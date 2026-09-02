import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../types';
import { TenantModels } from '../db/tenantModels';

/**
 * Maps a POS Transaction document → unified order shape.
 *
 * Transaction.status values:
 *   'success' → paymentStatus='paid',   orderStatus='success'  (stock deducted, added to sales)
 *   'voided'  → paymentStatus='voided', orderStatus='cancelled' (stock restocked, removed from sales)
 */
function txnToOrder(txn: Record<string, unknown>) {
  const orderStatus   = (txn.orderStatus ?? txn.status) as string;
  const paymentStatus = txn.paymentStatus
    ? (txn.paymentStatus as string)
    : (txn.status as string) === 'success' ? 'paid' : 'voided';

  return {
    _id:             txn._id,
    orderId:         txn.txnId,
    source:          'physical' as const,
    customerName:    txn.customer,
    customerEmail:   undefined,
    customerPhone:   undefined,
    items:           txn.items ?? [],
    subtotal:        txn.amount,
    discount:        (txn.discount as number) ?? 0,
    total:           (txn.total as number) ?? txn.amount,
    status:          orderStatus,
    orderStatus,
    paymentMethod:   txn.paymentMethod,
    paymentStatus,
    deliveryAddress: undefined,
    notes:           undefined,
    createdAt:       txn.createdAt,
    updatedAt:       txn.updatedAt,
    _sourceType:     'transaction' as const,
  };
}

/** Order states in which the goods have left the shelf. */
const STOCK_CONSUMING_STATUSES = ['processing', 'shipped', 'delivered', 'success'];

/**
 * Takes an order's items out of stock exactly once, leaving a Stock Out
 * movement behind each line.
 *
 * An order can reach a fulfilled state by more than one route — the sync job,
 * a manager overriding the status, confirmation on delivery — and before this
 * existed only the sync route moved stock, so an order pushed straight to
 * 'delivered' was despatched without ever leaving the inventory.
 *
 * The claim on `stockReleased` is atomic, so concurrent callers cannot both
 * take the same units.
 */
async function releaseOrderStock(
  models: TenantModels,
  orderDoc: Record<string, unknown>,
  actor: string
): Promise<boolean> {
  const { Order, Product, StockHistory } = models;
  const _id = orderDoc._id as mongoose.Types.ObjectId;

  const claimed = await Order.collection.findOneAndUpdate(
    { _id, stockReleased: { $ne: true } },
    { $set: { stockReleased: true } }
  );
  if (!claimed) return false;

  const orderId = (orderDoc.orderId as string) ?? String(_id);
  const items = (orderDoc.orderItems || orderDoc.items || []) as Record<string, unknown>[];

  for (const item of items) {
    const productId = item.product as mongoose.Types.ObjectId | string | undefined;
    const quantity = (item.qty ?? item.quantity ?? 1) as number;
    if (!productId) continue;

    await Product.findByIdAndUpdate(productId, { $inc: { stock: -quantity } });
    await StockHistory.create({
      product: productId,
      type: 'remove',
      quantity,
      reason: `E-com order ${orderId}`,
      by: actor,
      storeId: (orderDoc.storeId as string) ?? '',
    });
  }

  return true;
}

/**
 * Puts a cancelled order's items back on the shelf, leaving a Stock In
 * movement behind each line — the mirror of releaseOrderStock.
 *
 * A COD order takes its stock out the moment it reaches 'processing', long
 * before delivery is confirmed, so a cancellation after that point (a failed
 * delivery, a customer refusing at the door) leaves the units deducted with
 * nothing ever putting them back. The claim on `stockReleased` is the same
 * atomic flip in reverse, so this only fires once per order and only for one
 * whose stock was actually taken — cancelling before release is already a
 * no-op for inventory.
 */
async function restoreOrderStock(
  models: TenantModels,
  orderDoc: Record<string, unknown>,
  actor: string
): Promise<boolean> {
  const { Order, Product, StockHistory } = models;
  const _id = orderDoc._id as mongoose.Types.ObjectId;

  const claimed = await Order.collection.findOneAndUpdate(
    { _id, stockReleased: true },
    { $set: { stockReleased: false } }
  );
  if (!claimed) return false;

  const orderId = (orderDoc.orderId as string) ?? String(_id);
  const items = (orderDoc.orderItems || orderDoc.items || []) as Record<string, unknown>[];

  for (const item of items) {
    const productId = item.product as mongoose.Types.ObjectId | string | undefined;
    const quantity = (item.qty ?? item.quantity ?? 1) as number;
    if (!productId) continue;

    await Product.findByIdAndUpdate(productId, { $inc: { stock: quantity } });
    await StockHistory.create({
      product: productId,
      type: 'add',
      quantity,
      reason: `E-com order ${orderId} cancelled`,
      by: actor,
      storeId: (orderDoc.storeId as string) ?? '',
    });
  }

  return true;
}

