import mongoose, { Document, Schema } from 'mongoose';

export interface IShift extends Document {
  cashier: mongoose.Types.ObjectId;
  openingFloat: number;
  openedAt: Date;
  closedAt?: Date;
  status: 'open' | 'closed';
  storeId: string;
  actualCash?: number;
  expectedCash?: number;
  createdAt: Date;
  updatedAt: Date;
}

export const shiftSchema = new Schema<IShift>(
  {
    cashier: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    openingFloat: {
      type: Number,
      default: 0,
    },
    openedAt: {
      type: Date,
      default: Date.now,
    },
    closedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['open', 'closed'],
      default: 'open',
    },
    storeId: {
      type: String,
      required: true,
    },
    actualCash: {
      type: Number,
    },
    expectedCash: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

shiftSchema.index({ cashier: 1, status: 1 });
shiftSchema.index({ storeId: 1, openedAt: -1 });

export const Shift = mongoose.model<IShift>('Shift', shiftSchema);
