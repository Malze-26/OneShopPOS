import mongoose, { Document, Schema } from 'mongoose';
import { EXPIRY_SOON_DAYS } from '../constants';

export type ExpiryStatus = 'expired' | 'expiring-soon' | 'fresh';

export interface IProduct extends Document {
  name: string;
  slug: string;
  sku: string;
  description?: string;
  sellingPrice: number;
  costPrice: number;
  stock: number;
  lowStockThreshold: number;
  category: string;
  images: string[];
  brand?: string;
  featured: boolean;
  badge?: 'Best Seller' | 'New Arrival' | 'Sale' | '';
  rating: number;
  numReviews: number;
  storeId: string;
  expiryDate?: Date | null;
  status: 'in-stock' | 'low-stock' | 'out-of-stock';
  expiryStatus: ExpiryStatus | null;
  createdBy: mongoose.Types.ObjectId;
  isWeightBased: boolean;
  unit: 'kg' | 'item';
  createdAt: Date;
  updatedAt: Date;
}

export const productSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    sellingPrice: {
      type: Number,
      required: [true, 'Selling price is required'],
      min: [0, 'Selling price must be non-negative'],
    },
    costPrice: {
      type: Number,
      required: [true, 'Cost price is required'],
      min: [0, 'Cost price must be non-negative'],
    },
    stock: {
      type: Number,
      default: 0,
      min: [0, 'Stock cannot be negative'],
    },
    lowStockThreshold: {
      type: Number,
      default: 10,
      min: [0, 'Low stock threshold must be non-negative'],
    },
    // Expiry date of the stock currently on the shelf. Null for non-perishables.
    // Once it passes, the remaining stock must be returned to the supplier.
    expiryDate: {
      type: Date,
      default: null,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    images: {
      type: [String],
      default: [],
    },
    brand: {
      type: String,
      trim: true,
      default: 'OneShop',
    },
    featured: {
      type: Boolean,
      default: false,
    },
    badge: {
      type: String,
      enum: ['Best Seller', 'New Arrival', 'Sale', ''],
      default: '',
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    numReviews: {
      type: Number,
      default: 0,
      min: 0,
    },
    storeId: {
      type: String,
      required: true,
      default: 'STORE-2025-001',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isWeightBased: {
  type: Boolean,
  default: false,
},
unit: {
  type: String,
  enum: ['kg', 'item'],
  default: 'item',
},
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Auto-generate slug from name
productSchema.pre('save', function (next) {
  if (this.isModified('name') || !this.slug) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  next();
});

// Virtual for status
productSchema.virtual('status').get(function (this: IProduct) {
  if (this.stock === 0) return 'out-of-stock';
  if (this.stock <= this.lowStockThreshold) return 'low-stock';
  return 'in-stock';
});

// Virtual for expiry status — null when the product does not track expiry
productSchema.virtual('expiryStatus').get(function (this: IProduct) {
  if (!this.expiryDate) return null;

  // Compare on date boundaries so a product expiring later today still reads as
  // 'expiring-soon' instead of flipping to 'expired' partway through the day.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(this.expiryDate);
  expiry.setHours(0, 0, 0, 0);

  if (expiry.getTime() < today.getTime()) return 'expired';

  const daysLeft = Math.round((expiry.getTime() - today.getTime()) / 86400000);
  return daysLeft <= EXPIRY_SOON_DAYS ? 'expiring-soon' : 'fresh';
});

// Index for fast lookups
productSchema.index({ storeId: 1, sku: 1 });
productSchema.index({ storeId: 1, category: 1 });
productSchema.index({ storeId: 1, expiryDate: 1 });

export const Product = mongoose.model<IProduct>('Product', productSchema);
