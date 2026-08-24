import mongoose, { Document, Schema } from 'mongoose';

export type PaymentMethod = 'Cash' | 'Card';
export type TransactionStatus = 'success' | 'voided';
export type OrderStatus = 'success' | 'cancelled';
export type PaymentStatus = 'paid' | 'voided';

export interface ITransactionItem {
  product: mongoose.Types.ObjectId;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface ITransaction extends Document {
  txnId: string;
  orderId: string;
  customer: string;
  customerId?: string;
  paymentMethod: PaymentMethod;
  amount: number;
  discount: number;
  total: number;
  status: TransactionStatus;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  items: ITransactionItem[];
  storeId: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const transactionItemSchema = new Schema<ITransactionItem>(
  {
    product:     { type: Schema.Types.ObjectId, ref: 'Product' },
    productName: { type: String, default: '' },
    sku:         { type: String, default: '' },
    quantity:    { type: Number, min: 0 },
    unitPrice:   { type: Number, min: 0 },
    subtotal:    { type: Number, min: 0 },
  },
  { _id: false }
);

export const transactionSchema = new Schema<ITransaction>(
  {
    txnId: {
      type: String,
      required: true,
      unique: true,
    },
    orderId: {
      type: String,
      required: [true, 'Order ID is required'],
    },
    customer: {
      type: String,
      required: [true, 'Customer is required'],
      trim: true,
    },
    customerId: {
      type: String,
      default: null,
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'Card'],
      required: [true, 'Payment method is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount must be non-negative'],
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['success', 'voided'],
      default: 'success',
    },
    orderStatus: {
      type: String,
      enum: ['success', 'cancelled'],
      default: 'success',
    },
    paymentStatus: {
      type: String,
      enum: ['paid', 'voided'],
      default: 'paid',
    },
    items: {
      type: [transactionItemSchema],
      default: [],
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
  },
  {
    timestamps: true,
  }
);

transactionSchema.index({ storeId: 1, createdAt: -1 });
transactionSchema.index({ storeId: 1, paymentMethod: 1 });

export const Transaction = mongoose.model<ITransaction>('Transaction', transactionSchema);
