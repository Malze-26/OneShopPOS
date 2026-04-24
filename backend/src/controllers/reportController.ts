import { Response } from 'express';
import { AuthRequest } from '../types';
import { buildDateFilter, getDateRangeLabel } from '../utils/dateRange';

// ============= Sales by Product Report =============
export const getSalesByProductReport = async (req: AuthRequest, res: Response) => {
  try {
    const { Order } = req.models!;
    const { preset, startDate, endDate } = req.query;

    const dateMatchFilter = buildDateFilter(
      preset as string,
      startDate as string,
      endDate as string
    );
    const dateLabel = getDateRangeLabel(preset as string, startDate as string, endDate as string);

    const salesData = await Order.aggregate([
      {
        $match: {
          ...dateMatchFilter,
          status: { $ne: 'cancelled' },
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          totalQty: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.unitPrice'] } },
          productName: { $first: '$items.productName' },
          sku: { $first: '$items.sku' },
        },
      },
      { $sort: { totalQty: -1 } },
      { $limit: 100 },
    ]);

    const topGrossingItem = await Order.aggregate([
      {
        $match: {
          ...dateMatchFilter,
          status: { $ne: 'cancelled' },
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.unitPrice'] } },
          productName: { $first: '$items.productName' },
        },
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 1 },
    ]);

    const totalUnitsSold = await Order.aggregate([
      {
        $match: {
          ...dateMatchFilter,
          status: { $ne: 'cancelled' },
        },
      },
      { $unwind: '$items' },
      { $group: { _id: null, total: { $sum: '$items.quantity' } } },
    ]);

    const topCategoryByRevenue = await Order.aggregate([
      {
        $match: {
          ...dateMatchFilter,
          status: { $ne: 'cancelled' },
        },
      },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productDetails',
        },
      },
      { $unwind: { path: '$productDetails', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$productDetails.category',
          totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.unitPrice'] } },
        },
      },
      { $match: { _id: { $ne: null } } },
      { $sort: { totalRevenue: -1 } },
      { $limit: 1 },
    ]);

    res.json({
      dateRange: dateLabel,
      summary: {
        totalUnitsSold: totalUnitsSold[0]?.total || 0,
        topGrossingItem: topGrossingItem[0]?.productName || 'N/A',
        topGrossingAmount: topGrossingItem[0]?.totalRevenue || 0,
        topCategory: topCategoryByRevenue[0]?._id || 'N/A',
        topCategoryRevenue: topCategoryByRevenue[0]?.totalRevenue || 0,
      },
      products: salesData.map((item) => ({
        sku: item.sku,
        name: item.productName,
        qty: item.totalQty,
        sales: item.totalRevenue,
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

    const salesSummary = await Order.aggregate([
      {
        $match: {
          ...dateMatchFilter,
          status: { $ne: 'cancelled' },
        },
      },
      {
        $group: {
          _id: null,
          grossSales: { $sum: '$total' },
          transactionCount: { $sum: 1 },
          refundAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'refunded'] }, '$total', 0],
            },
          },
          voidAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'cancelled'] }, '$total', 0],
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
          assetValue:  { $multiply: ['$stock', '$costPrice'] },
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
          sortBy === 'value'  ? { assetValue: -1 }
          : sortBy === 'stock'  ? { stock: -1 }
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
          assetValue:  { $multiply: ['$stock', '$costPrice'] },
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
          totalAssetValue:  { $sum: '$assetValue' },
          totalRetailValue: { $sum: '$retailValue' },
          lowStockCount:    { $sum: { $cond: [{ $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', '$lowStockThreshold'] }] }, 1, 0] } },
          outOfStockCount:  { $sum: { $cond: [{ $eq: ['$stock', 0] }, 1, 0] } },
          totalProducts:    { $sum: 1 },
          totalUnits:       { $sum: '$stock' },
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
        totalAssetValue:  Number(summaryData.totalAssetValue.toFixed(2)),
        totalRetailValue: Number(summaryData.totalRetailValue.toFixed(2)),
        lowStockCount:    summaryData.lowStockCount,
        outOfStockCount:  summaryData.outOfStockCount,
        totalProducts:    summaryData.totalProducts,
        totalUnits:       summaryData.totalUnits,
        potentialMargin:  Number((summaryData.totalRetailValue - summaryData.totalAssetValue).toFixed(2)),
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
    const { Order, Customer } = req.models!;
    const { preset, startDate, endDate } = req.query;

    const dateMatchFilter = buildDateFilter(
      preset as string,
      startDate as string,
      endDate as string
    );
    const dateLabel = getDateRangeLabel(preset as string, startDate as string, endDate as string);

    const uniqueCustomers = await Order.aggregate([
      { $match: { ...dateMatchFilter, status: { $ne: 'cancelled' } } },
      { $group: { _id: '$customerName' } },
      { $count: 'total' },
    ]);

    const topSpender = await Order.aggregate([
      { $match: { ...dateMatchFilter, status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: '$customerName',
          totalSpent: { $sum: '$total' },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 1 },
    ]);

    await Customer.find({}).lean();
    const newVsReturning = await Order.aggregate([
      { $match: { ...dateMatchFilter, status: { $ne: 'cancelled' } } },
      { $group: { _id: '$customerName', orderCount: { $sum: 1 } } },
      {
        $facet: {
          new:       [{ $match: { orderCount: 1 } }, { $count: 'count' }],
          returning: [{ $match: { orderCount: { $gt: 1 } } }, { $count: 'count' }],
        },
      },
    ]);

    const newCount = newVsReturning[0]?.new[0]?.count || 0;
    const returningCount = newVsReturning[0]?.returning[0]?.count || 0;
    const totalNewReturning = newCount + returningCount;
    const returningPercentage = totalNewReturning > 0 ? Math.round((returningCount / totalNewReturning) * 100) : 0;

    const customerList = await Order.aggregate([
      { $match: { ...dateMatchFilter, status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: '$customerName',
          phone: { $first: '$customerPhone' },
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$total' },
          lastOrder: { $max: '$createdAt' },
        },
      },
      {
        $addFields: {
          type: { $cond: [{ $eq: ['$totalOrders', 1] }, 'New', 'Returning'] },
          loyaltyTier: {
            $cond: [
              { $gte: ['$totalSpent', 100000] }, 'Platinum',
              { $cond: [
                { $gte: ['$totalSpent', 50000] }, 'Gold',
                { $cond: [{ $gte: ['$totalSpent', 20000] }, 'Silver', 'Bronze'] },
              ] },
            ],
          },
        },
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 50 },
      {
        $project: {
          name: '$_id', phone: 1, type: 1,
          orderCount: '$totalOrders', spent: '$totalSpent',
          loyaltyTier: 1, lastOrder: 1, _id: 0,
        },
      },
    ]);

    res.json({
      dateRange: dateLabel,
      summary: {
        uniqueCustomers: uniqueCustomers[0]?.total || 0,
        topSpender: topSpender[0]?.customerName || 'N/A',
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
