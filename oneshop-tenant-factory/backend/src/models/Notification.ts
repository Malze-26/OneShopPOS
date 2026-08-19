import mongoose, { Document, Schema } from 'mongoose';

export type NotificationEvent = 'tenant_created' | 'tenant_deleted' | 'tenant_suspended' | 'tenant_activated' | 'tenant_updated';

export interface INotification extends Document {
  type: NotificationEvent;
  title: string;
  message: string;
  tenantId?: string;
  tenantName?: string;
  read: boolean;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>({
  type: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  tenantId: { type: String },
  tenantName: { type: String },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<INotification>('Notification', notificationSchema);
