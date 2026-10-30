import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { createDonationSchema } from '@/lib/validations';
import { successResponse, errorResponse } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return errorResponse('Unauthorized: Please log in to view donations', 401);
    }

    const supabase = await createServerSupabase();
    const { searchParams } = new URL(req.url);
    const requestedDonorId = searchParams.get('donorId');
    if (requestedDonorId && requestedDonorId !== authUser.userId && authUser.role !== 'admin') {
      return errorResponse('Forbidden: You can only view your own donations', 403);
    }
    const donorId = requestedDonorId || authUser.userId;

    const query = supabase
      .from('donations')
      .select('*')
      .eq('donor_id', donorId)
      .order('date', { ascending: false });

    const { data: donations, error } = await query;
    if (error) {
      console.error('Fetch donations error:', error);
      return errorResponse('Failed to fetch donations', 500);
    }

    const formattedDonations = (donations || []).map((d: any) => ({
      id: d.id,
      donationId: d.donation_id,
      donorId: d.donor_id,
      bloodBankId: d.blood_bank_id || null,
      date: d.date,
      status: d.status,
      units: d.units || 1,
      hospital: d.hospital || 'Authorized Blood Centre',
      notes: d.notes || '',
      createdAt: d.created_at,
    }));

    return successResponse(formattedDonations, 'Donation history fetched successfully', 200);
  } catch (error: any) {
    console.error('Fetch donations error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return errorResponse('Unauthorized: Please log in to create a donation', 401);
    }
    const body = await req.json().catch(() => null);

    if (!body) {
      return errorResponse('Invalid JSON body', 400);
    }

    const validation = createDonationSchema.safeParse(body);
    if (!validation.success) {
      const issue = validation.error.issues[0];
      return errorResponse(issue?.message || 'Validation error', 400);
    }

    const donorId = validation.data.donorId || authUser.userId;
    if (donorId !== authUser.userId) {
      return errorResponse('Forbidden: You can only create donations for yourself', 403);
    }

    const year = new Date().getFullYear();
    const rand = Math.floor(10000 + Math.random() * 90000);
    const donationId = `DN-${year}-${rand}`;

    const supabase = await createServerSupabase();
    const { data: donation, error } = await supabase
      .from('donations')
      .insert({
        donation_id: donationId,
        donor_id: donorId,
        blood_bank_id: validation.data.bloodBankId || null,
        date: validation.data.date
          ? new Date(validation.data.date).toISOString()
          : new Date().toISOString(),
        status: validation.data.status || 'scheduled',
        units: validation.data.units || 1,
        hospital: validation.data.hospital || '',
        notes: validation.data.notes || '',
      })
      .select()
      .single();

    if (error || !donation) {
      console.error('Create donation db error:', error);
      return errorResponse(error?.message || 'Failed to create donation record', 500);
    }

    // If status is 'completed', update donor's last_donation_date and increment donations_completed
    if (donation.status === 'completed') {
      const { data: donorProf } = await supabase
        .from('donor_profiles')
        .select('donations_completed')
        .eq('user_id', donorId)
        .maybeSingle();

      const newCount = (donorProf?.donations_completed || 0) + 1;

      const { error: donorUpdateError } = await supabase
        .from('donor_profiles')
        .update({
          last_donation_date: donation.date,
          donations_completed: newCount,
        })
        .eq('user_id', donorId);
      if (donorUpdateError) {
        console.error('Update donor statistics error:', donorUpdateError);
        return errorResponse('Donation created but donor statistics could not be updated', 500);
      }
    }

    return successResponse(donation, 'Donation record created successfully', 201);
  } catch (error: any) {
    console.error('Create donation error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
