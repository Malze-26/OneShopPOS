import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// This is the model for website users (customers who register/login on the site)
// DO NOT use a separate User model for website customers — use this one

const customerSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true },
    email:    { type: String, lowercase: true, trim: true },
    phone:    { type: String, trim: true },
    password: { type: String, select: false },  // hashed, for website login
    avatar:   { type: String, default: '' },
    address:  { type: String, trim: true, default: '' },

    // Updated automatically when orders are placed
    totalOrders: { type: Number, default: 0, min: 0 },
    totalSpent:  { type: Number, default: 0, min: 0 },
    lastPurchase:{ type: Date },

    storeId: { type: String, required: true, default: 'STORE-2025-001' },
  },
  { timestamps: true }
);

customerSchema.pre('save', async function (next) {
  if (this.isModified('password') && this.password) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  next();
});

customerSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.model('Customer', customerSchema);
