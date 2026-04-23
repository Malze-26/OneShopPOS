import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { Category } from '../models/Category';
import { Product } from '../models/Product';
import { DEFAULT_CATEGORY_ICON, DEFAULT_CATEGORY_COLOR } from '../constants';

// ── GET /api/categories ────────────────────────────────────────────────────

/**
 * Returns all categories for the authenticated store, sorted alphabetically.
 * Product counts are computed live via aggregation instead of relying on the
 * stored counter, which can drift if products are deleted outside normal flow.
 */
export async function getCategories(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = req.user!.storeId;

    const [categories, counts] = await Promise.all([
      Category.find({ storeId }).sort({ name: 1 }),
      Product.aggregate<{ _id: string; count: number }>([
        { $match: { storeId } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
    ]);

    const countMap = new Map(counts.map((c) => [c._id, c.count]));

    const result = categories.map((cat) => ({
      ...cat.toJSON(),
      productCount: countMap.get(cat.name) ?? 0,
    }));

    res.json({ data: result, total: result.length });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/categories/:id ────────────────────────────────────────────────

/**
 * Returns a single category by ID.
 * Returns 404 if it does not belong to the authenticated store.
 */
export async function getCategory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = req.user!.storeId;
    const category = await Category.findOne({ _id: req.params.id, storeId });

    if (!category) {
      res.status(404).json({ message: 'Category not found' });
      return;
    }

    res.json({ data: category });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/categories ───────────────────────────────────────────────────

/**
 * Creates a new category under the authenticated store.
 * Name must be non-empty. Icon and color fall back to defaults if omitted.
 * Returns 409 if a category with the same name already exists in this store
 * (enforced by a unique compound index on name + storeId in the schema).
 */
export async function createCategory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = req.user!.storeId;
    const { name, icon, color } = req.body as { name?: string; icon?: string; color?: string };

    if (!name?.trim()) {
      res.status(400).json({ message: 'Category name is required' });
      return;
    }

    const category = await Category.create({
      name: name.trim(),
      icon: icon || DEFAULT_CATEGORY_ICON,
      color: color || DEFAULT_CATEGORY_COLOR,
      storeId,
    });

    res.status(201).json({ data: category });
  } catch (err: unknown) {
    // MongoDB duplicate key error — name + storeId compound index violation
    if ((err as { code?: number }).code === 11000) {
      res.status(409).json({ message: 'Category with this name already exists' });
      return;
    }
    next(err);
  }
}

// ── PUT /api/categories/:id ────────────────────────────────────────────────

/**
 * Updates the name, icon, and/or color of an existing category.
 * Runs Mongoose validators on the updated fields.
 * Returns 404 if the category does not belong to the authenticated store.
 */
export async function updateCategory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = req.user!.storeId;
    const { name, icon, color } = req.body as { name?: string; icon?: string; color?: string };

    const category = await Category.findOneAndUpdate(
      { _id: req.params.id, storeId },
      { name, icon, color },
      { new: true, runValidators: true }
    );

    if (!category) {
      res.status(404).json({ message: 'Category not found' });
      return;
    }

    res.json({ data: category });
  } catch (err) {
    next(err);
  }
}

// ── DELETE /api/categories/:id ─────────────────────────────────────────────

/**
 * Deletes a category by ID.
 * Note: existing products referencing this category are NOT reassigned —
 * callers should handle orphaned products if needed.
 * Returns 404 if the category does not belong to the authenticated store.
 */
export async function deleteCategory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = req.user!.storeId;
    const category = await Category.findOneAndDelete({ _id: req.params.id, storeId });

    if (!category) {
      res.status(404).json({ message: 'Category not found' });
      return;
    }

    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    next(err);
  }
}
