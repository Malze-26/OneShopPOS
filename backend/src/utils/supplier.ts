import { Model } from 'mongoose';
import { ISupplier } from '../models/Supplier';

/**
 * Resolves a supplier reference — an _id or a name — to the stored document.
 *
 * Stock only exists because someone delivered it, so neither a product nor a
 * goods-received note may be saved against a supplier the suppliers page does
 * not know about. Matching on the name is case/whitespace-insensitive, the same
 * way categories are resolved.
 *
 * Returns null when the reference is empty or matches nothing, leaving the
 * caller to decide which error the user should see.
 */
export async function resolveSupplier(
  SupplierModel: Model<ISupplier>,
  ref: string | undefined | null
): Promise<ISupplier | null> {
  const value = ref?.trim();
  if (!value) return null;

  if (/^[0-9a-fA-F]{24}$/.test(value)) {
    const byId = await SupplierModel.findById(value);
    if (byId) return byId;
  }

  const wanted = value.toLowerCase();
  const suppliers = await SupplierModel.find({});
  return suppliers.find((sup) => sup.name.trim().toLowerCase() === wanted) ?? null;
}
