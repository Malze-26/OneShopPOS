import mongoose, { Document, Schema } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  icon: string;
  color: string;
  storeId: string;
  productCount: number;
}

const categorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
    },
    icon: {
      type: String,
      default: '📦',
    },
    color: {
      type: String,
      default: '#155dfc',
    },
    storeId: {
      type: String,
      required: true,
      default: 'STORE-2025-001',
    },
    productCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

categorySchema.index({ storeId: 1, name: 1 }, { unique: true });

export const Category = mongoose.model<ICategory>('Category', categorySchema);
