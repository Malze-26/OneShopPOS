import mongoose, { Document, Schema } from 'mongoose';

export interface ISubscription {
  plan: 'free' | 'basic' | 'premium' | 'enterprise';
  status: 'active' | 'inactive' | 'suspended' | 'trial';
  startDate: Date;
  endDate?: Date;
}

export interface ITenant extends Document {
  businessName: string;
  businessAddress: string;
  phoneNumber: string;
  email: string;
  logo: string | null;
  primaryColor: string;
  subscription: ISubscription;
  status: 'active' | 'inactive' | 'suspended';
  databaseName: string | null;
  ownerId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const tenantSchema = new Schema<ITenant>({
  businessName: { type: String, required: [true, 'Business name is required'] },
  businessAddress: { type: String, required: [true, 'Business address is required'] },
  phoneNumber: { type: String, required: [true, 'Phone number is required'] },
  email: { type: String, required: [true, 'Email is required'], unique: true },
  logo: { type: String, default: null },
  primaryColor: { type: String, default: '#3B82F6' },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'premium', 'enterprise'],
      default: 'free',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'trial'],
      default: 'trial',
    },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active',
  },
  databaseName: { type: String, default: null },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

tenantSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model<ITenant>('Tenant', tenantSchema);
