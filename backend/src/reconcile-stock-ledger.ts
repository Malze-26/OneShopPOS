/**
 * Reconciliation script — recomputes every product's stock from its movements.
 *
 *     current stock = total added − total removed
 *
 * The stock history is the record of what happened: goods received against a
 * GRN, sold at the till, despatched to an online customer, returned to a
 * supplier. Those movements are evidence and this script never edits them. The
 * stock figure is the running total they add up to, so where the two disagree
 * it is the total that is wrong, and the total is what gets rewritten.
 *
 * One movement is not evidence of anything that happened, though: an "Opening
 * Stock" GRN (or an `Initial Stock` row) does not record a delivery or a sale,
 * it records "this is what we counted on the day we started keeping a ledger
 * at all" — a balancing figure by definition, not an independent fact that can
 * agree or disagree with the rest of the book. Treating it as an ordinary
 * movement double-counts anything that happened to arrive later on top of it:
 * relink a product's real pre-reseed sales behind an opening note sized to
 * *today's* stock and the ledger "proves" the shelf is empty, because those
 * sales already happened once before the opening figure was ever set and this
 * script would subtract them a second time. So for a product with exactly one
 * opening-type row, that row is the unknown solved for — its quantity is set
 * to whatever makes `opening + net(everything else) = current stock` — and
 * only products with no opening row at all fall back to the plain replay.
 *
 * It also clears the fabricated "stock count adjustment" rows an earlier
 * version of this script invented to force the books to balance. Writing a
 * movement that never happened is not reconciliation — it hides the difference
 * instead of showing it.
 *
 * A product with no opening row at all is not given the same treatment,
 * though it once was: earlier this script trusted a plain replay of its
 * movements outright and overwrote `product.stock` to match. That is correct
 * only when the recorded movements are the product's *entire* history, and
 * there is no way to tell that from here — a product can just as easily be
 * missing an opening balance as have a real bug behind a mismatch, and
 * guessing which risks silently emptying a shelf that is not actually empty.
 * So this script now only ever writes an opening row's balancing figure,
 * which by construction cannot change `product.stock`; every other mismatch
 * is reported for a person to look at, never applied.
 *

 *   npm run reconcile:stock -- --dry-run              # report, change nothing
 *   npm run reconcile:stock -- --tenant oneshop_open_door
 */
import 'dotenv/config';
import dns from 'dns';
// Matches src/index.ts: this environment's default resolver can't reach the
// SRV record for the Atlas hostname, so DNS-over-Google is used instead.
dns.setServers(['8.8.8.8', '8.8.4.4']);
import mongoose from 'mongoose';
import { getModels } from './db/tenantModels';

/**
 * Reasons written by an earlier version of this script to paper over the
 * difference. They record no real movement, so they are removed rather than
 * counted.
 */
const FABRICATED_REASONS = ['Stock count adjustment', 'Opening stock adjustment'];

/** The reference `seed-opening-grns.ts` stamps on the notes it raises. */
const OPENING_GRN_REFERENCE = 'OPENING-STOCK';

/** The reason `productController.createProduct` writes for a product's first stock. */
const INITIAL_STOCK_REASON = 'Initial Stock';

const GRN_REASON_PATTERN = /GRN: (GRN-\d{4}-\d+)/;

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

