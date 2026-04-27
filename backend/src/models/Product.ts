import mongoose, { Document, Schema } from 'mongoose';

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
  status: 'in-stock' | 'low-stock' | 'out-of-stock';
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

// Index for fast lookups
productSchema.index({ storeId: 1, sku: 1 });
productSchema.index({ storeId: 1, category: 1 });

export const Product = mongoose.model<IProduct>('Product', productSchema);
