import { Response, NextFunction } from 'express';
import { Model } from 'mongoose';
import path from 'path';
import fs from 'fs';
import { AuthRequest } from '../types';
import { ICategory } from '../models/Category';
import { ISupplier } from '../models/Supplier';
import { IProduct } from '../models/Product';
import { deleteObject, keyBelongsToTenant, publicUrl } from '../storage/s3';
import { getCategoryPrefix, issueSku, previewSku, skuBelongsToPrefix } from '../utils/sku';
import { resolveSupplier } from '../utils/supplier';
import {
  DEFAULT_LOW_STOCK_THRESHOLD,
  DEFAULT_COST_PRICE,
  STOCK_HISTORY_RECENT_LIMIT,
  SYSTEM_ACTOR,
} from '../constants';

interface CSVRow {
  name: string;
  category: string;
  supplier: string;
  selling_price: number;
  cost_price: number;
  low_stock_threshold: number;
  is_weight_based?: boolean;
}

interface StockAdjustBody {
  type: 'add' | 'remove';
  quantity: number;
  reason: string;
}

/**
 * Resolves a user-supplied category name to an existing Category document name.
 * Products must always belong to a category that appears on the categories page,
 * so an unknown name is rejected rather than stored as free text.
 *
 * Matching is case/whitespace-insensitive and returns the canonical stored name,
 * so "  dairy " is accepted and normalised to "Dairy".
 */
async function resolveCategoryName(
  CategoryModel: Model<ICategory>,
  name: string | undefined | null
): Promise<string | null> {
  if (!name?.trim()) return null;
  const wanted = name.trim().toLowerCase();
  const categories = await CategoryModel.find({}).select('name').lean();
  const match = categories.find((c) => c.name.trim().toLowerCase() === wanted);
  return match ? match.name : null;
}

/**
 * Finds a product already carrying the given name (case/whitespace-insensitive).
 * A product out of stock is still that same product — the fix is to receive it
 * again through Receive Goods, not to mint a second record under a new SKU.
 */
