import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: 'superadmin' | 'admin';
  tenantId: mongoose.Types.ObjectId | null;
  isActive: boolean;
  isVerified: boolean;
  createdAt: Date;
  lastLogin?: Date;
}

const userSchema = new Schema<IUser>({
  name: { type: String, required: [true, 'Name is required'] },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 8,
    select: false,
  },
  role: {
    type: String,
    enum: ['superadmin', 'admin'],
    default: 'admin',
  },
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', default: null },
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date },
});

export default mongoose.model<IUser>('User', userSchema);
