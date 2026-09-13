import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { DONATION_STATUS, DonationStatus } from '@/lib/validations';

export interface IDonation extends Document {
  donationId: string;
  donorId: Types.ObjectId;
  bloodBankId?: Types.ObjectId | string | null;
  date: Date;
  status: DonationStatus;
  units: number;
  hospital?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DonationSchema = new Schema<IDonation>(
  {
    donationId: {
      type: String,
      unique: true,
      index: true,
      default: () => {
        const year = new Date().getFullYear();
        const rand = Math.floor(10000 + Math.random() * 90000);
        return `DN-${year}-${rand}`;
      },
    },
    donorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Donor ID is required'],
      index: true,
    },
    bloodBankId: {
      type: Schema.Types.Mixed,
      default: null,
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    status: {
      type: String,
      enum: DONATION_STATUS,
      default: 'scheduled',
      index: true,
    },
    units: {
      type: Number,
      default: 1,
      min: 1,
    },
    hospital: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

const Donation: Model<IDonation> =
  mongoose.models.Donation || mongoose.model<IDonation>('Donation', DonationSchema);

export default Donation;
