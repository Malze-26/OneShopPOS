import mongoose, { Document, Schema } from 'mongoose';

export type PaymentMethod = 'Cash' | 'Card';
export type TransactionStatus = 'success' | 'pending' | 'failed' | 'voided';

export interface ITransaction extends Document {
  txnId: string;
  orderId: string;
  customer: string;
  customerId?: string;
  paymentMethod: PaymentMethod;
  amount: number;
  status: TransactionStatus;
  storeId: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

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
    status: {
      type: String,
      enum: ['success', 'pending', 'failed', 'voided'],
      default: 'success',
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