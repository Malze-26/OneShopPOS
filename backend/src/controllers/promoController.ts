import { Request, Response } from 'express';
import { Promo } from '../models/Promo';
import { AuthRequest } from '../types';

// POST /api/promos — Create promo (Manager only)
export async function createPromo(req: AuthRequest, res: Response): Promise<void> {
  const { code, type, value, minOrderAmount, maxUses, expiresAt } = req.body;

  if (!code || !type || !value || !expiresAt) {
    res.status(400).json({ message: 'Code, type, value and expiry are required' });
    return;
  }

  const existing = await Promo.findOne({ code: code.toUpperCase() });
  if (existing) {
    res.status(409).json({ message: 'Promo code already exists' });
    return;
  }

  const promo = await Promo.create({
    code: code.toUpperCase(),
    type,
    value,
    minOrderAmount: minOrderAmount ?? 0,
    maxUses: maxUses ?? 0,
    expiresAt,
    storeId: req.user!.storeId,
    createdBy: req.user?.id,
  });

  res.status(201).json({ data: promo });
}

// GET /api/promos — Get all promos (Manager only)
export async function getPromos(req: AuthRequest, res: Response): Promise<void> {
  const promos = await Promo.find({ storeId: req.user?.storeId }).sort({ createdAt: -1 });
  res.status(200).json({ data: promos, total: promos.length });
}

// POST /api/promos/validate — Validate promo code
export async function validatePromo(req: AuthRequest, res: Response): Promise<void> {
  const { code, orderAmount } = req.body;

  if (!code) {
    res.status(400).json({ message: 'Promo code is required' });
    return;
  }

  const promo = await Promo.findOne({
    code: code.toUpperCase(),
    storeId: req.user?.storeId,
    isActive: true,
    expiresAt: { $gt: new Date() },
  });

  if (!promo) {
    res.status(404).json({ message: 'Invalid or expired promo code' });
    return;
  }

  if (promo.maxUses > 0 && promo.usedCount >= promo.maxUses) {
    res.status(400).json({ message: 'Promo code has reached its usage limit' });
    return;
  }

  if (orderAmount < promo.minOrderAmount) {
    res.status(400).json({ message: `Minimum order amount is Rs. ${promo.minOrderAmount}` });
    return;
  }

  // Calculate discount
  let discountAmount = 0;
  if (promo.type === 'percentage') {
    discountAmount = (orderAmount * promo.value) / 100;
  } else {
    discountAmount = promo.value;
  }

  // Cap discount at order amount
  discountAmount = Math.min(discountAmount, orderAmount);

  res.status(200).json({
    data: {
      code: promo.code,
      type: promo.type,
      value: promo.value,
      discountAmount: parseFloat(discountAmount.toFixed(2)),
      message: promo.type === 'percentage'
        ? `${promo.value}% discount applied!`
        : `Rs. ${promo.value} discount applied!`,
    }
  });
}

// DELETE /api/promos/:id — Delete promo (Manager only)
export async function deletePromo(req: AuthRequest, res: Response): Promise<void> {
  const promo = await Promo.findByIdAndDelete(req.params.id);
  if (!promo) {
    res.status(404).json({ message: 'Promo not found' });
    return;
  }
  res.status(200).json({ message: 'Promo deleted successfully' });
}

// PATCH /api/promos/:id/toggle — Toggle promo active status
export async function togglePromo(req: AuthRequest, res: Response): Promise<void> {
  const promo = await Promo.findById(req.params.id);
  if (!promo) {
    res.status(404).json({ message: 'Promo not found' });
    return;
  }
  promo.isActive = !promo.isActive;
  await promo.save();
  res.status(200).json({ data: promo });
}