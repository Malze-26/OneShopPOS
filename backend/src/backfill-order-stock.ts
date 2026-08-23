/**
 * Backfill script — despatches the e-com orders that were never taken out of stock.
 *
 * A manager can push an order straight to 'delivered' through the status
 * override, and until `releaseOrderStock` existed that path moved no inventory
 * at all: the goods went to the customer, the shelf count did not change, and
 * nothing was written to stock history. Only orders that happened to travel
 * through the sync job were ever deducted.
 *
 * This finishes the job for those orders — one "Stock Out" movement per line,
 * the stock reduced by the same amount, and the order flagged `stockReleased`
 * so neither this script nor the application can take those units twice.
 *
 * Cancelled and refunded orders are skipped: nothing left the shelf for them.
 *
 *   npm run backfill:order-stock -- --dry-run       # report, change nothing
 *   npm run backfill:order-stock -- --tenant oneshop_open_door
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { getModels } from './db/tenantModels';

/** Orders in these states never despatched anything. */
const NON_CONSUMING_STATUSES = ['cancelled', 'refunded', 'pending'];

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

async function backfillTenant(conn: mongoose.Connection, label: string, dryRun: boolean): Promise<void> {
  const { Order, Product, StockHistory } = getModels(conn);

  const pending = await Order.find({ stockReleased: { $ne: true } }).sort({ createdAt: 1 });
  const products = await Product.find({});
  const productById = new Map(products.map((p) => [String(p._id), p]));

  const skipped = pending.filter((o) => {
    const status = (o.get('orderStatus') as string) ?? o.status;
    return NON_CONSUMING_STATUSES.includes(status);
  });
  const toRelease = pending.filter((o) => !skipped.includes(o));

  console.log(`\n${label}: ${pending.length} orders not yet released`);
  console.log(`  ${toRelease.length} were despatched, ${skipped.length} cancelled/refunded/pending (nothing left the shelf)`);

  if (toRelease.length === 0) {
    console.log('  nothing to do.');
    return;
  }

  let lines = 0;
  let units = 0;

  for (const order of toRelease) {
    // E-com orders carry fields the schema does not declare (orderItems, user,
    // orderStatus), so the document is read as a plain bag of values here.
    const raw = order.toObject() as unknown as Record<string, unknown>;
    const items = (raw.orderItems || raw.items || []) as Record<string, unknown>[];
    const status = (raw.orderStatus as string) ?? order.status;
    // Dated to the order, not to the moment this script ran, so the movement
    // sits alongside the sale that caused it.
    const placedAt = (order.get('createdAt') as Date) ?? new Date();

    console.log(
      `  + ${order.orderId}  ${String(status).padEnd(11)} ${items.length} line(s)  ${placedAt
        .toISOString()
        .slice(0, 10)}`
    );

    for (const item of items) {
      const productId = String(item.product ?? '');
      const quantity = (item.qty ?? item.quantity ?? 1) as number;
      const product = productById.get(productId);

      if (!product) {
        console.log(`      !! product ${productId} not found, line skipped`);
        continue;
      }

      console.log(
        `      ${product.sku.padEnd(9)} ${product.name.slice(0, 28).padEnd(29)} ` +
          `${product.stock} - ${quantity} -> ${product.stock - quantity}`
      );

      lines++;
      units += quantity;
      if (dryRun) continue;

      await Product.updateOne({ _id: product._id }, { $inc: { stock: -quantity } });
      await StockHistory.create({
        product: product._id,
        type: 'remove',
        quantity,
        reason: `E-com order ${order.orderId}`,
        by: String(raw.createdBy ?? raw.user ?? 'System'),
        storeId: order.storeId,
        createdAt: placedAt,
        updatedAt: placedAt,
      });
    }

    // Claimed last: if anything above fails the order stays unreleased and the
    // script can be run again rather than leaving the work half done.
    if (!dryRun) {
      await Order.updateOne({ _id: order._id }, { $set: { stockReleased: true } });
    }
  }

  console.log(`\n  ${dryRun ? 'would write' : 'wrote'} ${lines} "Stock Out" movements, ${units} units off the shelf`);
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
