import mongoose, { Document, Schema } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  slug: string;
  description?: string;
  icon: string;
  color: string;
  /** Three capital letters every product SKU in this category starts with, e.g. SDW. */
  skuPrefix?: string;
  /** Highest SKU number handed out under this prefix; only ever moves up. */
  skuSequence?: number;
  storeId: string;
  productCount: number;
}

export const categorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    icon: {
      type: String,
      default: '📦',
    },
    color: {
      type: String,
      default: '#155dfc',
    },
    // Assigned on first use and never changed afterwards — renaming a category
    // must not strand its existing products under an orphaned prefix.
    skuPrefix: {
      type: String,
      uppercase: true,
      trim: true,
      match: [/^[A-Z]{3}$/, 'SKU prefix must be exactly 3 capital letters'],
    },
    // Never decremented: a deleted or reassigned product retires its number
    // instead of freeing it, so a SKU on an old receipt keeps its meaning.
    skuSequence: {
      type: Number,
      default: 0,
      min: 0,
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

categorySchema.pre('save', function (next) {
  if (this.isModified('name') || !this.slug) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  next();
});

categorySchema.index({ storeId: 1, name: 1 }, { unique: true });

// Partial so categories that predate SKU prefixes do not all collide on the
// missing value while they wait to be assigned one.
categorySchema.index(
  { skuPrefix: 1 },
  { unique: true, partialFilterExpression: { skuPrefix: { $type: 'string' } } }
);

export const Category = mongoose.model<ICategory>('Category', categorySchema);
