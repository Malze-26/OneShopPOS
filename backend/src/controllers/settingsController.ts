import { Request, Response } from 'express';
import { AuthRequest } from '../types';
import { StoreSettings } from '../models/StoreSettings';

// GET /api/settings — public
export async function getSettings(req: Request, res: Response): Promise<void> {
  const settings = await StoreSettings.findOne();
  if (!settings) {
    res.status(404).json({ message: 'Store settings not found' });
    return;
  }
  res.json({ data: settings });
}

// PATCH /api/settings — Manager only
export async function updateSettings(req: AuthRequest, res: Response): Promise<void> {
  const { storeId } = req.user!;
  const { storeName, currency, currencyLocale, address, phone, email } = req.body;

  const settings = await StoreSettings.findOneAndUpdate(
    { storeId },
    { ...(storeName && { storeName }), ...(currency && { currency }), ...(currencyLocale && { currencyLocale }), ...(address !== undefined && { address }), ...(phone !== undefined && { phone }), ...(email !== undefined && { email }) },
    { new: true, runValidators: true }
  );

  if (!settings) {
    res.status(404).json({ message: 'Store settings not found' });
    return;
  }

  res.json({ data: settings });
}
