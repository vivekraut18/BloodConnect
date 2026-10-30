import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import {
  BLOOD_GROUPS,
  DONOR_AVAILABILITY_STATUS,
  BloodGroup,
  DonorAvailabilityStatus,
} from '@/lib/validations';

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return errorResponse('Unauthorized: Please log in to view donors', 401);
    }

    const supabase = await createServerSupabase();
    const { searchParams } = new URL(req.url);
    const bloodGroup = searchParams.get('bloodGroup');
    const city = searchParams.get('city');
    const availability = searchParams.get('availability');

    let query = supabase
      .from('donor_profiles')
      .select('*, profiles!user_id(name, city, phone, verification_status, email)');

    if (bloodGroup && BLOOD_GROUPS.includes(bloodGroup as BloodGroup)) {
      query = query.eq('blood_group', bloodGroup);
    }

    if (
      availability &&
      DONOR_AVAILABILITY_STATUS.includes(availability as DonorAvailabilityStatus)
    ) {
      query = query.eq('availability_status', availability);
    }

    const { data: donors, error } = await query;
    if (error) {
      console.error('Fetch donors db error:', error);
      return errorResponse('Failed to fetch donors', 500);
    }

    let filteredDonors = (donors || []).filter((d: any) => Boolean(d.profiles));

    if (city) {
      const cityLower = city.toLowerCase();
      filteredDonors = filteredDonors.filter(
        (d: any) => d.profiles?.city && d.profiles.city.toLowerCase().includes(cityLower)
      );
    }

    const formattedDonors = filteredDonors.map((d: any) => {
      const user = d.profiles || {};
      const nameParts = (user.name || 'Donor').trim().split(' ');
      const initials = nameParts
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
      const firstName = nameParts[0] || 'Donor';
      const year = new Date(d.created_at || Date.now()).getFullYear();
      const idSuffix = String(d.id).slice(-5).toUpperCase();

      return {
        id: d.id,
        userId: d.user_id,
        bloodConnectId: `BC-${year}-${idSuffix}`,
        initials,
        firstName,
        fullName: user.name || 'Anonymous Donor',
        bloodGroup: d.blood_group,
        city: user.city || '',
        phone: user.phone || '',
        availabilityStatus: d.availability_status,
        isVerified: user.verification_status === 'verified',
        donationsCompleted: d.donations_completed || 0,
        reliabilityScore: d.reliability_score || 100,
        lastDonationDate: d.last_donation_date || null,
        createdAt: d.created_at,
      };
    });

    return successResponse(formattedDonors, 'Donors fetched successfully', 200);
  } catch (error: any) {
    console.error('Fetch donors error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
