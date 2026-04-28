import { Response } from 'express';
import { AuthRequest } from '../types';
import mongoose from 'mongoose';

export const getCurrentShift = async (req: AuthRequest, res: Response) => {
  try {
    const { Shift } = req.models!;
    const shift = await Shift.findOne({
      cashier: req.user?.id,
      status: 'open'
    }).populate('cashier', 'name');

    res.json(shift);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch shift' });
  }
};

export const openShift = async (req: AuthRequest, res: Response) => {
  try {
    const { Shift } = req.models!;
    const { openingFloat } = req.body;

    // Check if a shift is already open
    const existing = await Shift.findOne({ cashier: req.user?.id, status: 'open' });
    if (existing) {
      return res.status(400).json({ error: 'A shift is already open for this user' });
    }

    const shift = await Shift.create({
      cashier: req.user?.id,
      openingFloat: openingFloat || 0,
      openedAt: new Date(),
      status: 'open',
      storeId: req.headers['oneshop-tenant-id'] as string
    });

    res.status(201).json(shift);
  } catch (error) {
    res.status(500).json({ error: 'Failed to open shift' });
  }
};

export const closeShift = async (req: AuthRequest, res: Response) => {
  try {
    const { Shift, Transaction } = req.models!;
    const { shiftId, actualCash } = req.body;

    const shift = await Shift.findById(shiftId);
    if (!shift || shift.status === 'closed') {
      return res.status(404).json({ error: 'Active shift not found' });
    }

    // Calculate expected cash from transactions since shift opened
    const cashSalesAgg = await Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: shift.openedAt },
          status: 'success',
          paymentMethod: 'Cash'
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const cashSales = cashSalesAgg[0]?.total || 0;
    const expectedCash = shift.openingFloat + cashSales;

    shift.closedAt = new Date();
    shift.status = 'closed';
    shift.actualCash = actualCash;
    shift.expectedCash = expectedCash;
    await shift.save();

    res.json(shift);
  } catch (error) {
    res.status(500).json({ error: 'Failed to close shift' });
  }
};
