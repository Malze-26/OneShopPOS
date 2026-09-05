import { Response } from 'express';
import { AuthRequest } from '../types';
import { buildDateFilter, getDateRangeLabel } from '../utils/dateRange';
import { expiredExpr } from '../utils/stock';
import { STORE_TZ_OFFSET, formatStoreDate, formatStoreTime } from '../utils/timezone';

// ============= Sales Summary Report =============
export const getSalesSummary = async (req: AuthRequest, res: Response) => {
  try {
    const { Transaction, Order } = req.models!;
    const { preset, startDate, endDate, channel } = req.query;

    const sourceFilter = channel === 'pos' ? 'physical' : channel === 'online' ? 'online' : null;

    const dateFilter = buildDateFilter(preset as string, startDate as string, endDate as string);
    const dateLabel = getDateRangeLabel(preset as string, startDate as string, endDate as string);

    const includePOS = !sourceFilter || sourceFilter === 'physical';
    const includeEcom = !sourceFilter || sourceFilter === 'online';

    // E-com orders: identified by orderStatus field + paymentStatus='paid'
    const ecomMatch = { ...dateFilter, orderStatus: { $exists: true }, paymentStatus: 'paid' };
    const ecomAmountExpr = { $ifNull: ['$totalPrice', { $ifNull: ['$total', 0] }] };

    const [
      posSummaryAgg, ecomSummaryAgg,
      posHourlyAgg, ecomHourlyAgg,
      posPaymentAgg, ecomPaymentAgg,
      posDailyAgg, ecomDailyAgg,
    ] = await Promise.all([
      // POS summary (Transaction collection)
      includePOS ? Transaction.aggregate([
        { $match: { ...dateFilter } },
        {
          $group: {
            _id: null,
            grossSales: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, '$amount', 0] } },
            refundTotal: { $sum: { $cond: [{ $eq: ['$status', 'refunded'] }, '$amount', 0] } },
            refundCount: { $sum: { $cond: [{ $eq: ['$status', 'refunded'] }, 1, 0] } },
            transactionCount: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
            discounts: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, { $ifNull: ['$discount', 0] }, 0] } },
          },
        },
      ]) : Promise.resolve([]),

      // E-com summary (Order collection)
      includeEcom ? Order.aggregate([
        { $match: ecomMatch },
        {
          $group: {
            _id: null,
            grossSales: { $sum: ecomAmountExpr },
            transactionCount: { $sum: 1 },
          },
        },
      ]) : Promise.resolve([]),

      // POS hourly
      includePOS ? Transaction.aggregate([
        { $match: { ...dateFilter, status: 'success' } },
        { $group: { _id: { $hour: { date: '$createdAt', timezone: STORE_TZ_OFFSET } }, sales: { $sum: '$amount' } } },
        { $sort: { _id: 1 } },
      ]) : Promise.resolve([]),

      // E-com hourly
      includeEcom ? Order.aggregate([
        { $match: ecomMatch },
        { $group: { _id: { $hour: { date: '$createdAt', timezone: STORE_TZ_OFFSET } }, sales: { $sum: ecomAmountExpr } } },
        { $sort: { _id: 1 } },
      ]) : Promise.resolve([]),

      // POS payment methods
      includePOS ? Transaction.aggregate([
        { $match: { ...dateFilter, status: 'success' } },
        { $group: { _id: '$paymentMethod', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]) : Promise.resolve([]),

      // E-com payment methods
      includeEcom ? Order.aggregate([
        { $match: ecomMatch },
        { $group: { _id: '$paymentMethod', total: { $sum: ecomAmountExpr }, count: { $sum: 1 } } },
      ]) : Promise.resolve([]),

      // POS daily breakdown
      includePOS ? Transaction.aggregate([
        { $match: { ...dateFilter, status: 'success' } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: STORE_TZ_OFFSET } },
            posSales: { $sum: '$amount' },
            discounts: { $sum: { $ifNull: ['$discount', 0] } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]) : Promise.resolve([]),

      // E-com daily breakdown
      includeEcom ? Order.aggregate([
        { $match: ecomMatch },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: STORE_TZ_OFFSET } },
            onlineSales: { $sum: ecomAmountExpr },
            discounts: { $sum: { $ifNull: ['$discount', 0] } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]) : Promise.resolve([]),
    ]);

    // Merge summaries
    const posS = posSummaryAgg[0] ?? { grossSales: 0, refundTotal: 0, refundCount: 0, transactionCount: 0, discounts: 0 };
    const ecomS = ecomSummaryAgg[0] ?? { grossSales: 0, transactionCount: 0, discounts: 0 };

    const totalGross = posS.grossSales + ecomS.grossSales;
    const totalRefund = posS.refundTotal ?? 0;
    const totalRefundCnt = posS.refundCount ?? 0;
    const totalTxnCount = posS.transactionCount + ecomS.transactionCount;
    const totalDiscounts = (posS.discounts ?? 0) + (ecomS.discounts ?? 0);

    // Sales is revenue from what customers bought. Refunds and discounts are
    // adjustments to that same sale, so they net against it; supplier returns
    // are a procurement-side event and never do.
    const netSales = totalGross - totalRefund - totalDiscounts;
    const avgOrder = totalTxnCount > 0 ? Math.round(totalGross / totalTxnCount) : 0;

    // Merge hourly — fill hours 0–23
    const hourMap = new Map<number, number>();
    for (const h of [...posHourlyAgg, ...ecomHourlyAgg]) {
      hourMap.set(h._id, (hourMap.get(h._id) ?? 0) + h.sales);
    }
    const HOURS = ['12 AM', '1 AM', '2 AM', '3 AM', '4 AM', '5 AM', '6 AM', '7 AM', '8 AM',
      '9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM',
      '6 PM', '7 PM', '8 PM', '9 PM', '10 PM', '11 PM'];
    const hourlySales = HOURS.map((label, i) => ({ time: label, sales: hourMap.get(i) ?? 0 }));

    // Merge payment methods
    const payMap = new Map<string, { total: number; count: number }>();
    for (const p of [...posPaymentAgg, ...ecomPaymentAgg]) {
      const prev = payMap.get(p._id) ?? { total: 0, count: 0 };
      payMap.set(p._id, { total: prev.total + p.total, count: prev.count + p.count });
    }
    const payTotal = Array.from(payMap.values()).reduce((s, p) => s + p.total, 0);
    const paymentMethods = Array.from(payMap.entries()).map(([name, p]) => ({
      name,
      amount: p.total,
      count: p.count,
      percentage: payTotal > 0 ? Math.round((p.total / payTotal) * 100) : 0,
    }));

    // Merge daily breakdown
    const dayMap = new Map<string, { posSales: number; onlineSales: number; discounts: number; count: number }>();
    for (const d of posDailyAgg) {
      const prev = dayMap.get(d._id) ?? { posSales: 0, onlineSales: 0, discounts: 0, count: 0 };
      dayMap.set(d._id, { ...prev, posSales: prev.posSales + (d.posSales ?? 0), discounts: prev.discounts + (d.discounts ?? 0), count: prev.count + (d.count ?? 0) });
    }
    for (const d of ecomDailyAgg) {
      const prev = dayMap.get(d._id) ?? { posSales: 0, onlineSales: 0, discounts: 0, count: 0 };
      dayMap.set(d._id, { ...prev, onlineSales: prev.onlineSales + (d.onlineSales ?? 0), discounts: prev.discounts + (d.discounts ?? 0), count: prev.count + (d.count ?? 0) });
    }

    const salesBreakdown = Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateStr, d]) => {
        const grossSales = d.posSales + d.onlineSales;
        return {
          // dateStr is already a store-local 'YYYY-MM-DD' key (from the +05:30
          // $dateToString above) — format with timeZone: 'UTC' so the label
          // isn't re-shifted by whatever timezone the server process is in.
          date: new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }),
          posSales: d.posSales,
          onlineSales: d.onlineSales,
          discounts: d.discounts,
          tax: 0,
          grossSales,
          netSales: grossSales - d.discounts,
          count: d.count,
        };
      });

    // Dynamic Chart Data: Hourly for single day, Daily for multi-day
    const isSingleDay = preset === 'today' || preset === 'yesterday' || (startDate && startDate === endDate);
    const chartData = isSingleDay
      ? hourlySales
      : salesBreakdown.map(d => ({ time: d.date, sales: d.grossSales }));

    res.json({
      dateRange: dateLabel,
      summary: {
        grossSales: totalGross,
        discounts: totalDiscounts,
        refundsCount: totalRefundCnt,
        refundTotal: totalRefund,
        netSales,
        transactionCount: totalTxnCount,
        avgOrderValue: avgOrder,
      },
      hourlySales,
      paymentMethods,
      salesBreakdown,
      chartData,
    });
  } catch (error) {
    console.error('Error fetching sales summary:', error);
    res.status(500).json({ error: 'Failed to fetch sales summary' });
  }
};

