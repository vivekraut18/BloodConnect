import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import {
  createResponseSchema,
  RESPONSE_STATUS,
  ResponseStatus,
} from '@/lib/validations';
import { successResponse, errorResponse } from '@/lib/api-response';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimit = checkRateLimit(req, 'donor_respond', 10, 5 * 60 * 1000);
    if (!rateLimit.allowed) {
      const waitMinutes = Math.ceil((rateLimit.resetTime - Date.now()) / (60 * 1000));
      return errorResponse(
        `Rate limit exceeded. Please try again in ${waitMinutes} minute(s).`,
        429
      );
    }

    const authUser = await getAuthUser(req);
    if (!authUser) {
      return errorResponse('Unauthorized: Please log in to respond to blood requests', 401);
    }

    if (authUser.role !== 'donor' && authUser.role !== 'admin') {
      return errorResponse(
        'Forbidden: Only registered donors can respond to blood requests',
        403
      );
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const validation = createResponseSchema.safeParse(body);

    if (!validation.success) {
      const issue = validation.error.issues[0];
      return errorResponse(issue?.message || 'Invalid response data', 400);
    }

    const { status, notes } = validation.data;
    const supabase = await createServerSupabase();

    // Look up the blood request by UUID or request_id string
    let { data: bloodRequest } = await supabase
      .from('blood_requests')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!bloodRequest) {
      const { data: requestByCode } = await supabase
        .from('blood_requests')
        .select('*')
        .eq('request_id', id)
        .maybeSingle();
      bloodRequest = requestByCode;
    }

    if (!bloodRequest) {
      return errorResponse('Blood request not found', 404);
    }

    // Check request status
    if (['FULFILLED', 'CANCELLED', 'EXPIRED'].includes(bloodRequest.status)) {
      return errorResponse(
        `Cannot respond to a ${bloodRequest.status.toLowerCase()} blood request`,
        400
      );
    }

    // Prevent donor from responding to their own request
    if (bloodRequest.requester_id === authUser.userId) {
      return errorResponse('You cannot respond to your own blood request', 400);
    }

    // Check for existing response from this donor
    const { data: existingResponse } = await supabase
      .from('request_responses')
      .select('*')
      .eq('request_id', bloodRequest.id)
      .eq('donor_id', authUser.userId)
      .maybeSingle();

    if (existingResponse) {
      if (existingResponse.status === status) {
        return errorResponse(
          `You have already ${status === 'accepted' ? 'committed to' : 'declined'} this request`,
          409
        );
      }

      // Update existing response status
      const { data: updatedResponse, error: updateErr } = await supabase
        .from('request_responses')
        .update({
          status,
          notes: notes !== undefined ? notes : existingResponse.notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingResponse.id)
        .select()
        .single();

      if (updateErr || !updatedResponse) {
        console.error('Update donor response error:', updateErr);
        return errorResponse(updateErr?.message || 'Failed to update response', 500);
      }

      // Update blood request status if accepted
      if (status === 'accepted' && ['OPEN', 'MATCHING'].includes(bloodRequest.status)) {
        await supabase
          .from('blood_requests')
          .update({
            status: 'DONOR_RESPONDED',
            updated_at: new Date().toISOString(),
          })
          .eq('id', bloodRequest.id);
      }

      return successResponse(
        {
          response: {
            id: updatedResponse.id,
            requestId: bloodRequest.request_id,
            donorId: updatedResponse.donor_id,
            status: updatedResponse.status,
            notes: updatedResponse.notes,
            createdAt: updatedResponse.created_at,
            updatedAt: updatedResponse.updated_at,
          },
          requestStatus: status === 'accepted' && ['OPEN', 'MATCHING'].includes(bloodRequest.status)
            ? 'DONOR_RESPONDED'
            : bloodRequest.status,
        },
        `Your response has been updated to ${status}`,
        200
      );
    }

    // Insert new response into request_responses
    const { data: newResponse, error: insertErr } = await supabase
      .from('request_responses')
      .insert({
        request_id: bloodRequest.id,
        donor_id: authUser.userId,
        status,
        notes: notes || null,
      })
      .select()
      .single();

    if (insertErr || !newResponse) {
      console.error('Insert donor response error:', insertErr);
      return errorResponse(insertErr?.message || 'Failed to save donor response', 500);
    }

    // Update blood request status to DONOR_RESPONDED if currently OPEN or MATCHING
    let currentRequestStatus = bloodRequest.status;
    if (status === 'accepted' && ['OPEN', 'MATCHING'].includes(bloodRequest.status)) {
      currentRequestStatus = 'DONOR_RESPONDED';
      await supabase
        .from('blood_requests')
        .update({
          status: 'DONOR_RESPONDED',
          updated_at: new Date().toISOString(),
        })
        .eq('id', bloodRequest.id);
    }

    return successResponse(
      {
        response: {
          id: newResponse.id,
          requestId: bloodRequest.request_id,
          donorId: newResponse.donor_id,
          status: newResponse.status,
          notes: newResponse.notes,
          createdAt: newResponse.created_at,
          updatedAt: newResponse.updated_at,
        },
        requestStatus: currentRequestStatus,
      },
      'Donor response saved successfully',
      201
    );
  } catch (error: any) {
    console.error('Donor response endpoint error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return errorResponse('Unauthorized: Please log in to view responses', 401);
    }

    const { id } = await params;
    const supabase = await createServerSupabase();

    let { data: bloodRequest } = await supabase
      .from('blood_requests')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!bloodRequest) {
      const { data: requestByCode } = await supabase
        .from('blood_requests')
        .select('*')
        .eq('request_id', id)
        .maybeSingle();
      bloodRequest = requestByCode;
    }

    if (!bloodRequest) {
      return errorResponse('Blood request not found', 404);
    }

    let query = supabase
      .from('request_responses')
      .select('*, profiles!donor_id(name, city, phone, email, verification_status)')
      .eq('request_id', bloodRequest.id);

    // If donor, only see own response unless admin/requester/hospital
    if (authUser.role === 'donor') {
      query = query.eq('donor_id', authUser.userId);
    } else if (authUser.role === 'requester') {
      if (bloodRequest.requester_id !== authUser.userId) {
        return errorResponse('Forbidden: You can only view responses to your own requests', 403);
      }
    }

    const { data: responses, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch responses error:', error);
      return errorResponse('Failed to fetch responses', 500);
    }

    const formatted = (responses || []).map((resp: any) => {
      const donor = resp.profiles || {};
      return {
        id: resp.id,
        requestId: bloodRequest.request_id,
        donorId: resp.donor_id,
        donorName: donor.name || 'Anonymous Donor',
        donorCity: donor.city,
        donorPhone: donor.phone,
        donorVerified: donor.verification_status === 'verified',
        status: resp.status,
        notes: resp.notes,
        createdAt: resp.created_at,
        updatedAt: resp.updated_at,
      };
    });

    return successResponse({ responses: formatted }, 'Responses fetched successfully', 200);
  } catch (error: any) {
    console.error('Fetch responses error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
