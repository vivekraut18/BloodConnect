import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api-response';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return errorResponse('Unauthorized: Please log in', 401);
    }

    const supabase = await createServerSupabase();
    const { id } = await params;

    let targetDonor = null;

    if (id === 'me') {
      const { data } = await supabase
        .from('donor_profiles')
        .select('*, profiles!user_id(name, city, phone, verification_status, email)')
        .eq('user_id', authUser.userId)
        .maybeSingle();
      targetDonor = data;
    } else {
      // Try by donor profile ID
      let { data } = await supabase
        .from('donor_profiles')
        .select('*, profiles!user_id(name, city, phone, verification_status, email)')
        .eq('id', id)
        .maybeSingle();

      if (!data) {
        // Try by user_id
        const { data: dataByUserId } = await supabase
          .from('donor_profiles')
          .select('*, profiles!user_id(name, city, phone, verification_status, email)')
          .eq('user_id', id)
          .maybeSingle();
        data = dataByUserId;
      }
      targetDonor = data;
    }

    if (!targetDonor) {
      return errorResponse('Donor not found', 404);
    }

    const user = targetDonor.profiles || {};
    const targetUserId = targetDonor.user_id;

    // Full PII is only accessible by the donor themselves or an admin
    const canAccessPii = authUser.userId === targetUserId || authUser.role === 'admin';

    const year = new Date(targetDonor.created_at || Date.now()).getFullYear();
    const idSuffix = String(targetDonor.id).slice(-5).toUpperCase();
    const bloodConnectId = `BC-${year}-${idSuffix}`;

    if (canAccessPii) {
      return successResponse(
        {
          id: targetDonor.id,
          userId: targetDonor.user_id,
          bloodConnectId,
          name: user.name || 'Anonymous Donor',
          email: user.email,
          phone: user.phone,
          city: user.city,
          bloodGroup: targetDonor.blood_group,
          availabilityStatus: targetDonor.availability_status,
          isVerified: user.verification_status === 'verified',
          donationsCompleted: targetDonor.donations_completed || 0,
          reliabilityScore: targetDonor.reliability_score || 100,
          lastDonationDate: targetDonor.last_donation_date || null,
          createdAt: targetDonor.created_at,
        },
        'Donor details fetched',
        200
      );
    }

    // Privacy-limited view for other authenticated users
    const firstName = user.name ? user.name.trim().split(' ')[0] : 'Donor';

    return successResponse(
      {
        id: targetDonor.id,
        userId: targetDonor.user_id,
        bloodConnectId,
        name: firstName,
        city: user.city,
        bloodGroup: targetDonor.blood_group,
        availabilityStatus: targetDonor.availability_status,
        isVerified: user.verification_status === 'verified',
        donationsCompleted: targetDonor.donations_completed || 0,
        reliabilityScore: targetDonor.reliability_score || 100,
        lastDonationDate: targetDonor.last_donation_date || null,
        createdAt: targetDonor.created_at,
      },
      'Donor details fetched (public view)',
      200
    );
  } catch (error: any) {
    console.error('Fetch donor by id error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
