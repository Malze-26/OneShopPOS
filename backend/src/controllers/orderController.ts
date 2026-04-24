import { Response } from 'express';
import { AuthRequest } from '../types';
import { TransactionStatus } from '../models/Transaction';

type OrderStatus   = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

function mapTxnStatus(s: TransactionStatus): { status: OrderStatus; paymentStatus: PaymentStatus } {
  switch (s) {
    case 'success':  return { status: 'delivered', paymentStatus: 'paid' };
    case 'pending':  return { status: 'pending',   paymentStatus: 'pending' };
    case 'failed':   return { status: 'cancelled', paymentStatus: 'failed' };
    case 'refunded': return { status: 'refunded',  paymentStatus: 'refunded' };
    case 'voided':   return { status: 'cancelled', paymentStatus: 'paid' };
    default:         return { status: 'pending',   paymentStatus: 'pending' };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function txnToOrder(txn: any) {
  const { status, paymentStatus } = mapTxnStatus(txn.status as TransactionStatus);
  return {
    _id:           txn._id,
    orderId:       txn.txnId,
    source:        'physical',
    customerName:  txn.customer,
    items:         [],
    subtotal:      txn.amount,
    discount:      0,
    total:         txn.amount,
    status,
    paymentMethod: txn.paymentMethod,
    paymentStatus,
    createdAt:     txn.createdAt,
    createdBy:     txn.createdBy,
  };
}

// GET /api/orders
export async function getOrders(req: AuthRequest, res: Response): Promise<void> {
  const { Transaction } = req.models!;
  const { status, search, page = '1', limit = '20' } = req.query as Record<string, string>;

  const filter: Record<string, unknown> = {};

  if (status) {
    const txnStatusMap: Record<string, string | string[]> = {
      delivered:  'success',
      pending:    'pending',
      cancelled:  ['voided', 'failed'],
      refunded:   'refunded',
    };
    const mapped = txnStatusMap[status];
    if (mapped) filter.status = Array.isArray(mapped) ? { $in: mapped } : mapped;
  }

  if (search) filter.customer = { $regex: search, $options: 'i' };

  const skip  = (parseInt(page) - 1) * parseInt(limit);
  const [txns, total] = await Promise.all([
    Transaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).populate('createdBy', 'name'),
    Transaction.countDocuments(filter),
  ]);

  res.json({ data: txns.map(txnToOrder), total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
}

// GET /api/orders/stats
export async function getOrderStats(req: AuthRequest, res: Response): Promise<void> {
  const { Transaction } = req.models!;

  const [totals] = await Transaction.aggregate([
    {
      $group: {
        _id:     null,
        total:   { $sum: 1 },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        revenue: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, '$amount', 0] } },
      },
    },
  ]);

  res.json({
    data: totals
      ? { total: totals.total, physical: totals.total, online: 0, pending: totals.pending, revenue: totals.revenue }
      : { total: 0, physical: 0, online: 0, pending: 0, revenue: 0 },
  });
}

// GET /api/orders/:id
export async function getOrder(req: AuthRequest, res: Response): Promise<void> {
  const { Transaction } = req.models!;
  const txn = await Transaction.findById(req.params.id).populate('createdBy', 'name');
  if (!txn) { res.status(404).json({ message: 'Order not found' }); return; }
  res.json({ data: txnToOrder(txn) });
}

// POST /api/orders — not used; POS writes via POST /api/transactions
export async function createOrder(_req: AuthRequest, res: Response): Promise<void> {
  res.status(501).json({ message: 'Create orders via POST /api/transactions' });
}

// PATCH /api/orders/:id/status
export async function updateOrderStatus(req: AuthRequest, res: Response): Promise<void> {
  const { Transaction } = req.models!;
  const { status } = req.body as { status: string };

  const txn = await Transaction.findById(req.params.id);
  if (!txn) { res.status(404).json({ message: 'Order not found' }); return; }

  const statusMap: Record<string, TransactionStatus> = {
    refunded:  'refunded',
    cancelled: 'voided',
    delivered: 'success',
    pending:   'pending',
  };

  const txnStatus = statusMap[status];
  if (!txnStatus) { res.status(400).json({ message: `Status '${status}' is not supported` }); return; }

  txn.status = txnStatus;
  await txn.save();

  res.json({ data: txnToOrder(txn) });
}
