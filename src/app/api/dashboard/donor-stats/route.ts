import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { Donor, Donation } from '@/models';
import { getAuthUser } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return errorResponse('Unauthorized: Please log in to view donor stats', 401);
    }

    await connectDB();

    // Fetch donor profile for logged-in user
    const donor = await Donor.findOne({ userId: authUser.userId });

    // Count actual completed donations from Donation model
    const completedDonationsCount = await Donation.countDocuments({
      donorId: authUser.userId,
      status: 'completed',
    });

    // Use higher of actual donations count or donor.donationsCompleted (for seeded demo donors)
    const totalDonations = Math.max(
      completedDonationsCount,
      donor?.donationsCompleted || 0
    );

    const livesImpacted = totalDonations * 3;

    // Find the latest donation date
    let lastDonationDate: Date | null = donor?.lastDonationDate || null;
    const latestDonation = await Donation.findOne({
      donorId: authUser.userId,
      status: 'completed',
    }).sort({ date: -1 });

    if (latestDonation?.date) {
      if (!lastDonationDate || new Date(latestDonation.date) > new Date(lastDonationDate)) {
        lastDonationDate = new Date(latestDonation.date);
      }
    }

    // nextEligibleDate = last donation + 90 days (or today if never donated)
    let nextEligibleDate: string;
    if (lastDonationDate) {
      const eligible = new Date(new Date(lastDonationDate).getTime() + 90 * 24 * 60 * 60 * 1000);
      nextEligibleDate = eligible.toISOString();
    } else {
      nextEligibleDate = new Date().toISOString();
    }

    // Calculate donation streak (e.g. donations in recent quarters)
    const currentStreak = totalDonations > 0 ? Math.min(totalDonations, 4) : 0;

    return successResponse(
      {
        totalDonations,
        livesImpacted,
        nextEligibleDate,
        currentStreak,
        bloodGroup: donor?.bloodGroup || 'O+',
        availabilityStatus: donor?.availabilityStatus || 'available',
        lastDonationDate: lastDonationDate ? lastDonationDate.toISOString() : null,
      },
      'Donor statistics fetched successfully',
      200
    );
  } catch (error: any) {
    console.error('Fetch donor stats error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