// ============= Sales by Product Report =============
export const getSalesByProductReport = async (req: AuthRequest, res: Response) => {
  try {
    const { Order, Transaction } = req.models!;
    const { preset, startDate, endDate, channel } = req.query;

    const { buildDateFilter, getDateRangeLabel } = await import('../utils/dateRange');
    const dateMatchFilter = buildDateFilter(preset as string, startDate as string, endDate as string);
    const dateLabel = getDateRangeLabel(preset as string, startDate as string, endDate as string);

    const sourceFilter = channel === 'pos' ? 'physical' : channel === 'online' ? 'online' : null;
    const includePOS = !sourceFilter || sourceFilter === 'physical';
    const includeEcom = !sourceFilter || sourceFilter === 'online';

    // POS: Transaction collection, status=success, items[]
    const posProductPipeline: any[] = [
      { $match: { ...dateMatchFilter, status: 'success' } },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productInfo',
        },
      },
      { $unwind: { path: '$productInfo', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$items.product',
          totalQty: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.unitPrice'] } },
          avgUnitPrice: { $avg: '$items.unitPrice' },
          productName: { $first: '$items.productName' },
          sku: { $first: '$items.sku' },
          category: { $first: '$productInfo.category' },
          stock: { $first: '$productInfo.stock' },
        },
      },
    ];

    // E-com: Order collection — identified by orderStatus field (written by the e-com website)
    // Items may be in 'orderItems' OR 'items'; price in 'price' or 'unitPrice'; name in 'name' or 'productName'
    const ecomProductPipeline: any[] = [
      {
        $match: {
          ...dateMatchFilter,
          orderStatus: { $exists: true },
          paymentStatus: { $in: ['paid', 'success'] },
        },
      },
      // Normalise: merge orderItems/items into a single 'allItems' array
      {
        $addFields: {
          allItems: {
            $ifNull: [
              { $cond: [{ $isArray: '$orderItems' }, '$orderItems', null] },
              { $ifNull: ['$items', []] },
            ],
          },
        },
      },
      { $unwind: '$allItems' },
      // Resolve product reference — could be in allItems.product or allItems._id
      {
        $addFields: {
          'allItems.resolvedProductId': {
            $ifNull: ['$allItems.product', '$allItems._id'],
          },
        },
      },
      {
        $lookup: {
          from: 'products',
          localField: 'allItems.resolvedProductId',
          foreignField: '_id',
          as: 'productInfo',
        },
      },
      { $unwind: { path: '$productInfo', preserveNullAndEmptyArrays: true } },
      // Resolve name, sku, price with fallbacks
      {
        $addFields: {
          'allItems.resolvedName': {
            $let: {
              vars: {
                n: { $ifNull: ['$allItems.name', { $ifNull: ['$allItems.productName', ''] }] },
              },
              in: {
                $cond: [{ $eq: ['$$n', ''] }, { $ifNull: ['$productInfo.name', 'Unknown Product'] }, '$$n'],
              },
            },
          },
          'allItems.resolvedSku': {
            $let: {
              vars: { s: { $ifNull: ['$allItems.sku', ''] } },
              in: {
                $cond: [{ $eq: ['$$s', ''] }, { $ifNull: ['$productInfo.sku', 'N/A'] }, '$$s'],
              },
            },
          },
          'allItems.resolvedPrice': {
            $let: {
              vars: {
                p: { $ifNull: ['$allItems.price', { $ifNull: ['$allItems.unitPrice', 0] }] },
              },
              in: {
                $cond: [{ $eq: ['$$p', 0] }, { $ifNull: ['$productInfo.sellingPrice', 0] }, '$$p'],
              },
            },
          },
          'allItems.resolvedQty': {
            $ifNull: ['$allItems.qty', { $ifNull: ['$allItems.quantity', 1] }],
          },
        },
      },
      {
        $group: {
          _id: '$allItems.resolvedProductId',
          totalQty: { $sum: '$allItems.resolvedQty' },
          totalRevenue: { $sum: { $multiply: ['$allItems.resolvedQty', '$allItems.resolvedPrice'] } },
          avgUnitPrice: { $avg: '$allItems.resolvedPrice' },
          productName: { $first: '$allItems.resolvedName' },
          sku: { $first: '$allItems.resolvedSku' },
          category: { $first: '$productInfo.category' },
          stock: { $first: '$productInfo.stock' },
        },
      },
    ];




    const [posData, ecomData] = await Promise.all([
      includePOS ? Transaction.aggregate(posProductPipeline) : Promise.resolve([]),
      includeEcom ? Order.aggregate(ecomProductPipeline) : Promise.resolve([]),
    ]);

    // Merge POS + E-com by product _id
    const productMap = new Map<string, {
      _id: any; totalQty: number; totalRevenue: number; avgUnitPrice: number;
      productName: string; sku: string; category: string; stock: number;
    }>();

    for (const item of [...posData, ...ecomData]) {
      const key = item._id?.toString() ?? item.productName ?? 'unknown';
      const prev = productMap.get(key);
      if (prev) {
        prev.totalQty += item.totalQty;
        prev.totalRevenue += item.totalRevenue;
        prev.avgUnitPrice = item.avgUnitPrice;
      } else {
        productMap.set(key, { ...item });
      }
    }

    // Sort by qty sold descending — no limit, all products shown
    const mergedProducts = Array.from(productMap.values())
      .sort((a, b) => b.totalQty - a.totalQty);

    const totalUnitsSold = mergedProducts.reduce((s, p) => s + p.totalQty, 0);

    const topGrossing = [...mergedProducts].sort((a, b) => b.totalRevenue - a.totalRevenue)[0];

    // Top category by revenue
    const catMap = new Map<string, number>();
    for (const p of mergedProducts) {
      const cat = p.category || 'Uncategorized';
      catMap.set(cat, (catMap.get(cat) ?? 0) + p.totalRevenue);
    }
    let topCategory = 'N/A';
    let topCategoryRevenue = 0;
    for (const [cat, rev] of catMap.entries()) {
      if (rev > topCategoryRevenue) { topCategory = cat; topCategoryRevenue = rev; }
    }

    res.json({
      dateRange: dateLabel,
      summary: {
        totalUnitsSold,
        topGrossingItem: topGrossing?.productName || 'N/A',
        topGrossingAmount: topGrossing?.totalRevenue || 0,
        topCategory,
        topCategoryRevenue,
      },
      products: mergedProducts.map((item) => ({
        id: item._id ? String(item._id) : null,
        sku: item.sku || 'N/A',
        name: item.productName || 'Unknown Product',
        category: item.category || 'Uncategorized',
        qty: item.totalQty || 0,
        sales: item.totalRevenue || 0,
        unitPrice: item.avgUnitPrice || 0,
        stock: item.stock || 0,
      })),
    });
  } catch (error) {
    console.error('Error fetching sales by product:', error);
    res.status(500).json({ error: 'Failed to fetch sales data' });
  }
};

