import { Response } from 'express';
import { AuthRequest } from '../types';
import { Order } from '../models/Order';

// GET /api/orders
export async function getOrders(req: AuthRequest, res: Response): Promise<void> {
  const { storeId } = req.user!;
  const { source, status, paymentStatus, search, page = '1', limit = '20' } = req.query as Record<string, string>;

  const filter: Record<string, unknown> = { storeId };
  if (source)        filter.source        = source;
  if (status)        filter.status        = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (search)        filter.customerName  = { $regex: search, $options: 'i' };

  const skip  = (parseInt(page) - 1) * parseInt(limit);
  const total = await Order.countDocuments(filter);
  const orders = await Order.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('createdBy', 'name');

  res.json({ data: orders, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
}

// GET /api/orders/stats
export async function getOrderStats(req: AuthRequest, res: Response): Promise<void> {
  const { storeId } = req.user!;

  const [totals] = await Order.aggregate([
    { $match: { storeId } },
    {
      $group: {
        _id: null,
        total:    { $sum: 1 },
        physical: { $sum: { $cond: [{ $eq: ['$source', 'physical'] }, 1, 0] } },
        online:   { $sum: { $cond: [{ $eq: ['$source', 'online']   }, 1, 0] } },
        pending:  { $sum: { $cond: [{ $eq: ['$status', 'pending']  }, 1, 0] } },
        revenue:  { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$total', 0] } },
      },
    },
  ]);

  res.json({ data: totals ?? { total: 0, physical: 0, online: 0, pending: 0, revenue: 0 } });
}

// GET /api/orders/:id
export async function getOrder(req: AuthRequest, res: Response): Promise<void> {
  const { storeId } = req.user!;
  const order = await Order.findOne({ _id: req.params.id, storeId }).populate('createdBy', 'name');
  if (!order) { res.status(404).json({ message: 'Order not found' }); return; }
  res.json({ data: order });
}

// POST /api/orders
export async function createOrder(req: AuthRequest, res: Response): Promise<void> {
  const { storeId, id: userId } = req.user!;

  const { source, customerName, customerEmail, customerPhone, items, discount = 0, paymentMethod, deliveryAddress, notes } = req.body;

  if (!items?.length) { res.status(400).json({ message: 'At least one item is required' }); return; }

  const subtotal = items.reduce((sum: number, i: { subtotal: number }) => sum + i.subtotal, 0);
  const total    = subtotal - discount;

  const orderId = `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const order = await Order.create({
    orderId, source, customerName, customerEmail, customerPhone,
    items, subtotal, discount, total,
    paymentMethod,
    paymentStatus: paymentMethod === 'Cash' || paymentMethod === 'Card' ? 'paid' : 'pending',
    status: source === 'physical' ? 'delivered' : 'pending',
    deliveryAddress, notes,
    storeId, createdBy: userId,
  });

  res.status(201).json({ data: order });
}

// PATCH /api/orders/:id/status
export async function updateOrderStatus(req: AuthRequest, res: Response): Promise<void> {
  const { storeId } = req.user!;
  const { status, paymentStatus } = req.body;

  const order = await Order.findOne({ _id: req.params.id, storeId });
  if (!order) { res.status(404).json({ message: 'Order not found' }); return; }

  if (status)        order.status        = status;
  if (paymentStatus) order.paymentStatus = paymentStatus;
  await order.save();

  res.json({ data: order });
}
