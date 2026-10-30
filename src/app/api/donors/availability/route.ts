import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { DONOR_AVAILABILITY_STATUS, DonorAvailabilityStatus } from '@/lib/validations';

export async function PUT(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return errorResponse('Unauthorized: Please log in', 401);
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.status) {
      return errorResponse('status field is required', 400);
    }

    const status: DonorAvailabilityStatus = body.status;
    if (!DONOR_AVAILABILITY_STATUS.includes(status)) {
      return errorResponse('Invalid availability status', 400);
    }

    const supabase = await createServerSupabase();

    // Check if donor_profile exists for user
    const { data: existing } = await supabase
      .from('donor_profiles')
      .select('id')
      .eq('user_id', authUser.userId)
      .maybeSingle();

    if (existing) {
      const { data: updated, error } = await supabase
        .from('donor_profiles')
        .update({ availability_status: status })
        .eq('user_id', authUser.userId)
        .select()
        .single();

      if (error) {
        console.error('Update donor availability error:', error);
        return errorResponse('Failed to update availability status', 500);
      }
      return successResponse(updated, 'Availability status updated successfully', 200);
    } else {
      // Insert new donor profile
      const { data: inserted, error } = await supabase
        .from('donor_profiles')
        .insert({
          user_id: authUser.userId,
          blood_group: body.bloodGroup || 'O+',
          availability_status: status,
        })
        .select()
        .single();

      if (error) {
        console.error('Insert donor profile error:', error);
        return errorResponse('Failed to create donor profile', 500);
      }
      return successResponse(inserted, 'Availability status created successfully', 200);
    }
  } catch (error: any) {
    console.error('Donor availability error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
