import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name:         { type: String, required: true, trim: true },
    slug:         { type: String, trim: true, lowercase: true },
    description:  { type: String, trim: true, default: '' },
    icon:         { type: String, default: '📦' },
    color:        { type: String, default: '#155dfc' },
    productCount: { type: Number, default: 0 },
    storeId:      { type: String, required: true, default: 'STORE-2025-001' },
  },
  { timestamps: true }
);

categorySchema.pre('save', function (next) {
  if (this.isModified('name') || !this.slug) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  next();
});

export default mongoose.model('Category', categorySchema);