async function findProductByName(
  ProductModel: Model<IProduct>,
  name: string
): Promise<{ name: string; sku: string } | null> {
  const wanted = name.trim().toLowerCase();
  if (!wanted) return null;
  const products = await ProductModel.find({}).select('name sku').lean();
  const match = products.find((p) => p.name.trim().toLowerCase() === wanted);
  return match ? { name: match.name, sku: match.sku } : null;
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

// ── GET /api/products/next-sku ─────────────────────────────────────────────
/**
 * The SKU the next product in this category would be given, so the Add/Edit
 * form can show it as soon as a category is picked. Assigning the category its
 * prefix is a side effect, which is why this sits behind the Manager guard.
 */
export async function getNextSku(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { Product, Category } = req.models!;
    const category = req.query.category as string | undefined;

    const resolvedCategory = await resolveCategoryName(Category, category);
    if (!resolvedCategory) {
      res.status(400).json({
        message: category?.trim()
          ? `Category "${category.trim()}" does not exist. Create it on the Categories page first.`
          : 'Category is required to generate a SKU',
      });
      return;
    }

    const { sku, prefix } = await previewSku(Category, Product, resolvedCategory);
    res.json({ data: { sku, prefix, category: resolvedCategory } });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/products ─────────────────────────────────────────────────────
export async function createProduct(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { Product, Category, Supplier } = req.models!;
    const storeId = req.user!.storeId;
    const userId = req.user!.id;

    // sku is deliberately not read from the body — it is issued from the
    // category below so every product in a category shares its three letters.
    // stock is not accepted here either — creating a product is master-data
    // setup only. A product starts at zero and only gains stock once goods
    // are actually received through Receive Goods (GRN).
    const {
      name,
      description,
      sellingPrice,
      costPrice,
      lowStockThreshold,
      category,
      images,
      expiryDate,
      supplierId,
      isWeightBased,
      unit,
    } = req.body as {
      name: string;
      description?: string;
      sellingPrice: number;
      costPrice?: number;
      lowStockThreshold?: number;
      category: string;
      images?: string[];
      expiryDate?: string | null;
      supplierId?: string;
      isWeightBased?: boolean;
      unit?: 'kg' | 'item';
    };

    // Every product must belong to a category that exists on the categories page.
    const resolvedCategory = await resolveCategoryName(Category, category);
    if (!resolvedCategory) {
      res.status(400).json({
        message: category?.trim()
          ? `Category "${category.trim()}" does not exist. Create it on the Categories page first.`
          : 'Category is required',
      });
      return;
    }

    // Nothing reaches the shelf without being bought from someone, so a product
    // cannot be created without naming the supplier it came from.
    const resolvedSupplier = await resolveSupplier(Supplier, supplierId);
    if (!resolvedSupplier) {
      res.status(400).json({
        message: supplierId?.trim()
          ? `Supplier "${supplierId.trim()}" does not exist. Create it on the Suppliers page first.`
          : 'Supplier is required — every product must come from a supplier',
      });
      return;
    }

    // A product that already exists — even sitting at zero stock — is
    // restocked through Receive Goods, not recreated under a second SKU.
    const duplicate = await findProductByName(Product, name);
    if (duplicate) {
      res.status(409).json({
        message: `"${duplicate.name}" already exists (SKU ${duplicate.sku}). Use Receive Goods to add stock to it instead of creating a new product.`,
      });
      return;
    }

    // The SKU always belongs to the category: the client's value is accepted
    // only when it already carries this category's prefix, otherwise the next
    // free number under that prefix is issued.
    const product = await issueSku(Category, Product, resolvedCategory, (issued) =>
      Product.create({
        name,
        sku: issued,
        description,
        sellingPrice,
        costPrice: costPrice ?? DEFAULT_COST_PRICE,
        stock: 0,
        lowStockThreshold: lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD,
        category: resolvedCategory,
        images: images ?? [],
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        supplierId: resolvedSupplier._id,
        supplier: resolvedSupplier.name,
        storeId,
        createdBy: userId,
        isWeightBased: Boolean(isWeightBased),
        unit: unit || (isWeightBased ? 'kg' : 'item'),
      })
    );

    await Category.findOneAndUpdate(
      { name: resolvedCategory },
      { $inc: { productCount: 1 } }
    );

    res.status(201).json({ data: product });
  } catch (err) {
    next(err);
  }
}

// ── PUT /api/products/:id ──────────────────────────────────────────────────
export async function updateProduct(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { Product, Category, Supplier, StockHistory, GRN } = req.models!;

    const {
      name,
      description,
      sellingPrice,
      costPrice,
      stock,
      lowStockThreshold,
      category,
      expiryDate,
      supplierId,
      isWeightBased,
      unit,
    } = req.body as {
      name?: string;
      description?: string;
      sellingPrice?: number;
      costPrice?: number;
      stock?: number;
      lowStockThreshold?: number;
      category?: string;
      expiryDate?: string | null;
      supplierId?: string;
      isWeightBased?: boolean;
      unit?: 'kg' | 'item';
    };

    // A product may only be moved into a category that exists on the categories page.
    let resolvedCategory: string | undefined;
    if (category !== undefined) {
      const resolved = await resolveCategoryName(Category, category);
      if (!resolved) {
        res.status(400).json({
          message: category?.trim()
            ? `Category "${category.trim()}" does not exist. Create it on the Categories page first.`
            : 'Category is required',
        });
        return;
      }
      resolvedCategory = resolved;
    }

    // An edit may move a product to another supplier but never leave it without one.
    let resolvedSupplier: ISupplier | undefined;
    if (supplierId !== undefined) {
      const resolved = await resolveSupplier(Supplier, supplierId);
      if (!resolved) {
        res.status(400).json({
          message: supplierId?.trim()
            ? `Supplier "${supplierId.trim()}" does not exist. Create it on the Suppliers page first.`
            : 'Supplier is required — every product must come from a supplier',
        });
        return;
      }
      resolvedSupplier = resolved;
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }

    // Editing the stock field moves stock just as surely as a sale does, so
    // the difference is recorded rather than silently overwriting the total —
    // otherwise a product's history stops adding up to what is on the shelf.
    // A product that has never received a GRN has nothing to correct: its
    // stock can only start moving once goods have actually arrived.
    if (stock !== undefined && stock !== product.stock) {
      const hasReceivedGRN = await GRN.exists({ storeId: product.storeId, 'items.product': product._id });
      if (!hasReceivedGRN) {
        res.status(400).json({
          message: 'This product has not received any goods yet. Add a GRN via Receive Goods before adjusting its stock.',
        });
        return;
      }
    }

    const stockBefore = product.stock;

    const changes: Record<string, unknown> = {
      name, description, sellingPrice, costPrice, stock, lowStockThreshold,
      isWeightBased, unit,
      category: resolvedCategory,
      supplierId: resolvedSupplier?._id,
      supplier: resolvedSupplier?.name,
      isWeightBased: isWeightBased !== undefined ? Boolean(isWeightBased) : undefined,
      unit: unit !== undefined ? unit : (isWeightBased !== undefined ? (isWeightBased ? 'kg' : 'item') : undefined),
      // Undefined leaves the stored date alone; an empty string clears it.
      expiryDate: expiryDate === undefined ? undefined : expiryDate ? new Date(expiryDate) : null,
    };
    for (const [field, value] of Object.entries(changes)) {
      if (value !== undefined) product.set(field, value);
    }

    // Moving a product to another category — or editing one that still carries
    // a legacy SKU — reissues the code so every product in a category keeps the
    // same three leading letters. An untouched, well-formed SKU is left alone.
    const skuCategory = await resolveCategoryName(Category, product.category);
    const prefix = skuCategory ? await getCategoryPrefix(Category, skuCategory) : null;

    if (prefix && !skuBelongsToPrefix(product.sku, prefix)) {
      await issueSku(Category, Product, skuCategory!, async (issued) => {
        product.sku = issued;
        return product.save();
      });
    } else {
      await product.save();
    }

    const movement = product.stock - stockBefore;
    if (movement !== 0) {
      await StockHistory.create({
        product: product._id,
        type: movement > 0 ? 'add' : 'remove',
        quantity: Math.abs(movement),
        reason: 'Stock corrected on product edit',
        by: req.user?.email ?? SYSTEM_ACTOR,
        storeId: product.storeId,
      });
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
    const { Product, StockHistory, GRN } = req.models!;
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

    // A product only starts moving once goods have actually arrived — a
    // manual adjustment cannot be the first stock a product ever sees.
    const hasReceivedGRN = await GRN.exists({ storeId, 'items.product': product._id });
    if (!hasReceivedGRN) {
      res.status(400).json({
        message: 'This product has not received any goods yet. Add a GRN via Receive Goods before adjusting its stock.',
      });
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
    const { Product, Category, Supplier } = req.models!;
    const storeId = req.user!.storeId;
    const userId = req.user!.id;
    const rows: CSVRow[] = req.body.rows;

    if (!Array.isArray(rows) || rows.length === 0) {
      res.status(400).json({ message: 'No rows provided' });
      return;
    }

    // Fetch once rather than per row — imports can be large.
    const categoryDocs = await Category.find({}).select('name').lean();
    const categoryByLower = new Map(categoryDocs.map((c) => [c.name.trim().toLowerCase(), c.name]));

    const supplierDocs = await Supplier.find({}).select('name').lean();
    const supplierByLower = new Map(
      supplierDocs.map((s) => [s.name.trim().toLowerCase(), s])
    );

    // A product that already exists is restocked through Receive Goods, not
    // recreated under a second SKU — checked against the catalog up front,
    // and updated as the batch goes so two rows for the same item both flag.
    const productDocs = await Product.find({}).select('name sku').lean();
    const productSkuByLower = new Map(productDocs.map((p) => [p.name.trim().toLowerCase(), p.sku]));

    const results = {
      imported: 0,
      failed: 0,
      errors: [] as Array<{ row: number; errors: string[] }>,
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowErrors: string[] = [];

      if (!row.name?.trim()) rowErrors.push('Product name is required');
      if (!row.selling_price || row.selling_price <= 0) rowErrors.push('Selling price must be greater than 0');

      // Imported products must land in an existing category, not a free-text value.
      const rawCategory = row.category?.trim();
      const resolvedCategory = rawCategory
        ? categoryByLower.get(rawCategory.toLowerCase())
        : undefined;
      if (!rawCategory) {
        rowErrors.push('Category is required');
      } else if (!resolvedCategory) {
        rowErrors.push(`Category "${rawCategory}" does not exist. Create it on the Categories page first.`);
      }

      // Imported stock had to be delivered by someone too.
      const rawSupplier = row.supplier?.trim();
      const resolvedSupplier = rawSupplier
        ? supplierByLower.get(rawSupplier.toLowerCase())
        : undefined;
      if (!rawSupplier) {
        rowErrors.push('Supplier is required');
      } else if (!resolvedSupplier) {
        rowErrors.push(`Supplier "${rawSupplier}" does not exist. Create it on the Suppliers page first.`);
      }

      // A product with this name already exists — restock it through Receive
      // Goods rather than importing a duplicate under a new SKU.
      const nameLower = row.name?.trim().toLowerCase();
      const existingSku = nameLower ? productSkuByLower.get(nameLower) : undefined;
      if (existingSku) {
        rowErrors.push(`"${row.name.trim()}" already exists (SKU ${existingSku}). Use Receive Goods to add stock to it instead.`);
      }

      if (rowErrors.length > 0) {
        results.failed++;
        results.errors.push({ row: i + 1, errors: rowErrors });
        continue;
      }

      try {
        // Imported rows carry no SKU: each one is issued from its category.
        const created = await issueSku(Category, Product, resolvedCategory!, (issued) =>
          Product.create({
            name: row.name.trim(),
            sku: issued,
            category: resolvedCategory,
            sellingPrice: row.selling_price,
            costPrice: row.cost_price ?? DEFAULT_COST_PRICE,
            stock: 0,
            lowStockThreshold: row.low_stock_threshold ?? DEFAULT_LOW_STOCK_THRESHOLD,
            isWeightBased: row.is_weight_based ?? false,
            unit: row.is_weight_based ? 'kg' : 'item',
            supplierId: resolvedSupplier!._id,
            supplier: resolvedSupplier!.name,
            storeId,
            createdBy: userId,
          })
        );
        // So a second row further down the same file, for the same product,
        // is caught too instead of creating a second duplicate.
        productSkuByLower.set(nameLower!, created.sku);
        results.imported++;
      } catch {
        results.failed++;
        results.errors.push({ row: i + 1, errors: ['Invalid data'] });
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
    const { keys } = req.body as { keys?: string[] };

    if (!Array.isArray(keys) || keys.length === 0) {
      res.status(400).json({ message: 'keys must be a non-empty array (upload the files to S3 first)' });
      return;
    }

    if (keys.length > 10) {
      res.status(400).json({ message: 'At most 10 images may be attached at once' });
      return;
    }

    if (!keys.every((k) => typeof k === 'string' && keyBelongsToTenant(k, req.tenantDbName!))) {
      res.status(403).json({ message: 'Upload key does not belong to this store' });
      return;
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      // Orphan the objects rather than leaving them attached to nothing.
      await Promise.all(keys.map((k) => deleteObject(k)));
      res.status(404).json({ message: 'Product not found' });
      return;
    }

    const newPaths = keys.map((k) => publicUrl(k));
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
    const key = req.query.key as string | undefined;

    if (!key) {
      res.status(400).json({ message: 'key query parameter is required' });
      return;
    }

    if (!keyBelongsToTenant(key, req.tenantDbName!)) {
      res.status(403).json({ message: 'Upload key does not belong to this store' });
      return;
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }

    // Stored URLs may carry a cache-busting query string; match on the key.
    const url = publicUrl(key);
    product.images = product.images.filter((img) => img.split('?')[0] !== url);
    await product.save();

    await deleteObject(key);

    res.json({ data: product });
  } catch (err) {
    next(err);
  }
}
