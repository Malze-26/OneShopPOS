import { Response, NextFunction } from 'express';
import { Model } from 'mongoose';
import { AuthRequest } from '../types';
import { ISupplierReturn, ReturnReason } from '../models/SupplierReturn';
import { resolveSupplier } from '../utils/supplier';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_LIMIT,
  MAX_PAGE_LIMIT,
  RETURN_NUMBER_PAD_LENGTH,
  RETURN_REASONS,
  EXPIRY_SOON_DAYS,
  SYSTEM_ACTOR,
} from '../constants';

interface ReturnItemBody {
  productId: string;
  quantity: number;
  reason: ReturnReason;
}

interface CreateReturnBody {
  supplier?: string;
  supplierId?: string;
  referenceNumber?: string;
  notes?: string;
  items: ReturnItemBody[];
}

interface ResolvedReturnItem {
  product: unknown;
  productName: string;
  sku: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  reason: ReturnReason;
  expiryDate: Date | null;
  lossValue: number;
  retailValue: number;
}

function parsePagination(page: unknown, limit: unknown): { pageNum: number; limitNum: number; skip: number } {
  const pageNum = Math.max(DEFAULT_PAGE, parseInt(String(page), 10) || DEFAULT_PAGE);
  const limitNum = Math.min(MAX_PAGE_LIMIT, Math.max(1, parseInt(String(limit), 10) || DEFAULT_PAGE_LIMIT));
  return { pageNum, limitNum, skip: (pageNum - 1) * limitNum };
}

function buildDateFilter(from?: string, to?: string): Record<string, Date> | null {
  if (!from && !to) return null;
  const dateFilter: Record<string, Date> = {};
  if (from) dateFilter.$gte = new Date(from);
  if (to) {
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);
    dateFilter.$lte = toDate;
  }
  return dateFilter;
}

async function generateReturnNumber(SupplierReturn: Model<ISupplierReturn>): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `RTN-${year}-`;

  const last = await SupplierReturn.findOne({ returnNumber: { $regex: `^${prefix}` } })
    .sort({ returnNumber: -1 })
    .lean();

  const next = last ? parseInt((last.returnNumber as string).replace(prefix, ''), 10) + 1 : 1;
  return `${prefix}${String(next).padStart(RETURN_NUMBER_PAD_LENGTH, '0')}`;
}

