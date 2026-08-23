/**
 * Backfill script — writes the missing "Stock In" movements behind every GRN.
 *
 * Receiving goods through the API records two things: the note itself, and a
 * stock movement per line so the product's history shows where the units came
 * from. Notes raised outside that flow — the opening-stock balances — have no
 * movements, so most of the catalogue shows stock on the shelf and nothing in
 * its history explaining how it got there.
 *
 * This walks every GRN and adds the `add` movement each line is missing, dated
 * to the day the note records the goods as supplied rather than to today, so
 * the product's history reads in the order things actually happened.
 *
 * Stock levels are never touched: the units are already counted in
 * `product.stock`, and stock history is a log, not the source of the total.
 *
 *   npm run backfill:stock-history -- --dry-run       # report, change nothing
 *   npm run backfill:stock-history -- --tenant oneshop_open_door
 *
 * Re-running is safe: a line that already has its movement is skipped.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { getModels } from './db/tenantModels';
import { SYSTEM_ACTOR } from './constants';

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

/** The wording the receiving flow already uses, so old and new rows read alike. */
function movementReason(grnNumber: string, supplier: string): string {
  return `GRN: ${grnNumber} — ${supplier}`;
}

async function backfillTenant(conn: mongoose.Connection, label: string, dryRun: boolean): Promise<void> {
  const { GRN, Product, StockHistory } = getModels(conn);

  const [grns, history, productCount] = await Promise.all([
    GRN.find({}).sort({ grnNumber: 1 }),
    StockHistory.find({}),
    Product.countDocuments({}),
  ]);

  if (grns.length === 0) {
    console.log(`\n${label}: no GRNs, nothing to do.`);
    return;
  }

  // A movement already exists for a line when some row names that GRN and that
  // product — matching on the GRN number rather than the whole reason string so
  // a supplier renamed since the delivery does not orphan its own history.
  const existing = new Set<string>();
  for (const row of history) {
    const match = /GRN-\d{4}-\d+/.exec(row.reason ?? '');
    if (match) existing.add(`${match[0]}|${String(row.product)}`);
  }

  console.log(`\n${label}: ${grns.length} GRNs, ${history.length} stock movements on record`);

  const pending: Array<Record<string, unknown>> = [];
  let alreadyThere = 0;

  for (const grn of grns) {
    const receivedAt = grn.get('createdAt') as Date;
    let added = 0;

    for (const item of grn.items) {
      if (existing.has(`${grn.grnNumber}|${String(item.product)}`)) {
        alreadyThere++;
        continue;
      }

      pending.push({
        product: item.product,
        type: 'add',
        quantity: item.quantityReceived,
        reason: movementReason(grn.grnNumber, grn.supplier),
        by: grn.receivedBy || SYSTEM_ACTOR,
        storeId: grn.storeId,
        // Dated to the delivery, not to the moment this script ran.
        createdAt: receivedAt,
        updatedAt: receivedAt,
      });
      added++;
    }

    if (added > 0) {
      console.log(
        `  + ${grn.grnNumber}  ${grn.supplier.padEnd(30)} ${String(added).padStart(3)} movements  ` +
          `${receivedAt.toISOString().slice(0, 10)}`
      );
    }
  }

  console.log(`\n  ${alreadyThere} lines already had their movement`);
  console.log(`  ${dryRun ? 'would write' : 'writing'} ${pending.length} new "Stock In" movements`);

  if (!dryRun && pending.length > 0) {
    await StockHistory.insertMany(pending);
  }

  // Report the coverage this was really about.
  const after = dryRun
    ? new Set([
        ...history.filter((h) => h.type === 'add').map((h) => String(h.product)),
        ...pending.map((p) => String(p.product)),
      ])
    : new Set(
        (await StockHistory.find({ type: 'add' }).select('product').lean()).map((h) => String(h.product))
      );

  console.log(`\n  products with a "Stock In" movement: ${after.size} / ${productCount}`);
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
