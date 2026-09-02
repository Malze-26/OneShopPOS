import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { sendReceiptEmail } from '../utils/sendReceiptEmail';

function generateTxnId(): string {
  const num = Math.floor(Math.random() * 90000) + 10000;
  return `TXN-${num}`;
}

// GET /api/transactions
export async function getTransactions(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { Transaction } = req.models!;
    const { payment, search, startDate, endDate, page = '1', limit = '20', customerId, customer } = req.query;

    const filter: Record<string, unknown> = {};

    if (customerId && customer) {
      filter.$or = [
        { customerId: customerId as string },
        { customer: { $regex: `^${customer as string}$`, $options: 'i' } },
      ];
    } else if (customerId) {
      filter.customerId = customerId;
    } else if (customer) {
      filter.customer = { $regex: customer as string, $options: 'i' };
    }

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

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const stats = await Transaction.aggregate([
      { $match: { status: 'success', createdAt: { $gte: today, $lt: tomorrow } } },
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
    const { Transaction, Customer, Product, StockHistory, Promo } = req.models!;
    const storeId = req.user!.storeId;
    const userId = req.user?.id;

    const txnId = generateTxnId();

    // Enforce server-side statuses for new transactions to prevent client injection
    const status = 'success';
    const orderStatus = 'success';
    const paymentStatus = 'paid';

    const transaction = await Transaction.create({
      ...req.body,
      txnId,
      storeId,
      createdBy: userId,
      status,
      orderStatus,
      paymentStatus,
    });

    // Increment promo usage count if a promo code was applied
    const promoCode = req.body.discountCode || req.body.promoCode;
    if (promoCode && Promo) {
      await Promo.findOneAndUpdate(
        { code: String(promoCode).toUpperCase() },
        { $inc: { usedCount: 1 } }
      );
    }

    // Deduct inventory for each item in the POS transaction only if status is success
    if (status === 'success' && Array.isArray(req.body.items) && req.body.items.length > 0) {
      for (const item of req.body.items) {
        if (item.product) {
          await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
          await StockHistory.create({
            product:  item.product,
            type:     'remove',
            quantity: item.quantity,
            reason:   `POS Transaction ${txnId}`,
            by:       userId,
            storeId,
          });
        }
      }
    }

    // Recalculate customer stats, process loyalty redemption, and send receipt email
    if (req.body.customerId && req.body.customerId !== 'guest') {
      const customer = await Customer.findById(req.body.customerId);
      
      if (customer) {
        const amountPaid = req.body.total ?? req.body.amount;
        const pointsEarned = Math.floor(amountPaid / 100);

        // Server-side validation of loyalty points redemption
        const rawPointsUsed = parseInt(req.body.loyaltyPointsUsed, 10) || 0;
        // Cap points used by customer's actual balance to prevent over-redemption
        const pointsUsed = Math.min(Math.max(0, rawPointsUsed), customer.loyaltyPoints || 0);

        const [agg] = await Transaction.aggregate([
          { $match: { customerId: req.body.customerId, status: 'success' } },
          { $group: { _id: null, totalSpent: { $sum: { $ifNull: ['$total', '$amount'] } }, totalOrders: { $sum: 1 }, lastPurchase: { $max: '$createdAt' } } },
        ]);

        const netPointsChange = pointsEarned - pointsUsed;

        await Customer.findByIdAndUpdate(req.body.customerId, {
          $set: {
            totalSpent:   agg?.totalSpent  ?? 0,
            totalOrders:  agg?.totalOrders ?? 0,
            lastPurchase: agg?.lastPurchase ?? new Date(),
          },
          $inc: { loyaltyPoints: netPointsChange },
        });

        // Send receipt email if customer has email
        if (customer.email) {
          try {
            await sendReceiptEmail({
              customerName:  customer.name,
              customerEmail: customer.email,
              orderId:       txnId,
              items:         req.body.items || [],
              subtotal:      req.body.amount,
              discount:      req.body.discount || 0,
              total:         req.body.total ?? req.body.amount,
              paymentMethod: req.body.paymentMethod,
              date: new Date().toLocaleDateString('en-LK', {
                day: '2-digit', month: 'short', year: 'numeric',
              }),
            });
          } catch (emailErr) {
            console.error('Failed to send receipt email:', emailErr);
            // don't fail the transaction if email fails
          }
        }
      }
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
export async function voidTransaction(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { Transaction, Product, StockHistory } = req.models!;
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      res.status(404).json({ message: 'Transaction not found' });
      return;
    }

    if (transaction.paymentStatus === 'voided') {
      res.status(400).json({ message: 'Transaction already voided' });
      return;
    }

    await Transaction.collection.updateOne(
      { _id: transaction._id },
      { $set: { status: 'voided', orderStatus: 'cancelled', paymentStatus: 'voided' } }
    );

    if (transaction.items?.length > 0) {
      for (const item of transaction.items) {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });

        await StockHistory.create({
          product: item.product,
          type: 'add',
          quantity: item.quantity,
          reason: `Transaction voided: ${transaction.txnId}`,
          by: req.user!.id,
          storeId: transaction.storeId,
        });
      }
    }

    // Revert customer loyalty points and recalculate stats if linked to a customer
    if (transaction.customerId && transaction.customerId !== 'guest') {
      const { Customer } = req.models!;
      const [agg] = await Transaction.aggregate([
        { $match: { customerId: transaction.customerId, status: 'success' } },
        { $group: { _id: null, totalSpent: { $sum: { $ifNull: ['$total', '$amount'] } }, totalOrders: { $sum: 1 }, lastPurchase: { $max: '$createdAt' } } },
      ]);

      const amountPaid = transaction.total ?? transaction.amount;
      const pointsEarned = Math.floor(amountPaid / 100);
      const pointsUsed = transaction.loyaltyPointsUsed || 0;
      const reversePoints = pointsUsed - pointsEarned; // Refund used points, take back earned points

      await Customer.findByIdAndUpdate(transaction.customerId, {
        $set: {
          totalSpent:   agg?.totalSpent  ?? 0,
          totalOrders:  agg?.totalOrders ?? 0,
          lastPurchase: agg?.lastPurchase ?? new Date(),
        },
        $inc: { loyaltyPoints: reversePoints },
      });
    }

    const updated = await Transaction.findById(transaction._id).lean();

    res.status(200).json({
      message: 'Transaction voided successfully',
      data: updated,
    });

  } catch (error) {
    next(error);
  }
}