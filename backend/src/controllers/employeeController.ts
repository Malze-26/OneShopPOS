import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { User } from '../models/User';
import { Transaction } from '../models/Transaction';

// GET /api/employees
export async function getEmployees(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = req.user?.storeId ?? 'STORE-2025-001';
    const { search, role, status } = req.query;

    const filter: Record<string, unknown> = { storeId };
    if (role && role !== 'All Roles') filter.role = role;
    if (status === 'Active') filter.isActive = true;
    if (status === 'Inactive') filter.isActive = false;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(filter).sort({ createdAt: 1 });

    // Aggregate transaction stats per user in one query
    const txnStats = await Transaction.aggregate([
      { $match: { storeId, status: 'success' } },
      {
        $group: {
          _id: '$createdBy',
          revenue: { $sum: '$amount' },
          transactions: { $sum: 1 },
        },
      },
    ]);

    const statsMap = new Map(txnStats.map((s) => [String(s._id), s]));

    const employees = users.map((u) => {
      const stats = statsMap.get(String(u._id));
      const initials = u.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

      return {
        id: u._id,
        name: u.name,
        avatar: initials,
        role: u.role,
        email: u.email,
        phone: u.phone ?? '',
        revenue: stats?.revenue ?? 0,
        transactions: stats?.transactions ?? 0,
        lastActive: u.lastLogin
          ? u.lastLogin.toLocaleString('en-LK', { dateStyle: 'short', timeStyle: 'short' })
          : 'Never',
        status: u.isActive ? 'active' : 'inactive',
      };
    });

    res.json({ data: employees, total: employees.length });
  } catch (err) {
    next(err);
  }
}

// PUT /api/employees/:id/deactivate
export async function deactivateEmployee(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = req.user?.storeId ?? 'STORE-2025-001';
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, storeId },
      { isActive: false },
      { new: true }
    );
    if (!user) {
      res.status(404).json({ message: 'Employee not found' });
      return;
    }
    res.json({ message: 'Employee deactivated', data: { id: user._id, isActive: user.isActive } });
  } catch (err) {
    next(err);
  }
}
