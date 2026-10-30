import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import {
  updateRequestStatusSchema,
  isValidStatusTransition,
  RequestStatus,
} from '@/lib/validations';
import { successResponse, errorResponse } from '@/lib/api-response';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return errorResponse('Unauthorized: Please log in to update request status', 401);
    }

    const { id } = await params;
    const body = await req.json().catch(() => null);

    if (!body) {
      return errorResponse('Invalid JSON body', 400);
    }

    const validation = updateRequestStatusSchema.safeParse(body);
    if (!validation.success) {
      const issue = validation.error.issues[0];
      return errorResponse(issue?.message || 'Valid status is required', 400);
    }

    const nextStatus = validation.data.status as RequestStatus;
    const supabase = await createServerSupabase();

    // Query request by UUID or request_id string
    let { data: bloodRequest } = await supabase
      .from('blood_requests')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!bloodRequest) {
      const { data: requestByRequestId } = await supabase
        .from('blood_requests')
        .select('*')
        .eq('request_id', id)
        .maybeSingle();
      bloodRequest = requestByRequestId;
    }

    if (!bloodRequest) {
      return errorResponse('Blood request not found', 404);
    }

    const currentStatus = bloodRequest.status as RequestStatus;

    // Validate state transition sequence
    if (!isValidStatusTransition(currentStatus, nextStatus)) {
      return errorResponse(
        `Invalid status transition from "${currentStatus}" to "${nextStatus}". Cannot modify terminal requests or jump incompatible states.`,
        400
      );
    }

    // Role-based authorization checks
    let isAuthorized = false;

    if (authUser.role === 'admin') {
      isAuthorized = true;
    } else if (authUser.role === 'hospital') {
      const { data: hospitalUser } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', authUser.userId)
        .maybeSingle();

      const hospitalName = hospitalUser?.name?.trim().toLowerCase();
      const requestHospital = (bloodRequest.hospital || '').trim().toLowerCase();
      const isAssignedHospital = Boolean(hospitalName && requestHospital === hospitalName);
      const isHospitalRequester = bloodRequest.requester_id === authUser.userId;

      if (isAssignedHospital || isHospitalRequester) {
        const hospitalAllowedStatuses: RequestStatus[] = [
          'MATCHING',
          'DONOR_RESPONDED',
          'HOSPITAL_CONFIRMED',
          'FULFILLED',
          'CANCELLED',
        ];
        if (hospitalAllowedStatuses.includes(nextStatus)) {
          isAuthorized = true;
        }
      }
    } else if (authUser.role === 'requester') {
      // Requesters may ONLY cancel their own requests
      const isOwner = bloodRequest.requester_id === authUser.userId;
      if (isOwner && nextStatus === 'CANCELLED') {
        isAuthorized = true;
      }
    } else if (authUser.role === 'donor') {
      isAuthorized = false;
    }

    if (!isAuthorized) {
      console.warn(
        `[SECURITY] Unauthorized status transition attempt: User ${authUser.userId} (role: ${authUser.role}) attempted transition of request ${bloodRequest.request_id || bloodRequest.id} from ${currentStatus} to ${nextStatus}`
      );
      return errorResponse(
        'Forbidden: You are not authorized to perform this status transition',
        403
      );
    }

    const { data: updatedRequest, error: updateErr } = await supabase
      .from('blood_requests')
      .update({
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bloodRequest.id)
      .select()
      .single();

    if (updateErr || !updatedRequest) {
      console.error('Update request status error:', updateErr);
      return errorResponse('Failed to update request status', 500);
    }

    return successResponse(
      {
        id: updatedRequest.id,
        requestId: updatedRequest.request_id,
        requesterId: updatedRequest.requester_id,
        bloodGroup: updatedRequest.blood_group,
        priority: updatedRequest.priority,
        status: updatedRequest.status,
        hospital: updatedRequest.hospital,
        unitsNeeded: updatedRequest.units_needed,
        contactNumber: updatedRequest.contact_number,
        patientName: updatedRequest.patient_name,
        city: updatedRequest.city,
        notes: updatedRequest.notes,
        createdAt: updatedRequest.created_at,
        updatedAt: updatedRequest.updated_at,
      },
      `Request status transitioned to ${nextStatus}`,
      200
    );
  } catch (error: any) {
    console.error('Update request status error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
