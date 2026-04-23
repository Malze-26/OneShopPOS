import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { User } from '../models/User';
import { Transaction } from '../models/Transaction';

// ── Types ──────────────────────────────────────────────────────────────────

interface TxnStat {
  _id: string;
  revenue: number;
  transactions: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Derives a two-letter uppercase avatar string from a full name. */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/** Formats a Date to a short local date+time string for Sri Lanka. */
function formatLastActive(date?: Date): string {
  if (!date) return 'Never';
  return date.toLocaleString('en-LK', { dateStyle: 'short', timeStyle: 'short' });
}

// ── GET /api/employees ─────────────────────────────────────────────────────

/**
 * Returns all employees for the authenticated store with their transaction stats.
 * Supports optional query filters:
 *   - search: matches name, email, or phone (case-insensitive)
 *   - role: 'Manager' | 'Cashier' | 'Sales Representative'
 *   - status: 'Active' | 'Inactive'
 *
 * Transaction revenue and count are fetched in a single aggregation and merged
 * in-memory to avoid N+1 queries.
 */
export async function getEmployees(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = req.user!.storeId;
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

    const [users, txnStats] = await Promise.all([
      User.find(filter).sort({ createdAt: 1 }),
      Transaction.aggregate<TxnStat>([
        { $match: { storeId, status: 'success' } },
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

    res.json({ data: employees, total: employees.length });
  } catch (err) {
    next(err);
  }
}

// ── PUT /api/employees/:id/deactivate ─────────────────────────────────────

/**
 * Deactivates an employee account (sets isActive to false).
 * A deactivated employee cannot log in.
 * Returns 404 if the employee does not belong to the authenticated store.
 */
export async function deactivateEmployee(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = req.user!.storeId;

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

// ── PUT /api/employees/:id/activate ───────────────────────────────────────

/**
 * Re-activates a previously deactivated employee account.
 * Returns 404 if the employee does not belong to the authenticated store.
 */
export async function activateEmployee(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = req.user!.storeId;

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, storeId },
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
