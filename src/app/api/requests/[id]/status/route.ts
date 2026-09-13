import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import { BloodRequest, User } from '@/models';
import { getAuthUser } from '@/lib/auth';
import {
  updateRequestStatusSchema,
  isValidStatusTransition,
  RequestStatus,
} from '@/lib/validations';
import { successResponse, errorResponse } from '@/lib/api-response';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return errorResponse('Unauthorized: Please log in to update request status', 401);
    }

    await connectDB();
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

    // Find request by ObjectId or requestId string (e.g. BL-2026-XXXXX)
    let bloodRequest = null;
    if (mongoose.isValidObjectId(id)) {
      bloodRequest = await BloodRequest.findById(id);
    }
    if (!bloodRequest) {
      bloodRequest = await BloodRequest.findOne({ requestId: id });
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
      const hospitalUser = await User.findById(authUser.userId).lean();
      const hospitalName = hospitalUser?.name?.trim().toLowerCase();
      const requestHospital = (bloodRequest.hospital || '').trim().toLowerCase();
      const isAssignedHospital = Boolean(hospitalName && requestHospital === hospitalName);
      const isHospitalRequester = bloodRequest.requesterId?.toString() === authUser.userId;

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
      const isOwner = bloodRequest.requesterId?.toString() === authUser.userId;
      if (isOwner && nextStatus === 'CANCELLED') {
        isAuthorized = true;
      }
    } else if (authUser.role === 'donor') {
      // Donors cannot directly transition parent request status
      isAuthorized = false;
    }

    if (!isAuthorized) {
      console.warn(
        `[SECURITY] Unauthorized status transition attempt: User ${authUser.userId} (role: ${authUser.role}) attempted transition of request ${bloodRequest.requestId || bloodRequest._id} from ${currentStatus} to ${nextStatus}`
      );
      return errorResponse('Forbidden: You are not authorized to perform this status transition', 403);
    }

    bloodRequest.status = nextStatus;
    bloodRequest.updatedAt = new Date();
    await bloodRequest.save();

    return successResponse(
      bloodRequest,
      `Request status transitioned to ${nextStatus}`,
      200
    );
  } catch (error: any) {
    console.error('Update request status error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
