import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { Transaction } from '../models/Transaction';

function generateTxnId(): string {
  const num = Math.floor(Math.random() * 90000) + 10000;
  return `TXN-${num}`;
}

// GET /api/transactions
export async function getTransactions(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = req.user?.storeId ?? 'STORE-2025-001';
    const { payment, search, startDate, endDate, page = '1', limit = '20' } = req.query;

    const filter: Record<string, unknown> = { storeId };

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
    const storeId = req.user?.storeId ?? 'STORE-2025-001';

    const stats = await Transaction.aggregate([
      { $match: { storeId, status: 'success' } },
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
      'Bank Transfer': { total: 0, count: 0 },
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
    const storeId = req.user?.storeId ?? 'STORE-2025-001';
    const userId = req.user?.id;

    const txnId = generateTxnId();

    const transaction = await Transaction.create({
      ...req.body,
      txnId,
      storeId,
      createdBy: userId,
    });

    res.status(201).json({ data: transaction });
  } catch (err) {
    next(err);
  }
}

// GET /api/transactions/:id
export async function getTransaction(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = req.user?.storeId ?? 'STORE-2025-001';
    const transaction = await Transaction.findOne({ _id: req.params.id, storeId });

    if (!transaction) {
      res.status(404).json({ message: 'Transaction not found' });
      return;
    }

    res.json({ data: transaction });
  } catch (err) {
    next(err);
  }
}
