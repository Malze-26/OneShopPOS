import { Response } from 'express';
import { AuthRequest } from '../types';

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function yesterdayRange() {
  const start = new Date();
  start.setDate(start.getDate() - 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

// GET /api/dashboard/summary
export async function getDashboardSummary(req: AuthRequest, res: Response): Promise<void> {
  const { Transaction, Order, Customer, Product } = req.models!;
  const today = todayRange();
  const yesterday = yesterdayRange();

  // source: { $ne: 'physical' } matches ecom orders (no source field) and POS online orders
  const onlineFilter = { source: { $ne: 'physical' } };

  const [
    todaySalesAgg, yesterdaySalesAgg,
    todayTxnCount, yesterdayTxnCount,
    todayOnlineCount, yesterdayOnlineCount,
    customerCount,
    lowStockCount,
    pendingTxnCount,
    pendingOnlineCount,
    newCustomerCount,
  ] = await Promise.all([
    Transaction.aggregate([
      { $match: { status: 'success', createdAt: { $gte: today.start, $lte: today.end } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Transaction.aggregate([
      { $match: { status: 'success', createdAt: { $gte: yesterday.start, $lte: yesterday.end } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Transaction.countDocuments({ createdAt: { $gte: today.start, $lte: today.end } }),
    Transaction.countDocuments({ createdAt: { $gte: yesterday.start, $lte: yesterday.end } }),
    Order.countDocuments({ ...onlineFilter, createdAt: { $gte: today.start, $lte: today.end } }),
    Order.countDocuments({ ...onlineFilter, createdAt: { $gte: yesterday.start, $lte: yesterday.end } }),
    Customer.countDocuments({}),
    Product.countDocuments({
      $expr: { $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', '$lowStockThreshold'] }] },
    }),
    Transaction.countDocuments({ status: 'pending', createdAt: { $gte: today.start, $lte: today.end } }),
    // ecom orders use orderStatus; POS online orders use status — check both
    Order.countDocuments({
      ...onlineFilter,
      $or: [{ status: 'pending' }, { orderStatus: 'pending' }],
      createdAt: { $gte: today.start, $lte: today.end },
    }),
    Customer.countDocuments({ createdAt: { $gte: today.start, $lte: today.end } }),
  ]);

  const todaySales = todaySalesAgg[0]?.total ?? 0;
  const yesterdaySales = yesterdaySalesAgg[0]?.total ?? 0;
  const salesChange = yesterdaySales > 0
    ? Math.round(((todaySales - yesterdaySales) / yesterdaySales) * 100)
    : null;

  const todayOrderCount = todayTxnCount + todayOnlineCount;
  const yesterdayOrderCount = yesterdayTxnCount + yesterdayOnlineCount;

  const ordersChange = yesterdayOrderCount > 0
    ? Math.round(((todayOrderCount - yesterdayOrderCount) / yesterdayOrderCount) * 100)
    : null;

  res.json({
    todaySales,
    salesChange,
    todayOrders: todayOrderCount,
    ordersChange,
    pendingOrders: pendingTxnCount + pendingOnlineCount,
    totalCustomers: customerCount,
    newCustomersToday: newCustomerCount,
    lowStockItems: lowStockCount,
  });
}

// GET /api/dashboard/sales-trend
export async function getSalesTrend(req: AuthRequest, res: Response): Promise<void> {
  const { Transaction } = req.models!;
  const days = parseInt((req.query.days as string) ?? '7');

  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const raw = await Transaction.aggregate([
    { $match: { status: 'success', createdAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        sales: { $sum: '$amount' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const byDay = new Map(raw.map((r) => [r._id, r.sales]));

  const trend = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    trend.push({
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      sales: byDay.get(key) ?? 0,
    });
  }

  res.json({ data: trend });
}

// GET /api/dashboard/top-products
export async function getTopProducts(req: AuthRequest, res: Response): Promise<void> {
  const { Order } = req.models!;
  const limit = parseInt((req.query.limit as string) ?? '5');

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const products = await Order.aggregate([
    { $match: { status: { $ne: 'cancelled' }, createdAt: { $gte: since } } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        name: { $first: '$items.productName' },
        units: { $sum: '$items.quantity' },
        revenue: { $sum: { $multiply: ['$items.quantity', '$items.unitPrice'] } },
      },
    },
    { $sort: { units: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        name: 1,
        units: 1,
        revenue: 1,
      },
    },
  ]);

  res.json({
    data: products.map((p, i) => ({ rank: i + 1, ...p })),
  });
}

// GET /api/dashboard/employee-performance
export async function getEmployeePerformance(req: AuthRequest, res: Response): Promise<void> {
  const { Transaction, User } = req.models!;
  const today = todayRange();

  const perf = await Transaction.aggregate([
    { $match: { status: 'success', createdAt: { $gte: today.start, $lte: today.end } } },
    {
      $group: {
        _id: '$createdBy',
        revenue: { $sum: '$amount' },
        transactions: { $sum: 1 },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: 10 },
  ]);

  const userIds = perf.map((p) => p._id).filter(Boolean);
  const users = await User.find({ _id: { $in: userIds } }).select('name avatar').lean();
  const userMap = new Map(users.map((u) => [String(u._id), u]));

  const maxRevenue = perf[0]?.revenue ?? 1;

  res.json({
    data: perf.map((p) => {
      const user = userMap.get(String(p._id));
      const name = user?.name ?? 'Unknown';
      const initials = name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
      return {
        name,
        avatar: initials,
        revenue: p.revenue,
        transactions: p.transactions,
        performance: Math.round((p.revenue / maxRevenue) * 100),
      };
    }),
  });
}

// GET /api/dashboard/recent-orders
export async function getRecentOrders(req: AuthRequest, res: Response): Promise<void> {
  const { Transaction } = req.models!;
  const limit = parseInt((req.query.limit as string) ?? '5');

  const txns = await Transaction.find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  const now = new Date();
  const fmt = (d: Date) => {
    const diff = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff} min ago`;
    const hrs = Math.floor(diff / 60);
    if (hrs < 24) return `${hrs} hr ago`;
    return `${Math.floor(hrs / 24)} day ago`;
  };

  const statusMap: Record<string, string> = {
    success: 'completed',
    pending: 'pending',
    refunded: 'refunded',
    failed: 'cancelled',
    voided: 'cancelled',
  };

  res.json({
    data: txns.map((t) => ({
      id: t.txnId,
      customer: t.customer ?? 'Walk-in',
      amount: t.amount,
      status: statusMap[t.status] ?? t.status,
      time: fmt(new Date(t.createdAt as Date)),
    })),
  });
}
