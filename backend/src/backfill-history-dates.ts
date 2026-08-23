/**
 * Backfill script — dates every stock movement to the event that caused it.
 *
 * A movement is only meaningful next to the paperwork behind it: goods received
 * belong on the day the GRN says they arrived, units sold on the day the sale
 * rang up. Rows written by a backfill or a sync job carry the date they were
 * written instead, which pushes a sale days after the receipt that supplied it
 * and makes a product's history read out of order.
 *
 * Each movement is matched back to its source document by the reference in its
 * reason, and re-dated to that document:
 *
 *   GRN: <no> — <supplier>      → the note's date
 *   POS Transaction <txn>       → the transaction's date
 *   Transaction voided: <txn>   → when the transaction was voided
 *   E-com order <id>            → the order's date
 *   Initial Stock               → the product's creation date
 *
 * Quantities are never touched — only when the movement is recorded as having
 * happened. A row whose source document no longer exists is left alone and
 * reported, since there is nothing left to date it against.
 *
 *   npm run backfill:history-dates -- --dry-run       # report, change nothing
 *   npm run backfill:history-dates -- --tenant oneshop_open_door
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

const DAY = 86_400_000;

async function backfillTenant(conn: mongoose.Connection, label: string, dryRun: boolean): Promise<void> {
  const { StockHistory, GRN, Transaction, Order, Product } = getModels(conn);

  const [history, grns, transactions, orders, products] = await Promise.all([
    StockHistory.find({}),
    GRN.find({}),
    Transaction.find({}),
    Order.find({}),
    Product.find({}),
  ]);

  const grnByNumber = new Map(grns.map((g) => [g.grnNumber, g]));
  const txnById = new Map(transactions.map((t) => [t.txnId, t]));
  const orderById = new Map(orders.map((o) => [o.orderId, o]));
  const productById = new Map(products.map((p) => [String(p._id), p]));

  /** The document a movement came from, and the date it should carry. */
  function sourceDate(reason: string, productKey: string): { ref: string; at: Date } | 'missing' | null {
    let match;

    if ((match = /GRN-\d{4}-\d+/.exec(reason))) {
      const grn = grnByNumber.get(match[0]);
      return grn ? { ref: match[0], at: grn.get('createdAt') as Date } : 'missing';
    }
    if ((match = /^POS Transaction (\S+)/.exec(reason))) {
      const txn = txnById.get(match[1]);
      return txn ? { ref: match[1], at: txn.get('createdAt') as Date } : 'missing';
    }
    if ((match = /^Transaction voided: (\S+)/.exec(reason))) {
      // The void is a later event than the sale, so it carries its own date.
      const txn = txnById.get(match[1]);
      return txn ? { ref: match[1], at: txn.get('updatedAt') as Date } : 'missing';
    }
    if ((match = /(ORD-\w+)/.exec(reason))) {
      const order = orderById.get(match[1]);
      return order ? { ref: match[1], at: order.get('createdAt') as Date } : 'missing';
    }
    if (reason === 'Initial Stock') {
      const product = productById.get(productKey);
      return product ? { ref: product.sku, at: product.get('createdAt') as Date } : 'missing';
    }

    return null; // adjustments and edits have no source document
  }

  let aligned = 0;
  let byADay = 0;
  let orphaned = 0;
  let noSource = 0;
  const examples: string[] = [];

  for (const row of history) {
    const productKey = String(row.product);
    const source = sourceDate(row.reason, productKey);

    if (source === null) { noSource++; continue; }
    if (source === 'missing') { orphaned++; continue; }
    if (!source.at) { orphaned++; continue; }

    const current = row.get('createdAt') as Date;
    const drift = current.getTime() - source.at.getTime();
    if (drift === 0) continue;

    aligned++;
    if (Math.abs(drift) >= DAY) {
      byADay++;
      if (examples.length < 15) {
        const sku = productById.get(productKey)?.sku ?? '?';
        examples.push(
          `    ${sku.padEnd(9)} ${source.ref.padEnd(14)} ${current.toISOString().slice(0, 10)} -> ` +
            `${source.at.toISOString().slice(0, 10)}  (${Math.round(drift / DAY)}d)`
        );
      }
    }

    if (!dryRun) {
      // Straight to the driver: the schema keeps its own timestamps, and a
      // mongoose update quietly drops an explicit createdAt rather than
      // writing it.
      await StockHistory.collection.updateOne(
        { _id: row._id },
        { $set: { createdAt: source.at, updatedAt: source.at } }
      );
    }
  }

  console.log(`\n${label}: ${history.length} movements`);
  console.log(`  ${dryRun ? 'would re-date' : 're-dated'} ${aligned}, of which ${byADay} were out by a day or more`);
  if (examples.length > 0) {
    console.log('\n  the ones that moved a day or more:');
    examples.forEach((line) => console.log(line));
    if (byADay > examples.length) console.log(`    ... and ${byADay - examples.length} more`);
  }
  console.log(`\n  ${noSource} have no source document by design (manual adjustments, edits)`);
  if (orphaned > 0) {
    console.log(`  ${orphaned} reference a document that no longer exists — left as they are`);
  }
}

async function main(): Promise<void> {
  const { dryRun, tenant } = parseArgs(process.argv.slice(2));

  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set');
  await mongoose.connect(process.env.MONGODB_URI);

  try {
    await (tenant
      ? backfillTenant(mongoose.connection.useDb(tenant, { useCache: true }), tenant, dryRun)
      : backfillTenant(mongoose.connection, mongoose.connection.name, dryRun));
  } finally {
    await mongoose.disconnect();
  }

  console.log(dryRun ? '\nDry run complete.' : '\nBackfill complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