/**
 * Detects whether a raw order document is from the e-com website.
 * E-com orders written directly by the website carry an `orderStatus` field.
 */
function isEcomOrder(doc: Record<string, unknown>): boolean {
  return doc.orderStatus !== undefined;
}

/**
 * Normalises a raw Order collection document to the unified shape the frontend expects.
 *
 * E-com orderStatus values: 'processing' | 'cancelled' | 'delivered'
 * E-com paymentStatus values: 'paid' | 'declined' | 'pending'
 */
function normalizeOnlineOrder(doc: Record<string, unknown>) {
  if (!isEcomOrder(doc)) {
    return doc;
  }

  const addr = doc.shippingAddress as Record<string, string> | undefined;
  const addressParts = addr
    ? [addr.street || addr.address, addr.city, addr.province || addr.state].filter(Boolean)
    : [];

  const rawItems = ((doc.orderItems || doc.items || []) as Record<string, unknown>[]);
  let orderStatus   = (doc.orderStatus ?? doc.status ?? 'processing') as string;
  let paymentStatus = (doc.paymentStatus ?? 'pending') as string;
  const payMethod   = ((doc.paymentMethod as string) || '').toLowerCase();

  if (payMethod === 'payhere' && paymentStatus !== 'paid' && paymentStatus !== 'success') {
    paymentStatus = 'failed';
    orderStatus   = 'cancelled';
  } else if (paymentStatus === 'declined') {
    paymentStatus = 'failed';
    orderStatus   = 'cancelled';
  }

  return {
    _id:           doc._id,
    orderId:       doc.orderId,
    source:        'online' as const,
    customerName:  (doc.customerName as string) || addr?.fullName || addr?.name || 'Unknown',
    customerEmail: (doc.email as string) || (doc.customerEmail as string) || addr?.email,
    customerPhone: (doc.phone as string) || (doc.customerPhone as string) || addr?.phone,
    items: rawItems.map(item => {
      const qty   = (item.qty ?? item.quantity ?? 1) as number;
      const price = (item.price ?? item.unitPrice ?? 0) as number;
      return {
        product:     item.product,
        productName: (item.name || item.productName || 'Unknown') as string,
        sku:         (item.sku || '') as string,
        quantity:    qty,
        unitPrice:   price,
        subtotal:    (item.subtotal as number) ?? price * qty,
      };
    }),
    subtotal:        (doc.itemsPrice ?? doc.subtotal ?? 0) as number,
    discount:        (doc.discount as number) ?? 0,
    total:           (doc.totalPrice ?? doc.total ?? 0) as number,
    orderStatus,
    paymentStatus,
    status:          orderStatus,
    paymentMethod:   doc.paymentMethod || 'Cash',
    deliveryAddress: addressParts.length ? addressParts.join(', ') : undefined,
    notes:           (doc.orderNotes ?? doc.notes) as string | undefined,
    createdAt:       doc.createdAt,
    updatedAt:       doc.updatedAt,
    _sourceType:     'ecom' as const,
  };
}

