import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    product:     { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    sku:         { type: String, required: true },
    quantity:    { type: Number, required: true, min: 1 },
    unitPrice:   { type: Number, required: true, min: 0 },
    subtotal:    { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true },

    // physical = POS in-store sale, online = website purchase
    source: { type: String, enum: ['physical', 'online'], required: true },

    customerName:  { type: String, required: true, trim: true },
    customerEmail: { type: String, trim: true },
    customerPhone: { type: String, trim: true },

    items:    { type: [orderItemSchema], required: true },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    total:    { type: Number, required: true, min: 0 },

    status:        { type: String, enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'], default: 'pending' },
    paymentMethod: { type: String, enum: ['Cash', 'Card', 'Bank Transfer', 'Online'], required: true },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },

    deliveryAddress: { type: String, trim: true },
    notes:           { type: String, trim: true },

    storeId:   { type: String, required: true, default: 'STORE-2025-001' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('Order', orderSchema);
