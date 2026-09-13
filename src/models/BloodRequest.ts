import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import {
  BLOOD_GROUPS,
  REQUEST_PRIORITY,
  REQUEST_STATUS,
  BloodGroup,
  RequestPriority,
  RequestStatus,
} from '@/lib/validations';

export interface IBloodRequest extends Document {
  requestId: string;
  requesterId?: Types.ObjectId | null;
  bloodGroup: BloodGroup;
  priority: RequestPriority;
  status: RequestStatus;
  hospital: string;
  unitsNeeded: number;
  contactNumber: string;
  patientName?: string;
  city?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BloodRequestSchema = new Schema<IBloodRequest>(
  {
    requestId: {
      type: String,
      unique: true,
      index: true,
      default: () => {
        const year = new Date().getFullYear();
        const rand = Math.floor(10000 + Math.random() * 90000);
        return `BL-${year}-${rand}`;
      },
    },
    requesterId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    bloodGroup: {
      type: String,
      enum: BLOOD_GROUPS,
      required: [true, 'Blood group is required'],
      index: true,
    },
    priority: {
      type: String,
      enum: REQUEST_PRIORITY,
      default: 'STANDARD',
      index: true,
    },
    status: {
      type: String,
      enum: REQUEST_STATUS,
      default: 'OPEN',
      index: true,
    },
    hospital: {
      type: String,
      required: [true, 'Hospital name is required'],
      trim: true,
    },
    unitsNeeded: {
      type: Number,
      required: [true, 'Units needed is required'],
      min: [1, 'Must request at least 1 unit'],
    },
    contactNumber: {
      type: String,
      required: [true, 'Contact number is required'],
      trim: true,
    },
    patientName: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const BloodRequest: Model<IBloodRequest> =
  mongoose.models.BloodRequest ||
  mongoose.model<IBloodRequest>('BloodRequest', BloodRequestSchema);

export default BloodRequest;
