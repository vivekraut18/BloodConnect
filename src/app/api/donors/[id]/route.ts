import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import { Donor, User } from '@/models';
import { getAuthUser } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    // Enforce authentication for all donor lookups
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return errorResponse('Unauthorized: Please log in', 401);
    }

    let targetDonor = null;

    if (id === 'me') {
      targetDonor = await Donor.findOne({ userId: authUser.userId }).populate({
        path: 'userId',
        select: 'name city phone verificationStatus email',
      });
    } else if (mongoose.isValidObjectId(id)) {
      // Could be Donor ID or User ID
      targetDonor = await Donor.findById(id).populate({
        path: 'userId',
        select: 'name city phone verificationStatus email',
      });

      if (!targetDonor) {
        targetDonor = await Donor.findOne({ userId: id }).populate({
          path: 'userId',
          select: 'name city phone verificationStatus email',
        });
      }
    }

    if (!targetDonor) {
      return errorResponse('Donor not found', 404);
    }

    const d: any = targetDonor.toObject ? targetDonor.toObject() : targetDonor;
    const user = d.userId || {};
    const targetUserId = (user._id || d.userId)?.toString();

    // Full PII is only accessible by the donor themselves or an admin
    const canAccessPii = authUser.userId === targetUserId || authUser.role === 'admin';

    const bloodConnectId = `BC-${new Date(d.createdAt || Date.now()).getFullYear()}-${d._id.toString().slice(-5).toUpperCase()}`;

    if (canAccessPii) {
      return successResponse(
        {
          id: d._id.toString(),
          bloodConnectId,
          name: user.name || 'Anonymous Donor',
          email: user.email,
          phone: user.phone,
          city: user.city,
          bloodGroup: d.bloodGroup,
          availabilityStatus: d.availabilityStatus,
          isVerified: user.verificationStatus === 'verified',
          donationsCompleted: d.donationsCompleted || 0,
          reliabilityScore: d.reliabilityScore || 100,
          lastDonationDate: d.lastDonationDate || null,
          createdAt: d.createdAt,
        },
        'Donor details fetched',
        200
      );
    }

    // Privacy-limited view for other authenticated users
    const firstName = user.name ? user.name.trim().split(' ')[0] : 'Donor';

    return successResponse(
      {
        id: d._id.toString(),
        bloodConnectId,
        name: firstName,
        city: user.city,
        bloodGroup: d.bloodGroup,
        availabilityStatus: d.availabilityStatus,
        isVerified: user.verificationStatus === 'verified',
        donationsCompleted: d.donationsCompleted || 0,
        reliabilityScore: d.reliabilityScore || 100,
        lastDonationDate: d.lastDonationDate || null,
        createdAt: d.createdAt,
      },
      'Donor details fetched (public view)',
      200
    );
  } catch (error: any) {
    console.error('Fetch donor by id error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
