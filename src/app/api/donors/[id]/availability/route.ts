import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import { Donor } from '@/models';
import { getAuthUser } from '@/lib/auth';
import { updateAvailabilitySchema } from '@/lib/validations';
import { successResponse, errorResponse } from '@/lib/api-response';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return errorResponse('Unauthorized: Please log in', 401);
    }

    await connectDB();
    const { id } = await params;

    const body = await req.json().catch(() => null);
    if (!body) {
      return errorResponse('Invalid JSON body', 400);
    }

    const validation = updateAvailabilitySchema.safeParse(body);
    if (!validation.success) {
      const issue = validation.error.issues[0];
      return errorResponse(issue?.message || 'Invalid availability status', 400);
    }

    const { availabilityStatus } = validation.data;

    let targetDonor = null;

    if (id === 'me') {
      targetDonor = await Donor.findOne({ userId: authUser.userId });
    } else if (mongoose.isValidObjectId(id)) {
      targetDonor = await Donor.findById(id);
      if (!targetDonor) {
        targetDonor = await Donor.findOne({ userId: id });
      }
    }

    if (!targetDonor) {
      return errorResponse('Donor record not found', 404);
    }

    // Security check: only the donor or an admin can change availability
    if (
      targetDonor.userId.toString() !== authUser.userId &&
      authUser.role !== 'admin'
    ) {
      return errorResponse('Forbidden: You can only update your own availability', 403);
    }

    targetDonor.availabilityStatus = availabilityStatus;
    await targetDonor.save();

    return successResponse(
      {
        id: targetDonor._id.toString(),
        userId: targetDonor.userId.toString(),
        bloodGroup: targetDonor.bloodGroup,
        availabilityStatus: targetDonor.availabilityStatus,
        lastDonationDate: targetDonor.lastDonationDate,
        updatedAt: targetDonor.updatedAt,
      },
      'Availability status updated successfully',
      200
    );
  } catch (error: any) {
    console.error('Update donor availability error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
