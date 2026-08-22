import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../types';
import { keyBelongsToTenant, publicUrl } from '../storage/s3';

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

  // Fetch subscriptionPlan from the tenant factory DB
  const tenantId = req.headers['oneshop-tenant-id'] as string | undefined;
  let subscriptionPlan = 'free';
  if (tenantId) {
    try {
      const factoryDb = process.env.TENANT_FACTORY_DB || 'oneshop-tenant-factory';
      const factoryConn = mongoose.connection.useDb(factoryDb, { useCache: true });
      const tenant = await factoryConn.collection('tenants').findOne(
        { databaseName: tenantId },
        { projection: { 'subscription.plan': 1 } }
      );
      if (tenant?.subscription?.plan) subscriptionPlan = tenant.subscription.plan as string;
    } catch { /* keep default */ }
  }

  res.json({ data: { ...settings.toObject(), subscriptionPlan } });
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
  const { key } = req.body as { key?: string };

  if (!key) {
    res.status(400).json({ message: 'key is required (upload the file to S3 first)' });
    return;
  }

  // The key was minted for this tenant; refuse anything pointing elsewhere.
  if (!keyBelongsToTenant(key, req.tenantDbName!)) {
    res.status(403).json({ message: 'Upload key does not belong to this store' });
    return;
  }

  // Cache-buster kept so an updated logo is picked up immediately.
  const logoUrl = `${publicUrl(key)}?v=${Date.now()}`;

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
