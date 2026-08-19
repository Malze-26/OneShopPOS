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
    todayEcomSalesAgg, yesterdayEcomSalesAgg,
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
    Order.aggregate([
      { $match: { orderStatus: { $exists: true }, paymentStatus: 'paid', createdAt: { $gte: today.start, $lte: today.end } } },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$totalPrice', { $ifNull: ['$total', 0] }] } } } },
    ]),
    Order.aggregate([
      { $match: { orderStatus: { $exists: true }, paymentStatus: 'paid', createdAt: { $gte: yesterday.start, $lte: yesterday.end } } },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$totalPrice', { $ifNull: ['$total', 0] }] } } } },
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

  const todaySales = (todaySalesAgg[0]?.total ?? 0) + (todayEcomSalesAgg[0]?.total ?? 0);
  const yesterdaySales = (yesterdaySalesAgg[0]?.total ?? 0) + (yesterdayEcomSalesAgg[0]?.total ?? 0);
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
  try {
    const { Transaction, Order } = req.models!;
    const days = parseInt((req.query.days as string) ?? '7');

    const since = new Date();
    since.setDate(since.getDate() - (days - 1));
    since.setHours(0, 0, 0, 0);

    const dateGroup = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };

    const [txnRaw, orderRaw] = await Promise.all([
      Transaction.aggregate([
        { $match: { status: 'success', createdAt: { $gte: since } } },
        { $group: { _id: dateGroup, sales: { $sum: '$amount' } } },
      ]),
      Order.aggregate([
        { $match: { status: { $nin: ['cancelled', 'refunded'] }, paymentStatus: 'paid', createdAt: { $gte: since } } },
        { $group: { _id: dateGroup, sales: { $sum: '$total' } } },
      ]),
    ]);

    const byDay = new Map<string, number>();
    for (const r of [...txnRaw, ...orderRaw]) {
      byDay.set(r._id, (byDay.get(r._id) ?? 0) + r.sales);
    }

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
  } catch (err) {
    console.error('getSalesTrend error:', err);
    res.status(500).json({ message: 'Failed to fetch sales trend' });
  }
}

// GET /api/dashboard/top-products
export async function getTopProducts(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { Transaction, Order, Product } = req.models!;
    const limit = parseInt((req.query.limit as string) ?? '5');
    const days = parseInt((req.query.days as string) ?? '30');

    const since = new Date();
    since.setDate(since.getDate() - days);

    // Older line items were written without unitPrice, so fall back to the
    // stored subtotal before giving up and counting the line as zero revenue.
    const lineRevenue = {
      $ifNull: [
        '$items.subtotal',
        { $ifNull: [{ $multiply: ['$items.quantity', '$items.unitPrice'] }, 0] },
      ],
    };

    const itemPipeline = (matchStage: object) => [
      { $match: { ...matchStage, createdAt: { $gte: since } } },
      { $unwind: '$items' },
      // Items with no product ref can't be attributed or named — drop them
      // instead of collapsing them all into a single anonymous bucket.
      { $match: { 'items.product': { $ne: null } } },
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$items.productName' },
          units: { $sum: '$items.quantity' },
          revenue: { $sum: lineRevenue },
        },
      },
    ];

    const [txnProducts, orderProducts] = await Promise.all([
      Transaction.aggregate(itemPipeline({ status: 'success' })),
      Order.aggregate(itemPipeline({ status: { $nin: ['cancelled', 'refunded'] } })),
    ]);

    const map = new Map<string, { id: string; name: string; units: number; revenue: number }>();
    for (const p of [...txnProducts, ...orderProducts]) {
      const key = String(p._id);
      const existing = map.get(key);
      if (existing) {
        existing.units += p.units;
        existing.revenue += p.revenue;
        existing.name = existing.name || p.name;
      } else {
        map.set(key, { id: key, name: p.name, units: p.units, revenue: p.revenue });
      }
    }

    const products = [...map.values()]
      .sort((a, b) => b.units - a.units || b.revenue - a.revenue)
      .slice(0, limit);

    // Pull the current name/image from the product itself — the name snapshot on
    // the line item may be blank (legacy rows) or stale after a rename.
    const catalog = await Product.find({ _id: { $in: products.map((p) => p.id) } })
      .select('name images')
      .lean();
    const byId = new Map(catalog.map((p) => [String(p._id), p]));

    res.json({
      data: products.map((p, i) => {
        const product = byId.get(p.id);
        return {
          rank: i + 1,
          id: p.id,
          name: product?.name || p.name || 'Unknown Product',
          image: product?.images?.[0] ?? null,
          units: p.units,
          revenue: p.revenue,
        };
      }),
    });
  } catch (err) {
    console.error('getTopProducts error:', err);
    res.status(500).json({ message: 'Failed to fetch top products' });
  }
}

// Raw paymentMethod values differ per channel: POS writes 'Cash'/'Card', the
// e-com site writes 'payhere'/'cash-on-delivery'. Fold them into display labels.
const METHOD_LABELS: Record<string, string> = {
  'cash':             'Cash',
  'card':             'Card',
  'payhere':          'Online',
  'online':           'Online',
  'cash-on-delivery': 'Cash on Delivery',
  'bank transfer':    'Bank Transfer',
};

function methodLabel(raw: unknown): string {
  const key = String(raw ?? '').toLowerCase().trim();
  return METHOD_LABELS[key] ?? (key ? key.charAt(0).toUpperCase() + key.slice(1) : 'Unknown');
}

// GET /api/dashboard/payment-methods
// Today's breakdown of the same revenue reported as `todaySales` by /summary:
// POS transactions with status='success' plus e-com orders with paymentStatus='paid'.
export async function getPaymentMethods(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { Transaction, Order } = req.models!;
    const today = todayRange();

    const [txnMethods, orderMethods] = await Promise.all([
      Transaction.aggregate([
        { $match: { status: 'success', createdAt: { $gte: today.start, $lte: today.end } } },
        { $group: { _id: '$paymentMethod', count: { $sum: 1 }, total: { $sum: '$amount' } } },
      ]),
      Order.aggregate([
        { $match: { orderStatus: { $exists: true }, paymentStatus: 'paid', createdAt: { $gte: today.start, $lte: today.end } } },
        {
          $group: {
            _id:   '$paymentMethod',
            count: { $sum: 1 },
            total: { $sum: { $ifNull: ['$totalPrice', { $ifNull: ['$total', 0] }] } },
          },
        },
      ]),
    ]);

    // Cash/Card are always shown so the POS pair stays visible on a zero day.
    const map = new Map<string, { count: number; total: number }>([
      ['Cash', { count: 0, total: 0 }],
      ['Card', { count: 0, total: 0 }],
    ]);

    for (const m of [...txnMethods, ...orderMethods]) {
      const key = methodLabel(m._id);
      const existing = map.get(key);
      if (existing) {
        existing.count += m.count;
        existing.total += m.total;
      } else {
        map.set(key, { count: m.count, total: m.total });
      }
    }

    const grandTotal = [...map.values()].reduce((sum, m) => sum + m.total, 0);

    const data = [...map.entries()]
      .map(([method, { count, total }]) => ({
        method,
        count,
        total,
        percentage: grandTotal > 0 ? Math.round((total / grandTotal) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);

    res.json({ data });
  } catch (err) {
    console.error('getPaymentMethods error:', err);
    res.status(500).json({ message: 'Failed to fetch payment methods' });
  }
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
