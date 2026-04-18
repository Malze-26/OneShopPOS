import mongoose, { Document, Schema } from 'mongoose';

export type OrderSource = 'physical' | 'online';
export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
export type PaymentMethod = 'Cash' | 'Card' | 'Bank Transfer' | 'Online';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface IOrderItem {
  product: mongoose.Types.ObjectId;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface IOrder extends Document {
  orderId: string;
  source: OrderSource;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  items: IOrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  deliveryAddress?: string;
  notes?: string;
  storeId: string;
  createdBy: mongoose.Types.ObjectId;
}

const orderItemSchema = new Schema<IOrderItem>(
  {
    product:     { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    sku:         { type: String, required: true },
    quantity:    { type: Number, required: true, min: 1 },
    unitPrice:   { type: Number, required: true, min: 0 },
    subtotal:    { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const orderSchema = new Schema<IOrder>(
  {
    orderId: { type: String, required: true, unique: true },
    source:  { type: String, enum: ['physical', 'online'], required: true },

    customerName:  { type: String, required: true, trim: true },
    customerEmail: { type: String, trim: true },
    customerPhone: { type: String, trim: true },

    items:    { type: [orderItemSchema], required: true, validate: [(v: IOrderItem[]) => v.length > 0, 'At least one item required'] },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    total:    { type: Number, required: true, min: 0 },

    status:        { type: String, enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'], default: 'pending' },
    paymentMethod: { type: String, enum: ['Cash', 'Card', 'Bank Transfer', 'Online'], required: true },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },

    deliveryAddress: { type: String, trim: true },
    notes:           { type: String, trim: true },

    storeId:   { type: String, required: true, default: 'STORE-2025-001' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

orderSchema.index({ storeId: 1, createdAt: -1 });
orderSchema.index({ storeId: 1, source: 1 });
orderSchema.index({ storeId: 1, status: 1 });

export const Order = mongoose.model<IOrder>('Order', orderSchema);
