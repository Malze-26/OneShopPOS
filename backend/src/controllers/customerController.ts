import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { Transaction } from '../models/Transaction';

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

function parseDuplicateCustomerError(err: any): string {
  const msg = err?.message || '';
  const keyPattern = err?.keyPattern || err?.errorResponse?.keyPattern || {};
  const keyValue = err?.keyValue || err?.errorResponse?.keyValue || {};

  if (keyPattern.phone || msg.includes('phone') || keyValue.phone) {
    return 'A customer with this phone number already exists.';
  }
  if (keyPattern.email || msg.includes('email') || keyValue.email) {
    return 'A customer with this email address already exists.';
  }
  return 'A customer with this phone number or email already exists.';
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
    if (!phone?.trim()) {
      res.status(400).json({ message: 'Customer phone number is required' });
      return;
    }

    const cleanPhone = phone.trim();
    const cleanEmail = email?.trim() ? email.trim().toLowerCase() : undefined;

    // Check duplicate phone number
    const existingPhone = await Customer.findOne({ phone: cleanPhone });
    if (existingPhone) {
      res.status(400).json({ message: `A customer with phone number "${cleanPhone}" already exists.` });
      return;
    }

    // Check duplicate email (if provided)
    if (cleanEmail) {
      const existingEmail = await Customer.findOne({ email: cleanEmail });
      if (existingEmail) {
        res.status(400).json({ message: `A customer with email "${cleanEmail}" already exists.` });
        return;
      }
    }

    const avatar = name.trim().split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

    const customer = await Customer.create({
      name: name.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      avatar,
      storeId,
    });
    res.status(201).json({ data: customer });
  } catch (err: any) {
    if (err?.code === 11000 || err?.errorResponse?.code === 11000 || err?.message?.includes('E11000')) {
      res.status(400).json({ message: parseDuplicateCustomerError(err) });
      return;
    }
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
    if (!phone?.trim()) {
      res.status(400).json({ message: 'Customer phone number is required' });
      return;
    }

    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      res.status(404).json({ message: 'Customer not found' });
      return;
    }

    const cleanPhone = phone.trim();
    const cleanEmail = email?.trim() ? email.trim().toLowerCase() : undefined;

    // Check duplicate phone number against other customers
    const existingPhone = await Customer.findOne({ phone: cleanPhone, _id: { $ne: req.params.id } });
    if (existingPhone) {
      res.status(400).json({ message: `A customer with phone number "${cleanPhone}" already exists.` });
      return;
    }

    // Check duplicate email against other customers (if provided)
    if (cleanEmail) {
      const existingEmail = await Customer.findOne({ email: cleanEmail, _id: { $ne: req.params.id } });
      if (existingEmail) {
        res.status(400).json({ message: `A customer with email "${cleanEmail}" already exists.` });
        return;
      }
    }

    const avatar = name.trim() !== customer.name
      ? name.trim().split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
      : customer.avatar;

    customer.name = name.trim();
    customer.email = cleanEmail;
    customer.phone = cleanPhone;
    customer.avatar = avatar;

    await customer.save();
    res.json({ data: customer });
  } catch (err: any) {
    if (err?.code === 11000 || err?.errorResponse?.code === 11000 || err?.message?.includes('E11000')) {
      res.status(400).json({ message: parseDuplicateCustomerError(err) });
      return;
    }
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

// Normalizer for e-com orders in Order collection
function normalizeEcomOrder(doc: Record<string, unknown>) {
  const addr = doc.shippingAddress as Record<string, string> | undefined;
  const rawItems = ((doc.orderItems || doc.items || []) as Record<string, unknown>[]);
  const orderStatus = (doc.orderStatus ?? doc.status ?? 'delivered') as string;
  const paymentStatus = (doc.paymentStatus ?? 'paid') as string;
  const total = (doc.totalPrice ?? doc.total ?? doc.subtotal ?? 0) as number;
  const subtotal = (doc.itemsPrice ?? doc.subtotal ?? total) as number;

  return {
    _id: doc._id,
    orderId: (doc.orderId as string) || (doc.txnId as string) || String(doc._id),
    source: 'online' as const,
    customerName: (doc.customerName as string) || addr?.fullName || addr?.name || 'Customer',
    customerEmail: (doc.email as string) || (doc.customerEmail as string) || addr?.email,
    customerPhone: (doc.phone as string) || (doc.customerPhone as string) || addr?.phone,
    items: rawItems.map(item => {
      const qty = (item.qty ?? item.quantity ?? 1) as number;
      const price = (item.price ?? item.unitPrice ?? 0) as number;
      return {
        product: item.product,
        productName: (item.name || item.productName || 'Item') as string,
        sku: (item.sku || '') as string,
        quantity: qty,
        unitPrice: price,
        subtotal: (item.subtotal as number) ?? price * qty,
      };
    }),
    subtotal,
    discount: (doc.discount as number) ?? 0,
    total,
    status: orderStatus,
    paymentMethod: (doc.paymentMethod as string) || 'Cash',
    paymentStatus,
    createdAt: doc.createdAt,
  };
}

// GET /api/customers/:id/orders
export async function getCustomerOrders(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { Customer, Order, Transaction } = req.models!;
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      res.status(404).json({ message: 'Customer not found' });
      return;
    }

    const firstName = customer.name.split(' ')[0].trim();
    const orderConditions: Record<string, unknown>[] = [
      { user: customer._id },
      { user: customer._id.toString() },
      { customerName: { $regex: customer.name, $options: 'i' } },
      { 'shippingAddress.fullName': { $regex: customer.name, $options: 'i' } },
    ];
    if (firstName && firstName.length >= 3) {
      orderConditions.push({ customerName: { $regex: firstName, $options: 'i' } });
      orderConditions.push({ 'shippingAddress.fullName': { $regex: firstName, $options: 'i' } });
    }
    if (customer.email) {
      orderConditions.push({ customerEmail: { $regex: customer.email, $options: 'i' } });
      orderConditions.push({ email: { $regex: customer.email, $options: 'i' } });
    }
    if (customer.phone) {
      const digits = customer.phone.replace(/[^0-9]/g, '');
      if (digits.length >= 7) {
        orderConditions.push({ customerPhone: { $regex: digits.slice(-7) } });
        orderConditions.push({ 'shippingAddress.phone': { $regex: digits.slice(-7) } });
      }
    }

    const txnConditions: Record<string, unknown>[] = [
      { customerId: customer._id.toString() },
      { customer: { $regex: customer.name, $options: 'i' } },
    ];
    if (firstName && firstName.length >= 3) {
      txnConditions.push({ customer: { $regex: firstName, $options: 'i' } });
    }

    const [rawOrders, rawTransactions] = await Promise.all([
      Order.collection.find({ $or: orderConditions }).sort({ createdAt: -1 }).limit(50).toArray(),
      Transaction.collection.find({ $or: txnConditions }).sort({ createdAt: -1 }).limit(50).toArray(),
    ]);

    const normalizedOrders = rawOrders.map((doc) => normalizeEcomOrder(doc as Record<string, unknown>));

    const normalizedTxns = rawTransactions.map((t: Record<string, unknown>) => ({
      _id: t._id,
      orderId: (t.txnId as string) || (t.orderId as string) || String(t._id),
      source: 'physical' as const,
      customerName: (t.customer as string) || customer.name,
      items: (((t.items || []) as Record<string, unknown>[]).map((item) => ({
        product: item.product,
        productName: (item.productName || item.name || 'Item') as string,
        sku: (item.sku || '') as string,
        quantity: (item.quantity ?? item.qty ?? 1) as number,
        unitPrice: (item.unitPrice ?? item.price ?? 0) as number,
        subtotal: (item.subtotal ?? 0) as number,
      }))),
      subtotal: (t.amount as number) || (t.total as number) || 0,
      discount: (t.discount as number) ?? 0,
      total: (t.total as number) ?? (t.amount as number) ?? 0,
      status: (t.orderStatus ?? t.status ?? 'success') as string,
      paymentMethod: (t.paymentMethod as string) || 'Cash',
      paymentStatus: (t.paymentStatus ?? (t.status === 'success' ? 'paid' : 'voided')) as string,
      createdAt: t.createdAt,
    }));

    const combined = [...normalizedOrders, ...normalizedTxns].sort(
      (a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime()
    );

    res.json({ data: combined });
  } catch (err) {
    next(err);
  }
}

