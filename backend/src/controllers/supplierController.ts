import { Response, NextFunction } from 'express';
import { Model } from 'mongoose';
import { AuthRequest } from '../types';
import { ICategory } from '../models/Category';

/**
 * Resolves the categories a supplier claims to supply to the names stored on
 * the categories page. A supplier's categories are the same vocabulary the
 * products use — free text would strand a supplier under a category no product
 * can ever belong to (the old "Dairy & Eggs" against a "Dairy" catalogue).
 *
 * Matching is case/whitespace-insensitive and returns the canonical names.
 * Returns the offending values instead when any of them is unknown.
 */
async function resolveCategoryNames(
  CategoryModel: Model<ICategory>,
  names: unknown
): Promise<{ resolved: string[]; unknown: string[] }> {
  if (!Array.isArray(names)) return { resolved: [], unknown: [] };

  const categories = await CategoryModel.find({}).select('name').lean();
  const byLower = new Map(categories.map((c) => [c.name.trim().toLowerCase(), c.name]));

  const resolved: string[] = [];
  const unknown: string[] = [];

  for (const raw of names) {
    const value = String(raw ?? '').trim();
    if (!value) continue;
    const match = byLower.get(value.toLowerCase());
    if (match) {
      // Deduplicate: two spellings of one category are still one category.
      if (!resolved.includes(match)) resolved.push(match);
    } else {
      unknown.push(value);
    }
  }

  return { resolved, unknown };
}

// GET /api/suppliers
export async function getSuppliers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { Supplier } = req.models!;
    const { search, status, category } = req.query as Record<string, string>;

    const filter: Record<string, unknown> = {};
    if (status && status !== 'all') filter.status = status;
    if (category && category !== 'all') filter.categories = category;
    if (search) {
      filter.$or = [
        { name:          { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } },
        { email:         { $regex: search, $options: 'i' } },
        { phone:         { $regex: search, $options: 'i' } },
      ];
    }

    const suppliers = await Supplier.find(filter).sort({ name: 1 });
    res.json({ data: suppliers, total: suppliers.length });
  } catch (err) {
    next(err);
  }
}

// GET /api/suppliers/stats
export async function getSupplierStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { Supplier } = req.models!;
    const [total, active] = await Promise.all([
      Supplier.countDocuments({}),
      Supplier.countDocuments({ status: 'active' }),
    ]);
    const allSuppliers = await Supplier.find({}).select('categories');
    const uniqueCategories = new Set(allSuppliers.flatMap(s => s.categories));
    res.json({ data: { total, active, inactive: total - active, categoriesSupplied: uniqueCategories.size } });
  } catch (err) {
    next(err);
  }
}

// GET /api/suppliers/:id
export async function getSupplier(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { Supplier } = req.models!;
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) { res.status(404).json({ message: 'Supplier not found' }); return; }
    res.json({ data: supplier });
  } catch (err) {
    next(err);
  }
}

// POST /api/suppliers
export async function createSupplier(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { Supplier, Category } = req.models!;
    const storeId = req.user!.storeId;
    const { name, contactPerson, email, phone, address, categories, notes } = req.body;
    if (!name?.trim()) { res.status(400).json({ message: 'Supplier name is required' }); return; }

    const { resolved, unknown } = await resolveCategoryNames(Category, categories ?? []);
    if (unknown.length > 0) {
      res.status(400).json({
        message: `Unknown categor${unknown.length > 1 ? 'ies' : 'y'}: ${unknown.join(', ')}. Create them on the Categories page first.`,
      });
      return;
    }

    const supplier = await Supplier.create({ name: name.trim(), contactPerson, email, phone, address, categories: resolved, notes, storeId });
    res.status(201).json({ data: supplier });
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) {
      res.status(409).json({ message: 'A supplier with this name already exists' });
      return;
    }
    next(err);
  }
}

// PATCH /api/suppliers/:id
export async function updateSupplier(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { Supplier, Category } = req.models!;
    const { name, contactPerson, email, phone, address, categories, status, notes } = req.body;

    // Undefined leaves the stored list alone; anything sent has to be real.
    let resolvedCategories: string[] | undefined;
    if (categories !== undefined) {
      const { resolved, unknown } = await resolveCategoryNames(Category, categories);
      if (unknown.length > 0) {
        res.status(400).json({
          message: `Unknown categor${unknown.length > 1 ? 'ies' : 'y'}: ${unknown.join(', ')}. Create them on the Categories page first.`,
        });
        return;
      }
      resolvedCategories = resolved;
    }

    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      { name, contactPerson, email, phone, address, categories: resolvedCategories, status, notes },
      { new: true, runValidators: true }
    );
    if (!supplier) { res.status(404).json({ message: 'Supplier not found' }); return; }
    res.json({ data: supplier });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/suppliers/:id  (Manager only)
export async function deleteSupplier(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { Supplier } = req.models!;
    const supplier = await Supplier.findByIdAndDelete(req.params.id);
    if (!supplier) { res.status(404).json({ message: 'Supplier not found' }); return; }
    res.json({ message: 'Supplier deleted' });
  } catch (err) {
    next(err);
  }
}