// ============= Daily Z Report =============
export const getDailyZReport = async (req: AuthRequest, res: Response) => {
  try {
    const { Order, Transaction } = req.models!;
    const { preset, startDate, endDate } = req.query;

    const dateMatchFilter = buildDateFilter(
      preset as string,
      startDate as string,
      endDate as string
    );
    const dateLabel = getDateRangeLabel(preset as string, startDate as string, endDate as string);

    const ecomMatch = { ...dateMatchFilter, orderStatus: { $exists: true }, paymentStatus: 'paid' };
    const ecomAmountExpr = { $ifNull: ['$totalPrice', { $ifNull: ['$total', 0] }] };

    const [posSummaryAgg, ecomSummaryAgg, posPaymentAgg, ecomPaymentAgg] = await Promise.all([
      // POS summary
      Transaction.aggregate([
        { $match: { ...dateMatchFilter } },
        {
          $group: {
            _id: null,
            grossSales: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, '$amount', 0] } },
            transactionCount: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
            refundAmount: { $sum: { $cond: [{ $eq: ['$status', 'refunded'] }, '$amount', 0] } },
            voidAmount: { $sum: { $cond: [{ $eq: ['$status', 'voided'] }, '$amount', 0] } },
            discounts: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, { $ifNull: ['$discount', 0] }, 0] } },
          },
        },
      ]),

      // E-com summary (Order collection, paymentStatus='paid')
      Order.aggregate([
        { $match: ecomMatch },
        {
          $group: {
            _id: null,
            grossSales: { $sum: ecomAmountExpr },
            discounts: { $sum: { $ifNull: ['$discount', 0] } },
            transactionCount: { $sum: 1 },
          },
        },
      ]),

      // POS payment methods
      Transaction.aggregate([
        { $match: { ...dateMatchFilter, status: 'success' } },
        { $group: { _id: '$paymentMethod', amount: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, '$total', 0] } }, transactionCount: { $sum: 1 } } },
      ]),

      // E-com payment methods
      Order.aggregate([
        { $match: ecomMatch },
        { $group: { _id: '$paymentMethod', amount: { $sum: ecomAmountExpr }, transactionCount: { $sum: 1 } } },
      ]),
    ]);

    const posS = posSummaryAgg[0] || { grossSales: 0, transactionCount: 0, refundAmount: 0, voidAmount: 0, discounts: 0 };
    const ecomS = ecomSummaryAgg[0] || { grossSales: 0, discounts: 0, transactionCount: 0 };

    const totalGross = posS.grossSales + ecomS.grossSales;
    const totalDiscounts = (posS.discounts ?? 0) + (ecomS.discounts ?? 0);
    const totalRefunds = posS.refundAmount ?? 0;
    const netSales = totalGross - totalDiscounts - totalRefunds;

    // Merge payment methods
    const payMap = new Map<string, { amount: number; count: number }>();
    for (const p of [...posPaymentAgg, ...ecomPaymentAgg]) {
      const prev = payMap.get(p._id) ?? { amount: 0, count: 0 };
      payMap.set(p._id, { amount: prev.amount + p.amount, count: prev.count + p.transactionCount });
    }
    const paymentMethods = Array.from(payMap.entries()).map(([method, p]) => ({
      method,
      amount: p.amount,
      txCount: p.count,
    }));

    // Cash reconciliation
    const cashSales = payMap.get('Cash')?.amount ?? 0;
    const openingFloat = 0;

    const generatedAt = formatStoreTime(new Date(), { hour: '2-digit', minute: '2-digit', hour12: true });

    res.json({
      dateRange: dateLabel,
      generatedAt,
      shiftInfo: {
        storeName: 'OneShop Store',
        storeId: req.user!.storeId || '---',
        register: 'Terminal 01',
        cashier: req.user!.email || 'Unknown',
        cashierId: req.user!.id || '---',
        openedAt: '--:--',
      },
      summary: {
        grossSales: totalGross,
        discounts: totalDiscounts,
        refunds: totalRefunds,
        netSales,
        totalTransactions: posS.transactionCount + ecomS.transactionCount,
      },
      paymentBreakdown: paymentMethods,
      reconciliation: {
        openingFloat,
        cashSales,
        expectedCash: openingFloat + cashSales,
      },
    });
  } catch (error) {
    console.error('Error fetching daily Z report:', error);
    res.status(500).json({ error: 'Failed to fetch daily Z report' });
  }
};

