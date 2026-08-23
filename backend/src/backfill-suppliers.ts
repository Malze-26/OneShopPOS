/**
 * Backfill script — gives every product the supplier it was bought from.
 *
 * Products predate the supplier link, so the whole catalogue carries no
 * `supplierId`. Stock does not appear on a shelf by itself: each product must
 * name the supplier that delivered it. This script
 *
 *   1. re-scopes suppliers still sitting on a legacy storeId onto the store
 *      that actually owns the products, and rewrites their category lists to
 *      the names on the categories page — a supplier filed under "Dairy & Eggs"
 *      supplies nothing in a catalogue whose category is "Dairy";
 *   2. creates the distributors needed to cover categories nobody supplies yet;
 *   3. stamps `supplierId` + `supplier` onto every product, preferring a brand
 *      match (Anchor butter comes from Anchor Foods) and falling back to the
 *      category's default supplier.
 *
 *   npm run backfill:suppliers -- --dry-run          # report, change nothing
 *   npm run backfill:suppliers -- --tenant oneshop_open_door
 *
 * With no --tenant it runs against the database named in MONGODB_URI.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { getModels } from './db/tenantModels';
import { IGRNItem } from './models/GRN';

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

interface SupplierSpec {
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  categories: string[];
}

/**
 * Suppliers that must exist once this has run. Existing documents are matched
 * on name and updated in place, so a re-run never creates a duplicate.
 */
const SUPPLIERS: SupplierSpec[] = [
  // ── already in the database, extended to cover the categories in use ──────
  { name: 'Nestlé Lanka PLC', contactPerson: 'Ruwan Perera', email: 'orders@nestle.lk', phone: '011 230 4500', address: '410 Galle Road, Colombo 03', categories: ['Malt & Milk Drinks', 'Tea & Coffee', 'Chilled Food'] },
  { name: 'HiLine Foods Lanka', contactPerson: 'Nadeesha Silva', email: 'sales@hilinefoods.lk', phone: '011 244 8820', address: '58 Nawala Road, Rajagiriya', categories: ['Tea & Coffee', 'Malt & Milk Drinks'] },
  { name: 'Anchor Foods Lanka', contactPerson: 'Dilan Fernando', email: 'trade@anchor.lk', phone: '011 267 3311', address: '77 Baseline Road, Colombo 09', categories: ['Dairy', 'Chilled Food'] },
  { name: 'Ceylon Beverages Ltd', contactPerson: 'Amali Jayawardena', email: 'orders@ceylonbev.lk', phone: '011 259 7700', address: 'Ranala Industrial Estate, Ranala', categories: ['Beverages', 'Juices & Cordials', 'Soft Drinks & Water'] },
  { name: 'Island Frozen Foods', contactPerson: 'Kasun Bandara', email: 'sales@islandfrozen.lk', phone: '011 281 4460', address: '12 Sirimavo Bandaranaike Mw, Colombo 14', categories: ['Frozen Food'] },
  { name: 'Prima Ceylon Ltd', contactPerson: 'Sanjeewa Rathnayake', email: 'orders@prima.lk', phone: '038 224 0100', address: 'Prima Industrial Complex, Trincomalee', categories: ['Processed Meats', 'Bakery', 'Pasta & Noodles', 'Flour & Baking'] },
  { name: 'Fresh Harvest Suppliers', contactPerson: 'Priyantha Kumara', email: 'supply@freshharvest.lk', phone: '081 249 3320', address: 'Dambulla Economic Centre, Dambulla', categories: ['Vegetables', 'Fruits'] },
  { name: 'Keells Food Products', contactPerson: 'Malith Gunasekara', email: 'trade@keellsfoods.lk', phone: '011 244 1000', address: '16 Minuwangoda Road, Ja-Ela', categories: ['Processed Meats', 'Chilled Food'] },
  { name: 'Heyles Lanka', contactPerson: 'Ishara Wickramasinghe', email: 'info@heyles.lk', phone: '011 262 7180', address: '25 Foster Lane, Colombo 10', categories: ['Personal Care'] },

  // ── new distributors covering the categories nobody supplied ──────────────
  { name: 'Crysbro Poultry & Meats', contactPerson: 'Tharindu Alwis', email: 'orders@crysbro.lk', phone: '037 228 5500', address: 'Panaliya, Pannala', categories: ['Meat & Poultry'] },
  { name: 'Ceylon Fresh Seafoods', contactPerson: 'Nuwan Peiris', email: 'sales@ceylonseafoods.lk', phone: '011 243 9910', address: 'Fisheries Harbour, Negombo', categories: ['Seafood'] },
  { name: 'Araliya Rice & Grain Mills', contactPerson: 'Sunil Rajapaksha', email: 'orders@araliyarice.lk', phone: '047 224 7100', address: 'Mahaweli Junction, Polonnaruwa', categories: ['Rice & Grains', 'Grains & Pulses'] },
  { name: 'CBL Foods International', contactPerson: 'Chamari Dias', email: 'trade@cblfoods.lk', phone: '011 240 8000', address: '100 Dharmapala Mw, Colombo 07', categories: ['Canned & Preserved', 'Sauces & Condiments', 'Cooking Essentials'] },
  { name: 'Maliban Biscuit Manufactories', contactPerson: 'Roshan Mendis', email: 'orders@maliban.lk', phone: '011 246 5000', address: 'Ratmalana Industrial Zone, Ratmalana', categories: ['Biscuits', 'Snacks', 'Confectionery'] },
  { name: 'Unilever Sri Lanka Ltd', contactPerson: 'Fathima Naseer', email: 'trade@unilever.lk', phone: '011 471 5000', address: '258 Grandpass Road, Colombo 14', categories: ['Cleaning & Laundry', 'Oral Care'] },
  { name: 'Hemas Consumer Brands', contactPerson: 'Dinesh Abeysekara', email: 'orders@hemas.lk', phone: '011 475 5000', address: '75 Braybrooke Place, Colombo 02', categories: ['Personal Care', 'Baby Products'] },
  { name: 'Lanka Housewares Distributors', contactPerson: 'Shalini Fernando', email: 'sales@lankahousewares.lk', phone: '011 233 6640', address: '19 First Cross Street, Colombo 11', categories: ['Kitchen & Dining', 'Household'] },
  { name: 'PetLife Distributors Lanka', contactPerson: 'Anuradha Silva', email: 'orders@petlife.lk', phone: '011 250 8890', address: '44 Havelock Road, Colombo 05', categories: ['Pet Care'] },
  { name: 'Atlas Stationery Lanka', contactPerson: 'Hasitha Weerasinghe', email: 'trade@atlas.lk', phone: '011 267 2200', address: 'Kelaniya Industrial Estate, Kelaniya', categories: ['Stationery'] },
];

