import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { GRN } from '../models/GRN';
import { Product } from '../models/Product';
import { StockHistory } from '../models/StockHistory';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_LIMIT,
  MAX_PAGE_LIMIT,
  GRN_NUMBER_PAD_LENGTH,
  SYSTEM_ACTOR,
} from '../constants';

// ── Types ──────────────────────────────────────────────────────────────────

interface GRNItem {
  productId: string;
  quantityReceived: number;
  costPrice: number;
}

interface CreateGRNBody {
  supplier?: string;
  referenceNumber?: string;
  notes?: string;
  items: GRNItem[];
}

interface ResolvedGRNItem {
  product: unknown;
  productName: string;
  sku: string;
  quantityReceived: number;
  costPrice: number;
  subtotal: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Generates the next sequential GRN number for the store in the format:
 *   GRN-YYYY-XXXX  (e.g. GRN-2025-0001)
 * Reads the highest existing GRN number for the current year and increments it.
 */
async function generateGRNNumber(storeId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `GRN-${year}-`;

  const last = await GRN.findOne({ storeId, grnNumber: { $regex: `^${prefix}` } })
    .sort({ grnNumber: -1 })
    .lean();

  const next = last ? parseInt(last.grnNumber.replace(prefix, ''), 10) + 1 : 1;
  return `${prefix}${String(next).padStart(GRN_NUMBER_PAD_LENGTH, '0')}`;
}

/**
 * Parses page and limit query params with safe clamping.
 * Page is always >= 1. Limit is clamped between 1 and MAX_PAGE_LIMIT.
 */
function parsePagination(page: unknown, limit: unknown): { pageNum: number; limitNum: number; skip: number } {
  const pageNum = Math.max(DEFAULT_PAGE, parseInt(String(page), 10) || DEFAULT_PAGE);
  const limitNum = Math.min(MAX_PAGE_LIMIT, Math.max(1, parseInt(String(limit), 10) || DEFAULT_PAGE_LIMIT));
  return { pageNum, limitNum, skip: (pageNum - 1) * limitNum };
}

/**
 * Builds a MongoDB date range filter from optional from/to query strings.
 * The 'to' date is extended to 23:59:59.999 so the full day is included.
 */
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

// ── GET /api/stocks/grns ───────────────────────────────────────────────────

/**
 * Returns a paginated list of GRNs for the authenticated store.
 * Supports optional filters:
 *   - search: matches GRN number, supplier name, or reference number
 *   - from / to: date range filter on createdAt
 *   - page / limit: pagination controls (limit capped at 50)
 */
export async function getGRNs(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = req.user!.storeId;
    const { search, from, to, page, limit } = req.query;
    const { pageNum, limitNum, skip } = parsePagination(page, limit);

    const filter: Record<string, unknown> = { storeId };

    if (search) {
      filter.$or = [
        { grnNumber: { $regex: search, $options: 'i' } },
        { supplier: { $regex: search, $options: 'i' } },
        { referenceNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const dateFilter = buildDateFilter(from as string | undefined, to as string | undefined);
    if (dateFilter) filter.createdAt = dateFilter;

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

/**
 * Creates a new Goods Received Note (GRN) and updates stock for each item.
 * For every item:
 *   1. Validates product exists in the store
 *   2. Increments product.stock
 *   3. Creates a StockHistory record referencing the GRN number
 * All items must pass validation before the GRN is saved (fail-fast approach).
 */
export async function createGRN(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = req.user!.storeId;
    const receivedBy = req.user?.email ?? SYSTEM_ACTOR;
    const { supplier, referenceNumber, notes, items } = req.body as CreateGRNBody;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ message: 'At least one item is required' });
      return;
    }

    // Validate all items before writing anything to the database
    const resolvedItems: ResolvedGRNItem[] = [];
    for (let i = 0; i < items.length; i++) {
      const { productId, quantityReceived, costPrice } = items[i];

      if (!productId) {
        res.status(400).json({ message: `Item ${i + 1}: product is required` });
        return;
      }
      if (!Number.isInteger(quantityReceived) || quantityReceived < 1) {
        res.status(400).json({ message: `Item ${i + 1}: quantity must be a positive integer` });
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

    const totalItems = resolvedItems.reduce((sum, r) => sum + r.quantityReceived, 0);
    const totalCost = resolvedItems.reduce((sum, r) => sum + r.subtotal, 0);
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

    // Update stock and record history for each received item
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

/**
 * Returns a single GRN by ID.
 * Returns 404 if it does not belong to the authenticated store.
 */
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

/**
 * Returns paginated stock movement history for the authenticated store.
 * Supports optional filters:
 *   - type: 'add' | 'remove'
 *   - productId: filter by specific product
 *   - from / to: date range filter on createdAt
 *   - page / limit: pagination (limit capped at 50)
 * Product name and SKU are populated for each record.
 */
export async function getStockHistory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = req.user!.storeId;
    const { type, productId, from, to, page, limit } = req.query;
    const { pageNum, limitNum, skip } = parsePagination(page, limit);

    const filter: Record<string, unknown> = { storeId };

    if (type && ['add', 'remove'].includes(type as string)) filter.type = type;
    if (productId) filter.product = productId;

    const dateFilter = buildDateFilter(from as string | undefined, to as string | undefined);
    if (dateFilter) filter.createdAt = dateFilter;

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