// GET /api/orders — unified view: POS from transactions collection, e-com from orders collection
export async function getOrders(req: AuthRequest, res: Response): Promise<void> {
  const { Order, Transaction } = req.models!;
  const { source, status, search, page = '1', limit = '20' } = req.query as Record<string, string>;

  const pageNum  = parseInt(page);
  const limitNum = parseInt(limit);
  const skip     = (pageNum - 1) * limitNum;

  // ── Physical only: Transaction collection ─────────────────────────────────
  if (source === 'physical') {
    const filter: Record<string, unknown> = {};

    // Map unified orderStatus → Transaction.status
    if (status === 'cancelled') filter.status = 'voided';
    else if (status)            filter.status = status;

    if (search) filter.customer = { $regex: search, $options: 'i' };

    const [txns, total] = await Promise.all([
      Transaction.collection.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).toArray(),
      Transaction.collection.countDocuments(filter),
    ]);
    res.json({ data: txns.map(t => txnToOrder(t as unknown as Record<string, unknown>)), total, page: pageNum, pages: Math.ceil(total / limitNum) });
    return;
  }

  // ── Online only: Orders collection (e-com orders identified by orderStatus field) ───
  if (source === 'online') {
    const filter: Record<string, unknown> = { orderStatus: { $exists: true } };
    if (status) filter.orderStatus = status;
    if (search) {
      filter.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { 'shippingAddress.fullName': { $regex: search, $options: 'i' } },
        { orderId: { $regex: search, $options: 'i' } },
      ];
    }

    const [docs, total] = await Promise.all([
      Order.collection.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).toArray(),
      Order.collection.countDocuments(filter),
    ]);
    res.json({
      data:  docs.map(d => normalizeOnlineOrder(d as unknown as Record<string, unknown>)),
      total, page: pageNum, pages: Math.ceil(total / limitNum),
    });
    return;
  }

  // ── All sources: merge transactions + e-com orders ────────────────────────
  const txnFilter: Record<string, unknown>   = {};
  const orderFilter: Record<string, unknown> = {};

  if (status) {
    // POS: 'cancelled' maps to Transaction.status='voided'
    txnFilter.status        = status === 'cancelled' ? 'voided' : status;
    orderFilter.orderStatus = status;
  }
  if (search) {
    txnFilter.$or = [
      { customer: { $regex: search, $options: 'i' } },
      { txnId: { $regex: search, $options: 'i' } },
      { orderId: { $regex: search, $options: 'i' } },
    ];
    orderFilter.$or = [
      { customerName: { $regex: search, $options: 'i' } },
      { 'shippingAddress.fullName': { $regex: search, $options: 'i' } },
      { orderId: { $regex: search, $options: 'i' } },
    ];
  }

  const [txns, onlineOrders] = await Promise.all([
    Transaction.collection.find(txnFilter).sort({ createdAt: -1 }).toArray(),
    Order.collection.find(orderFilter).sort({ createdAt: -1 }).toArray(),
  ]);

  const merged = [
    ...txns.map(t => txnToOrder(t as unknown as Record<string, unknown>)),
    ...onlineOrders.map(d => normalizeOnlineOrder(d as unknown as Record<string, unknown>)),
  ].sort((a, b) =>
    new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime()
  );

  const total = merged.length;
  res.json({ data: merged.slice(skip, skip + limitNum), total, page: pageNum, pages: Math.ceil(total / limitNum) });
}

// GET /api/orders/stats
export async function getOrderStats(req: AuthRequest, res: Response): Promise<void> {
  const { Order, Transaction } = req.models!;

  const [txnAgg, orderAgg] = await Promise.all([
    // POS: count all transactions; revenue only from status='success' (paymentStatus='paid')
    Transaction.aggregate([
      {
        $group: {
          _id:        null,
          physical:   { $sum: 1 },
          posRevenue: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, '$amount', 0] } },
        },
      },
    ]),
    // E-com: e-com orders have orderStatus field
    Order.aggregate([
      { $match: { orderStatus: { $exists: true } } },
      {
        $group: {
          _id:    null,
          online: { $sum: 1 },
          // Pending = COD orders in 'processing' state awaiting payment confirmation
          pending: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$orderStatus', 'processing'] },
                    { $eq: ['$paymentMethod', 'cash-on-delivery'] },
                  ],
                },
                1, 0,
              ],
            },
          },
          // Revenue = paymentStatus='paid':
          //   payhere+paid: counted when orderStatus becomes 'processing'
          //   COD+paid:     counted when orderStatus becomes 'delivered'
          // Counted at subtotal (items only), not the delivery-inclusive total.
          onlineRevenue: {
            $sum: {
              $cond: [
                { $eq: ['$paymentStatus', 'paid'] },
                { $ifNull: ['$itemsPrice', { $ifNull: ['$subtotal', 0] }] },
                0,
              ],
            },
          },
        },
      },
    ]),
  ]);

  const p = txnAgg[0]   ?? { physical: 0, posRevenue: 0 };
  const o = orderAgg[0] ?? { online: 0, pending: 0, onlineRevenue: 0 };

  res.json({
    data: {
      total:    p.physical + o.online,
      physical: p.physical,
      online:   o.online,
      pending:  o.pending,
      revenue:  p.posRevenue + o.onlineRevenue,
    },
  });
}

