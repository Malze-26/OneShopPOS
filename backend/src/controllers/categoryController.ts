import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { Category } from '../models/Category';

// GET /api/categories
export async function getCategories(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = req.user?.storeId ?? 'STORE-2025-001';
    const categories = await Category.find({ storeId }).sort({ name: 1 });
    res.json({ data: categories, total: categories.length });
  } catch (err) {
    next(err);
  }
}

// GET /api/categories/:id
export async function getCategory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = req.user?.storeId ?? 'STORE-2025-001';
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

// POST /api/categories
export async function createCategory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = req.user?.storeId ?? 'STORE-2025-001';
    const { name, icon, color } = req.body;

    if (!name?.trim()) {
      res.status(400).json({ message: 'Category name is required' });
      return;
    }

    const category = await Category.create({
      name: name.trim(),
      icon: icon || '📦',
      color: color || '#155dfc',
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

// PUT /api/categories/:id
export async function updateCategory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = req.user?.storeId ?? 'STORE-2025-001';
    const { name, icon, color } = req.body;

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

// DELETE /api/categories/:id
export async function deleteCategory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = req.user?.storeId ?? 'STORE-2025-001';
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
