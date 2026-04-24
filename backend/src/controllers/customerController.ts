import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';

// GET /api/customers
export async function getCustomers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { Customer } = req.models!;
    const { search, sort } = req.query;

    const filter: Record<string, unknown> = {};

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
    const totalCount = await Customer.countDocuments({});

    res.json({ data: customers, total: customers.length, totalCount });
  } catch (err) {
    next(err);
  }
}

// GET /api/customers/:id
export async function getCustomer(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { Customer } = req.models!;
    const customer = await Customer.findById(req.params.id);

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
    const { Customer } = req.models!;
    const storeId = req.user!.storeId;
    const { name, email, phone } = req.body;

    if (!name?.trim()) {
      res.status(400).json({ message: 'Customer name is required' });
      return;
    }

    const avatar = name.trim().split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

    const customer = await Customer.create({ name: name.trim(), email, phone, avatar, storeId });
    res.status(201).json({ data: customer });
  } catch (err) {
    next(err);
  }
}

// PUT /api/customers/:id
export async function updateCustomer(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { Customer } = req.models!;
    const { name, email, phone } = req.body;

    if (!name?.trim()) {
      res.status(400).json({ message: 'Customer name is required' });
      return;
    }

    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      res.status(404).json({ message: 'Customer not found' });
      return;
    }

    const avatar = name.trim() !== customer.name
      ? name.trim().split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
      : customer.avatar;

    customer.name = name.trim();
    customer.email = email;
    customer.phone = phone;
    customer.avatar = avatar;

    await customer.save();
    res.json({ data: customer });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/customers/:id
export async function deleteCustomer(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { Customer } = req.models!;
    const customer = await Customer.findByIdAndDelete(req.params.id);

    if (!customer) {
      res.status(404).json({ message: 'Customer not found' });
      return;
    }

    res.json({ message: 'Customer deleted successfully' });
  } catch (err) {
    next(err);
  }
}

// GET /api/customers/:id/orders
export async function getCustomerOrders(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { Customer, Order } = req.models!;
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      res.status(404).json({ message: 'Customer not found' });
      return;
    }

    const filter: Record<string, unknown> = {};
    if (customer.email) {
      filter.customerEmail = customer.email;
    } else {
      filter.customerName = customer.name;
    }

    const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(50);
    res.json({ data: orders });
  } catch (err) {
    next(err);
  }
}

// GET /api/customers/stats
export async function getCustomerStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { Customer } = req.models!;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalCount, newThisMonth, avgLifetimeValue] = await Promise.all([
      Customer.countDocuments({}),
      Customer.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Customer.aggregate([
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
