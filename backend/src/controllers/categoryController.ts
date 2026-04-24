import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { DEFAULT_CATEGORY_ICON, DEFAULT_CATEGORY_COLOR } from '../constants';

// ── GET /api/categories ────────────────────────────────────────────────────
export async function getCategories(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { Category, Product } = req.models!;

    const [categories, counts] = await Promise.all([
      Category.find({}).sort({ name: 1 }),
      Product.aggregate<{ _id: string; count: number }>([
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
export async function getCategory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { Category } = req.models!;
    const category = await Category.findById(req.params.id);

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
export async function createCategory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { Category } = req.models!;
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
    if ((err as { code?: number }).code === 11000) {
      res.status(409).json({ message: 'Category with this name already exists' });
      return;
    }
    next(err);
  }
}

// ── PUT /api/categories/:id ────────────────────────────────────────────────
export async function updateCategory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { Category } = req.models!;
    const { name, icon, color } = req.body as { name?: string; icon?: string; color?: string };

    const category = await Category.findByIdAndUpdate(
      req.params.id,
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
export async function deleteCategory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { Category } = req.models!;
    const category = await Category.findByIdAndDelete(req.params.id);

    if (!category) {
      res.status(404).json({ message: 'Category not found' });
      return;
    }

    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    next(err);
  }
}
