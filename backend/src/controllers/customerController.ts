import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { Customer } from '../models/Customer';

// GET /api/customers
export async function getCustomers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = req.user?.storeId ?? 'STORE-2025-001';
    const { search, sort } = req.query;

    const filter: Record<string, unknown> = { storeId };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    let sortQuery: Record<string, 1 | -1> = { createdAt: -1 };
    if (sort === 'spent_high') sortQuery = { totalSpent: -1 };
    else if (sort === 'spent_low') sortQuery = { totalSpent: 1 };
    else if (sort === 'orders') sortQuery = { totalOrders: -1 };

    const customers = await Customer.find(filter).sort(sortQuery);
    const totalCount = await Customer.countDocuments({ storeId });

    res.json({ data: customers, total: customers.length, totalCount });
  } catch (err) {
    next(err);
  }
}

// GET /api/customers/:id
export async function getCustomer(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = req.user?.storeId ?? 'STORE-2025-001';
    const customer = await Customer.findOne({ _id: req.params.id, storeId });

    if (!customer) {
      res.status(404).json({ message: 'Customer not found' });
      return;
    }

    res.json({ data: customer });
  } catch (err) {
    next(err);
  }
}

// POST /api/customers
export async function createCustomer(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = req.user?.storeId ?? 'STORE-2025-001';
    const { name, email, phone } = req.body;

    if (!name?.trim()) {
      res.status(400).json({ message: 'Customer name is required' });
      return;
    }

    // Auto-generate avatar initials
    const avatar = name.trim().split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

    const customer = await Customer.create({ name: name.trim(), email, phone, avatar, storeId });
    res.status(201).json({ data: customer });
  } catch (err) {
    next(err);
  }
}

// GET /api/customers/stats
export async function getCustomerStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = req.user?.storeId ?? 'STORE-2025-001';

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalCount, newThisMonth, avgLifetimeValue] = await Promise.all([
      Customer.countDocuments({ storeId }),
      Customer.countDocuments({ storeId, createdAt: { $gte: startOfMonth } }),
      Customer.aggregate([
        { $match: { storeId } },
        { $group: { _id: null, avg: { $avg: '$totalSpent' } } },
      ]),
    ]);

    res.json({
      totalCustomers: totalCount,
      newThisMonth,
      avgLifetimeValue: Math.round(avgLifetimeValue[0]?.avg ?? 0),
    });
  } catch (err) {
    next(err);
  }
}
