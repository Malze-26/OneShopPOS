import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';

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
    const { Supplier } = req.models!;
    const storeId = req.user!.storeId;
    const { name, contactPerson, email, phone, address, categories, notes } = req.body;
    if (!name?.trim()) { res.status(400).json({ message: 'Supplier name is required' }); return; }

    const supplier = await Supplier.create({ name: name.trim(), contactPerson, email, phone, address, categories: categories ?? [], notes, storeId });
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
    const { Supplier } = req.models!;
    const { name, contactPerson, email, phone, address, categories, status, notes } = req.body;
    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      { name, contactPerson, email, phone, address, categories, status, notes },
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
