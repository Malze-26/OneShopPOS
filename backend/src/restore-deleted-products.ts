/**
 * Recovery script — rebuilds the products a bulk delete removed from a tenant.
 *
 * The products collection is gone but the record of what passed through the
 * shop is not: every GRN line still names the product it received, every order
 * line names what was sold, every stock movement still points at the product it
 * moved. Those documents hold the product's own _id, so a product rebuilt under
 * that same _id re-attaches to its whole history rather than starting a new one.
 *
 * What comes from where:
 *   _id, sku, name, costPrice   GRN and supplier-return lines
 *   sellingPrice                order lines, else the seed catalogue by name
 *   supplier, supplierId        the GRN or return the product was received on
 *   category                    the live Category whose skuPrefix matches
 *   description, unit, ...      the seed catalogue matched by name
 *   stock                       replayed from the stock-history ledger
 *
 * Images are not recoverable — they lived in object storage keyed off records
 * that no longer exist — so rebuilt products come back with none.
 *
 *   npx tsx src/restore-deleted-products.ts --dry-run
 *   npx tsx src/restore-deleted-products.ts --tenant oneshop_open_door
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

const DEFAULT_TENANT = 'oneshop_open_door';
const MANAGER_EMAIL = 'mng01@opendoor.lk';

interface Options {
  dryRun: boolean;
  tenant: string;
}

function parseArgs(argv: string[]): Options {
  const tenantIndex = argv.indexOf('--tenant');
  return {
    dryRun: argv.includes('--dry-run'),
    tenant: tenantIndex >= 0 ? argv[tenantIndex + 1] : DEFAULT_TENANT,
  };
}

const norm = (value: string): string => String(value).toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * The seed catalogue is the only surviving source of descriptions, pack units
 * and reorder levels, so it is read straight out of the seed script rather
 * than duplicated here where the two could drift apart.
 */
function loadCatalogue(): Map<string, Record<string, any>> {
  const lines = fs.readFileSync(path.join(__dirname, 'seed.ts'), 'utf-8').split(/\r?\n/);
  const start = lines.findIndex((line) => /^\s*const products = \[/.test(line));
  if (start < 0) throw new Error('could not find the product catalogue in seed.ts');

  let end = start;
  while (end < lines.length && !/^\s*\];\s*$/.test(lines[end])) end++;

  const text = lines
    .slice(start, end + 1)
    .join('\n')
    .replace(/^\s*const products = /, '')
    .replace(/;\s*$/, '');

  // eslint-disable-next-line no-eval
  const products: Record<string, any>[] = eval(text);
  return new Map(products.map((product) => [norm(product.name), product]));
}

interface Gathered {
  name?: string;
  sku?: string;
  costPrice?: number;
  sellingPrice?: number;
  supplier?: string;
  supplierId?: mongoose.Types.ObjectId;
  firstSeen?: Date;
  sources: Set<string>;
}

