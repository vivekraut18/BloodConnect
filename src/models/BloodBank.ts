import mongoose, { Schema, Document, Model } from 'mongoose';
import { INVENTORY_STATUS, InventoryStatus, BloodGroup, BLOOD_GROUPS } from '@/lib/validations';

export interface IStockItem {
  units: number;
  status: InventoryStatus;
  lastUpdated?: Date;
}

export interface IBloodBank extends Document {
  name: string;
  address: string;
  city: string;
  contact: string;
  phone?: string;
  operatingHours?: string;
  isVerified?: boolean;
  stock: Record<string, IStockItem>;
  createdAt: Date;
  updatedAt: Date;
}

const StockItemSchema = new Schema<IStockItem>(
  {
    units: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: INVENTORY_STATUS,
      default: 'available',
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const BloodBankSchema = new Schema<IBloodBank>(
  {
    name: {
      type: String,
      required: [true, 'Blood bank name is required'],
      trim: true,
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      index: true,
    },
    contact: {
      type: String,
      required: [true, 'Contact is required'],
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    operatingHours: {
      type: String,
      default: '24/7 Emergency Service',
    },
    isVerified: {
      type: Boolean,
      default: true,
    },
    stock: {
      type: Map,
      of: StockItemSchema,
      default: () => {
        const defaultStock: Record<string, IStockItem> = {};
        for (const bg of BLOOD_GROUPS) {
          defaultStock[bg] = { units: 10, status: 'available', lastUpdated: new Date() };
        }
        return defaultStock;
      },
    },
  },
  {
    timestamps: true,
  }
);

const BloodBank: Model<IBloodBank> =
  mongoose.models.BloodBank || mongoose.model<IBloodBank>('BloodBank', BloodBankSchema);

export default BloodBank;