// POST /api/customers/recalc  — recompute totalSpent / totalOrders / lastPurchase from real orders & transactions
export async function recalcCustomerStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { Customer, Order, Transaction } = req.models!;
    const customers = await Customer.find({}).lean();
    let updated = 0;

    for (const c of customers) {
      const firstName = (c.name || '').split(' ')[0].trim();

      const orderConditions: Record<string, unknown>[] = [
        { user: c._id },
        { user: c._id.toString() },
        { customerName: c.name },
        { customerName: { $regex: `^${c.name}$`, $options: 'i' } },
        { 'shippingAddress.fullName': { $regex: `^${c.name}$`, $options: 'i' } },
      ];
      if (c.email) {
        orderConditions.push({ customerEmail: { $regex: `^${c.email}$`, $options: 'i' } });
        orderConditions.push({ email: { $regex: `^${c.email}$`, $options: 'i' } });
      }
      if (c.phone) {
        const digits = c.phone.replace(/[^0-9]/g, '');
        if (digits.length >= 7) {
          orderConditions.push({ customerPhone: { $regex: digits.slice(-7) } });
          orderConditions.push({ 'shippingAddress.phone': { $regex: digits.slice(-7) } });
        }
      }

      const txnConditions: Record<string, unknown>[] = [
        { customerId: c._id.toString() },
        { customer: c.name },
        { customer: { $regex: `^${c.name}$`, $options: 'i' } },
      ];
      if (firstName && firstName.length >= 3) {
        txnConditions.push({ customer: { $regex: `^${firstName}$`, $options: 'i' } });
      }

      const [orders, txns] = await Promise.all([
        Order.collection.find({ $or: orderConditions }).toArray(),
        Transaction.collection.find({ $or: txnConditions }).toArray(),
      ]);

      const validOrders = orders.filter((o) => {
        const s = ((o.orderStatus as string) || (o.status as string) || '').toLowerCase();
        const p = ((o.paymentStatus as string) || '').toLowerCase();
        return s !== 'cancelled' && s !== 'voided' && p !== 'voided' && p !== 'failed';
      });

      const validTxns = txns.filter((t) => {
        const s = ((t.orderStatus as string) || (t.status as string) || '').toLowerCase();
        const p = ((t.paymentStatus as string) || '').toLowerCase();
        return s !== 'cancelled' && s !== 'voided' && p !== 'voided' && p !== 'failed';
      });

      const totalOrders = validOrders.length + validTxns.length;
      const ordersSpent = validOrders.reduce((sum, o) => sum + ((o.totalPrice as number) ?? (o.total as number) ?? (o.subtotal as number) ?? 0), 0);
      const txnsSpent = validTxns.reduce((sum, t) => sum + ((t.total as number) ?? (t.amount as number) ?? (t.subtotal as number) ?? 0), 0);
      const totalSpent = Math.round(ordersSpent + txnsSpent);

      const allDates = [
        ...validOrders.map((o) => new Date(o.createdAt as string)),
        ...validTxns.map((t) => new Date(t.createdAt as string)),
      ].filter((d) => !isNaN(d.getTime()));

      const lastPurchase = allDates.length > 0 ? new Date(Math.max(...allDates.map((d) => d.getTime()))) : null;

      await Customer.findByIdAndUpdate(c._id, {
        $set: {
          totalOrders,
          totalSpent,
          lastPurchase,
        },
      });
      updated++;
    }

    res.json({ message: `Recalculated stats for ${updated} customers` });
  } catch (err) {
    next(err);
  }
}

// GET /api/customers/stats
export async function getCustomerStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { Customer  } = req.models!;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalCount, newThisMonth, revenueAgg] = await Promise.all([
      Customer.countDocuments({}),
      Customer.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Customer.aggregate([
    { $group: { _id: null, total: { $sum: '$totalSpent' }, avg: { $avg: '$totalSpent' } } },

  ]),
    ]);

    res.json({
      totalCustomers: totalCount,
      newThisMonth,
      totalRevenue: Math.round(revenueAgg[0]?.total ?? 0),
      avgSpend: Math.round(revenueAgg[0]?.avg ?? 0),    });
  } catch (err) {
    next(err);
  }
}
