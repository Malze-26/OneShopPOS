import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { Product } from '../models/Product';
import { StockHistory } from '../models/StockHistory';
import { Category } from '../models/Category';

// GET /api/products
export async function getProducts(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { search, category, status } = req.query;
    const storeId = req.user?.storeId ?? 'STORE-2025-001';

    const filter: Record<string, unknown> = { storeId };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
      ];
    }
    if (category) filter.category = category;

    const products = await Product.find(filter).sort({ createdAt: -1 });

    // Apply status filter after fetching (status is a virtual)
    const filtered = status
      ? products.filter((p) => p.status === status)
      : products;

    res.json({ data: filtered, total: filtered.length });
  } catch (err) {
    next(err);
  }
}

// GET /api/products/:id
export async function getProduct(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = req.user?.storeId ?? 'STORE-2025-001';
    const product = await Product.findOne({ _id: req.params.id, storeId });

    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }

    const stockHistory = await StockHistory.find({ product: product._id }).sort({ createdAt: -1 }).limit(20);

    res.json({ data: product, stockHistory });
  } catch (err) {
    next(err);
  }
}

// POST /api/products
export async function createProduct(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = req.user?.storeId ?? 'STORE-2025-001';
    const userId = req.user?.id;

    const product = await Product.create({
      ...req.body,
      storeId,
      createdBy: userId,
    });

    // Update category product count
    await Category.findOneAndUpdate(
      { name: req.body.category, storeId },
      { $inc: { productCount: 1 } }
    );

    // Record initial stock history
    if (req.body.stock > 0) {
      await StockHistory.create({
        product: product._id,
        type: 'add',
        quantity: req.body.stock,
        reason: 'Initial Stock',
        by: req.user?.email ?? 'System',
        storeId,
      });
    }

    res.status(201).json({ data: product });
  } catch (err) {
    next(err);
  }
}

// PUT /api/products/:id
export async function updateProduct(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = req.user?.storeId ?? 'STORE-2025-001';

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, storeId },
      req.body,
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

// DELETE /api/products/:id
export async function deleteProduct(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = req.user?.storeId ?? 'STORE-2025-001';

    const product = await Product.findOneAndDelete({ _id: req.params.id, storeId });

    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }

    // Update category product count
    await Category.findOneAndUpdate(
      { name: product.category, storeId },
      { $inc: { productCount: -1 } }
    );

    // Remove stock history
    await StockHistory.deleteMany({ product: product._id });

    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    next(err);
  }
}

// POST /api/products/:id/adjust-stock
export async function adjustStock(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = req.user?.storeId ?? 'STORE-2025-001';
    const { type, quantity, reason } = req.body as { type: 'add' | 'remove'; quantity: number; reason: string };

    if (!['add', 'remove'].includes(type)) {
      res.status(400).json({ message: 'Adjustment type must be "add" or "remove"' });
      return;
    }
    if (!quantity || quantity < 1) {
      res.status(400).json({ message: 'Quantity must be at least 1' });
      return;
    }

    const product = await Product.findOne({ _id: req.params.id, storeId });
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
      by: req.user?.email ?? 'System',
      storeId,
    });

    res.json({ data: product });
  } catch (err) {
    next(err);
  }
}

// POST /api/products/import-csv
export async function importCSV(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = req.user?.storeId ?? 'STORE-2025-001';
    const userId = req.user?.id;
    const rows: Array<{
      name: string;
      sku: string;
      category: string;
      selling_price: number;
      cost_price: number;
      stock: number;
      low_stock_threshold: number;
    }> = req.body.rows;

    if (!Array.isArray(rows) || rows.length === 0) {
      res.status(400).json({ message: 'No rows provided' });
      return;
    }

    const results = { imported: 0, failed: 0, errors: [] as Array<{ row: number; errors: string[] }> };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowErrors: string[] = [];

      if (!row.name?.trim()) rowErrors.push('Product name is required');
      if (!row.sku?.trim()) rowErrors.push('SKU is required');
      if (!row.selling_price || row.selling_price <= 0) rowErrors.push('Price must be greater than 0');

      if (rowErrors.length > 0) {
        results.failed++;
        results.errors.push({ row: i + 1, errors: rowErrors });
        continue;
      }

      try {
        await Product.create({
          name: row.name.trim(),
          sku: row.sku.trim().toUpperCase(),
          category: row.category?.trim() || 'Uncategorized',
          sellingPrice: row.selling_price,
          costPrice: row.cost_price || 0,
          stock: row.stock || 0,
          lowStockThreshold: row.low_stock_threshold || 10,
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
