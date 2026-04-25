import { Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../types';

function signToken(id: string, email: string, role: string, storeId: string): string {
  const secret = process.env.JWT_SECRET as jwt.Secret;
  const expiresIn = (process.env.JWT_EXPIRES_IN ?? '7d') as jwt.SignOptions['expiresIn'];

  return jwt.sign(
    { id, email, role, storeId },
    secret,
    { expiresIn }
  );
}

// POST /api/auth/login
export async function login(req: AuthRequest, res: Response): Promise<void> {
  if (!req.models) {
    res.status(400).json({ message: 'OneShop-Tenant-ID header is required' });
    return;
  }

  const { User } = req.models;
  const { email, password } = req.body as { email?: string; password?: string };
  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail || !password) {
    res.status(400).json({ message: 'Email and password are required' });
    return;
  }

  // Include password (excluded by default via select:false)
  const user = await User.findOne({ email: normalizedEmail }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    res.status(401).json({ message: 'Invalid email or password' });
    return;
  }

  if (!user.isActive) {
    res.status(403).json({ message: 'Your account has been deactivated' });
    return;
  }

  // One-time migration for legacy plaintext passwords.
  if (!user.password.startsWith('$2')) {
    const hashed = await bcrypt.hash(password, 12);
    await User.updateOne({ _id: user._id }, { $set: { password: hashed } });
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  const token = signToken(user.id as string, user.email, user.role, user.storeId);

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
export async function register(req: AuthRequest, res: Response): Promise<void> {
  const { User } = req.models!;
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
    storeId: storeId ?? req.user?.storeId ?? process.env.DEFAULT_STORE_ID ?? 'STORE-2025-001',
  });

  const token = signToken(user.id as string, user.email, user.role, user.storeId);

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

// POST /api/auth/change-password  (protected)
export async function changePassword(req: AuthRequest, res: Response): Promise<void> {
  const { User } = req.models!;
  const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };

  if (!currentPassword || !newPassword) {
    res.status(400).json({ message: 'Current password and new password are required' });
    return;
  }

  if (newPassword.length < 8) {
    res.status(400).json({ message: 'New password must be at least 8 characters' });
    return;
  }

  const user = await User.findById(req.user?.id).select('+password');
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    res.status(401).json({ message: 'Current password is incorrect' });
    return;
  }

  user.password = newPassword;
  await user.save();

  res.json({ message: 'Password changed successfully' });
}

// GET /api/auth/me  (protected)
export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  const { User } = req.models!;
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
    phone: user.phone ?? '',
    avatar: user.avatar ?? '',
    lastLogin: user.lastLogin,
  });
}

// PATCH /api/auth/profile  (protected)
export async function updateProfile(req: AuthRequest, res: Response): Promise<void> {
  const { User } = req.models!;
  const { name, phone } = req.body as { name?: string; phone?: string };

  if (!name?.trim()) {
    res.status(400).json({ message: 'Name is required' });
    return;
  }

  const user = await User.findById(req.user?.id);
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  user.name = name.trim();
  if (phone !== undefined) user.phone = phone.trim();

  await user.save({ validateBeforeSave: true });

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    storeId: user.storeId,
    phone: user.phone ?? '',
    avatar: user.avatar ?? '',
  });
}

// POST /api/auth/profile/avatar  (protected)
export async function uploadAvatar(req: AuthRequest, res: Response): Promise<void> {
  const { User } = req.models!;
  if (!req.file) {
    res.status(400).json({ message: 'No file uploaded' });
    return;
  }

  const user = await User.findById(req.user?.id);
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  user.avatar = `/uploads/avatars/${req.file.filename}`;
  await user.save({ validateBeforeSave: false });

  res.json({ avatar: user.avatar });
}
