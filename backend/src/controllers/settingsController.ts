import { Response } from 'express';
import { AuthRequest } from '../types';

// GET /api/settings — requires tenant header (set by tenantMiddleware)
export async function getSettings(req: AuthRequest, res: Response): Promise<void> {
  if (!req.models) {
    res.status(400).json({ message: 'OneShop-Tenant-ID header is required' });
    return;
  }
  const { StoreSettings } = req.models;
  const settings = await StoreSettings.findOne();
  if (!settings) {
    res.status(404).json({ message: 'Store settings not found' });
    return;
  }
  res.json({ data: settings });
}

// PATCH /api/settings — Manager only
export async function updateSettings(req: AuthRequest, res: Response): Promise<void> {
  const { StoreSettings } = req.models!;
  const { storeId } = req.user!;
  const { storeName, currency, currencyLocale, address, phone, email, primaryColor } = req.body;

  const update: Record<string, string> = {};
  if (storeName)              update.storeName      = storeName;
  if (currency)               update.currency       = currency;
  if (currencyLocale)         update.currencyLocale = currencyLocale;
  if (address !== undefined)  update.address        = address;
  if (phone !== undefined)    update.phone          = phone;
  if (email !== undefined)    update.email          = email;
  if (primaryColor) {
    const clean = '#' + String(primaryColor).replace(/^#+/, '');
    if (/^#[0-9a-fA-F]{6}$/.test(clean)) update.primaryColor = clean;
  }

  const settings = await StoreSettings.findOneAndUpdate(
    { storeId },
    update,
    { new: true, runValidators: true }
  );

  if (!settings) {
    res.status(404).json({ message: 'Store settings not found' });
    return;
  }

  res.json({ data: settings });
}

// POST /api/settings/logo — Manager only
export async function uploadLogo(req: AuthRequest, res: Response): Promise<void> {
  const { StoreSettings } = req.models!;
  const { storeId } = req.user!;

  if (!req.file) {
    res.status(400).json({ message: 'No file uploaded' });
    return;
  }

  const logoUrl = `/uploads/logo/${req.file.filename}?v=${Date.now()}`;

  const settings = await StoreSettings.findOneAndUpdate(
    { storeId },
    { logoUrl },
    { new: true }
  );

  if (!settings) {
    res.status(404).json({ message: 'Store settings not found' });
    return;
  }

  res.json({ data: settings });
}
