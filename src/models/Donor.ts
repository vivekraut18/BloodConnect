import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import {
  BLOOD_GROUPS,
  DONOR_AVAILABILITY_STATUS,
  BloodGroup,
  DonorAvailabilityStatus,
} from '@/lib/validations';

export interface IDonor extends Document {
  userId: Types.ObjectId;
  bloodGroup: BloodGroup;
  availabilityStatus: DonorAvailabilityStatus;
  lastDonationDate?: Date | null;
  donationsCompleted: number;
  reliabilityScore: number;
  createdAt: Date;
  updatedAt: Date;
}

const DonorSchema = new Schema<IDonor>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true,
      index: true,
    },
    bloodGroup: {
      type: String,
      enum: BLOOD_GROUPS,
      required: [true, 'Blood group is required'],
      index: true,
    },
    availabilityStatus: {
      type: String,
      enum: DONOR_AVAILABILITY_STATUS,
      default: 'available',
      index: true,
    },
    lastDonationDate: {
      type: Date,
      default: null,
    },
    donationsCompleted: {
      type: Number,
      default: 0,
    },
    reliabilityScore: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },
  },
  {
    timestamps: true,
  }
);

const Donor: Model<IDonor> =
  mongoose.models.Donor || mongoose.model<IDonor>('Donor', DonorSchema);

export default Donor;