async function reconcileTenant(conn: mongoose.Connection, label: string, dryRun: boolean): Promise<void> {
  const { Product, StockHistory, GRN } = getModels(conn);

  const [products, history, grns] = await Promise.all([Product.find({}), StockHistory.find({}), GRN.find({})]);

  const fabricated = history.filter((row) => FABRICATED_REASONS.includes(row.reason));
  const real = history.filter((row) => !FABRICATED_REASONS.includes(row.reason));

  console.log(`\n${label}: ${products.length} products, ${real.length} movements`);

  if (fabricated.length > 0) {
    console.log(`\n  ${dryRun ? 'would remove' : 'removing'} ${fabricated.length} fabricated adjustment(s):`);
    const nameById = new Map(products.map((p) => [String(p._id), p]));
    for (const row of fabricated) {
      const product = nameById.get(String(row.product));
      console.log(
        `    ${(product?.sku ?? '?').padEnd(10)} ${(product?.name ?? '').slice(0, 28).padEnd(29)} ` +
          `${row.type === 'add' ? '+' : '-'}${row.quantity}  "${row.reason}"`
      );
    }
    if (!dryRun) {
      await StockHistory.deleteMany({ _id: { $in: fabricated.map((r) => r._id) } });
    }
  }

  // A GRN counts as an opening note only if it was actually raised as one —
  // matching on the reference `seed-opening-grns.ts` stamps, not on wording.
  const openingGrnByNumber = new Map(grns.filter((g) => g.referenceNumber === OPENING_GRN_REFERENCE).map((g) => [g.grnNumber, g]));

  const openingGrnNumber = (row: (typeof real)[number]): string | null => {
    const match = GRN_REASON_PATTERN.exec(row.reason ?? '');
    return match && openingGrnByNumber.has(match[1]) ? match[1] : null;
  };
  const isOpeningRow = (row: (typeof real)[number]): boolean =>
    row.reason === INITIAL_STOCK_REASON || openingGrnNumber(row) !== null;

  const rowsByProduct = new Map<string, typeof real>();
  for (const row of real) {
    const key = String(row.product);
    if (!rowsByProduct.has(key)) rowsByProduct.set(key, []);
    rowsByProduct.get(key)!.push(row);
  }

  const openingCorrections: Array<{ row: (typeof real)[number]; from: number; to: number; grnNumber: string | null }> = [];
  const anomalies: Array<{ product: (typeof products)[number]; note: string }> = [];

  for (const product of products) {
    const rows = rowsByProduct.get(String(product._id)) ?? [];
    const openingRows = rows.filter(isOpeningRow);
    const otherRows = rows.filter((r) => !isOpeningRow(r));
    const otherNet = otherRows.reduce((sum, r) => sum + (r.type === 'add' ? r.quantity : -r.quantity), 0);

    if (openingRows.length === 1) {
      const needed = product.stock - otherNet;
      if (needed < 1) {
        // More was really sold/received/returned around it than the product
        // ever had — no opening figure fixes that, so it is reported rather
        // than written as an invalid (zero or negative) received quantity.
        anomalies.push({ product, note: `needs an opening balance of ${needed}, which is not a valid received quantity` });
        continue;
      }
      if (needed !== openingRows[0].quantity) {
        openingCorrections.push({ row: openingRows[0], from: openingRows[0].quantity, to: needed, grnNumber: openingGrnNumber(openingRows[0]) });
      }
      // A corrected opening row always brings the ledger to product.stock
      // exactly, so product.stock itself needs no change here.
    } else if (openingRows.length === 0) {
      // No balancing figure to solve for, and no way to tell from here
      // whether that is because this really is the product's whole history
      // or because it is missing an opening row like the ones above. Report
      // rather than guess — see the file header.
      if (otherNet !== product.stock) {
        anomalies.push({ product, note: `has no opening row; its movements alone total ${otherNet}, but stock is ${product.stock}` });
      }
    } else {
      anomalies.push({ product, note: `has ${openingRows.length} opening-type rows` });
    }
  }

  // ── Apply opening-row corrections: the StockHistory row and, for a
  //    GRN-backed opening note, the matching GRN line and its totals ──────
  console.log(`\n  ${openingCorrections.length} opening balance(s) ${dryRun ? 'would be' : 'were'} recalculated to match today's stock:`);
  for (const { row, from, to, grnNumber } of openingCorrections) {
    const product = products.find((p) => String(p._id) === String(row.product))!;
    console.log(`    ${product.sku.padEnd(10)} ${product.name.slice(0, 29).padEnd(30)} ${String(from).padStart(5)} -> ${String(to).padStart(5)}`);
  }

  if (!dryRun && openingCorrections.length > 0) {
    await StockHistory.bulkWrite(
      openingCorrections.map(({ row, to }) => ({
        updateOne: { filter: { _id: row._id }, update: { $set: { quantity: to } } },
      }))
    );

    const grnOps: Array<{ updateOne: { filter: { _id: unknown }; update: { $set: { items: unknown; totalItems: number; totalCost: number } } } }> = [];
    const byGrnNumber = new Map<string, typeof openingCorrections>();
    for (const c of openingCorrections) {
      if (!c.grnNumber) continue;
      if (!byGrnNumber.has(c.grnNumber)) byGrnNumber.set(c.grnNumber, []);
      byGrnNumber.get(c.grnNumber)!.push(c);
    }
    for (const [grnNumber, corrections] of byGrnNumber) {
      const grn = openingGrnByNumber.get(grnNumber)!;
      const toByProduct = new Map(corrections.map((c) => [String(c.row.product), c.to]));
      const items = grn.items.map((item) => {
        const to = toByProduct.get(String(item.product));
        const quantityReceived = to ?? item.quantityReceived;
        return {
          product: item.product,
          productName: item.productName,
          sku: item.sku,
          quantityReceived,
          costPrice: item.costPrice,
          subtotal: quantityReceived * item.costPrice,
        };
      });
      const totalItems = items.reduce((sum, i) => sum + i.quantityReceived, 0);
      const totalCost = items.reduce((sum, i) => sum + i.subtotal, 0);
      grnOps.push({ updateOne: { filter: { _id: grn._id }, update: { $set: { items, totalItems, totalCost } } } });
    }
    if (grnOps.length > 0) await GRN.bulkWrite(grnOps as never);
  }

  // Never written automatically — see the file header. Reported so a person
  // can decide whether each one needs a backfilled opening row or is a real
  // bug in how stock is being tracked.
  if (anomalies.length > 0) {
    console.log(`\n  !! ${anomalies.length} product(s) could not be reconciled automatically — needs a person to look:`);
    for (const { product, note } of anomalies) {
      console.log(`     ${product.sku.padEnd(10)} ${product.name.padEnd(30)} ${note}`);
    }
  }

  console.log(`\n  ${products.length - openingCorrections.length - anomalies.length} product(s) already consistent`);
}

async function main(): Promise<void> {
  const { dryRun, tenant } = parseArgs(process.argv.slice(2));

  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set');
  await mongoose.connect(process.env.MONGODB_URI);

  try {
    await (tenant
      ? reconcileTenant(mongoose.connection.useDb(tenant, { useCache: true }), tenant, dryRun)
      : reconcileTenant(mongoose.connection, mongoose.connection.name, dryRun));
  } finally {
    await mongoose.disconnect();
  }

  console.log(dryRun ? '\nDry run complete.' : '\nReconciliation complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