// ============= Inventory Status Report =============
export const getInventoryStatusReport = async (req: AuthRequest, res: Response) => {
  try {
    const { Product } = req.models!;
    const { category, status, sortBy, preset, startDate: start, endDate: end } = req.query;
    const { getDateRange } = await import('../utils/dateRange');
    const { endDate } = getDateRange(preset as string, start as string, end as string);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pipeline: any[] = [
      {
        $match: {
          ...(category ? { category: category as string } : {}),
          createdAt: { $lte: endDate },
        },
      },
      {
        $addFields: {
          assetValue: { $multiply: ['$stock', '$costPrice'] },
          retailValue: { $multiply: ['$stock', '$sellingPrice'] },
          stockStatus: {
            $cond: [
              { $eq: ['$stock', 0] },
              'Out of Stock',
              // Expired stock outranks low stock: it needs returning to the
              // supplier, not reordering, so it is never listed as low.
              {
                $cond: [
                  expiredExpr(),
                  'Expired',
                  { $cond: [{ $lte: ['$stock', '$lowStockThreshold'] }, 'Low Stock', 'In Stock'] },
                ],
              },
            ],
          },
          margin: {
            $cond: [
              { $eq: ['$costPrice', 0] },
              0,
              {
                $multiply: [
                  { $divide: [{ $subtract: ['$sellingPrice', '$costPrice'] }, '$costPrice'] },
                  100,
                ],
              },
            ],
          },
        },
      },
      ...(status ? [{ $match: { stockStatus: status as string } }] : []),
      {
        $sort:
          sortBy === 'value' ? { assetValue: -1 }
            : sortBy === 'stock' ? { stock: -1 }
              : sortBy === 'margin' ? { margin: -1 }
                : { _id: -1 },
      },
    ];

    const products = await Product.aggregate(pipeline);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const summaryPipeline: any[] = [
      {
        $match: {
          ...(category ? { category: category as string } : {}),
          createdAt: { $lte: endDate },
        },
      },
      {
        $addFields: {
          assetValue: { $multiply: ['$stock', '$costPrice'] },
          retailValue: { $multiply: ['$stock', '$sellingPrice'] },
          stockStatus: {
            $cond: [
              { $eq: ['$stock', 0] },
              'Out of Stock',
              {
                $cond: [
                  expiredExpr(),
                  'Expired',
                  { $cond: [{ $lte: ['$stock', '$lowStockThreshold'] }, 'Low Stock', 'In Stock'] },
                ],
              },
            ],
          },
          isExpired: expiredExpr(),
        },
      },
      {
        $group: {
          _id: null,
          totalAssetValue: { $sum: '$assetValue' },
          totalRetailValue: { $sum: '$retailValue' },
          lowStockCount: {
            $sum: {
              $cond: [
                { $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', '$lowStockThreshold'] }, { $not: '$isExpired' }] },
                1,
                0,
              ],
            },
          },
          expiredCount: {
            $sum: {
              $cond: [
                { $and: [{ $gt: ['$stock', 0] }, '$isExpired'] },
                1,
                0,
              ],
            },
          },
          outOfStockCount: { $sum: { $cond: [{ $eq: ['$stock', 0] }, 1, 0] } },
          totalProducts: { $sum: 1 },
          totalUnits: { $sum: '$stock' },
        },
      },
    ];

    const summary = await Product.aggregate(summaryPipeline);
    const summaryData = summary[0] || {
      totalAssetValue: 0, totalRetailValue: 0, lowStockCount: 0,
      expiredCount: 0, outOfStockCount: 0, totalProducts: 0, totalUnits: 0,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inventoryItems = products.map((product: any) => ({
      id: product._id,
      sku: product.sku,
      name: product.name,
      category: product.category,
      cost: product.costPrice,
      retail: product.sellingPrice,
      margin: Number(product.margin.toFixed(2)),
      stock: product.stock,
      lowStockThreshold: product.lowStockThreshold,
      value: Number(product.assetValue.toFixed(2)),
      retailValue: Number(product.retailValue.toFixed(2)),
      status: product.stockStatus,
      brand: product.brand || 'N/A',
      featured: product.featured,
    }));

    res.json({
      summary: {
        totalAssetValue: Number(summaryData.totalAssetValue.toFixed(2)),
        totalRetailValue: Number(summaryData.totalRetailValue.toFixed(2)),
        lowStockCount: summaryData.lowStockCount,
        expiredCount: summaryData.expiredCount ?? 0,
        outOfStockCount: summaryData.outOfStockCount,
        totalProducts: summaryData.totalProducts,
        totalUnits: summaryData.totalUnits,
        potentialMargin: Number((summaryData.totalRetailValue - summaryData.totalAssetValue).toFixed(2)),
      },
      products: inventoryItems,
    });
  } catch (error) {
    console.error('Error fetching inventory status:', error);
    res.status(500).json({ error: 'Failed to fetch inventory status' });
  }
};

// ============= Employee Activity Report =============
export const getEmployeeActivityReport = async (req: AuthRequest, res: Response) => {
  try {
    const { User, Transaction, Customer } = req.models!;
    const { preset, startDate, endDate, role } = req.query;

    const dateMatchFilter = buildDateFilter(
      preset as string,
      startDate as string,
      endDate as string
    );
    const dateLabel = getDateRangeLabel(preset as string, startDate as string, endDate as string);

    // If preset is custom, show registered relevant customers
    if (preset === 'custom') {
      const customerMatch: any = {};
      if (dateMatchFilter.createdAt) {
        customerMatch.createdAt = dateMatchFilter.createdAt;
      }

      const customerStats = await Customer.aggregate([
        { $match: customerMatch },
        {
          $lookup: {
            from: 'transactions',
            let: { custId: { $toString: '$_id' } },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$customerId', '$$custId'] },
                  status: 'success',
                  ...dateMatchFilter,
                },
              },
            ],
            as: 'transactions',
          },
        },
        {
          $addFields: {
            orderCount: { $size: '$transactions' },
            totalSales: { $sum: '$transactions.amount' },
            lastActive: { $max: '$transactions.createdAt' },
          },
        },
        { $project: { transactions: 0, password: 0 } },
        { $sort: { totalSales: -1, name: 1 } },
      ]);

      const activeCustomers = customerStats.filter(c => c.orderCount > 0).length;
      let topCustName = 'N/A';
      let topCustSales = 0;
      let totalSpentAll = 0;

      const customersList = customerStats.map((c) => {
        totalSpentAll += c.totalSales;
        if (c.totalSales > topCustSales) {
          topCustSales = c.totalSales;
          topCustName = c.name || 'Unknown';
        }

        return {
          id: c._id,
          name: c.name || 'Unknown',
          email: c.email || 'N/A',
          role: 'Customer',
          orderCount: c.orderCount || 0,
          totalSales: c.totalSales || 0,
          lastActive: c.lastActive || null,
        };
      });

      const avgSpent = activeCustomers > 0 ? Math.round(totalSpentAll / activeCustomers) : 0;

      return res.json({
        dateRange: dateLabel,
        summary: {
          activeEmployees: activeCustomers,
          topPerformer: topCustName,
          topPerformerSales: topCustSales,
          avgSalesPerEmployee: avgSpent,
        },
        employees: customersList,
        isCustomerReport: true,
      });
    }

    // Default: Employee activity (Today, 7 Days, This Month)
    // Always show all active employees — only filter transactions by date
    const userMatch: any = { isActive: true };

    if (role && role !== 'all') {
      userMatch.role = role;
    } else {
      // Show Cashier and Sales Representative roles
      userMatch.role = { $in: ['Cashier', 'Sales Representative'] };
    }

    const employeeStats = await User.aggregate([
      { $match: userMatch },
      {
        $lookup: {
          from: 'transactions',
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$createdBy', '$$userId'] },
                status: 'success',
                ...dateMatchFilter,
              },
            },
          ],
          as: 'transactions',
        },
      },
      {
        $addFields: {
          orderCount: { $size: '$transactions' },
          totalSales: { $sum: '$transactions.amount' },
          lastActive: { $max: '$transactions.createdAt' },
        },
      },
      { $project: { transactions: 0, password: 0 } },
      { $sort: { totalSales: -1, name: 1 } },
    ]);

    // Active employees count ONLY includes those who processed at least 1 order
    const activeEmployees = employeeStats.filter(e => e.orderCount > 0).length;
    let topPerformer = 'N/A';
    let topPerformerSales = 0;
    let totalSalesAll = 0;

    const employeesList = employeeStats.map((e) => {
      totalSalesAll += e.totalSales;
      if (e.totalSales > topPerformerSales) {
        topPerformerSales = e.totalSales;
        topPerformer = e.name || 'Unknown';
      }

      return {
        id: e._id,
        name: e.name || 'Unknown',
        email: e.email || 'N/A',
        role: e.role || 'Unknown',
        orderCount: e.orderCount || 0,
        totalSales: e.totalSales || 0,
        lastActive: e.lastActive || null,
      };
    });

    const avgSalesPerEmployee = activeEmployees > 0 ? Math.round(totalSalesAll / activeEmployees) : 0;

    res.json({
      dateRange: dateLabel,
      summary: {
        activeEmployees,
        topPerformer,
        topPerformerSales,
        avgSalesPerEmployee,
      },
      employees: employeesList,
    });
  } catch (error) {
    console.error('Error fetching employee activity:', error);
    res.status(500).json({ error: 'Failed to fetch employee activity' });
  }
};