async function main(): Promise<void> {
  const { dryRun, tenant } = parseArgs(process.argv.slice(2));
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set');
  await mongoose.connect(process.env.MONGODB_URI);

  try {
    const db = mongoose.connection.useDb(tenant, { useCache: true }).db!;
    const catalogue = loadCatalogue();

    const [existing, grns, returns, orders, history, categories, manager, settings] = await Promise.all([
      db.collection('products').find({}).toArray(),
      db.collection('grns').find({}).toArray(),
      db.collection('supplierreturns').find({}).toArray(),
      db.collection('orders').find({}).toArray(),
      db.collection('stockhistories').find({}).toArray(),
      db.collection('categories').find({}).toArray(),
      db.collection('users').findOne({ email: MANAGER_EMAIL }),
      db.collection('storesettings').findOne({}),
    ]);

    if (!manager) throw new Error(`manager ${MANAGER_EMAIL} not found in ${tenant}`);

    const storeId: string = settings?.storeId ?? manager.storeId;
    const categoryByPrefix = new Map<string, string>(
      categories.filter((c) => c.skuPrefix).map((c) => [c.skuPrefix as string, c.name as string])
    );

    const onFile = new Set(existing.map((product) => String(product._id)));

    // ── What the surviving documents still remember about each product ──
    const found = new Map<string, Gathered>();
    const remember = (id: unknown, data: Partial<Gathered> & { source: string; at?: Date }): void => {
      if (!id) return;
      const key = String(id);
      if (onFile.has(key)) return; // still on file, nothing to rebuild

      const entry = found.get(key) ?? { sources: new Set<string>() };
      for (const field of ['name', 'sku', 'costPrice', 'sellingPrice', 'supplier', 'supplierId'] as const) {
        const value = data[field];
        if (entry[field] == null && value != null && value !== '') (entry as any)[field] = value;
      }
      entry.sources.add(data.source);
      if (data.at && (!entry.firstSeen || data.at < entry.firstSeen)) entry.firstSeen = data.at;
      found.set(key, entry);
    };

    for (const grn of grns) {
      for (const item of grn.items ?? []) {
        remember(item.product, {
          name: item.productName,
          sku: item.sku,
          costPrice: item.costPrice,
          supplier: grn.supplier,
          supplierId: grn.supplierId,
          source: 'grn',
          at: grn.createdAt,
        });
      }
    }

    for (const ret of returns) {
      for (const item of ret.items ?? []) {
        remember(item.product, {
          name: item.productName,
          sku: item.sku,
          costPrice: item.costPrice,
          sellingPrice: item.sellingPrice,
          supplier: ret.supplier,
          supplierId: ret.supplierId,
          source: 'supplier-return',
          at: ret.createdAt,
        });
      }
    }

    for (const order of orders) {
      for (const item of order.items ?? []) {
        remember(item.product ?? item.productId, {
          name: item.name,
          sellingPrice: item.price,
          source: 'order',
          at: order.createdAt,
        });
      }
    }

    for (const move of history) {
      remember(move.product, { source: 'stock-history', at: move.createdAt });
    }

    // ── Stock is whatever the movements add up to ──
    const ledger = new Map<string, number>();
    for (const move of history) {
      const key = String(move.product);
      ledger.set(key, (ledger.get(key) ?? 0) + (move.type === 'add' ? move.quantity : -move.quantity));
    }

    const rebuilt: Record<string, any>[] = [];
    const incomplete: { id: string; entry: Gathered }[] = [];

    for (const [id, entry] of found) {
      const catalogued = entry.name ? catalogue.get(norm(entry.name)) : undefined;
      const sellingPrice = entry.sellingPrice ?? catalogued?.sellingPrice;
      const costPrice = entry.costPrice ?? catalogued?.costPrice;
      const category = entry.sku ? categoryByPrefix.get(entry.sku.slice(0, 3).toUpperCase()) : undefined;

      // A product missing its name, its code, a price or its supplier cannot be
      // put back on the shelf without inventing the missing part, so it is
      // reported for manual re-entry instead of guessed at.
      if (!entry.name || !entry.sku || sellingPrice == null || costPrice == null || !category || !entry.supplierId) {
        incomplete.push({ id, entry });
        continue;
      }

      rebuilt.push({
        _id: new mongoose.Types.ObjectId(id),
        name: entry.name,
        slug: entry.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        sku: entry.sku.toUpperCase(),
        description: catalogued?.description ?? '',
        sellingPrice,
        costPrice,
        stock: Math.max(0, ledger.get(id) ?? 0),
        lowStockThreshold: catalogued?.lowStockThreshold ?? 10,
        category,
        images: [],
        supplierId: entry.supplierId,
        supplier: entry.supplier,
        brand: 'OneShop',
        featured: false,
        badge: '',
        rating: 0,
        numReviews: 0,
        storeId,
        expiryDate: null,
        createdBy: manager._id,
        isWeightBased: catalogued?.isWeightBased ?? false,
        unit: catalogued?.unit ?? 'item',
        createdAt: entry.firstSeen ?? new Date(),
        updatedAt: new Date(),
        __v: 0,
      });
    }

    // ── Products nothing points at, stamped with another store's id, were
    //    never part of this shop's history — they are a stray seed run ──
    const referenced = new Set<string>();
    for (const move of history) referenced.add(String(move.product));
    for (const doc of [...orders, ...grns, ...returns]) {
      for (const item of (doc as any).items ?? []) referenced.add(String(item.product ?? item.productId));
    }

    const strays = existing.filter(
      (product) => !referenced.has(String(product._id)) && String(product.storeId) !== storeId
    );
    const rebuiltSkus = new Set(rebuilt.map((product) => product.sku));
    const blocking = strays.filter((product) => rebuiltSkus.has(String(product.sku).toUpperCase()));

    console.log(`\ntenant ${tenant}${dryRun ? '   (dry run — nothing is written)' : ''}`);
    console.log(`  ${existing.length} products on file, ${found.size} referenced but missing\n`);
    console.log(`  ${strays.length} unreferenced product(s) carrying a foreign storeId ${dryRun ? 'would be' : ''} removed`);
    console.log(`      ${blocking.length} of them hold a SKU belonging to a product being rebuilt`);
    console.log(`  ${rebuilt.length} product(s) ${dryRun ? 'would be' : ''} rebuilt under their original _id`);
    console.log(`  ${incomplete.length} product(s) cannot be rebuilt from what survives\n`);

    if (incomplete.length > 0) {
      console.log('  needs manual re-entry:');
      for (const { id, entry } of incomplete) {
        const missing = (['name', 'sku', 'sellingPrice', 'costPrice', 'supplierId'] as const).filter(
          (field) => entry[field] == null
        );
        console.log(
          `    ${id}  ${(entry.name ?? '(name unknown)').padEnd(26)} ${(entry.sku ?? '—').padEnd(9)} ` +
            `stock ${String(Math.max(0, ledger.get(id) ?? 0)).padStart(4)}  ` +
            `missing: ${missing.join(', ') || 'category'}  seen in: ${[...entry.sources].join(', ')}`
        );
      }
      console.log('');
    }

    if (dryRun) {
      console.log('  first 10 to be rebuilt:');
      for (const product of rebuilt.slice(0, 10)) {
        console.log(
          `    ${product.sku.padEnd(9)} ${product.name.slice(0, 30).padEnd(31)} ` +
            `${String(product.stock).padStart(4)} @ ${String(product.sellingPrice).padStart(5)}  ${product.category}`
        );
      }
      console.log('\nDry run complete.');
      return;
    }

    if (strays.length > 0) {
      const result = await db.collection('products').deleteMany({ _id: { $in: strays.map((p) => p._id) } });
      console.log(`  removed ${result.deletedCount} unreferenced product(s)`);
    }

    if (rebuilt.length > 0) {
      const result = await db.collection('products').insertMany(rebuilt, { ordered: false });
      console.log(`  rebuilt ${result.insertedCount} product(s)`);
    }

    // ── Every reference should now resolve, bar the ones reported above ──
    const after = new Set(
      (await db.collection('products').find({}, { projection: { _id: 1 } }).toArray()).map((p) => String(p._id))
    );
    const unresolved = [...referenced].filter((id) => id !== 'undefined' && !after.has(id));

    console.log(`\n  ${after.size} products on file`);
    console.log(`  ${unresolved.length} reference(s) still unresolved`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
