import mongoose, { Schema, Document, Model } from 'mongoose';
import { USER_ROLES, VERIFICATION_STATUS, UserRole, VerificationStatus } from '@/lib/validations';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  phone: string;
  city: string;
  verificationStatus: VerificationStatus;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false, // Never return passwordHash by default
    },
    role: {
      type: String,
      enum: USER_ROLES,
      default: 'donor',
      index: true,
    },
    phone: {
      type: String,
      default: '',
      trim: true,
    },
    city: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },
    verificationStatus: {
      type: String,
      enum: VERIFICATION_STATUS,
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

// Prevent re-compilation of model in development
const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
