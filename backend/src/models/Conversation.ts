import mongoose, { Document, Schema } from 'mongoose';

export interface IConversation extends Document {
  storeId: string;
  customerId: mongoose.Types.ObjectId;
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount: number;
}

export const conversationSchema = new Schema<IConversation>(
  {
    storeId: {
      type: String,
      required: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    lastMessage: {
      type: String,
      default: '',
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    unreadCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

conversationSchema.index({ storeId: 1, customerId: 1 }, { unique: true });

export const Conversation = mongoose.model<IConversation>('Conversation', conversationSchema);