/** The supplier a product falls back to when no brand rule matches. */
const CATEGORY_SUPPLIER: Record<string, string> = {
  'Malt & Milk Drinks': 'Nestlé Lanka PLC',
  'Tea & Coffee': 'Nestlé Lanka PLC',
  'Chilled Food': 'Anchor Foods Lanka',
  'Dairy': 'Anchor Foods Lanka',
  'Beverages': 'Ceylon Beverages Ltd',
  'Juices & Cordials': 'Ceylon Beverages Ltd',
  'Soft Drinks & Water': 'Ceylon Beverages Ltd',
  'Frozen Food': 'Island Frozen Foods',
  'Processed Meats': 'Keells Food Products',
  'Bakery': 'Prima Ceylon Ltd',
  'Pasta & Noodles': 'Prima Ceylon Ltd',
  'Flour & Baking': 'Prima Ceylon Ltd',
  'Vegetables': 'Fresh Harvest Suppliers',
  'Fruits': 'Fresh Harvest Suppliers',
  'Meat & Poultry': 'Crysbro Poultry & Meats',
  'Seafood': 'Ceylon Fresh Seafoods',
  'Rice & Grains': 'Araliya Rice & Grain Mills',
  'Grains & Pulses': 'Araliya Rice & Grain Mills',
  'Canned & Preserved': 'CBL Foods International',
  'Sauces & Condiments': 'CBL Foods International',
  'Cooking Essentials': 'CBL Foods International',
  'Biscuits': 'Maliban Biscuit Manufactories',
  'Snacks': 'Maliban Biscuit Manufactories',
  'Confectionery': 'Maliban Biscuit Manufactories',
  'Cleaning & Laundry': 'Unilever Sri Lanka Ltd',
  'Oral Care': 'Unilever Sri Lanka Ltd',
  'Personal Care': 'Hemas Consumer Brands',
  'Baby Products': 'Hemas Consumer Brands',
  'Kitchen & Dining': 'Lanka Housewares Distributors',
  'Household': 'Lanka Housewares Distributors',
  'Pet Care': 'PetLife Distributors Lanka',
  'Stationery': 'Atlas Stationery Lanka',
};

/**
 * Brands whose own distributor is known, checked before the category default —
 * Anchor butter is filed under Dairy but comes from Anchor Foods, not from
 * whoever happens to be the Dairy default.
 */
