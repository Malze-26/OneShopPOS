/**
 * Backfill script — repoints old purchase/sales history at the products that
 * replaced them.
 *
 * A bulk reseed gave the catalogue brand new `_id`s without touching the GRNs,
 * orders, transactions, supplier returns and stock-history rows that already
 * named the old ones — so real paperwork going back to January exists, it is
 * just filed under products that no longer exist. Every one of those source
 * documents also carries the product's name alongside its `_id`, so a product
 * that survived the reseed under the same name can be found again and the old
 * reference repointed at it, recovering the real dates, suppliers and costs
 * instead of inventing an opening balance from scratch.
 *
 * Stock levels are never touched — only the `product` reference (and, on GRN/
 * order/transaction/return line items, the denormalised name/sku that goes
 * with it) is corrected.
 *
 *   npm run relink:history -- --dry-run          # report, change nothing
 *   npm run relink:history -- --tenant oneshop_open_door
 *
 * Re-running is safe: once a reference points at a current product, it is
 * left alone.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { getModels } from './db/tenantModels';

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

const norm = (value: string): string => String(value).toLowerCase().replace(/[^a-z0-9]/g, '');

/** Weight-based line items carry a computed pack size, e.g. "Chicken Drumsticks (1kg)". */
const stripWeightSuffix = (value: string): string => value.replace(/\s*\([\d.]+\s*(kg|g|l|ml)\)\s*$/i, '');

async function relinkTenant(conn: mongoose.Connection, label: string, dryRun: boolean): Promise<void> {
  const { Product, GRN, Order, Transaction, SupplierReturn, StockHistory } = getModels(conn);

  const products = await Product.find({});
  if (products.length === 0) {
    console.log(`\n${label}: no products, nothing to do.`);
    return;
  }

  const currentIds = new Set(products.map((p) => String(p._id)));
  const byNormalisedName = new Map(products.map((p) => [norm(p.name), p]));

  const [grns, orders, transactions, returns, history] = await Promise.all([
    GRN.find({}),
    Order.find({}),
    Transaction.find({}),
    SupplierReturn.find({}),
    StockHistory.find({}),
  ]);

  console.log(`\n${label}: ${products.length} products`);
  console.log(
    `  source documents: ${grns.length} GRNs, ${orders.length} orders, ${transactions.length} transactions, ` +
      `${returns.length} supplier returns, ${history.length} stock-history rows`
  );

  // ── Gather what every stale id used to be called, from whichever surviving
  //    document still names it (a GRN line, an order line, ...). ──────────
  const nameByOldId = new Map<string, string>();
  const collectNames = (docs: Array<{ items: Array<{ product: unknown; productName?: string }> }>): void => {
    for (const doc of docs) {
      for (const item of doc.items ?? []) {
        const id = String(item.product);
        if (id && item.productName && !currentIds.has(id) && !nameByOldId.has(id)) {
          nameByOldId.set(id, item.productName);
        }
      }
    }
  };
  collectNames(grns);
  collectNames(orders);
  collectNames(transactions);
  collectNames(returns);

  // ── Resolve each stale id to the current product carrying the same name ──
  const remap = new Map<string, mongoose.Types.ObjectId>();
  const unresolved: Array<{ id: string; name: string }> = [];
  for (const [oldId, name] of nameByOldId) {
    const match = byNormalisedName.get(norm(name)) ?? byNormalisedName.get(norm(stripWeightSuffix(name)));
    if (match) remap.set(oldId, match._id as mongoose.Types.ObjectId);
    else unresolved.push({ id: oldId, name });
  }

  console.log(`\n  ${nameByOldId.size} stale product ids found in surviving documents`);
  console.log(`  ${remap.size} resolved to a current product by name, ${unresolved.length} could not be matched`);
  if (unresolved.length > 0) {
    console.log('\n  unmatched (no current product carries this name):');
    for (const u of unresolved.slice(0, 30)) console.log(`     ${u.id}  ${u.name}`);
    if (unresolved.length > 30) console.log(`     ... and ${unresolved.length - 30} more`);
  }

  // ── Relink line items on every source document type ──────────────────────
  // updateOne with a raw $set rather than doc.save(): some legacy documents
  // predate fields the schema now requires, and a full-document save() would
  // fail their validation on paths this script never touches.
  async function relinkItems<T extends { _id: unknown; items: Array<{ product: unknown; productName?: string; sku?: string }> }>(
    docs: T[],
    model: { bulkWrite(ops: unknown[]): Promise<unknown> },
    label: string
  ): Promise<number> {
    let itemsChanged = 0;
    const ops: Array<{ updateOne: { filter: { _id: unknown }; update: { $set: { items: unknown } } } }> = [];

    for (const doc of docs) {
      let changed = false;
      const items = (doc.items ?? []).map((item) => {
        const oldId = String(item.product);
        const newId = remap.get(oldId);
        if (!newId) return item;

        const product = products.find((p) => String(p._id) === String(newId))!;
        itemsChanged++;
        changed = true;
        return {
          ...item,
          product: newId,
          ...('productName' in item ? { productName: product.name } : {}),
          ...('sku' in item ? { sku: product.sku } : {}),
        };
      });

      if (changed) ops.push({ updateOne: { filter: { _id: doc._id }, update: { $set: { items } } } });
    }

    console.log(`  ${label}: ${dryRun ? 'would relink' : 'relinked'} ${itemsChanged} line item(s) across ${ops.length} document(s)`);
    if (!dryRun && ops.length > 0) await model.bulkWrite(ops);
    return itemsChanged;
  }

  console.log('\n  relinking line items:');
  await relinkItems(grns.map((g) => g.toObject()), GRN, 'GRNs');
  await relinkItems(orders.map((o) => o.toObject()), Order, 'orders');
  await relinkItems(transactions.map((t) => t.toObject()), Transaction, 'transactions');
  await relinkItems(returns.map((r) => r.toObject()), SupplierReturn, 'supplier returns');

  // ── Relink stock-history rows (single `product` field, no denormalised name) ──
  const historyOps = history
    .filter((row) => remap.has(String(row.product)))
    .map((row) => ({
      updateOne: {
        filter: { _id: row._id },
        update: { $set: { product: remap.get(String(row.product)) } },
      },
    }));

  console.log(`  stock history: ${dryRun ? 'would relink' : 'relinking'} ${historyOps.length} row(s)`);
  if (!dryRun && historyOps.length > 0) {
    await StockHistory.bulkWrite(historyOps);
  }

  console.log(`\n  ${history.length - historyOps.length} stock-history row(s) already point at a current product or could not be resolved`);
}

async function main(): Promise<void> {
  const { dryRun, tenant } = parseArgs(process.argv.slice(2));

  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set');
  await mongoose.connect(process.env.MONGODB_URI);

  try {
    await (tenant
      ? relinkTenant(mongoose.connection.useDb(tenant, { useCache: true }), tenant, dryRun)
      : relinkTenant(mongoose.connection, mongoose.connection.name, dryRun));
  } finally {
    await mongoose.disconnect();
  }

  console.log(dryRun ? '\nDry run complete.' : '\nRelink complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
