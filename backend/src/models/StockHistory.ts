import mongoose, { Document, Schema } from 'mongoose';

export type AdjustmentType = 'add' | 'remove';

export interface IStockHistory extends Document {
  product: mongoose.Types.ObjectId;
  type: AdjustmentType;
  quantity: number;
  reason: string;
  by: string;
  storeId: string;
}

const stockHistorySchema = new Schema<IStockHistory>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    type: {
      type: String,
      enum: ['add', 'remove'],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
    },
    reason: {
      type: String,
      required: [true, 'Reason is required'],
      trim: true,
    },
    by: {
      type: String,
      required: true,
    },
    storeId: {
      type: String,
      required: true,
      default: 'STORE-2025-001',
    },
  },
  {
    timestamps: true,
  }
);

stockHistorySchema.index({ product: 1, createdAt: -1 });

export const StockHistory = mongoose.model<IStockHistory>('StockHistory', stockHistorySchema);
