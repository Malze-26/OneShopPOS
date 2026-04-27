import { Response } from 'express';
import { AuthRequest } from '../types';

type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

// GET /api/orders
export async function getOrders(req: AuthRequest, res: Response): Promise<void> {
  const { Order } = req.models!;
  const { source, status, search, page = '1', limit = '20' } = req.query as Record<string, string>;

  const filter: Record<string, unknown> = {};
  if (source) filter.source = source;
  if (status) filter.status = status;
  if (search) filter.customerName = { $regex: search, $options: 'i' };

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
    Order.countDocuments(filter),
  ]);

  res.json({ data: orders, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
}

// GET /api/orders/stats
export async function getOrderStats(req: AuthRequest, res: Response): Promise<void> {
  const { Order } = req.models!;

  const [totals] = await Order.aggregate([
    {
      $group: {
        _id:      null,
        total:    { $sum: 1 },
        physical: { $sum: { $cond: [{ $eq: ['$source', 'physical'] }, 1, 0] } },
        online:   { $sum: { $cond: [{ $eq: ['$source', 'online'] }, 1, 0] } },
        pending:  { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        revenue:  { $sum: { $cond: [{ $in: ['$status', ['confirmed', 'delivered']] }, '$total', 0] } },
      },
    },
  ]);

  res.json({
    data: totals
      ? { total: totals.total, physical: totals.physical, online: totals.online, pending: totals.pending, revenue: totals.revenue }
      : { total: 0, physical: 0, online: 0, pending: 0, revenue: 0 },
  });
}

// GET /api/orders/:id
export async function getOrder(req: AuthRequest, res: Response): Promise<void> {
  const { Order } = req.models!;
  const order = await Order.findById(req.params.id);
  if (!order) { res.status(404).json({ message: 'Order not found' }); return; }
  res.json({ data: order });
}

// POST /api/orders — creates a new order in pending state
export async function createOrder(req: AuthRequest, res: Response): Promise<void> {
  const { Order } = req.models!;

  const {
    orderId, source, customerName, customerEmail, customerPhone,
    items, subtotal, discount, total, paymentMethod, paymentStatus,
    deliveryAddress, notes,
  } = req.body;

  const order = await Order.create({
    orderId,
    source: source || 'physical',
    customerName,
    customerEmail,
    customerPhone,
    items,
    subtotal,
    discount: discount || 0,
    total,
    status: 'pending',
    paymentMethod,
    paymentStatus: paymentStatus || 'pending',
    deliveryAddress,
    notes,
    storeId: req.user!.storeId || 'STORE-2025-001',
    createdBy: req.user!.id,
  });

  res.status(201).json({ data: order });
}

// PATCH /api/orders/:id/confirm — Manager only; confirms the order and decrements stock
export async function confirmOrder(req: AuthRequest, res: Response): Promise<void> {
  const { Order, Product, StockHistory } = req.models!;

  const order = await Order.findById(req.params.id);
  if (!order) { res.status(404).json({ message: 'Order not found' }); return; }
  if (order.status !== 'pending') {
    res.status(400).json({ message: `Order is already ${order.status}` });
    return;
  }

  for (const item of order.items) {
    await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
    await StockHistory.create({
      product:  item.product,
      type:     'remove',
      quantity: item.quantity,
      reason:   `Order confirmed: ${order.orderId}`,
      by:       req.user!.id,
      storeId:  order.storeId,
    });
  }

  order.status = 'confirmed';
  await order.save();

  res.json({ data: order });
}

// PATCH /api/orders/:id/status
export async function updateOrderStatus(req: AuthRequest, res: Response): Promise<void> {
  const { Order } = req.models!;
  const { status } = req.body as { status: OrderStatus };

  const validStatuses: OrderStatus[] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ message: `Invalid status: ${status}` });
    return;
  }

  const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!order) { res.status(404).json({ message: 'Order not found' }); return; }

  res.json({ data: order });
}
