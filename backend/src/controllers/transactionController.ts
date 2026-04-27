import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';

function generateTxnId(): string {
  const num = Math.floor(Math.random() * 90000) + 10000;
  return `TXN-${num}`;
}

// GET /api/transactions
export async function getTransactions(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { Transaction } = req.models!;
    const { payment, search, startDate, endDate, page = '1', limit = '20', customerId } = req.query;

    const filter: Record<string, unknown> = {};

    if (customerId) filter.customerId = customerId; 
    if (payment && payment !== 'All') filter.paymentMethod = payment;
    if (search) filter.txnId = { $regex: search, $options: 'i' };
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) (filter.createdAt as Record<string, Date>).$gte = new Date(startDate as string);
      if (endDate) (filter.createdAt as Record<string, Date>).$lte = new Date(endDate as string);
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [transactions, total] = await Promise.all([
      Transaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit as string)),
      Transaction.countDocuments(filter),
    ]);

    res.json({ data: transactions, total, page: parseInt(page as string), limit: parseInt(limit as string) });
  } catch (err) {
    next(err);
  }
}

// GET /api/transactions/stats
export async function getTransactionStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { Transaction } = req.models!;

    const stats = await Transaction.aggregate([
      { $match: { status: 'success' } },
      {
        $group: {
          _id: '$paymentMethod',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    const result: Record<string, { total: number; count: number }> = {
      Cash: { total: 0, count: 0 },
      Card: { total: 0, count: 0 },
    };

    stats.forEach((s) => {
      result[s._id] = { total: s.total, count: s.count };
    });

    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

// POST /api/transactions
export async function createTransaction(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { Transaction, Customer } = req.models!;
    const storeId = req.user!.storeId;
    const userId = req.user?.id;

    const txnId = generateTxnId();

    const transaction = await Transaction.create({
      ...req.body,
      txnId,
      storeId,
      createdBy: userId,
    });

    // Award loyalty points: 1 point per Rs. 100 spent
    if (req.body.customerId && req.body.customerId !== 'guest') {
      const pointsEarned = Math.floor(req.body.amount / 100);
      await Customer.findByIdAndUpdate(req.body.customerId, {
        $inc: {
          loyaltyPoints: pointsEarned,
          totalOrders: 1,
          totalSpent: req.body.amount,
        },
        lastPurchase: new Date(),
      });
    }

    res.status(201).json({ data: transaction });
  } catch (err) {
    next(err);
  }
}

// GET /api/transactions/:id
export async function getTransaction(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { Transaction } = req.models!;
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      res.status(404).json({ message: 'Transaction not found' });
      return;
    }

    res.json({ data: transaction });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/transactions/:id/void — Void transaction
export async function voidTransaction(req: AuthRequest, res: Response): Promise<void> {
  const { Transaction, Order, Product, StockHistory } = req.models!;
  const transaction = await Transaction.findById(req.params.id);
  if (!transaction) {
    res.status(404).json({ message: 'Transaction not found' });
    return;
  }
  if (transaction.status === 'voided') {
    res.status(400).json({ message: 'Transaction already voided' });
    return;
  }

  // Restore inventory by finding the order and incrementing stock for each item
  const order = await Order.findOne({ orderId: transaction.orderId });
  if (order) {
    for (const item of order.items) {
      // Increment product stock back
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
      // Log the restoration in StockHistory
      await StockHistory.create({
        product:  item.product,
        type:     'add',
        quantity: item.quantity,
        reason:   `Transaction voided: ${transaction.txnId}`,
        by:       req.user!.id,
        storeId:  transaction.storeId,
      });
    }
  }

  transaction.status = 'voided';
  await transaction.save();
  res.status(200).json({ message: 'Transaction voided successfully', data: transaction });
}


