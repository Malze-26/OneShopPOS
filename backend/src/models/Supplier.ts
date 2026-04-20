import mongoose, { Document, Schema } from 'mongoose';

export interface ISupplier extends Document {
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  categories: string[];
  status: 'active' | 'inactive';
  notes: string;
  storeId: string;
}

const supplierSchema = new Schema<ISupplier>(
  {
    name:          { type: String, required: true, trim: true },
    contactPerson: { type: String, trim: true, default: '' },
    email:         { type: String, trim: true, lowercase: true, default: '' },
    phone:         { type: String, trim: true, default: '' },
    address:       { type: String, trim: true, default: '' },
    categories:    { type: [String], default: [] },
    status:        { type: String, enum: ['active', 'inactive'], default: 'active' },
    notes:         { type: String, trim: true, default: '' },
    storeId:       { type: String, required: true },
  },
  { timestamps: true }
);

supplierSchema.index({ storeId: 1 });
supplierSchema.index({ name: 1, storeId: 1 }, { unique: true });

export const Supplier = mongoose.model<ISupplier>('Supplier', supplierSchema);
