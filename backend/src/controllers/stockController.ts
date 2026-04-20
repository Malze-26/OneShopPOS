import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { GRN } from '../models/GRN';
import { Product } from '../models/Product';
import { StockHistory } from '../models/StockHistory';

// ── helpers ────────────────────────────────────────────────────────────────

async function generateGRNNumber(storeId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `GRN-${year}-`;
  const last = await GRN.findOne({ storeId, grnNumber: { $regex: `^${prefix}` } })
    .sort({ grnNumber: -1 })
    .lean();
  const next = last
    ? parseInt(last.grnNumber.replace(prefix, ''), 10) + 1
    : 1;
  return `${prefix}${String(next).padStart(4, '0')}`;
}

// ── GET /api/stocks/grns ───────────────────────────────────────────────────
export async function getGRNs(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = req.user!.storeId;
    const { search, from, to, page = '1', limit = '10' } = req.query;

    const filter: Record<string, unknown> = { storeId };

    if (search) {
      filter.$or = [
        { grnNumber: { $regex: search, $options: 'i' } },
        { supplier: { $regex: search, $options: 'i' } },
        { referenceNumber: { $regex: search, $options: 'i' } },
      ];
    }
    if (from || to) {
      const dateFilter: Record<string, Date> = {};
      if (from) dateFilter.$gte = new Date(from as string);
      if (to) {
        const toDate = new Date(to as string);
        toDate.setHours(23, 59, 59, 999);
        dateFilter.$lte = toDate;
      }
      filter.createdAt = dateFilter;
    }

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [grns, total] = await Promise.all([
      GRN.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      GRN.countDocuments(filter),
    ]);

    res.json({ data: grns, total, page: pageNum, pages: Math.ceil(total / limitNum) });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/stocks/grns ──────────────────────────────────────────────────
export async function createGRN(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = req.user!.storeId;
    const receivedBy = req.user?.email ?? 'System';

    const { supplier, referenceNumber, notes, items } = req.body as {
      supplier?: string;
      referenceNumber?: string;
      notes?: string;
      items: Array<{ productId: string; quantityReceived: number; costPrice: number }>;
    };

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ message: 'At least one item is required' });
      return;
    }

    // Validate and resolve each product
    const resolvedItems = [];
    for (let i = 0; i < items.length; i++) {
      const { productId, quantityReceived, costPrice } = items[i];

      if (!productId) {
        res.status(400).json({ message: `Item ${i + 1}: product is required` });
        return;
      }
      if (!quantityReceived || quantityReceived < 1) {
        res.status(400).json({ message: `Item ${i + 1}: quantity must be at least 1` });
        return;
      }
      if (costPrice == null || costPrice < 0) {
        res.status(400).json({ message: `Item ${i + 1}: cost price cannot be negative` });
        return;
      }

      const product = await Product.findOne({ _id: productId, storeId });
      if (!product) {
        res.status(404).json({ message: `Item ${i + 1}: product not found` });
        return;
      }

      resolvedItems.push({
        product: product._id,
        productName: product.name,
        sku: product.sku,
        quantityReceived,
        costPrice,
        subtotal: quantityReceived * costPrice,
      });
    }

    const totalItems = resolvedItems.reduce((s, r) => s + r.quantityReceived, 0);
    const totalCost = resolvedItems.reduce((s, r) => s + r.subtotal, 0);
    const grnNumber = await generateGRNNumber(storeId);

    const grn = await GRN.create({
      grnNumber,
      supplier: supplier?.trim() ?? '',
      referenceNumber: referenceNumber?.trim() ?? '',
      notes: notes?.trim() ?? '',
      items: resolvedItems,
      totalItems,
      totalCost,
      receivedBy,
      storeId,
    });

    // Update stock + create history records for each item
    for (const item of resolvedItems) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantityReceived } });
      await StockHistory.create({
        product: item.product,
        type: 'add',
        quantity: item.quantityReceived,
        reason: `GRN: ${grnNumber}${supplier ? ` — ${supplier}` : ''}`,
        by: receivedBy,
        storeId,
      });
    }

    res.status(201).json({ data: grn });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/stocks/grns/:id ───────────────────────────────────────────────
export async function getGRN(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = req.user!.storeId;
    const grn = await GRN.findOne({ _id: req.params.id, storeId }).lean();

    if (!grn) {
      res.status(404).json({ message: 'GRN not found' });
      return;
    }

    res.json({ data: grn });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/stocks/history ────────────────────────────────────────────────
export async function getStockHistory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = req.user!.storeId;
    const { type, productId, from, to, page = '1', limit = '10' } = req.query;

    const filter: Record<string, unknown> = { storeId };

    if (type && ['add', 'remove'].includes(type as string)) filter.type = type;
    if (productId) filter.product = productId;
    if (from || to) {
      const dateFilter: Record<string, Date> = {};
      if (from) dateFilter.$gte = new Date(from as string);
      if (to) {
        const toDate = new Date(to as string);
        toDate.setHours(23, 59, 59, 999);
        dateFilter.$lte = toDate;
      }
      filter.createdAt = dateFilter;
    }

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [history, total] = await Promise.all([
      StockHistory.find(filter)
        .populate('product', 'name sku')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      StockHistory.countDocuments(filter),
    ]);

    res.json({ data: history, total, page: pageNum, pages: Math.ceil(total / limitNum) });
  } catch (err) {
    next(err);
  }
}
