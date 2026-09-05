import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { resolveSupplier } from '../utils/supplier';
import { generateGRNNumber, generateGRNReferenceNumber } from '../utils/grn';
import { startOfStoreDay, endOfStoreDay } from '../utils/timezone';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_LIMIT,
  MAX_PAGE_LIMIT,
  SYSTEM_ACTOR,
} from '../constants';

interface GRNItem {
  productId: string;
  quantityReceived: number;
  costPrice: number;
}

interface CreateGRNBody {
  /** Supplier _id. `supplier` is still accepted as a name for older clients. */
  supplierId?: string;
  supplier?: string;
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

function parsePagination(page: unknown, limit: unknown): { pageNum: number; limitNum: number; skip: number } {
  const pageNum = Math.max(DEFAULT_PAGE, parseInt(String(page), 10) || DEFAULT_PAGE);
  const limitNum = Math.min(MAX_PAGE_LIMIT, Math.max(1, parseInt(String(limit), 10) || DEFAULT_PAGE_LIMIT));
  return { pageNum, limitNum, skip: (pageNum - 1) * limitNum };
}

function buildDateFilter(from?: string, to?: string): Record<string, Date> | null {
  if (!from && !to) return null;
  const dateFilter: Record<string, Date> = {};
  if (from) dateFilter.$gte = startOfStoreDay(new Date(from));
  if (to) dateFilter.$lte = endOfStoreDay(new Date(to));
  return dateFilter;
}

// ── GET /api/stocks/grns ───────────────────────────────────────────────────
export async function getGRNs(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { GRN } = req.models!;
    const { search, from, to, page, limit } = req.query;
    const { pageNum, limitNum, skip } = parsePagination(page, limit);

    const filter: Record<string, unknown> = {};

    if (search) {
      // Items are matched too, so searching a product name answers the question
      // the GRN list is usually opened for: who supplied this product.
      filter.$or = [
        { grnNumber: { $regex: search, $options: 'i' } },
        { supplier: { $regex: search, $options: 'i' } },
        { referenceNumber: { $regex: search, $options: 'i' } },
        { 'items.productName': { $regex: search, $options: 'i' } },
        { 'items.sku': { $regex: search, $options: 'i' } },
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
export async function createGRN(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { GRN, Product, StockHistory, Supplier } = req.models!;
    const storeId = req.user!.storeId;
    const receivedBy = req.user?.email ?? SYSTEM_ACTOR;
    const { supplierId, supplier, notes, items } = req.body as CreateGRNBody;
    const supplierRef = supplierId ?? supplier;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ message: 'At least one item is required' });
      return;
    }

    // Goods arrive from a supplier on the suppliers page. A free-text name
    // would leave a delivery no purchase history could ever be traced back to.
    const resolvedSupplier = await resolveSupplier(Supplier, supplierRef);
    if (!resolvedSupplier) {
      res.status(400).json({
        message: supplierRef?.trim()
          ? `Supplier "${supplierRef.trim()}" does not exist. Create it on the Suppliers page first.`
          : 'Supplier is required — goods must be received from a supplier',
      });
      return;
    }

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

      const product = await Product.findById(productId);
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
    const grnNumber = await generateGRNNumber(GRN);
    // Auto-assigned — a free-text PO number let two GRNs collide on the same
    // reference, so it is generated the same way grnNumber is.
    const referenceNumber = await generateGRNReferenceNumber(GRN);

    const grn = await GRN.create({
      grnNumber,
      supplierId: resolvedSupplier._id,
      supplier: resolvedSupplier.name,
      referenceNumber,
      notes: notes?.trim() ?? '',
      items: resolvedItems,
      totalItems,
      totalCost,
      receivedBy,
      storeId,
    });

    for (const item of resolvedItems) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantityReceived } });
      await StockHistory.create({
        product: item.product,
        type: 'add',
        quantity: item.quantityReceived,
        reason: `GRN: ${grnNumber} — ${resolvedSupplier.name}`,
        by: receivedBy,
        storeId,
      });
    }

    res.status(201).json({ data: grn });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/stocks/grns/next-reference ────────────────────────────────────
// Lets the Receive Goods form show the PO number it will be assigned before
// the GRN is actually saved. The value is only a preview: createGRN assigns
// the real one at save time, so a concurrent GRN can never steal it.
export async function getNextGRNReference(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { GRN } = req.models!;
    const referenceNumber = await generateGRNReferenceNumber(GRN);
    res.json({ data: { referenceNumber } });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/stocks/grns/:id ───────────────────────────────────────────────
export async function getGRN(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { GRN } = req.models!;
    const grn = await GRN.findById(req.params.id).lean();

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
    const { StockHistory } = req.models!;
    const { type, productId, from, to, page, limit } = req.query;
    const { pageNum, limitNum, skip } = parsePagination(page, limit);

    const filter: Record<string, unknown> = {};

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