/** Start of today — the cut-off an expiry date must fall before to count as expired. */
function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// ── GET /api/stocks/returns ────────────────────────────────────────────────
export async function getReturns(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { SupplierReturn } = req.models!;
    const { search, reason, from, to, page, limit } = req.query;
    const { pageNum, limitNum, skip } = parsePagination(page, limit);

    const filter: Record<string, unknown> = {};

    if (search) {
      filter.$or = [
        { returnNumber: { $regex: search, $options: 'i' } },
        { supplier: { $regex: search, $options: 'i' } },
        { referenceNumber: { $regex: search, $options: 'i' } },
      ];
    }

    // A return can mix reasons, so match any return holding an item of this one.
    if (reason && RETURN_REASONS.includes(reason as ReturnReason)) {
      filter['items.reason'] = reason;
    }

    const dateFilter = buildDateFilter(from as string | undefined, to as string | undefined);
    if (dateFilter) filter.createdAt = dateFilter;

    const [returns, total] = await Promise.all([
      SupplierReturn.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      SupplierReturn.countDocuments(filter),
    ]);

    res.json({ data: returns, total, page: pageNum, pages: Math.ceil(total / limitNum) });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/stocks/returns ───────────────────────────────────────────────
// Removes the returned units from stock and books their cost as an immediate
// revenue loss. Every item is validated before any stock is touched, so a bad
// line cannot leave the batch half-applied.
export async function createReturn(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { SupplierReturn, Product, StockHistory, Supplier } = req.models!;
    const storeId = req.user!.storeId;
    const returnedBy = req.user?.email ?? SYSTEM_ACTOR;
    const { supplier, supplierId, referenceNumber, notes, items } = req.body as CreateReturnBody;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ message: 'At least one item is required' });
      return;
    }

    // Stock goes back to a supplier on the suppliers page, never to a name
    // somebody typed — a return nobody can be billed for is not a return.
    const supplierRef = supplierId ?? supplier;
    const resolvedSupplier = await resolveSupplier(Supplier, supplierRef);
    if (!resolvedSupplier) {
      res.status(400).json({
        message: supplierRef?.trim()
          ? `Supplier "${supplierRef.trim()}" does not exist. Create it on the Suppliers page first.`
          : 'Supplier is required — returned stock must go back to a supplier',
      });
      return;
    }

    // Two lines can name the same product; their quantities have to be checked
    // against one running balance or an over-return slips through.
    const requestedByProduct = new Map<string, number>();
    const resolvedItems: ResolvedReturnItem[] = [];

    for (let i = 0; i < items.length; i++) {
      const { productId, quantity, reason } = items[i];

      if (!productId) {
        res.status(400).json({ message: `Item ${i + 1}: product is required` });
        return;
      }
      if (!Number.isInteger(quantity) || quantity < 1) {
        res.status(400).json({ message: `Item ${i + 1}: quantity must be a positive integer` });
        return;
      }
      if (!RETURN_REASONS.includes(reason)) {
        res.status(400).json({ message: `Item ${i + 1}: reason must be "expired" or "damaged"` });
        return;
      }

      const product = await Product.findById(productId);
      if (!product) {
        res.status(404).json({ message: `Item ${i + 1}: product not found` });
        return;
      }

      const alreadyRequested = requestedByProduct.get(String(product._id)) ?? 0;
      if (alreadyRequested + quantity > product.stock) {
        res.status(400).json({
          message: `Item ${i + 1}: cannot return ${quantity} of "${product.name}" — only ${product.stock - alreadyRequested} in stock`,
        });
        return;
      }
      requestedByProduct.set(String(product._id), alreadyRequested + quantity);

      resolvedItems.push({
        product: product._id,
        productName: product.name,
        sku: product.sku,
        quantity,
        costPrice: product.costPrice,
        sellingPrice: product.sellingPrice,
        reason,
        expiryDate: product.expiryDate ?? null,
        lossValue: quantity * product.costPrice,
        retailValue: quantity * product.sellingPrice,
      });
    }

    const totalItems = resolvedItems.reduce((sum, r) => sum + r.quantity, 0);
    const totalLossValue = resolvedItems.reduce((sum, r) => sum + r.lossValue, 0);
    const totalRetailValue = resolvedItems.reduce((sum, r) => sum + r.retailValue, 0);
    const returnNumber = await generateReturnNumber(SupplierReturn);

    const supplierReturn = await SupplierReturn.create({
      returnNumber,
      supplier: resolvedSupplier.name,
      supplierId: resolvedSupplier._id,
      referenceNumber: referenceNumber?.trim() ?? '',
      notes: notes?.trim() ?? '',
      items: resolvedItems,
      totalItems,
      totalLossValue,
      totalRetailValue,
      returnedBy,
      storeId,
    });

    for (const item of resolvedItems) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
      await StockHistory.create({
        product: item.product,
        type: 'remove',
        quantity: item.quantity,
        reason: `Return ${returnNumber}: ${item.reason} — ${resolvedSupplier.name}`,
        by: returnedBy,
        storeId,
      });
    }

    // An expired batch that has been fully returned leaves nothing on the shelf,
    // so the stale expiry date is cleared — the next GRN sets a fresh one.
    const expiredProductIds = resolvedItems
      .filter((r) => r.reason === 'expired')
      .map((r) => r.product);
    if (expiredProductIds.length > 0) {
      await Product.updateMany(
        { _id: { $in: expiredProductIds }, stock: { $lte: 0 } },
        { $set: { expiryDate: null } }
      );
    }

    res.status(201).json({ data: supplierReturn });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/stocks/returns/stats ──────────────────────────────────────────
