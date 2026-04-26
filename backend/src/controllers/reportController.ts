import { Response } from 'express';
import { AuthRequest } from '../types';
import { buildDateFilter, getDateRangeLabel } from '../utils/dateRange';

// ============= Sales Summary Report =============
export const getSalesSummary = async (req: AuthRequest, res: Response) => {
  try {
    const { Transaction } = req.models!;
    const { preset, startDate, endDate } = req.query;

    const dateFilter = buildDateFilter(preset as string, startDate as string, endDate as string);
    const dateLabel = getDateRangeLabel(preset as string, startDate as string, endDate as string);

    const [summaryAgg, hourlyAgg, paymentAgg, dailyAgg] = await Promise.all([
      Transaction.aggregate([
        { $match: { ...dateFilter } },
        {
          $group: {
            _id: null,
            grossSales: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, '$amount', 0] } },
            refundTotal: { $sum: { $cond: [{ $eq: ['$status', 'refunded'] }, '$amount', 0] } },
            refundCount: { $sum: { $cond: [{ $eq: ['$status', 'refunded'] }, 1, 0] } },
            transactionCount: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
          },
        },
      ]),
      // Hourly breakdown — only successful
      Transaction.aggregate([
        { $match: { ...dateFilter, status: 'success' } },
        {
          $group: {
            _id: { $hour: '$createdAt' },
            sales: { $sum: '$amount' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      // Payment method breakdown
      Transaction.aggregate([
        { $match: { ...dateFilter, status: 'success' } },
        {
          $group: {
            _id: '$paymentMethod',
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),
      // Daily breakdown for table
      Transaction.aggregate([
        { $match: { ...dateFilter, status: 'success' } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            grossSales: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const s = summaryAgg[0] ?? { grossSales: 0, refundTotal: 0, refundCount: 0, transactionCount: 0 };
    const netSales = s.grossSales - s.refundTotal;
    const avgOrder = s.transactionCount > 0 ? Math.round(s.grossSales / s.transactionCount) : 0;

    // Hourly — fill hours 0–23
    const hourMap = new Map(hourlyAgg.map((h: { _id: number; sales: number }) => [h._id, h.sales]));
    const HOURS = ['12 AM', '1 AM', '2 AM', '3 AM', '4 AM', '5 AM', '6 AM', '7 AM', '8 AM',
      '9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM',
      '6 PM', '7 PM', '8 PM', '9 PM', '10 PM', '11 PM'];
    const hourlySales = HOURS.map((label, i) => ({ time: label, sales: hourMap.get(i) ?? 0 }));

    // Payment methods as percentages
    const paymentTotal = paymentAgg.reduce((s: number, p: { total: number }) => s + p.total, 0);
    const paymentMethods = paymentAgg.map((p: { _id: string; total: number; count: number }) => ({
      name: p._id,
      amount: p.total,
      count: p.count,
      percentage: paymentTotal > 0 ? Math.round((p.total / paymentTotal) * 100) : 0,
    }));

    // Daily rows
    const salesBreakdown = dailyAgg.map((d: { _id: string; grossSales: number; count: number }) => ({
      date: new Date(d._id).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      grossSales: d.grossSales,
      count: d.count,
    }));

    res.json({
      dateRange: dateLabel,
      summary: {
        grossSales: s.grossSales,
        refundsCount: s.refundCount,
        refundTotal: s.refundTotal,
        netSales,
        transactionCount: s.transactionCount,
        avgOrderValue: avgOrder,
      },
      hourlySales,
      paymentMethods,
      salesBreakdown,
    });
  } catch (error) {
    console.error('Error fetching sales summary:', error);
    res.status(500).json({ error: 'Failed to fetch sales summary' });
  }
};

// ============= Sales by Product Report =============
export const getSalesByProductReport = async (req: AuthRequest, res: Response) => {
  try {
    const { Transaction, Order, Product } = req.models!;
    const { preset, startDate, endDate } = req.query;

    const dateMatchFilter = buildDateFilter(
      preset as string,
      startDate as string,
      endDate as string
    );
    const dateLabel = getDateRangeLabel(preset as string, startDate as string, endDate as string);

    // Start from Transaction (filtered by date + success), then join to Order for product items
    const [salesData, topGrossingItem, totalUnitsSoldAgg, topCategoryByRevenue] = await Promise.all([
      // Product-level sales data
      Transaction.aggregate([
        { $match: { ...dateMatchFilter, status: 'success' } },
        {
          $lookup: {
            from: 'orders',
            localField: 'orderId',
            foreignField: 'orderId',
            as: 'order',
          },
        },
        { $unwind: '$order' },
        { $unwind: '$order.items' },
        {
          $lookup: {
            from: 'products',
            localField: 'order.items.product',
            foreignField: '_id',
            as: 'productInfo',
          },
        },
        { $unwind: { path: '$productInfo', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$order.items.product',
            totalQty: { $sum: '$order.items.quantity' },
            totalRevenue: { $sum: { $multiply: ['$order.items.quantity', '$order.items.unitPrice'] } },
            avgUnitPrice: { $avg: '$order.items.unitPrice' },
            productName: { $first: '$order.items.productName' },
            sku: { $first: '$order.items.sku' },
            category: { $first: '$productInfo.category' },
          },
        },
        { $sort: { totalQty: -1 } },
        { $limit: 100 },
      ]),

      // Top grossing item
      Transaction.aggregate([
        { $match: { ...dateMatchFilter, status: 'success' } },
        {
          $lookup: {
            from: 'orders',
            localField: 'orderId',
            foreignField: 'orderId',
            as: 'order',
          },
        },
        { $unwind: '$order' },
        { $unwind: '$order.items' },
        {
          $group: {
            _id: '$order.items.product',
            totalRevenue: { $sum: { $multiply: ['$order.items.quantity', '$order.items.unitPrice'] } },
            productName: { $first: '$order.items.productName' },
          },
        },
        { $sort: { totalRevenue: -1 } },
        { $limit: 1 },
      ]),

      // Total units sold
      Transaction.aggregate([
        { $match: { ...dateMatchFilter, status: 'success' } },
        {
          $lookup: {
            from: 'orders',
            localField: 'orderId',
            foreignField: 'orderId',
            as: 'order',
          },
        },
        { $unwind: '$order' },
        { $unwind: '$order.items' },
        { $group: { _id: null, total: { $sum: '$order.items.quantity' } } },
      ]),

      // Top category by revenue
      Transaction.aggregate([
        { $match: { ...dateMatchFilter, status: 'success' } },
        {
          $lookup: {
            from: 'orders',
            localField: 'orderId',
            foreignField: 'orderId',
            as: 'order',
          },
        },
        { $unwind: '$order' },
        { $unwind: '$order.items' },
        {
          $lookup: {
            from: 'products',
            localField: 'order.items.product',
            foreignField: '_id',
            as: 'productDetails',
          },
        },
        { $unwind: { path: '$productDetails', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$productDetails.category',
            totalRevenue: { $sum: { $multiply: ['$order.items.quantity', '$order.items.unitPrice'] } },
          },
        },
        { $match: { _id: { $ne: null } } },
        { $sort: { totalRevenue: -1 } },
        { $limit: 1 },
      ]),
    ]);

    res.json({
      dateRange: dateLabel,
      summary: {
        totalUnitsSold: totalUnitsSoldAgg[0]?.total || 0,
        topGrossingItem: topGrossingItem[0]?.productName || 'N/A',
        topGrossingAmount: topGrossingItem[0]?.totalRevenue || 0,
        topCategory: topCategoryByRevenue[0]?._id || 'N/A',
        topCategoryRevenue: topCategoryByRevenue[0]?.totalRevenue || 0,
      },
      products: salesData.map((item: any) => ({
        sku: item.sku || 'N/A',
        name: item.productName || 'Unknown Product',
        category: item.category || 'Uncategorized',
        qty: item.totalQty || 0,
        sales: item.totalRevenue || 0,
        unitPrice: item.avgUnitPrice || 0,
        stock: item.productInfo?.stock || 0,
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

    const salesSummary = await Transaction.aggregate([
      {
        $match: {
          ...dateMatchFilter,
        },
      },
      {
        $group: {
          _id: null,
          grossSales: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, '$amount', 0] } },
          transactionCount: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
          refundAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'refunded'] }, '$amount', 0],
            },
          },
          voidAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'voided'] }, '$amount', 0],
            },
          },
        },
      },
    ]);

    const paymentBreakdown = await Transaction.aggregate([
      {
        $match: {
          ...dateMatchFilter,
          status: 'success',
        },
      },
      {
        $group: {
          _id: '$paymentMethod',
          amount: { $sum: '$amount' },
          transactionCount: { $sum: 1 },
        },
      },
    ]);

    const summary = salesSummary[0] || {
      grossSales: 0,
      transactionCount: 0,
      refundAmount: 0,
      voidAmount: 0,
    };

    const paymentMethods = paymentBreakdown.map((payment) => ({
      method: payment._id,
      amount: payment.amount,
      txCount: payment.transactionCount,
    }));

    res.json({
      dateRange: dateLabel,
      summary: {
        grossSales: summary.grossSales,
        totalTransactions: summary.transactionCount,
        refunds: summary.refundAmount,
        voids: summary.voidAmount,
      },
      paymentBreakdown: paymentMethods,
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
    const { category, status, sortBy } = req.query;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pipeline: any[] = [
      {
        $match: category ? { category: category as string } : {},
      },
      {
        $addFields: {
          assetValue: { $multiply: ['$stock', '$costPrice'] },
          retailValue: { $multiply: ['$stock', '$sellingPrice'] },
          stockStatus: {
            $cond: [
              { $eq: ['$stock', 0] },
              'Out of Stock',
              { $cond: [{ $lte: ['$stock', '$lowStockThreshold'] }, 'Low Stock', 'In Stock'] },
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
      { $match: category ? { category: category as string } : {} },
      {
        $addFields: {
          assetValue: { $multiply: ['$stock', '$costPrice'] },
          retailValue: { $multiply: ['$stock', '$sellingPrice'] },
          stockStatus: {
            $cond: [
              { $eq: ['$stock', 0] },
              'Out of Stock',
              { $cond: [{ $lte: ['$stock', '$lowStockThreshold'] }, 'Low Stock', 'In Stock'] },
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          totalAssetValue: { $sum: '$assetValue' },
          totalRetailValue: { $sum: '$retailValue' },
          lowStockCount: { $sum: { $cond: [{ $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', '$lowStockThreshold'] }] }, 1, 0] } },
          outOfStockCount: { $sum: { $cond: [{ $eq: ['$stock', 0] }, 1, 0] } },
          totalProducts: { $sum: 1 },
          totalUnits: { $sum: '$stock' },
        },
      },
    ];

    const summary = await Product.aggregate(summaryPipeline);
    const summaryData = summary[0] || {
      totalAssetValue: 0, totalRetailValue: 0, lowStockCount: 0,
      outOfStockCount: 0, totalProducts: 0, totalUnits: 0,
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

// ============= Customer Activity Report =============
export const getCustomerActivityReport = async (req: AuthRequest, res: Response) => {
  try {
    const { Order, Customer, Transaction } = req.models!;
    const { preset, startDate, endDate } = req.query;

    const dateMatchFilter = buildDateFilter(
      preset as string,
      startDate as string,
      endDate as string
    );
    const dateLabel = getDateRangeLabel(preset as string, startDate as string, endDate as string);

    const uniqueCustomers = await Transaction.aggregate([
      { $match: { ...dateMatchFilter, status: 'success' } },
      { $group: { _id: '$customer' } },
      { $count: 'total' },
    ]);

    const topSpender = await Transaction.aggregate([
      { $match: { ...dateMatchFilter, status: 'success' } },
      {
        $group: {
          _id: '$customer',
          totalSpent: { $sum: '$amount' },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 1 },
    ]);

    const newVsReturning = await Transaction.aggregate([
      { $match: { ...dateMatchFilter, status: 'success' } },
      { $group: { _id: '$customer', orderCount: { $sum: 1 } } },
      {
        $facet: {
          new: [{ $match: { orderCount: 1 } }, { $count: 'count' }],
          returning: [{ $match: { orderCount: { $gt: 1 } } }, { $count: 'count' }],
        },
      },
    ]);

    const newCount = newVsReturning[0]?.new[0]?.count || 0;
    const returningCount = newVsReturning[0]?.returning[0]?.count || 0;
    const totalNewReturning = newCount + returningCount;
    const returningPercentage = totalNewReturning > 0 ? Math.round((returningCount / totalNewReturning) * 100) : 0;

    const customerStats = await Transaction.aggregate([
      { $match: { ...dateMatchFilter, status: 'success' } },
      {
        $group: {
          _id: '$customer',
          orderCount: { $sum: 1 },
          spent: { $sum: '$amount' },
          lastOrder: { $max: '$createdAt' },
        },
      },
      {
        $lookup: {
          from: 'customers',
          localField: '_id',
          foreignField: 'name',
          as: 'profile',
        },
      },
      { $unwind: { path: '$profile', preserveNullAndEmptyArrays: true } },
      { $sort: { spent: -1 } },
      { $limit: 100 },
    ]);

    const customerList = customerStats.map(c => {
      const spent = c.spent || 0;
      return {
        name: c._id || 'Anonymous Customer',
        email: c.profile?.email || 'N/A',
        phone: c.profile?.phone || 'N/A',
        type: c.orderCount <= 1 ? 'New' : 'Returning',
        orderCount: c.orderCount || 0,
        spent: spent,
        loyaltyTier: (c.profile?.totalSpent || spent) >= 100000 ? 'Platinum' : (c.profile?.totalSpent || spent) >= 50000 ? 'Gold' : (c.profile?.totalSpent || spent) >= 20000 ? 'Silver' : 'Bronze',
        lastOrder: c.lastOrder
      };
    });

    res.json({
      dateRange: dateLabel,
      summary: {
        uniqueCustomers: uniqueCustomers[0]?.total || 0,
        topSpender: topSpender[0]?._id || 'N/A',
        topSpenderAmount: topSpender[0]?.totalSpent || 0,
        newVsReturning: {
          returning: returningPercentage,
          new: 100 - returningPercentage,
        },
      },
      customers: customerList,
    });
  } catch (error) {
    console.error('Error fetching customer activity:', error);
    res.status(500).json({ error: 'Failed to fetch customer activity' });
  }
};
