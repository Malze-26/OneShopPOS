import mongoose, { Document, Schema } from 'mongoose';

export interface ICustomer extends Document {
  name: string;
  email?: string;
  phone?: string;
  avatar: string;
  totalOrders: number;
  totalSpent: number;
  lastPurchase?: Date;
  storeId: string;
}

const customerSchema = new Schema<ICustomer>(
  {
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    avatar: {
      type: String,
      default: '',
    },
    totalOrders: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalSpent: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastPurchase: {
      type: Date,
    },
    storeId: {
      type: String,
      required: true,
      default: 'STORE-2025-001',
    },
  },
  {
    timestamps: true,
  }
);

customerSchema.index({ storeId: 1 });
customerSchema.index({ email: 1 });

export const Customer = mongoose.model<ICustomer>('Customer', customerSchema);
