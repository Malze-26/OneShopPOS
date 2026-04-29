import { Response } from 'express';
import { AuthRequest } from '../types';
import { buildDateFilter, getDateRangeLabel } from '../utils/dateRange';

// ============= Sales Summary Report =============
export const getSalesSummary = async (req: AuthRequest, res: Response) => {
  try {
    const { Transaction } = req.models!;
    const { preset, startDate, endDate, channel } = req.query;

    const sourceFilter = channel === 'pos' ? 'physical' : channel === 'online' ? 'online' : null;

    const dateFilter = buildDateFilter(preset as string, startDate as string, endDate as string);
    const dateLabel = getDateRangeLabel(preset as string, startDate as string, endDate as string);

    // Common match for top-level stats if channel filtered
    const baseMatch = { ...dateFilter };

    const [summaryAgg, hourlyAgg, paymentAgg, dailyAgg] = await Promise.all([
      Transaction.aggregate([
        { $match: baseMatch },
        {
          $lookup: {
            from: 'orders',
            localField: 'orderId',
            foreignField: 'orderId',
            as: 'orderInfo',
          },
        },
        { $unwind: { path: '$orderInfo', preserveNullAndEmptyArrays: true } },
        ...(sourceFilter ? [{ $match: { 'orderInfo.source': sourceFilter } }] : []),
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
      // Hourly breakdown
      Transaction.aggregate([
        { $match: { ...dateFilter, status: 'success' } },
        {
          $lookup: {
            from: 'orders',
            localField: 'orderId',
            foreignField: 'orderId',
            as: 'orderInfo',
          },
        },
        { $unwind: { path: '$orderInfo', preserveNullAndEmptyArrays: true } },
        ...(sourceFilter ? [{ $match: { 'orderInfo.source': sourceFilter } }] : []),
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
          $lookup: {
            from: 'orders',
            localField: 'orderId',
            foreignField: 'orderId',
            as: 'orderInfo',
          },
        },
        { $unwind: { path: '$orderInfo', preserveNullAndEmptyArrays: true } },
        ...(sourceFilter ? [{ $match: { 'orderInfo.source': sourceFilter } }] : []),
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
          $lookup: {
            from: 'orders',
            localField: 'orderId',
            foreignField: 'orderId',
            as: 'orderInfo',
          },
        },
        { $unwind: { path: '$orderInfo', preserveNullAndEmptyArrays: true } },
        ...(sourceFilter ? [{ $match: { 'orderInfo.source': sourceFilter } }] : []),
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            posSales: { $sum: { $cond: [{ $eq: ['$orderInfo.source', 'physical'] }, '$amount', 0] } },
            onlineSales: { $sum: { $cond: [{ $eq: ['$orderInfo.source', 'online'] }, '$amount', 0] } },
            discounts: { $sum: { $ifNull: ['$orderInfo.discount', 0] } },
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

    // Payment methods
    const paymentTotal = paymentAgg.reduce((sum: number, p: { total: number }) => sum + p.total, 0);
    const paymentMethods = paymentAgg.map((p: { _id: string; total: number; count: number }) => ({
      name: p._id,
      amount: p.total,
      count: p.count,
      percentage: paymentTotal > 0 ? Math.round((p.total / paymentTotal) * 100) : 0,
    }));

    // Daily rows
    const salesBreakdown = dailyAgg.map((d: any) => ({
      date: new Date(d._id).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      posSales: d.posSales || 0,
      onlineSales: d.onlineSales || 0,
      discounts: d.discounts || 0,
      tax: 0, // Not in current schema, placeholder
      grossSales: d.grossSales,
      netSales: d.grossSales - (d.discounts || 0),
      count: d.count,
    }));

    // Dynamic Chart Data: Hourly for single day, Daily for multi-day
    const isSingleDay = preset === 'today' || preset === 'yesterday' || (startDate && startDate === endDate);
    const chartData = isSingleDay
      ? hourlySales
      : salesBreakdown.map(d => ({ time: d.date, sales: d.grossSales }));

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
    const { Transaction, Order, Product } = req.models!;
    const { preset, startDate, endDate, channel } = req.query;

    const { buildDateFilter, getDateRangeLabel } = await import('../utils/dateRange');
    const dateMatchFilter = buildDateFilter(
      preset as string,
      startDate as string,
      endDate as string
    );
    const dateLabel = getDateRangeLabel(preset as string, startDate as string, endDate as string);

    // Map frontend channel names to backend OrderSource
    const sourceFilter = channel === 'pos' ? 'physical' : channel === 'online' ? 'online' : null;

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
        ...(sourceFilter ? [{ $match: { 'order.source': sourceFilter } }] : []),
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
        ...(sourceFilter ? [{ $match: { 'order.source': sourceFilter } }] : []),
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
        ...(sourceFilter ? [{ $match: { 'order.source': sourceFilter } }] : []),
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
        ...(sourceFilter ? [{ $match: { 'order.source': sourceFilter } }] : []),
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
    const { category, status, sortBy, preset, startDate, endDate } = req.query;

    const { buildDateFilter } = await import('../utils/dateRange');
    const dateMatchFilter = buildDateFilter(
      preset as string,
      startDate as string,
      endDate as string
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pipeline: any[] = [
      {
        $match: {
          stock: { $gt: 0 },
          ...(category ? { category: category as string } : {}),
          ...(preset && preset !== 'all-time' && dateMatchFilter.createdAt ? { createdAt: dateMatchFilter.createdAt } : {}),
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
      {
        $match: {
          stock: { $gt: 0 },
          ...(category ? { category: category as string } : {}),
          ...(preset && preset !== 'all-time' && dateMatchFilter.createdAt ? { createdAt: dateMatchFilter.createdAt } : {}),
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
    const userMatch: any = { isActive: true };

    if (role && role !== 'all') {
      userMatch.role = role;
    } else {
      // User requested only Cashier and Sales Representative for Today/7D/Month
      userMatch.role = { $in: ['Cashier', 'Sales Representative'] };
    }

    if (preset !== 'all-time' && dateMatchFilter.createdAt) {
      userMatch.createdAt = dateMatchFilter.createdAt;
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