const BRAND_SUPPLIER: Array<[RegExp, string]> = [
  [/nestl|nescaf|milo\b|nestomalt|nespray|maggi|cerelac|kitkat/i, 'Nestlé Lanka PLC'],
  [/\banchor\b/i, 'Anchor Foods Lanka'],
  [/\bprima\b/i, 'Prima Ceylon Ltd'],
  [/munchee|maliban/i, 'Maliban Biscuit Manufactories'],
  [/sunlight|surf excel|\brin\b|comfort|sunsilk|\bdove\b|rexona|close-?up/i, 'Unilever Sri Lanka Ltd'],
];

function supplierFor(product: { name: string; category: string }): string | null {
  for (const [pattern, name] of BRAND_SUPPLIER) {
    if (pattern.test(product.name)) return name;
  }
  return CATEGORY_SUPPLIER[product.category] ?? null;
}

async function backfillTenant(conn: mongoose.Connection, label: string, dryRun: boolean): Promise<number> {
  const { Product, Supplier, Category } = getModels(conn);

  const products = await Product.find({});
  if (products.length === 0) {
    console.log(`\n${label}: no products, nothing to do.`);
    return 0;
  }

  // The products are the authority on which store this catalogue belongs to —
  // some suppliers still carry the storeId of an earlier single-store setup.
  const storeId = products[0].storeId;
  console.log(`\n${label}: ${products.length} products, store ${storeId}`);

  // Suppliers share the products' category vocabulary. Anything outside it is
  // dropped rather than carried forward, so a supplier is never left claiming a
  // category no product can belong to.
  const realCategories = new Set((await Category.find({}).select('name').lean()).map((c) => c.name));

  // ── 1 + 2. every supplier exists, on the right store ──────────────────────
  const byName = new Map<string, mongoose.Types.ObjectId>();

  for (const spec of SUPPLIERS) {
    const existing = await Supplier.findOne({ name: spec.name });

    if (!existing) {
      if (dryRun) {
        console.log(`  + would create supplier  ${spec.name}`);
        byName.set(spec.name, new mongoose.Types.ObjectId());
        continue;
      }
      const created = await Supplier.create({ ...spec, storeId, status: 'active', notes: '' });
      console.log(`  + created supplier       ${spec.name}`);
      byName.set(spec.name, created._id as mongoose.Types.ObjectId);
      continue;
    }

    // A category added by hand on the suppliers page survives a re-run; one
    // that does not exist on the categories page does not.
    const merged = Array.from(new Set([...existing.categories, ...spec.categories])).filter((c) =>
      realCategories.has(c)
    );
    const rescoped = existing.storeId !== storeId;
    const changedCategories =
      merged.length !== existing.categories.length ||
      merged.some((c, i) => c !== existing.categories[i]);

    if (rescoped || changedCategories) {
      const notes = [rescoped ? 're-scoped' : '', changedCategories ? 'categories' : ''].filter(Boolean).join(', ');
      if (dryRun) {
        console.log(`  ~ would update supplier  ${spec.name} (${notes})`);
      } else {
        existing.storeId = storeId;
        existing.categories = merged;
        await existing.save();
        console.log(`  ~ updated supplier       ${spec.name} (${notes})`);
      }
    }

    byName.set(spec.name, existing._id as mongoose.Types.ObjectId);
  }

  // ── 3. stamp the supplier onto every product ─────────────────────────────
  const perSupplier = new Map<string, number>();
  const unmapped: string[] = [];
  let changed = 0;

  for (const product of products) {
    const supplierName = supplierFor(product);
    if (!supplierName) {
      unmapped.push(`${product.sku} ${product.name} (${product.category})`);
      continue;
    }

    const supplierId = byName.get(supplierName)!;
    perSupplier.set(supplierName, (perSupplier.get(supplierName) ?? 0) + 1);

    if (product.supplier === supplierName && String(product.supplierId) === String(supplierId)) {
      continue;
    }

    changed++;
    if (dryRun) continue;

    // updateOne rather than save(): the products being backfilled are exactly
    // the ones that cannot pass the new required-supplier validation yet.
    await Product.updateOne({ _id: product._id }, { $set: { supplierId, supplier: supplierName } });
  }

  console.log('\n  products per supplier:');
  for (const [name, count] of [...perSupplier].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${String(count).padStart(4)}  ${name}`);
  }

  if (unmapped.length > 0) {
    console.log(`\n  !! ${unmapped.length} products match no supplier rule — add their category to CATEGORY_SUPPLIER:`);
    unmapped.forEach((line) => console.log(`     ${line}`));
  }

  console.log(`\n  ${dryRun ? 'would update' : 'updated'} ${changed} products`);

  const orphanGRNs = await backfillGRNs(conn, storeId, dryRun);
  return unmapped.length + orphanGRNs;
}

/**
 * Links every goods-received note to the supplier that delivered it and to the
 * products it delivered.
 *
 * The item→product references were always there, but the copies of the product
 * name and SKU held on each line drift: renumbering SKUs into the
 * category-derived format left old notes quoting codes (BEV-001) that now
 * belong to a different category (SDW-008). A GRN is the paperwork behind a
 * delivery, so it has to keep naming what actually arrived.
 */
async function backfillGRNs(
  conn: mongoose.Connection,
  storeId: string,
  dryRun: boolean
): Promise<number> {
  const { GRN, Product, Supplier } = getModels(conn);

  const grns = await GRN.find({}).sort({ grnNumber: 1 });
  if (grns.length === 0) {
    console.log('\n  no GRNs, nothing to link.');
    return 0;
  }

  const suppliers = await Supplier.find({});
  const supplierByName = new Map(suppliers.map((s) => [s.name.trim().toLowerCase(), s]));
  const products = await Product.find({});
  const productById = new Map(products.map((p) => [String(p._id), p]));

  console.log(`\n  GRNs: ${grns.length}`);

  let linked = 0;
  let relabelled = 0;
  let restored = 0;
  const orphans: string[] = [];

  for (const grn of grns) {
    const supplier = supplierByName.get((grn.supplier ?? '').trim().toLowerCase());
    if (!supplier) {
      orphans.push(`${grn.grnNumber} — supplier "${grn.supplier || '(none)'}" is not on the suppliers page`);
      continue;
    }

    const set: Record<string, unknown> = {};

    if (String(grn.supplierId ?? '') !== String(supplier._id)) {
      set.supplierId = supplier._id;
      set.supplier = supplier.name;
      linked++;
    }

    // A GRN raised before the store ids were unified points at a store that no
    // longer owns anything.
    if (grn.storeId !== storeId) {
      set.storeId = storeId;
      restored++;
    }

    // Refresh each line from the product it already references. The fields are
    // listed out rather than spread: `items` holds mongoose subdocuments, and
    // spreading one copies its internals ($__, _doc, …) instead of its values.
    let itemsChanged = false;
    const items: IGRNItem[] = grn.items.map((item) => {
      const line: IGRNItem = {
        product: item.product,
        productName: item.productName,
        sku: item.sku,
        quantityReceived: item.quantityReceived,
        costPrice: item.costPrice,
        subtotal: item.subtotal,
      };

      const product = productById.get(String(line.product));
      if (!product) {
        orphans.push(`${grn.grnNumber} — item references a product that no longer exists (${line.productName})`);
        return line;
      }

      if (product.sku !== line.sku || product.name !== line.productName) {
        relabelled++;
        itemsChanged = true;
        console.log(`    ~ ${grn.grnNumber}  ${line.sku} -> ${product.sku}  ${product.name}`);
      }
      return { ...line, sku: product.sku, productName: product.name };
    });

    if (itemsChanged) set.items = items;

    if (Object.keys(set).length === 0) continue;

    // updateOne rather than save(): the notes being backfilled are exactly the
    // ones that cannot pass the new required-supplier validation yet.
    if (!dryRun) await GRN.updateOne({ _id: grn._id }, { $set: set });
  }

  console.log(`  ${dryRun ? 'would link' : 'linked'} ${linked} GRNs to a supplier, refreshed ${relabelled} item labels, re-scoped ${restored}`);

  if (orphans.length > 0) {
    console.log(`\n  !! ${orphans.length} GRNs could not be linked:`);
    orphans.forEach((line) => console.log(`     ${line}`));
  }

  return orphans.length;
}

async function main(): Promise<void> {
  const { dryRun, tenant } = parseArgs(process.argv.slice(2));

  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set');
  await mongoose.connect(process.env.MONGODB_URI);

  let unmapped = 0;
  try {
    unmapped = tenant
      ? await backfillTenant(mongoose.connection.useDb(tenant, { useCache: true }), tenant, dryRun)
      : await backfillTenant(mongoose.connection, mongoose.connection.name, dryRun);
  } finally {
    await mongoose.disconnect();
  }

  console.log(dryRun ? '\nDry run complete.' : '\nBackfill complete.');

  // A product with no supplier is the thing this script exists to prevent, so
  // leaving one behind is a failure even though the rest of the run succeeded.
  if (unmapped > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
