import { Response } from 'express';
import { AuthRequest } from '../types';

// GET /api/alerts/low-stock
export async function getLowStockAlerts(req: AuthRequest, res: Response): Promise<void> {
  const { Product } = req.models!;

  const products = await Product.aggregate([
    {
      $match: {
        $expr: { $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', '$lowStockThreshold'] }] },
      },
    },
    { $sort: { stock: 1 } },
    { $limit: 50 },
    {
      $lookup: {
        from: 'categories',
        localField: 'category',
        foreignField: '_id',
        as: 'categoryDoc',
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        sku: 1,
        stock: 1,
        lowStockThreshold: 1,
        category: { $ifNull: [{ $arrayElemAt: ['$categoryDoc.name', 0] }, 'Uncategorized'] },
      },
    },
  ]);

  res.json({ data: products });
}

// GET /api/alerts/out-of-stock
export async function getOutOfStockAlerts(req: AuthRequest, res: Response): Promise<void> {
  const { Product } = req.models!;

  const products = await Product.find({ stock: 0 })
    .select('name sku stock lowStockThreshold category')
    .sort({ updatedAt: -1 })
    .limit(50)
    .lean();

  res.json({ data: products });
}

// GET /api/alerts/no-sales  — products not sold in the last N days
export async function getNoSalesAlerts(req: AuthRequest, res: Response): Promise<void> {
  const { Product, Order } = req.models!;
  const days = parseInt((req.query.days as string) ?? '7');

  const since = new Date();
  since.setDate(since.getDate() - days);

  // product IDs sold recently
  const recentlySold = await Order.aggregate([
    { $match: { status: { $ne: 'cancelled' }, createdAt: { $gte: since } } },
    { $unwind: '$items' },
    { $group: { _id: '$items.product' } },
  ]);
  const soldIds = recentlySold.map((r) => r._id);

  const products = await Product.find({ _id: { $nin: soldIds } })
    .select('name sku createdAt')
    .sort({ createdAt: 1 })
    .limit(30)
    .lean();

  const now = new Date();
  res.json({
    data: products.map((p) => {
      const created = new Date(p.createdAt as Date);
      const daysOld = Math.floor((now.getTime() - created.getTime()) / 86400000);
      return {
        id: p._id,
        product: p.name,
        sku: p.sku,
        lastSale: null,
        daysAgo: daysOld,
      };
    }),
  });
}

// GET /api/alerts/inactive-staff  — cashiers who haven't logged in recently
export async function getInactiveStaffAlerts(req: AuthRequest, res: Response): Promise<void> {
  const { User } = req.models!;
  const days = parseInt((req.query.days as string) ?? '7');

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const users = await User.find({
    role: 'Cashier',
    isActive: true,
    $or: [
      { lastLogin: { $lt: cutoff } },
      { lastLogin: { $exists: false } },
    ],
  })
    .select('name lastLogin')
    .sort({ lastLogin: 1 })
    .lean();

  const now = new Date();
  res.json({
    data: users.map((u) => {
      const last = u.lastLogin ? new Date(u.lastLogin) : null;
      const daysInactive = last
        ? Math.floor((now.getTime() - last.getTime()) / 86400000)
        : null;
      return {
        id: u._id,
        name: u.name,
        lastLogin: last ? last.toISOString().slice(0, 10) : 'Never',
        daysInactive: daysInactive ?? days,
      };
    }),
  });
}

// GET /api/alerts/high-refunds  — recent refunded transactions
export async function getHighRefundAlerts(req: AuthRequest, res: Response): Promise<void> {
  const { Transaction } = req.models!;
  const minAmount = parseInt((req.query.minAmount as string) ?? '1000');

  const refunds = await Transaction.find({
    status: 'refunded',
    amount: { $gte: minAmount },
  })
    .sort({ amount: -1 })
    .limit(20)
    .lean();

  res.json({
    data: refunds.map((r) => ({
      id: r._id,
      refundId: r.txnId,
      orderId: r.txnId,
      customer: r.customer ?? 'Walk-in',
      amount: r.amount,
      reason: 'Refunded',
    })),
  });
}
