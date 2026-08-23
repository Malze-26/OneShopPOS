import mongoose, { Document, Schema } from 'mongoose';

/**
 * Why stock left the shelf and went back to the supplier. Both reasons are
 * unsellable stock, so both are booked as a loss against revenue.
 */
export type ReturnReason = 'expired' | 'damaged';

export interface ISupplierReturnItem {
  product: mongoose.Types.ObjectId;
  productName: string;
  sku: string;
  quantity: number;
  /** Cost price snapshot at return time — the basis for the revenue deduction. */
  costPrice: number;
  /** Selling price snapshot — reported alongside as the forgone retail value. */
  sellingPrice: number;
  reason: ReturnReason;
  expiryDate?: Date | null;
  lossValue: number;
  retailValue: number;
}

export interface ISupplierReturn extends Document {
  returnNumber: string;
  supplier: string;
  supplierId: mongoose.Types.ObjectId;
  referenceNumber: string;
  notes: string;
  items: ISupplierReturnItem[];
  totalItems: number;
  /** Sum of item lossValue — deducted from revenue the moment this is saved. */
  totalLossValue: number;
  totalRetailValue: number;
  returnedBy: string;
  storeId: string;
  createdAt: Date;
  updatedAt: Date;
}

const supplierReturnItemSchema = new Schema<ISupplierReturnItem>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    productName: { type: String, required: true },
    sku: { type: String, required: true },
    quantity: { type: Number, required: true, min: [1, 'Quantity must be at least 1'] },
    costPrice: { type: Number, required: true, min: [0, 'Cost price cannot be negative'] },
    sellingPrice: { type: Number, required: true, min: [0, 'Selling price cannot be negative'] },
    reason: { type: String, enum: ['expired', 'damaged'], required: true },
    expiryDate: { type: Date, default: null },
    lossValue: { type: Number, required: true },
    retailValue: { type: Number, required: true },
  },
  { _id: false }
);

export const supplierReturnSchema = new Schema<ISupplierReturn>(
  {
    returnNumber: { type: String, required: true, unique: true },
    // Stock goes back to the supplier it came from, so a return without
    // one is paperwork nobody can act on. Required the same way a GRN is.
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: [true, 'Supplier is required'] },
    supplier: { type: String, trim: true, required: [true, 'Supplier is required'] },
    referenceNumber: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
    items: {
      type: [supplierReturnItemSchema],
      required: true,
      validate: [(v: ISupplierReturnItem[]) => v.length > 0, 'At least one item is required'],
    },
    totalItems: { type: Number, required: true },
    totalLossValue: { type: Number, required: true },
    totalRetailValue: { type: Number, required: true },
    returnedBy: { type: String, required: true },
    storeId: { type: String, required: true, default: 'STORE-2025-001' },
  },
  { timestamps: true }
);

supplierReturnSchema.index({ storeId: 1, createdAt: -1 });

export const SupplierReturn = mongoose.model<ISupplierReturn>('SupplierReturn', supplierReturnSchema);