// GET /api/orders/:id
export async function getOrder(req: AuthRequest, res: Response): Promise<void> {
  const { Order } = req.models!;
  const order = await Order.findById(req.params.id).lean();
  if (!order) { res.status(404).json({ message: 'Order not found' }); return; }
  res.json({ data: normalizeOnlineOrder(order as unknown as Record<string, unknown>) });
}

// POST /api/orders
export async function createOrder(req: AuthRequest, res: Response): Promise<void> {
  const { Order, Product, StockHistory } = req.models!;

  const {
    orderId, source, customerName, customerEmail, customerPhone,
    items, subtotal, discount, total, paymentMethod,
    deliveryAddress, notes,
  } = req.body;

  const src    = (source || 'physical') as string;
  const method = (paymentMethod as string) || '';

  const isPOS = src === 'physical';
  const isCOD = method.toLowerCase() === 'cash-on-delivery';

  // POS: immediately success | payhere online: pending until sync | COD online: pending until sync
  const finalStatus        = isPOS ? 'success' : 'pending';
  const finalPaymentStatus = isPOS ? 'paid' : (isCOD ? 'pending' : 'paid');

  const order = await Order.create({
    orderId,
    source: src,
    customerName,
    customerEmail,
    customerPhone,
    items,
    subtotal,
    discount: discount || 0,
    total,
    status:        finalStatus,
    paymentMethod: method,
    paymentStatus: finalPaymentStatus,
    deliveryAddress,
    notes,
    storeId:   req.user!.storeId || 'STORE-2025-001',
    createdBy: req.user!.id,
  });

  // Deduct inventory immediately for physical POS orders only
  if (isPOS && Array.isArray(items) && items.length > 0) {
    for (const item of items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
      await StockHistory.create({
        product:  item.product,
        type:     'remove',
        quantity: item.quantity,
        reason:   `POS Order ${order.orderId}`,
        by:       req.user!.id,
        storeId:  order.storeId,
      });
    }
  }

  res.status(201).json({ data: order });
}

// POST /api/orders/sync — Manager only
// Auto-processes new e-com orders based on paymentMethod + paymentStatus.
// Rules:
//   payhere + paid     → orderStatus='processing', reduce stock (revenue counted via paymentStatus='paid')
//   payhere + declined → orderStatus='cancelled',  no stock change
//   COD     + pending  → orderStatus='processing', reduce stock (no revenue yet; paymentStatus stays 'pending')
// Idempotent: orders already in 'processing'/'cancelled'/'delivered' are skipped.
export async function syncEcomOrders(req: AuthRequest, res: Response): Promise<void> {
  const { Order, Product, StockHistory } = req.models!;

  // Find all e-com orders not yet processed (orderStatus field exists but not in terminal states)
  const unprocessed = await Order.find({
    orderStatus: { $exists: true, $nin: ['processing', 'cancelled', 'delivered'] },
  }).lean() as Record<string, unknown>[];

  let processed = 0;

  for (const order of unprocessed) {
    const payMethod = ((order.paymentMethod as string) || '').toLowerCase();
    const payStatus = ((order.paymentStatus as string) || '').toLowerCase();

    let newOrderStatus: string | null = null;
    let newPaymentStatus: string | null = null;
    let shouldReduceStock = false;

    if (payMethod === 'payhere') {
      if (payStatus === 'paid') {
        // Payhere + paid → processing: revenue counted immediately (paymentStatus='paid')
        // Stock is NOT deducted yet — it is deducted when admin marks the order delivered.
        newOrderStatus    = 'processing';
        shouldReduceStock = false;
      } else if (payStatus === 'declined') {
        // Payhere + declined → cancelled + failed: no inventory change
        newOrderStatus    = 'cancelled';
        newPaymentStatus  = 'failed';
      }
    } else if (payMethod === 'cash-on-delivery' && payStatus === 'pending') {
      // COD + pending → processing: stock deducted now; revenue only when delivered
      newOrderStatus    = 'processing';
      shouldReduceStock = true;
    }

    if (!newOrderStatus) continue;

    // Build the fields to set atomically
    const setFields: Record<string, string> = {
      orderStatus: newOrderStatus,
      status:      newOrderStatus,
    };
    if (newPaymentStatus) setFields.paymentStatus = newPaymentStatus;

    // Atomic claim — prevent double-processing under concurrent calls
    const claimed = await Order.collection.findOneAndUpdate(
      {
        _id:         (order as { _id: mongoose.Types.ObjectId })._id,
        orderStatus: { $nin: ['processing', 'cancelled', 'delivered'] },
      },
      { $set: setFields }
    );
    if (!claimed) continue;

    if (shouldReduceStock) {
      await releaseOrderStock(req.models!, order as Record<string, unknown>, req.user!.id);
    }

    processed++;
  }

  res.json({ data: { processed } });
}

