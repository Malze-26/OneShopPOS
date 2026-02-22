import mongoose, { Document, Schema } from 'mongoose';

export type PaymentMethod = 'Cash' | 'Card' | 'Bank Transfer';
export type TransactionStatus = 'success' | 'pending' | 'failed';

export interface ITransaction extends Document {
  txnId: string;
  orderId: string;
  customer: string;
  paymentMethod: PaymentMethod;
  amount: number;
  status: TransactionStatus;
  storeId: string;
  createdBy: mongoose.Types.ObjectId;
}

const transactionSchema = new Schema<ITransaction>(
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
    paymentMethod: {
      type: String,
      enum: ['Cash', 'Card', 'Bank Transfer'],
      required: [true, 'Payment method is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount must be non-negative'],
    },
    status: {
      type: String,
      enum: ['success', 'pending', 'failed'],
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
