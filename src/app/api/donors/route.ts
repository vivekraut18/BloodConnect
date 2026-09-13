import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { Donor, User } from '@/models';
import { successResponse, errorResponse } from '@/lib/api-response';
import { BLOOD_GROUPS, DONOR_AVAILABILITY_STATUS, BloodGroup, DonorAvailabilityStatus } from '@/lib/validations';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const bloodGroup = searchParams.get('bloodGroup');
    const city = searchParams.get('city');
    const availability = searchParams.get('availability');

    const donorQuery: Record<string, any> = {};

    if (bloodGroup && BLOOD_GROUPS.includes(bloodGroup as BloodGroup)) {
      donorQuery.bloodGroup = bloodGroup;
    }

    if (availability && DONOR_AVAILABILITY_STATUS.includes(availability as DonorAvailabilityStatus)) {
      donorQuery.availabilityStatus = availability;
    }

    // Populate user and filter by city if needed
    const donors = await Donor.find(donorQuery)
      .populate<{ userId: { name: string; city: string; phone: string; verificationStatus: string; email: string } }>({
        path: 'userId',
        select: 'name city phone verificationStatus email -_id',
      })
      .lean();

    // If city is specified, filter by populated user city (case-insensitive substring match)
    let filteredDonors = donors.filter((d) => Boolean(d.userId));

    if (city) {
      const cityLower = city.toLowerCase();
      filteredDonors = filteredDonors.filter(
        (d) => d.userId?.city && d.userId.city.toLowerCase().includes(cityLower)
      );
    }

    // Transform to clean frontend-friendly shape
    const formattedDonors = filteredDonors.map((d: any) => {
      const user = d.userId || {};
      const nameParts = (user.name || 'Donor').trim().split(' ');
      const initials = nameParts.map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
      const firstName = nameParts[0] || 'Donor';

      return {
        id: d._id.toString(),
        bloodConnectId: `BC-${new Date(d.createdAt || Date.now()).getFullYear()}-${d._id.toString().slice(-5).toUpperCase()}`,
        initials,
        firstName,
        fullName: user.name || 'Anonymous Donor',
        bloodGroup: d.bloodGroup,
        city: user.city || '',
        phone: user.phone || '',
        availabilityStatus: d.availabilityStatus,
        isVerified: user.verificationStatus === 'verified',
        donationsCompleted: d.donationsCompleted || 0,
        reliabilityScore: d.reliabilityScore || 100,
        lastDonationDate: d.lastDonationDate || null,
        createdAt: d.createdAt,
      };
    });

    return successResponse(formattedDonors, 'Donors fetched successfully', 200);
  } catch (error: any) {
    console.error('Fetch donors error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
