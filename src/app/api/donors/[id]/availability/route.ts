import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { updateAvailabilitySchema } from '@/lib/validations';
import { successResponse, errorResponse } from '@/lib/api-response';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return errorResponse('Unauthorized: Please log in', 401);
    }

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
    const supabase = await createServerSupabase();

    let targetDonor = null;

    if (id === 'me') {
      const { data } = await supabase
        .from('donor_profiles')
        .select('*')
        .eq('user_id', authUser.userId)
        .maybeSingle();
      targetDonor = data;
    } else {
      let { data } = await supabase.from('donor_profiles').select('*').eq('id', id).maybeSingle();

      if (!data) {
        const { data: dataByUserId } = await supabase
          .from('donor_profiles')
          .select('*')
          .eq('user_id', id)
          .maybeSingle();
        data = dataByUserId;
      }
      targetDonor = data;
    }

    if (!targetDonor) {
      return errorResponse('Donor record not found', 404);
    }

    // Security check: only the donor themselves or an admin can change availability
    if (targetDonor.user_id !== authUser.userId && authUser.role !== 'admin') {
      return errorResponse('Forbidden: You can only update your own availability', 403);
    }

    const { data: updatedDonor, error: updateErr } = await supabase
      .from('donor_profiles')
      .update({ availability_status: availabilityStatus })
      .eq('id', targetDonor.id)
      .select()
      .single();

    if (updateErr || !updatedDonor) {
      console.error('Update availability error:', updateErr);
      return errorResponse('Failed to update availability status', 500);
    }

    return successResponse(
      {
        id: updatedDonor.id,
        userId: updatedDonor.user_id,
        bloodGroup: updatedDonor.blood_group,
        availabilityStatus: updatedDonor.availability_status,
        lastDonationDate: updatedDonor.last_donation_date,
        updatedAt: updatedDonor.updated_at,
      },
      'Availability status updated successfully',
      200
    );
  } catch (error: any) {
    console.error('Update donor availability error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