// PATCH /api/orders/:id/confirm
// Marks a COD or PayHere e-com order in 'processing' as delivered.
//
// COD:     paymentStatus → 'paid' (paid on delivery), stock was already deducted at processing.
// PayHere: paymentStatus stays 'paid' (already paid at checkout), stock deducted NOW on delivery.
export async function confirmOrder(req: AuthRequest, res: Response): Promise<void> {
  const { Order } = req.models!;

  const raw = await Order.findById(req.params.id).lean() as Record<string, unknown> | null;
  if (!raw) { res.status(404).json({ message: 'Order not found' }); return; }

  const ecom        = isEcomOrder(raw);
  const payMethod   = ((raw.paymentMethod as string) || '').toLowerCase();
  const orderStatus = (raw.orderStatus as string) || (raw.status as string) || '';

  if (!ecom || !['cash-on-delivery', 'payhere'].includes(payMethod)) {
    res.status(400).json({ message: 'Only COD or PayHere e-com orders can be confirmed through this endpoint.' });
    return;
  }

  if (orderStatus !== 'processing') {
    res.status(400).json({ message: `Order is already ${orderStatus}.` });
    return;
  }

  const updateFields: Record<string, unknown> = {
    // COD: becomes paid now. PayHere: already paid at checkout, keep it.
    paymentStatus: payMethod === 'cash-on-delivery' ? 'paid' : (raw.paymentStatus ?? 'paid'),
    orderStatus:   'delivered',
    status:        'delivered',
    confirmedBy:   new mongoose.Types.ObjectId(req.user!.id),
  };

  await Order.collection.updateOne(
    { _id: (raw as { _id: mongoose.Types.ObjectId })._id },
    { $set: updateFields }
  );

  // PayHere: stock was held at 'processing' — deduct it now on delivery.
  // COD: stock was already deducted when the order moved to 'processing'.
  if (payMethod === 'payhere') {
    await releaseOrderStock(req.models!, { ...raw, ...updateFields } as Record<string, unknown>, req.user!.id);
  }

  res.json({ data: normalizeOnlineOrder({ ...raw, ...updateFields }) });
}

// PATCH /api/orders/:id/status — Manager only (admin override)
export async function updateOrderStatus(req: AuthRequest, res: Response): Promise<void> {
  const { Order } = req.models!;

  const VALID_STATUSES = ['processing', 'cancelled', 'delivered'];
  const { status } = req.body as { status: string };

  if (!VALID_STATUSES.includes(status)) {
    res.status(400).json({ message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
    return;
  }

  await Order.collection.updateOne(
    { _id: new mongoose.Types.ObjectId(req.params.id as string) },
    { $set: { status, orderStatus: status } }
  );

  const updated = await Order.findById(req.params.id).lean();
  if (!updated) { res.status(404).json({ message: 'Order not found' }); return; }

  if (status === 'cancelled') {
    // A COD order already took its stock out on the way to 'processing' —
    // cancelling it has to put those units back, not just relabel the order.
    await restoreOrderStock(req.models!, updated as unknown as Record<string, unknown>, req.user!.id);
  } else if (STOCK_CONSUMING_STATUSES.includes(status)) {
    // Overriding an order into a fulfilled state despatches the goods, so the
    // stock has to leave here as well — the sync job may never see this order.
    await releaseOrderStock(req.models!, updated as unknown as Record<string, unknown>, req.user!.id);
  }

  res.json({ data: normalizeOnlineOrder(updated as unknown as Record<string, unknown>) });
}
