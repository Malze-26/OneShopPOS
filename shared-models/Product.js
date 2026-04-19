import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true },
    slug:        { type: String, trim: true, lowercase: true },
    sku:         { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, trim: true },

    // Price — use sellingPrice as the customer-facing price
    sellingPrice: { type: Number, required: true, min: 0 },
    costPrice:    { type: Number, required: true, min: 0 },

    stock:             { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 10, min: 0 },

    category: { type: String, required: true, trim: true },
    images:   { type: [String], default: [] },

    brand:      { type: String, trim: true, default: 'OneShop' },
    featured:   { type: Boolean, default: false },
    badge:      { type: String, enum: ['Best Seller', 'New Arrival', 'Sale', ''], default: '' },
    rating:     { type: Number, default: 0, min: 0, max: 5 },
    numReviews: { type: Number, default: 0, min: 0 },

    isWeightBased: { type: Boolean, default: false },
    unit:          { type: String, enum: ['kg', 'item'], default: 'item' },

    storeId:   { type: String, required: true, default: 'STORE-2025-001' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Auto-generate slug
productSchema.pre('save', function (next) {
  if (this.isModified('name') || !this.slug) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  next();
});

// Status virtual
productSchema.virtual('status').get(function () {
  if (this.stock === 0) return 'out-of-stock';
  if (this.stock <= this.lowStockThreshold) return 'low-stock';
  return 'in-stock';
});

export default mongoose.model('Product', productSchema);
