import { Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { AuthRequest } from '../types';
import {
  DEFAULT_CATEGORY_NAME,
  DEFAULT_LOW_STOCK_THRESHOLD,
  DEFAULT_COST_PRICE,
  DEFAULT_STOCK,
  STOCK_HISTORY_RECENT_LIMIT,
  SYSTEM_ACTOR,
} from '../constants';

interface CSVRow {
  name: string;
  sku: string;
  category: string;
  selling_price: number;
  cost_price: number;
  stock: number;
  low_stock_threshold: number;
}

interface StockAdjustBody {
  type: 'add' | 'remove';
  quantity: number;
  reason: string;
}

// ── GET /api/products ──────────────────────────────────────────────────────
export async function getProducts(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { Product } = req.models!;
    const { search, category, status } = req.query;

    const filter: Record<string, unknown> = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
      ];
    }
    if (category) filter.category = category;

    const products = await Product.find(filter).sort({ createdAt: -1 });

    // status is a virtual — filter after fetch
    const filtered = status ? products.filter((p) => p.status === status) : products;

    res.json({ data: filtered, total: filtered.length });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/products/stats ────────────────────────────────────────────────
export async function getProductStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { Product } = req.models!;
    const total = await Product.countDocuments();
    res.json({ total });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/products/:id ──────────────────────────────────────────────────
export async function getProduct(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { Product, StockHistory } = req.models!;
    const product = await Product.findById(req.params.id);

    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }

    const stockHistory = await StockHistory.find({ product: product._id })
      .sort({ createdAt: -1 })
      .limit(STOCK_HISTORY_RECENT_LIMIT);

    res.json({ data: product, stockHistory });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/products ─────────────────────────────────────────────────────
export async function createProduct(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { Product, Category, StockHistory } = req.models!;
    const storeId = req.user!.storeId;
    const userId = req.user!.id;

    const {
      name,
      sku,
      description,
      sellingPrice,
      costPrice,
      stock,
      lowStockThreshold,
      category,
      images,
    } = req.body as {
      name: string;
      sku: string;
      description?: string;
      sellingPrice: number;
      costPrice?: number;
      stock?: number;
      lowStockThreshold?: number;
      category: string;
      images?: string[];
    };

    const product = await Product.create({
      name,
      sku,
      description,
      sellingPrice,
      costPrice: costPrice ?? DEFAULT_COST_PRICE,
      stock: stock ?? DEFAULT_STOCK,
      lowStockThreshold: lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD,
      category,
      images: images ?? [],
      storeId,
      createdBy: userId,
    });

    await Category.findOneAndUpdate(
      { name: category },
      { $inc: { productCount: 1 } }
    );

    if (product.stock > 0) {
      await StockHistory.create({
        product: product._id,
        type: 'add',
        quantity: product.stock,
        reason: 'Initial Stock',
        by: req.user?.email ?? SYSTEM_ACTOR,
        storeId,
      });
    }

    res.status(201).json({ data: product });
  } catch (err) {
    next(err);
  }
}

// ── PUT /api/products/:id ──────────────────────────────────────────────────
export async function updateProduct(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { Product } = req.models!;

    const {
      name,
      sku,
      description,
      sellingPrice,
      costPrice,
      stock,
      lowStockThreshold,
      category,
    } = req.body as {
      name?: string;
      sku?: string;
      description?: string;
      sellingPrice?: number;
      costPrice?: number;
      stock?: number;
      lowStockThreshold?: number;
      category?: string;
    };

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { name, sku, description, sellingPrice, costPrice, stock, lowStockThreshold, category },
      { new: true, runValidators: true }
    );

    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }

    res.json({ data: product });
  } catch (err) {
    next(err);
  }
}

// ── DELETE /api/products/:id ───────────────────────────────────────────────
export async function deleteProduct(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { Product, Category, StockHistory } = req.models!;

    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }

    await Category.findOneAndUpdate(
      { name: product.category },
      { $inc: { productCount: -1 } }
    );

    await StockHistory.deleteMany({ product: product._id });

    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/products/:id/adjust-stock ───────────────────────────────────
