import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { buildDateFilter } from '../utils/dateRange';

interface TxnStat {
  _id: string;
  revenue: number;
  transactions: number;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatLastActive(date?: Date): string {
  if (!date) return 'Never';
  return date.toLocaleString('en-LK', { dateStyle: 'short', timeStyle: 'short' });
}

// ── GET /api/employees ─────────────────────────────────────────────────────
export async function getEmployees(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { User, Transaction } = req.models!;
    const { search, role, status, preset, startDate, endDate } = req.query;

    const filter: Record<string, unknown> = {};

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

    const dateFilter = buildDateFilter(
      preset as string,
      startDate as string,
      endDate as string
    );

    const [users, txnStats] = await Promise.all([
      User.find(filter).sort({ createdAt: 1 }),
      Transaction.aggregate<TxnStat>([
        { $match: { ...dateFilter, status: 'success' } },
        {
          $group: {
            _id: '$createdBy',
            revenue: { $sum: '$amount' },
            transactions: { $sum: 1 },
          },
        },
      ]),
    ]);

    const statsMap = new Map(txnStats.map((s) => [String(s._id), s]));

    const employees = users.map((u) => {
      const stats = statsMap.get(String(u._id));
      return {
        id: u._id,
        name: u.name,
        avatar: u.avatar || getInitials(u.name),
        role: u.role,
        email: u.email,
        phone: u.phone ?? '',
        revenue: stats?.revenue ?? 0,
        transactions: stats?.transactions ?? 0,
        lastActive: formatLastActive(u.lastLogin),
        status: u.isActive ? 'active' : 'inactive',
      };
    });

    // Filter to only show employees with activity in the selected range
    // but show everyone if 'all-time' is selected or if there are no date constraints
    const filteredEmployees = employees.filter(emp => {
      if (preset && preset !== 'all-time') {
        return emp.transactions > 0;
      }
      return true;
    });

    res.json({ data: filteredEmployees, total: filteredEmployees.length });
  } catch (err) {
    next(err);
  }
}

// ── PUT /api/employees/:id/deactivate ─────────────────────────────────────
export async function deactivateEmployee(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { User } = req.models!;

    const user = await User.findByIdAndUpdate(
      req.params.id,
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

// ── PUT /api/employees/:id/activate ───────────────────────────────────────
export async function activateEmployee(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { User } = req.models!;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true }
    );

    if (!user) {
      res.status(404).json({ message: 'Employee not found' });
      return;
    }

    res.json({ message: 'Employee activated', data: { id: user._id, isActive: user.isActive } });
  } catch (err) {
    next(err);
  }
}