// Powers the revenue-impact cards: how much value left the business as expired
// versus damaged stock over the requested window.
export async function getReturnStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { SupplierReturn } = req.models!;
    const { from, to } = req.query;

    const match: Record<string, unknown> = {};
    const dateFilter = buildDateFilter(from as string | undefined, to as string | undefined);
    if (dateFilter) match.createdAt = dateFilter;

    const [totals, byReason] = await Promise.all([
      SupplierReturn.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            returnCount: { $sum: 1 },
            totalUnits: { $sum: '$totalItems' },
            totalLossValue: { $sum: '$totalLossValue' },
            totalRetailValue: { $sum: '$totalRetailValue' },
          },
        },
      ]),
      SupplierReturn.aggregate([
        { $match: match },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.reason',
            units: { $sum: '$items.quantity' },
            lossValue: { $sum: '$items.lossValue' },
          },
        },
      ]),
    ]);

    const t = totals[0] ?? { returnCount: 0, totalUnits: 0, totalLossValue: 0, totalRetailValue: 0 };
    const reasonMap = new Map(byReason.map((r) => [r._id, r]));

    res.json({
      returnCount: t.returnCount,
      totalUnits: t.totalUnits,
      totalLossValue: t.totalLossValue,
      totalRetailValue: t.totalRetailValue,
      expired: {
        units: reasonMap.get('expired')?.units ?? 0,
        lossValue: reasonMap.get('expired')?.lossValue ?? 0,
      },
      damaged: {
        units: reasonMap.get('damaged')?.units ?? 0,
        lossValue: reasonMap.get('damaged')?.lossValue ?? 0,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/stocks/returns/:id ────────────────────────────────────────────
export async function getReturn(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { SupplierReturn } = req.models!;
    const supplierReturn = await SupplierReturn.findById(req.params.id).lean();

    if (!supplierReturn) {
      res.status(404).json({ message: 'Return not found' });
      return;
    }

    res.json({ data: supplierReturn });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/stocks/expiring ───────────────────────────────────────────────
// The worklist behind "what needs returning": stock that has already expired,
// plus stock about to. Only products still holding units are worth listing.
export async function getExpiringProducts(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { Product } = req.models!;
    const days = Math.max(0, parseInt(String(req.query.days), 10) || EXPIRY_SOON_DAYS);
    const status = req.query.status as string | undefined;

    const today = startOfToday();
    const soonCutoff = new Date(today);
    soonCutoff.setDate(soonCutoff.getDate() + days);
    soonCutoff.setHours(23, 59, 59, 999);

    const expiryRange =
      status === 'expired' ? { $lt: today }
        : status === 'expiring-soon' ? { $gte: today, $lte: soonCutoff }
          : { $lte: soonCutoff };

    const products = await Product.find({ stock: { $gt: 0 }, expiryDate: expiryRange })
      .select('name sku category stock costPrice sellingPrice expiryDate')
      .sort({ expiryDate: 1 })
      .lean();

    const data = products.map((p) => {
      const expiry = new Date(p.expiryDate as Date);
      expiry.setHours(0, 0, 0, 0);
      const daysLeft = Math.round((expiry.getTime() - today.getTime()) / 86400000);
      return {
        _id: p._id,
        name: p.name,
        sku: p.sku,
        category: p.category,
        stock: p.stock,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        expiryDate: p.expiryDate,
        daysLeft,
        expiryStatus: daysLeft < 0 ? 'expired' : 'expiring-soon',
        // What writing this stock off would cost — shown before the return is made.
        atRiskValue: p.stock * p.costPrice,
      };
    });

    res.json({
      data,
      total: data.length,
      expiredCount: data.filter((p) => p.expiryStatus === 'expired').length,
      expiredValue: data
        .filter((p) => p.expiryStatus === 'expired')
        .reduce((sum, p) => sum + p.atRiskValue, 0),
    });
  } catch (err) {
    next(err);
  }
}
