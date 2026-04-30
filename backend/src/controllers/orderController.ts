import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../types';

type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'cancelled' | 'success';

/** Maps a Transaction document → unified order shape (for POS / physical orders). */
function txnToOrder(txn: Record<string, unknown>) {
  // Derive orderStatus: prefer explicit field, fallback to status
  const orderStatus = (txn.orderStatus ?? txn.status) as string;

  // Derive paymentStatus: prefer explicit field, fallback mapping from status
  const paymentStatus = txn.paymentStatus
    ? (txn.paymentStatus as string)
    : (txn.status as string) === 'success'
    ? 'paid'
    : 'voided';

  return {
    _id:             txn._id,
    orderId:         txn.txnId,
    source:          'physical' as const,
    customerName:    txn.customer,
    customerEmail:   undefined,
    customerPhone:   undefined,
    items:           txn.items ?? [],
    subtotal:        txn.amount,
    discount:        0,
    total:           txn.amount,
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

/**
 * Detects whether a raw order document is from e com website vs a POS order
 * E-com orders have an `orderStatus` field; POS orders have a `source` field.
 */
function isEcomOrder(doc: Record<string, unknown>): boolean {
  return doc.orderStatus !== undefined;
}

/**
 * Normalises a raw Order collection document to the unified shape the frontend expects.
 * Handles both POS online orders (source='online') and e-com orders (no source field).
 */
function normalizeOnlineOrder(doc: Record<string, unknown>) {
  if (!isEcomOrder(doc)) {
    // POS online order — already has the correct field names
    return doc;
  }

  // E-com order — remap fields to unified shape
  const addr = doc.shippingAddress as Record<string, string> | undefined;
  const addressParts = addr
    ? [addr.street || addr.address, addr.city, addr.province || addr.state].filter(Boolean)
    : [];

  const rawItems = ((doc.orderItems || doc.items || []) as Record<string, unknown>[]);

  return {
    _id:          doc._id,
    orderId:      doc.orderId,
    source:       'online' as const,
    customerName: (doc.customerName as string) || addr?.name || 'Unknown',
    customerEmail: (doc.email as string) || addr?.email,
    customerPhone: (doc.phone as string) || addr?.phone,
    items: rawItems.map(item => {
      const qty   = (item.qty ?? item.quantity ?? 1) as number;
      const price = (item.price ?? item.unitPrice ?? 0) as number;
      return {
        product:     item.product,
        productName: (item.name || item.productName || 'Unknown') as string,
        sku:         (item.sku || '') as string,
        quantity:    qty,
        unitPrice:   price,
        subtotal:    price * qty,
      };
    }),
    subtotal:       (doc.itemsPrice ?? doc.subtotal ?? 0) as number,
    discount:       0,
    total:          (doc.totalPrice ?? doc.total ?? 0) as number,
    status:         (doc.orderStatus ?? doc.status ?? 'pending') as string,
    paymentMethod:  doc.paymentMethod,
    paymentStatus:  doc.paymentStatus,
    deliveryAddress: addressParts.length ? addressParts.join(', ') : undefined,
    notes:          (doc.orderNotes ?? doc.notes) as string | undefined,
    createdAt:      doc.createdAt,
    updatedAt:      doc.updatedAt,
    _sourceType:    'ecom' as const,
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
    if (status) filter.status = status;
    if (search) filter.customer = { $regex: search, $options: 'i' };

    const [txns, total] = await Promise.all([
      Transaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      Transaction.countDocuments(filter),
    ]);
    res.json({ data: txns.map(t => txnToOrder(t as unknown as Record<string, unknown>)), total, page: pageNum, pages: Math.ceil(total / limitNum) });
    return;
  }

  // ── Online only: Order collection (e-com + POS online) ────────────────────
  // Filter: everything that is NOT explicitly source='physical'.
  // This catches: e-com orders (no source field) + POS online orders (source='online').
  if (source === 'online') {
    const filter: Record<string, unknown> = { source: { $ne: 'physical' } };
    if (status) filter.status = status;
    if (search) filter.customerName = { $regex: search, $options: 'i' };

    const [docs, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      Order.countDocuments(filter),
    ]);
    res.json({
      data:  docs.map(d => normalizeOnlineOrder(d as unknown as Record<string, unknown>)),
      total, page: pageNum, pages: Math.ceil(total / limitNum),
    });
    return;
  }

  // ── All sources: merge transactions + online orders ────────────────────────
  const txnFilter: Record<string, unknown>   = {};
  const orderFilter: Record<string, unknown> = { source: { $ne: 'physical' } };

  if (status) {
    txnFilter.status   = status;
    orderFilter.status = status;
  }
  if (search) {
    txnFilter.customer       = { $regex: search, $options: 'i' };
    orderFilter.customerName = { $regex: search, $options: 'i' };
  }

  const [txns, onlineOrders] = await Promise.all([
    Transaction.find(txnFilter).sort({ createdAt: -1 }).lean(),
    Order.find(orderFilter).sort({ createdAt: -1 }).lean(),
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
    Transaction.aggregate([
      {
        $group: {
          _id:        null,
          physical:   { $sum: 1 },
          posRevenue: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, '$amount', 0] } },
        },
      },
    ]),
    Order.aggregate([
      { $match: { source: { $ne: 'physical' } } },
      {
        $group: {
          _id:           null,
          online:        { $sum: 1 },
          // Pending: status='pending' covers both POS online and e-com (e-com also has status field)
          pending:       { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          // Revenue: use totalPrice (e-com) fallback to total (POS online); both 'success' checks
          onlineRevenue: {
            $sum: {
              $cond: [
                { $or: [{ $eq: ['$status', 'success'] }, { $eq: ['$orderStatus', 'success'] }] },
                { $ifNull: ['$totalPrice', { $ifNull: ['$total', 0] }] },
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

  const isPOS        = src === 'physical';
  const isOnlinePaid = src === 'online' && method.toLowerCase() !== 'cash-on-delivery';

  // Online card orders: status stays 'pending' until syncEcomOrders processes them.
  // Physical POS orders: immediately complete.
  const finalStatus        = isPOS ? 'success' : 'pending';
  const finalPaymentStatus = isPOS ? 'paid' : (isOnlinePaid ? 'paid' : 'pending'); //]=
  
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

  // Only deduct inventory immediately for physical POS orders.
  // Online card orders are deducted by syncEcomOrders to avoid double-counting
  // when the e-com website also creates a record with orderStatus in MongoDB.
  if (isPOS && Array.isArray(items) && items.length > 0) {
    for (const item of items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
      await StockHistory.create({
        product:  item.product,
        type:     'remove',
        quantity: item.quantity,
        reason:   `Order ${order.orderId}`,
        by:       req.user!.id,
        storeId:  order.storeId,
      });
    }
  }

  res.status(201).json({ data: order });
}

// PATCH /api/orders/:id/confirm — Manager only (COD e-com orders only)
export async function confirmOrder(req: AuthRequest, res: Response): Promise<void> {
  const { Order, Product, StockHistory } = req.models!;

  // Use lean() to get ALL raw fields including e-com-specific ones (orderStatus, orderItems, etc.)
  const raw = await Order.findById(req.params.id).lean() as Record<string, unknown> | null;
  if (!raw) { res.status(404).json({ message: 'Order not found' }); return; }

  const ecom          = isEcomOrder(raw);
  const payMethod     = ((raw.paymentMethod as string) || '').toLowerCase();
  const currentStatus = ecom ? (raw.orderStatus as string) : (raw.status as string);

  // Card/payhere e-com orders are auto-processed via /sync — reject manual confirmation
  if (ecom && payMethod !== 'cash-on-delivery') {
    res.status(400).json({ message: 'This order is auto-processed and does not require manual confirmation.' });
    return;
  }

  if (currentStatus !== 'pending') {
    res.status(400).json({ message: `Order is already ${currentStatus}` });
    return;
  }

  // Items: e-com uses 'orderItems' (with qty/price), POS uses 'items' (with quantity/unitPrice)
  const items = (ecom
    ? ((raw.orderItems || raw.items || []) as Record<string, unknown>[])
    : ((raw.items || []) as Record<string, unknown>[]));

  for (const item of items) {
    const productId = item.product as mongoose.Types.ObjectId | string | undefined;
    const quantity  = (item.qty ?? item.quantity ?? 1) as number;
    if (productId) {
      //await Product.findByIdAndUpdate(productId, { $inc: { stock: -quantity } });
      await StockHistory.create({
        product:  productId,
        type:     'remove',
        quantity: quantity,
        reason:   `Order confirmed: ${raw.orderId}`,
        by:       req.user!.id,
        storeId:  req.user!.storeId,
      });
    }
  }

  // Use collection.updateOne to bypass schema strict mode so we can write
  // both 'status' and 'orderStatus' regardless of the Mongoose schema.
  const updateFields: Record<string, unknown> = {
    status:        'success',
    paymentStatus: 'success',
    confirmedBy:   new mongoose.Types.ObjectId(req.user!.id),
  };
  if (ecom) {
    // Keep e-com's own status field in sync so the website sees the update too
    updateFields.orderStatus = 'success';
  }

  await Order.collection.updateOne(
    { _id: (raw as { _id: mongoose.Types.ObjectId })._id },
    { $set: updateFields }
  );

  res.json({ data: normalizeOnlineOrder({ ...raw, ...updateFields }) });
}

// POST /api/orders/sync — Manager only
// Auto-processes pending card/payhere e-com orders: reduces inventory and marks as success.
// Idempotent — safe to call multiple times (atomic findOneAndUpdate guards against double-processing).
export async function syncEcomOrders(req: AuthRequest, res: Response): Promise<void> {
  const { Order, Product, StockHistory } = req.models!;

  const CARD_METHODS = [
    //'card', 
    'payhere'
  ];

  // Find all unprocessed online card orders — covers two cases:
  //   1. E-com direct orders (website wrote to MongoDB with orderStatus field)
  //   2. POS-API-created online orders (via POST /api/orders, source='online', paymentStatus='paid')
  const unprocessed = await Order.find({
    $or: [
      { orderStatus: { $exists: true } },
      { source: 'online' },
    ],
    paymentMethod: { $in: CARD_METHODS },
    paymentStatus: { $ne: 'success' },
  }).lean() as Record<string, unknown>[];

  let processed = 0;

  for (const order of unprocessed) {
    // Atomic claim — only the first concurrent caller succeeds; others skip this order
    const claimed = await Order.collection.findOneAndUpdate(
      { _id: (order as { _id: mongoose.Types.ObjectId })._id, paymentStatus: { $ne: 'success' } },
      { $set: { paymentStatus: 'success', status: 'success', orderStatus: 'success' } }
    );
    if (!claimed) continue;

    const items = ((order.orderItems || order.items || []) as Record<string, unknown>[]);
    for (const item of items) {
      const productId = item.product as mongoose.Types.ObjectId | string | undefined;
      const quantity  = (item.qty ?? item.quantity ?? 1) as number;
      if (productId) {
        //await Product.findByIdAndUpdate(productId, { $inc: { stock: -quantity } });
        await StockHistory.create({
          product:  productId,
          type:     'remove',
          quantity: quantity,
          reason:   `E-com order auto-processed: ${order.orderId as string}`,
          by:       req.user!.id,
          storeId:  req.user!.storeId,
        });
      }
    }
    processed++;
  }

  res.json({ data: { processed } });
}

// PATCH /api/orders/:id/status — Manager only
export async function updateOrderStatus(req: AuthRequest, res: Response): Promise<void> {
  const { Order } = req.models!;
  const { status } = req.body as { status: OrderStatus };

  const validStatuses: OrderStatus[] = ['pending', 'confirmed', 'shipped', 'cancelled', 'success'];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ message: `Invalid status: ${status}` });
    return;
  }

  await Order.collection.updateOne(
    { _id: new mongoose.Types.ObjectId(req.params.id as string) },
    { $set: { status, orderStatus: status } }
  );

  const updated = await Order.findById(req.params.id).lean();
  if (!updated) { res.status(404).json({ message: 'Order not found' }); return; }

  res.json({ data: normalizeOnlineOrder(updated as unknown as Record<string, unknown>) });
}
