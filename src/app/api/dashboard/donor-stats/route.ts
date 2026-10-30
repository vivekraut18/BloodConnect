import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return errorResponse('Unauthorized: Please log in to view donor stats', 401);
    }

    const supabase = await createServerSupabase();

    // 1. Fetch donor profile for logged-in user
    const { data: donor } = await supabase
      .from('donor_profiles')
      .select('*')
      .eq('user_id', authUser.userId)
      .maybeSingle();

    // 2. Count actual completed donations from donations table
    const { count: completedCount } = await supabase
      .from('donations')
      .select('*', { count: 'exact', head: true })
      .eq('donor_id', authUser.userId)
      .eq('status', 'completed');

    const totalDonations = Math.max(completedCount || 0, donor?.donations_completed || 0);

    const livesImpacted = totalDonations * 3;

    // 3. Find latest completed donation
    let lastDonationDate: Date | null = donor?.last_donation_date
      ? new Date(donor.last_donation_date)
      : null;

    const { data: latestDonation } = await supabase
      .from('donations')
      .select('date')
      .eq('donor_id', authUser.userId)
      .eq('status', 'completed')
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestDonation?.date) {
      const latestDate = new Date(latestDonation.date);
      if (!lastDonationDate || latestDate > lastDonationDate) {
        lastDonationDate = latestDate;
      }
    }

    // 4. Calculate next eligible donation date (+90 days)
    let nextEligibleDate: string;
    if (lastDonationDate) {
      const eligible = new Date(lastDonationDate.getTime() + 90 * 24 * 60 * 60 * 1000);
      nextEligibleDate = eligible.toISOString();
    } else {
      nextEligibleDate = new Date().toISOString();
    }

    const currentStreak = totalDonations > 0 ? Math.min(totalDonations, 4) : 0;

    return successResponse(
      {
        totalDonations,
        livesImpacted,
        nextEligibleDate,
        currentStreak,
        bloodGroup: donor?.blood_group || 'O+',
        availabilityStatus: donor?.availability_status || 'available',
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
