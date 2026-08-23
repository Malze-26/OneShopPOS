/**
 * One-off: rebuilds the return note that went missing behind a stock movement.
 *
 * The Open Door shop has a Stock Out of 6 Gardenia White Bread 450g reading
 * "Return RTN-2026-0004: expired", but no return on file to match it. The
 * number was reissued to a later return of tomatoes, so the note that owned it
 * is gone while its movement remains.
 *
 * Only the paperwork is rebuilt. The stock was taken off the shelf when the
 * return was first made — the product is already at zero with its expiry date
 * cleared — so this writes no movement and touches no stock. The orphaned
 * movement is repointed at the number the rebuilt note is issued, since
 * RTN-2026-0004 now belongs to the tomatoes.
 *
 * Dry run by default. Pass --apply to write.
 *
 *   npx tsx src/restore-missing-return.ts            # show the plan
 *   npx tsx src/restore-missing-return.ts --apply    # write it
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { getModels } from './db/tenantModels';
import { RETURN_NUMBER_PAD_LENGTH } from './constants';
import { ISupplierReturn } from './models/SupplierReturn';

const DB = 'oneshop_open_door';
const SKU = 'BAK-001';
const QUANTITY = 6;
const ORPHAN_REASON = 'Return RTN-2026-0004: expired';

const apply = process.argv.includes('--apply');

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');

  await mongoose.connect(uri);
  const conn = mongoose.connection.useDb(DB, { useCache: true });
  const { Product, Supplier, SupplierReturn, StockHistory } = getModels(conn);

  const product = await Product.findOne({ sku: SKU });
  if (!product) throw new Error(`Product ${SKU} not found in ${DB}`);

  const supplier = await Supplier.findById(product.supplierId);
  if (!supplier) throw new Error(`Supplier ${product.supplierId} not found in ${DB}`);

  // The movement is the record of what actually happened; everything below is
  // derived from it, so refuse to guess if it is not exactly where expected.
  const movements = await StockHistory.find({
    product: product._id,
    type: 'remove',
    quantity: QUANTITY,
    reason: ORPHAN_REASON,
  });
  if (movements.length !== 1) {
    throw new Error(`Expected exactly 1 movement reading "${ORPHAN_REASON}" for ${SKU}, found ${movements.length}`);
  }
  const movement = movements[0];

  const already = await SupplierReturn.findOne({ 'items.sku': SKU });
  if (already) {
    console.log(`${SKU} is already on return ${already.returnNumber} — nothing to do.`);
    await mongoose.disconnect();
    return;
  }

  const returnNumber = await nextReturnNumber(SupplierReturn);
  const when = movement.get('createdAt') as Date;
  const lossValue = QUANTITY * product.costPrice;
  const retailValue = QUANTITY * product.sellingPrice;

  console.log(`Tenant     ${DB}`);
  console.log(`Product    ${product.name} [${SKU}] — stock ${product.stock} (already taken off the shelf)`);
  console.log(`Supplier   ${supplier.name} (${supplier._id})`);
  console.log(`Movement   ${movement._id} — "${movement.reason}" by ${movement.by} on ${when.toISOString().slice(0, 10)}`);
  console.log('');
  console.log(`Rebuild as ${returnNumber}: ${QUANTITY} x ${product.name}, expired, dated ${when.toISOString()}`);
  console.log(`           loss ${lossValue}, forgone retail ${retailValue}, returned by ${movement.by}`);
  console.log(`Repoint    movement reason -> "Return ${returnNumber}: expired — ${supplier.name}"`);
  console.log('           no stock change, no new movement');

  if (!apply) {
    console.log('\nDry run — pass --apply to write.');
    await mongoose.disconnect();
    return;
  }

  const supplierReturn = await SupplierReturn.create({
    returnNumber,
    supplierId: supplier._id,
    supplier: supplier.name,
    referenceNumber: '',
    notes: 'Return note rebuilt from its stock movement — the original was lost and its number reissued.',
    items: [{
      product: product._id,
      productName: product.name,
      sku: product.sku,
      quantity: QUANTITY,
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      reason: 'expired',
      // The batch left the shelf and its expiry date was cleared with it, so
      // the date it carried is no longer recoverable.
      expiryDate: null,
      lossValue,
      retailValue,
    }],
    totalItems: QUANTITY,
    totalLossValue: lossValue,
    totalRetailValue: retailValue,
    returnedBy: movement.by,
    storeId: movement.storeId,
  });

  // timestamps:true stamps insert time, so the real date is set afterwards —
  // the note has to sit beside its movement in the history, not at today's top.
  await conn.collection('supplierreturns').updateOne(
    { _id: supplierReturn._id as never },
    { $set: { createdAt: when, updatedAt: when } }
  );

  await StockHistory.findByIdAndUpdate(movement._id, {
    $set: { reason: `Return ${returnNumber}: expired — ${supplier.name}` },
  });

  console.log(`\nWrote ${returnNumber} dated ${when.toISOString()}.`);
  console.log(`Movement ${movement._id} now reads "Return ${returnNumber}: expired — ${supplier.name}".`);
  console.log(`${product.name} left at stock ${product.stock} — untouched.`);

  await mongoose.disconnect();
}

/** Next number in the yearly series, matching how the controller issues them. */
async function nextReturnNumber(model: mongoose.Model<ISupplierReturn>): Promise<string> {
  const prefix = `RTN-${new Date().getFullYear()}-`;
  const last = await model
    .findOne({ returnNumber: { $regex: `^${prefix}` } })
    .sort({ returnNumber: -1 })
    .lean<{ returnNumber: string } | null>();
  const next = last ? parseInt(last.returnNumber.replace(prefix, ''), 10) + 1 : 1;
  return `${prefix}${String(next).padStart(RETURN_NUMBER_PAD_LENGTH, '0')}`;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
