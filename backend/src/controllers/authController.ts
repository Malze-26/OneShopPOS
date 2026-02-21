import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { AuthRequest } from '../types';

function signToken(id: string, email: string, role: string): string {
  return jwt.sign(
    { id, email, role },
    process.env.JWT_SECRET as string,
    { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' }
  );
}

// POST /api/auth/login
export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ message: 'Email and password are required' });
    return;
  }

  // Include password (excluded by default via select:false)
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    res.status(401).json({ message: 'Invalid email or password' });
    return;
  }

  if (!user.isActive) {
    res.status(403).json({ message: 'Your account has been deactivated' });
    return;
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  const token = signToken(user.id as string, user.email, user.role);

  res.status(200).json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      storeId: user.storeId,
    },
  });
}

// POST /api/auth/register  (protected - Manager only in production)
export async function register(req: Request, res: Response): Promise<void> {
  const { name, email, password, role, storeId } = req.body as {
    name?: string;
    email?: string;
    password?: string;
    role?: 'Manager' | 'Cashier';
    storeId?: string;
  };

  if (!name || !email || !password) {
    res.status(400).json({ message: 'Name, email, and password are required' });
    return;
  }

  const existing = await User.findOne({ email });
  if (existing) {
    res.status(409).json({ message: 'Email is already registered' });
    return;
  }

  const user = await User.create({
    name,
    email,
    password,
    role: role ?? 'Cashier',
    storeId: storeId ?? 'STORE-2025-001',
  });

  const token = signToken(user.id as string, user.email, user.role);

  res.status(201).json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      storeId: user.storeId,
    },
  });
}

// GET /api/auth/me  (protected)
export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  const user = await User.findById(req.user?.id);
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }
  res.status(200).json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    storeId: user.storeId,
    lastLogin: user.lastLogin,
  });
}
