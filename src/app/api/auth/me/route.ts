import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { updateProfileSchema } from '@/lib/validations';

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return errorResponse('Unauthorized: Please log in', 401);
    }

    const supabase = await createServerSupabase();
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*, donor_profiles(*)')
      .eq('id', authUser.userId)
      .single();

    if (error || !profile) {
      return errorResponse('User profile not found', 404);
    }

    const donorProfile = Array.isArray(profile.donor_profiles)
      ? profile.donor_profiles[0]
      : profile.donor_profiles;

    return successResponse(
      {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        city: profile.city,
        phone: profile.phone,
        verificationStatus: profile.verification_status,
        bloodGroup: donorProfile?.blood_group || 'O+',
        availabilityStatus: donorProfile?.availability_status || 'available',
        donationsCompleted: donorProfile?.donations_completed || 0,
        reliabilityScore: donorProfile?.reliability_score || 100,
        lastDonationDate: donorProfile?.last_donation_date || null,
      },
      'User fetched successfully',
      200
    );
  } catch (error) {
    console.error('Me route error:', error);
    return errorResponse('Unable to fetch the current user', 500);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return errorResponse('Unauthorized: Please log in', 401);
    }

    const body = await req.json().catch(() => ({}));
    const validation = updateProfileSchema.safeParse(body);

    if (!validation.success) {
      const issue = validation.error.issues[0];
      return errorResponse(issue?.message || 'Invalid profile data', 400);
    }

    const { name, phone, city, bloodGroup, availabilityStatus } = validation.data;
    const supabase = await createServerSupabase();

    // 1. Update profiles table
    const profileUpdates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (name !== undefined) profileUpdates.name = name.trim();
    if (phone !== undefined) profileUpdates.phone = phone.trim();
    if (city !== undefined) profileUpdates.city = city.trim();

    if (Object.keys(profileUpdates).length > 1) {
      const { error: profileErr } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', authUser.userId);

      if (profileErr) {
        console.error('Update profile error:', profileErr);
        return errorResponse(profileErr.message || 'Failed to update profile', 500);
      }
    }

    // 2. Update or insert donor_profiles if bloodGroup or availabilityStatus is provided
    if (bloodGroup !== undefined || availabilityStatus !== undefined) {
      const donorUpdates: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (bloodGroup !== undefined) donorUpdates.blood_group = bloodGroup;
      if (availabilityStatus !== undefined) donorUpdates.availability_status = availabilityStatus;

      const { data: existingDonor } = await supabase
        .from('donor_profiles')
        .select('id')
        .eq('user_id', authUser.userId)
        .maybeSingle();

      if (existingDonor) {
        const { error: donorErr } = await supabase
          .from('donor_profiles')
          .update(donorUpdates)
          .eq('user_id', authUser.userId);

        if (donorErr) {
          console.error('Update donor_profiles error:', donorErr);
          return errorResponse(donorErr.message || 'Failed to update donor profile', 500);
        }
      } else {
        const { error: donorInsertErr } = await supabase
          .from('donor_profiles')
          .insert({
            user_id: authUser.userId,
            blood_group: bloodGroup || 'O+',
            availability_status: availabilityStatus || 'available',
          });

        if (donorInsertErr) {
          console.error('Insert donor_profiles error:', donorInsertErr);
          return errorResponse(donorInsertErr.message || 'Failed to create donor profile', 500);
        }
      }
    }

    // 3. Fetch fresh profile and return
    const { data: updatedProfile, error: fetchErr } = await supabase
      .from('profiles')
      .select('*, donor_profiles(*)')
      .eq('id', authUser.userId)
      .single();

    if (fetchErr || !updatedProfile) {
      return errorResponse('Failed to fetch updated profile', 500);
    }

    const donorProfile = Array.isArray(updatedProfile.donor_profiles)
      ? updatedProfile.donor_profiles[0]
      : updatedProfile.donor_profiles;

    return successResponse(
      {
        id: updatedProfile.id,
        name: updatedProfile.name,
        email: updatedProfile.email,
        role: updatedProfile.role,
        city: updatedProfile.city,
        phone: updatedProfile.phone,
        verificationStatus: updatedProfile.verification_status,
        bloodGroup: donorProfile?.blood_group || 'O+',
        availabilityStatus: donorProfile?.availability_status || 'available',
        donationsCompleted: donorProfile?.donations_completed || 0,
        reliabilityScore: donorProfile?.reliability_score || 100,
        lastDonationDate: donorProfile?.last_donation_date || null,
      },
      'Profile updated successfully',
      200
    );
  } catch (error: any) {
    console.error('Update me error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
