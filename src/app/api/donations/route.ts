import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import { Donation, Donor, User } from '@/models';
import { getAuthUser } from '@/lib/auth';
import { createDonationSchema } from '@/lib/validations';
import { successResponse, errorResponse } from '@/lib/api-response';

// 11. GET /api/donations?donorId=X — donation history for that donor
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    let donorId = searchParams.get('donorId');

    // If no donorId in query, check authenticated user
    if (!donorId) {
      const authUser = await getAuthUser(req);
      if (authUser) {
        donorId = authUser.userId;
      }
    }

    const query: Record<string, any> = {};
    if (donorId) {
      if (mongoose.isValidObjectId(donorId)) {
        // Find if this is a Donor doc id or User doc id
        const donorDoc = await Donor.findById(donorId);
        const targetUserId = donorDoc ? donorDoc.userId : donorId;
        query.$or = [{ donorId: targetUserId }, { donorId: donorId }];
      } else {
        query.donorId = donorId;
      }
    }

    const donations = await Donation.find(query)
      .sort({ date: -1 })
      .lean();

    const formattedDonations = donations.map((d: any) => ({
      id: d._id.toString(),
      donationId: d.donationId,
      donorId: d.donorId.toString(),
      bloodBankId: d.bloodBankId ? d.bloodBankId.toString() : null,
      date: d.date,
      status: d.status,
      units: d.units || 1,
      hospital: d.hospital || 'Authorized Blood Centre',
      notes: d.notes || '',
      createdAt: d.createdAt,
    }));

    return successResponse(formattedDonations, 'Donation history fetched successfully', 200);
  } catch (error: any) {
    console.error('Fetch donations error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}

// 12. POST /api/donations — body: { donorId, bloodBankId, date }, status defaults to "scheduled"
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const authUser = await getAuthUser(req);
    const body = await req.json().catch(() => null);

    if (!body) {
      return errorResponse('Invalid JSON body', 400);
    }

    const validation = createDonationSchema.safeParse(body);
    if (!validation.success) {
      const issue = validation.error.issues[0];
      return errorResponse(issue?.message || 'Validation error', 400);
    }

    let donorId = validation.data.donorId;

    // Default to authenticated user if donorId not specified in body
    if (!donorId) {
      if (authUser) {
        donorId = authUser.userId;
      } else {
        return errorResponse('donorId is required when not authenticated', 400);
      }
    }

    const donation = await Donation.create({
      donorId,
      bloodBankId: validation.data.bloodBankId || null,
      date: validation.data.date,
      status: validation.data.status || 'scheduled',
      units: validation.data.units || 1,
      hospital: validation.data.hospital || '',
      notes: validation.data.notes || '',
    });

    // If status is 'completed', update donor's lastDonationDate and donationsCompleted count
    if (donation.status === 'completed') {
      await Donor.findOneAndUpdate(
        { userId: donorId },
        {
          $set: { lastDonationDate: donation.date },
          $inc: { donationsCompleted: 1 },
        }
      );
    }

    return successResponse(
      donation,
      'Donation record created successfully',
      201
    );
  } catch (error: any) {
    console.error('Create donation error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
