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
 * It also clears the fabricated "stock count adjustment" rows an earlier
 * version of this script invented to force the books to balance. Writing a
 * movement that never happened is not reconciliation — it hides the difference
 * instead of showing it.
 *
 *   npm run reconcile:stock -- --dry-run              # report, change nothing
 *   npm run reconcile:stock -- --tenant oneshop_open_door
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { getModels } from './db/tenantModels';

/**
 * Reasons written by an earlier version of this script to paper over the
 * difference. They record no real movement, so they are removed rather than
 * counted.
 */
const FABRICATED_REASONS = ['Stock count adjustment', 'Opening stock adjustment'];

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
  const { Product, StockHistory } = getModels(conn);

  const [products, history] = await Promise.all([Product.find({}), StockHistory.find({})]);

  const fabricated = history.filter((row) => FABRICATED_REASONS.includes(row.reason));
  const real = history.filter((row) => !FABRICATED_REASONS.includes(row.reason));

  // What the movements add up to, per product.
  const ledger = new Map<string, number>();
  for (const row of real) {
    const key = String(row.product);
    ledger.set(key, (ledger.get(key) ?? 0) + (row.type === 'add' ? row.quantity : -row.quantity));
  }

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

  const corrections = products
    .map((product) => ({ product, from: product.stock, to: ledger.get(String(product._id)) ?? 0 }))
    .filter((c) => c.from !== c.to);

  console.log(`\n  ${products.length - corrections.length} products already match their movements`);
  console.log(`  ${corrections.length} ${dryRun ? 'would have' : 'have'} their stock recomputed\n`);

  if (corrections.length > 0) {
    console.log('    sku        name                            stock -> from movements');
    for (const { product, from, to } of corrections) {
      console.log(
        `    ${product.sku.padEnd(10)} ${product.name.slice(0, 29).padEnd(30)} ` +
          `${String(from).padStart(5)} -> ${String(to).padStart(5)}`
      );
      if (!dryRun) {
        await Product.updateOne({ _id: product._id }, { $set: { stock: to } });
      }
    }
  }

  // A negative total means more was issued than was ever received — the
  // movements themselves are incomplete, and no amount of recomputing fixes
  // that, so it is reported rather than clamped away.
  const negative = [...ledger].filter(([, total]) => total < 0);
  if (negative.length > 0) {
    const byId = new Map(products.map((p) => [String(p._id), p]));
    console.log(`\n  !! ${negative.length} product(s) have more issued than received:`);
    for (const [key, total] of negative) {
      console.log(`     ${byId.get(key)?.sku ?? key}  ${total}`);
    }
  }
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
