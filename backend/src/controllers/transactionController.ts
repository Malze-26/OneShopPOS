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
        // ── Loyalty points validation ────────────────────────────────────────
        // Points are earned on the pre-loyalty subtotal (amount = subtotal - promoDiscount).
        // This prevents loyalty redemption from reducing earned points.
        const preDiscountBase = req.body.amount ?? 0; // subtotal after promo, before loyalty
        const pointsEarned = Math.floor(preDiscountBase / 100);

        // Validate how many points the client wants to redeem
        const rawPointsUsed = parseInt(req.body.loyaltyPointsUsed, 10) || 0;

        // Server-side guards:
        // 1. Cannot exceed customer's actual balance
        // 2. Cannot exceed the order value (prevents over-discount)
        // 3. Cannot be negative
        const maxAllowedByBalance = Math.max(0, customer.loyaltyPoints || 0);
        const maxAllowedByOrder   = Math.floor(preDiscountBase); // 1 pt = Rs 1
        const pointsUsed = Math.min(
          Math.max(0, rawPointsUsed),
          maxAllowedByBalance,
          maxAllowedByOrder,
        );

        // Server always computes loyaltyDiscount — never trust client value
        const loyaltyDiscount = pointsUsed; // 1 point = Rs 1

        // Atomic deduction: only deduct if balance is still sufficient.
        // This prevents a race condition where two simultaneous transactions
        // both read the same balance and both are allowed.
        if (pointsUsed > 0) {
          const deductResult = await Customer.findOneAndUpdate(
            { _id: req.body.customerId, loyaltyPoints: { $gte: pointsUsed } },
            { $inc: { loyaltyPoints: -pointsUsed } },
            { new: true }
          );
          if (!deductResult) {
            res.status(409).json({ message: 'Insufficient loyalty points — balance may have changed. Please refresh and try again.' });
            return;
          }
        }

        // Patch the saved transaction with server-computed loyalty values
        // so the stored record reflects the validated numbers, not client-sent ones
        await Transaction.collection.updateOne(
          { _id: transaction._id },
          { $set: { loyaltyDiscount, loyaltyPointsUsed: pointsUsed, pointsEarned } }
        );

        const [agg] = await Transaction.aggregate([
          { $match: { customerId: req.body.customerId, status: 'success' } },
          { $group: { _id: null, totalSpent: { $sum: { $ifNull: ['$total', '$amount'] } }, totalOrders: { $sum: 1 }, lastPurchase: { $max: '$createdAt' } } },
        ]);

        const netPointsChange = pointsEarned - 0; // deduction already done atomically above
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
              customerName:      customer.name,
              customerEmail:     customer.email,
              orderId:           txnId,
              items:             req.body.items || [],
              subtotal:          req.body.amount,
              discount:          req.body.discount || 0,
              discountCode:      req.body.discountCode || req.body.promoCode,
              loyaltyDiscount,
              loyaltyPointsUsed: pointsUsed,
              pointsEarned,
              total:             req.body.total ?? req.body.amount,
              paymentMethod:     req.body.paymentMethod,
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
    const { Transaction, Product, StockHistory, User } = req.models!;

    // Check manager authorization: either logged-in user is Manager or override credentials provided
    let authorizedByManager = req.user?.role === 'Manager';
    let managerName = req.user?.name || 'Manager';

    if (!authorizedByManager) {
      const { managerEmail, managerPassword } = req.body || {};
      if (!managerEmail || !managerPassword) {
        res.status(403).json({ message: 'Manager authorization required. Please provide manager credentials.' });
        return;
      }

      const manager = await User.findOne({ email: String(managerEmail).trim().toLowerCase() }).select('+password');
      if (!manager || !(await manager.comparePassword(managerPassword))) {
        res.status(401).json({ message: 'Invalid manager email or password' });
        return;
      }

      if (manager.role !== 'Manager') {
        res.status(403).json({ message: 'The specified user is not authorized as a Manager' });
        return;
      }

      if (!manager.isActive) {
        res.status(403).json({ message: 'This manager account is inactive' });
        return;
      }

      authorizedByManager = true;
      managerName = manager.name;
    }

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
          reason: `Transaction voided: ${transaction.txnId} (Authorized by ${managerName})`,
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

      // Use the saved pointsEarned from when the transaction was created,
      // not a recomputed value — prevents drift if total changed.
      const pointsEarned = transaction.pointsEarned || 0;
      const pointsUsed   = transaction.loyaltyPointsUsed || 0;

      // Reverse: refund the redeemed points back, deduct the earned points.
      // Do these as two separate guarded increments:
      // 1. Refund redeemed points (always safe to add back)
      // 2. Deduct earned points (guarded — cannot go below 0)
      const customer = await Customer.findById(transaction.customerId);
      if (customer) {
        let netPointsDelta = pointsUsed - pointsEarned; // positive = net refund, negative = net deduction

        // If net is negative (customer would go below 0), clamp to -(current balance)
        if (netPointsDelta < 0) {
          netPointsDelta = Math.max(netPointsDelta, -customer.loyaltyPoints);
        }

        await Customer.findByIdAndUpdate(transaction.customerId, {
          $set: {
            totalSpent:   agg?.totalSpent  ?? 0,
            totalOrders:  agg?.totalOrders ?? 0,
            lastPurchase: agg?.lastPurchase ?? new Date(),
          },
          $inc: { loyaltyPoints: netPointsDelta },
        });
      }
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