export async function adjustStock(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { Product, StockHistory } = req.models!;
    const storeId = req.user!.storeId;
    const { type, quantity, reason } = req.body as StockAdjustBody;

    if (!['add', 'remove'].includes(type)) {
      res.status(400).json({ message: 'Adjustment type must be "add" or "remove"' });
      return;
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      res.status(400).json({ message: 'Quantity must be a positive integer' });
      return;
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }

    const newStock = type === 'add' ? product.stock + quantity : product.stock - quantity;

    if (newStock < 0) {
      res.status(400).json({ message: 'Insufficient stock' });
      return;
    }

    product.stock = newStock;
    await product.save();

    await StockHistory.create({
      product: product._id,
      type,
      quantity,
      reason,
      by: req.user?.email ?? SYSTEM_ACTOR,
      storeId,
    });

    res.json({ data: product });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/products/bulk/import-csv ────────────────────────────────────
export async function importCSV(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { Product } = req.models!;
    const storeId = req.user!.storeId;
    const userId = req.user!.id;
    const rows: CSVRow[] = req.body.rows;

    if (!Array.isArray(rows) || rows.length === 0) {
      res.status(400).json({ message: 'No rows provided' });
      return;
    }

    const results = {
      imported: 0,
      failed: 0,
      errors: [] as Array<{ row: number; errors: string[] }>,
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowErrors: string[] = [];

      if (!row.name?.trim()) rowErrors.push('Product name is required');
      if (!row.sku?.trim()) rowErrors.push('SKU is required');
      if (!row.selling_price || row.selling_price <= 0) rowErrors.push('Selling price must be greater than 0');

      if (rowErrors.length > 0) {
        results.failed++;
        results.errors.push({ row: i + 1, errors: rowErrors });
        continue;
      }

      try {
        await Product.create({
          name: row.name.trim(),
          sku: row.sku.trim().toUpperCase(),
          category: row.category?.trim() || DEFAULT_CATEGORY_NAME,
          sellingPrice: row.selling_price,
          costPrice: row.cost_price ?? DEFAULT_COST_PRICE,
          stock: row.stock ?? DEFAULT_STOCK,
          lowStockThreshold: row.low_stock_threshold ?? DEFAULT_LOW_STOCK_THRESHOLD,
          storeId,
          createdBy: userId,
        });
        results.imported++;
      } catch {
        results.failed++;
        results.errors.push({ row: i + 1, errors: ['Duplicate SKU or invalid data'] });
      }
    }

    res.json({ message: 'Import complete', ...results });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/products/:id/images ─────────────────────────────────────────
export async function uploadProductImages(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { Product } = req.models!;
    const files = req.files as Express.Multer.File[] | undefined;

    if (!files || files.length === 0) {
      res.status(400).json({ message: 'No files uploaded' });
      return;
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      files.forEach((f) => { try { fs.unlinkSync(f.path); } catch { /* ignore */ } });
      res.status(404).json({ message: 'Product not found' });
      return;
    }

    const newPaths = files.map((f) => `/uploads/products/${f.filename}`);
    product.images = [...product.images, ...newPaths];
    await product.save();

    res.json({ data: product });
  } catch (err) {
    next(err);
  }
}

// ── DELETE /api/products/:id/images/:filename ──────────────────────────────
export async function deleteProductImage(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { Product } = req.models!;
    const { filename } = req.params;
    const imagePath = `/uploads/products/${filename}`;

    const product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }

    product.images = product.images.filter((img) => img !== imagePath);
    await product.save();

    const fullPath = path.join(process.cwd(), 'uploads', 'products', filename as string);
    try { fs.unlinkSync(fullPath); } catch { /* file may not exist */ }

    res.json({ data: product });
  } catch (err) {
    next(err);
  }
}
