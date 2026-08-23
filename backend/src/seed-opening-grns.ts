/**
 * Seed script — raises an opening-stock GRN for every product that has none.
 *
 * Most of the catalogue was seeded straight into the products collection, so
 * the stock on those shelves is backed by no paperwork at all. This raises one
 * "Opening Stock" note per supplier listing every one of its products at the
 * quantity currently on hand, the way a shop records the balances it carries in
 * when it goes live.
 *
 * These notes record stock that is ALREADY counted in `product.stock`. Unlike
 * receiving goods through the API, this script never increments stock and never
 * writes stock history — doing either would double-count the whole catalogue.
 *
 *   npm run seed:opening-grns -- --dry-run          # report, change nothing
 *   npm run seed:opening-grns -- --tenant oneshop_open_door
 *
 * Re-running is safe: a supplier that already has its opening note is skipped.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { getModels } from './db/tenantModels';
import { IGRNItem } from './models/GRN';
import { GRN_NUMBER_PAD_LENGTH, SYSTEM_ACTOR } from './constants';

/** Marks the notes this script raises, so a re-run can recognise its own work. */
const OPENING_REFERENCE = 'OPENING-STOCK';

const OPENING_NOTES =
  'Opening stock — balances carried in when the store went live. ' +
  'Recorded for traceability; these units were already on the shelf and were not a physical delivery.';

interface Options {
  dryRun: boolean;
  tenant?: string;
}

function parseArgs(argv: string[]): Options {
  const tenantIndex = argv.indexOf('--tenant');
  return {
    dryRun: argv.includes('--dry-run'),
    tenant: tenantIndex >= 0 ? argv[tenantIndex + 1] : undefined,
  };
}

async function seedTenant(conn: mongoose.Connection, label: string, dryRun: boolean): Promise<number> {
  const { GRN, Product, Supplier } = getModels(conn);

  const [products, grns, suppliers] = await Promise.all([
    Product.find({}),
    GRN.find({}),
    Supplier.find({}),
  ]);

  if (products.length === 0) {
    console.log(`\n${label}: no products, nothing to do.`);
    return 0;
  }

  const received = new Set(grns.flatMap((g) => g.items.map((i) => String(i.product))));
  const uncovered = products.filter((p) => !received.has(String(p._id)));

  console.log(`\n${label}: ${products.length} products, ${grns.length} GRNs`);
  console.log(`  ${products.length - uncovered.length} already appear on a GRN, ${uncovered.length} do not`);

  if (uncovered.length === 0) {
    console.log('  every product already has a GRN.');
    return 0;
  }

  // A supplier that already carries its opening note keeps it — the script must
  // not raise a second one for products added to the catalogue later.
  const alreadyOpened = new Set(
    grns.filter((g) => g.referenceNumber === OPENING_REFERENCE).map((g) => String(g.supplierId))
  );

  const supplierById = new Map(suppliers.map((s) => [String(s._id), s]));

  // An opening balance can only list stock that is actually on hand. A product
  // sitting at zero has nothing to carry in, so it waits for a real delivery.
  const empty = uncovered.filter((p) => p.stock <= 0);
  const toReceive = uncovered.filter((p) => p.stock > 0);

  const bySupplier = new Map<string, typeof toReceive>();
  for (const product of toReceive) {
    const key = String(product.supplierId);
    if (!bySupplier.has(key)) bySupplier.set(key, []);
    bySupplier.get(key)!.push(product);
  }

  // Opening balances precede every delivery already on record.
  const earliestGRN = grns.reduce<Date | null>((earliest, g) => {
    const created = g.get('createdAt') as Date | undefined;
    if (!created) return earliest;
    return !earliest || created < earliest ? created : earliest;
  }, null);
  const openedAt = earliestGRN ? new Date(earliestGRN.getTime() - 86_400_000) : new Date();

  // Match whoever signed for the existing deliveries rather than inventing a name.
  const receivedBy = grns.find((g) => g.receivedBy)?.receivedBy ?? SYSTEM_ACTOR;
  const storeId = products[0].storeId;

  // Continue the existing GRN sequence rather than restarting it.
  const year = openedAt.getFullYear();
  const prefix = `GRN-${year}-`;
  let sequence = grns
    .filter((g) => g.grnNumber.startsWith(prefix))
    .reduce((highest, g) => Math.max(highest, parseInt(g.grnNumber.slice(prefix.length), 10) || 0), 0);

  console.log(`  raising ${bySupplier.size} opening notes, dated ${openedAt.toISOString().slice(0, 10)}\n`);

  let created = 0;
  let lines = 0;

  for (const [supplierId, group] of [...bySupplier].sort(
    (a, b) => (supplierById.get(a[0])?.name ?? '').localeCompare(supplierById.get(b[0])?.name ?? '')
  )) {
    const supplier = supplierById.get(supplierId);
    if (!supplier) {
      console.log(`  !! skipped ${group.length} products — supplier ${supplierId} not found`);
      continue;
    }
    if (alreadyOpened.has(supplierId)) {
      console.log(`  = ${supplier.name} already has an opening note, skipped`);
      continue;
    }

    const items: IGRNItem[] = group.map((product) => ({
      product: product._id as mongoose.Types.ObjectId,
      productName: product.name,
      sku: product.sku,
      quantityReceived: product.stock,
      costPrice: product.costPrice,
      subtotal: product.stock * product.costPrice,
    }));

    sequence++;
    const grnNumber = `${prefix}${String(sequence).padStart(GRN_NUMBER_PAD_LENGTH, '0')}`;
    const totalItems = items.reduce((sum, i) => sum + i.quantityReceived, 0);
    const totalCost = items.reduce((sum, i) => sum + i.subtotal, 0);

    console.log(
      `  + ${grnNumber}  ${supplier.name.padEnd(30)} ${String(items.length).padStart(3)} lines, ` +
        `${String(totalItems).padStart(5)} units, LKR ${totalCost.toLocaleString()}`
    );

    created++;
    lines += items.length;
    if (dryRun) continue;

    await GRN.create({
      grnNumber,
      supplierId: supplier._id,
      supplier: supplier.name,
      referenceNumber: OPENING_REFERENCE,
      notes: OPENING_NOTES,
      items,
      totalItems,
      totalCost,
      receivedBy,
      storeId,
      // Stock is deliberately left alone: these units are already counted.
      createdAt: openedAt,
      updatedAt: openedAt,
    });
  }

  console.log(`\n  ${dryRun ? 'would raise' : 'raised'} ${created} opening notes covering ${lines} products`);

  if (empty.length > 0) {
    console.log(`\n  ${empty.length} product(s) hold no stock, so there is no opening balance to record:`);
    empty.forEach((p) => console.log(`     ${p.sku}  ${p.name}`));
    console.log('     These get their first GRN when stock is actually received.');
  }

  return empty.length;
}

async function main(): Promise<void> {
  const { dryRun, tenant } = parseArgs(process.argv.slice(2));

  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set');
  await mongoose.connect(process.env.MONGODB_URI);

  try {
    await (tenant
      ? seedTenant(mongoose.connection.useDb(tenant, { useCache: true }), tenant, dryRun)
      : seedTenant(mongoose.connection, mongoose.connection.name, dryRun));
  } finally {
    await mongoose.disconnect();
  }

  console.log(dryRun ? '\nDry run complete.' : '\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
