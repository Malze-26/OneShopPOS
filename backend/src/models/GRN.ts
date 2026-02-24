import mongoose, { Document, Schema } from 'mongoose';

export interface IGRNItem {
  product: mongoose.Types.ObjectId;
  productName: string;
  sku: string;
  quantityReceived: number;
  costPrice: number;
  subtotal: number;
}

export interface IGRN extends Document {
  grnNumber: string;
  supplier: string;
  referenceNumber: string;
  notes: string;
  items: IGRNItem[];
  totalItems: number;
  totalCost: number;
  receivedBy: string;
  storeId: string;
}

const grnItemSchema = new Schema<IGRNItem>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    productName: { type: String, required: true },
    sku: { type: String, required: true },
    quantityReceived: { type: Number, required: true, min: [1, 'Quantity must be at least 1'] },
    costPrice: { type: Number, required: true, min: [0, 'Cost price cannot be negative'] },
    subtotal: { type: Number, required: true },
  },
  { _id: false }
);

const grnSchema = new Schema<IGRN>(
  {
    grnNumber: { type: String, required: true, unique: true },
    supplier: { type: String, trim: true, default: '' },
    referenceNumber: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
    items: { type: [grnItemSchema], required: true, validate: [(v: IGRNItem[]) => v.length > 0, 'At least one item is required'] },
    totalItems: { type: Number, required: true },
    totalCost: { type: Number, required: true },
    receivedBy: { type: String, required: true },
    storeId: { type: String, required: true, default: 'STORE-2025-001' },
  },
  { timestamps: true }
);

grnSchema.index({ storeId: 1, createdAt: -1 });
grnSchema.index({ grnNumber: 1 }, { unique: true });

export const GRN = mongoose.model<IGRN>('GRN', grnSchema);
