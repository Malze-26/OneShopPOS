import mongoose, { Document, Schema } from 'mongoose';

export interface IStoreSettings extends Document {
  storeId: string;
  storeName: string;
  currency: string;
  currencyLocale: string;
  address: string;
  phone: string;
  email: string;
  logoUrl: string;
  primaryColor: string;
  subscriptionPlan?: 'basic' | 'premium';
  maxProducts?: number | null;
}

export const storeSettingsSchema = new Schema<IStoreSettings>(
  {
    storeId:          { type: String, required: true, unique: true },
    storeName:        { type: String, required: true },
    currency:         { type: String, required: true },
    currencyLocale:   { type: String, required: true },
    address:          { type: String, default: '' },
    phone:            { type: String, default: '' },
    email:            { type: String, default: '' },
    logoUrl:          { type: String, default: '' },
    primaryColor:     { type: String, default: '#155dfc' },
    subscriptionPlan: { type: String, enum: ['basic', 'premium'], default: 'basic' },
    maxProducts:      { type: Number, default: 100 },
  },
  { timestamps: true }
);

export const StoreSettings = mongoose.model<IStoreSettings>('StoreSettings', storeSettingsSchema);
