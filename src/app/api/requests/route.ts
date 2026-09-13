import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { BloodRequest, Donor, User } from '@/models';
import { getAuthUser } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import {
  createBloodRequestSchema,
  REQUEST_STATUS,
  REQUEST_PRIORITY,
  RequestStatus,
  RequestPriority,
  getCompatibleDonorGroups,
} from '@/lib/validations';
import { successResponse, errorResponse } from '@/lib/api-response';

// 8. POST /api/requests — Rate-limited, creates request, finds compatible available donors
export async function POST(req: NextRequest) {
  try {
    // Rate limit: 5 requests per IP per 10 minutes
    const rateLimit = checkRateLimit(req, 'blood_request', 5, 10 * 60 * 1000);
    if (!rateLimit.allowed) {
      const waitMinutes = Math.ceil((rateLimit.resetTime - Date.now()) / (60 * 1000));
      return errorResponse(
        `Rate limit exceeded. Too many requests. Please try again in ${waitMinutes} minute(s).`,
        429
      );
    }

    await connectDB();

    const body = await req.json().catch(() => null);
    if (!body) {
      return errorResponse('Invalid JSON request body', 400);
    }

    const validation = createBloodRequestSchema.safeParse(body);
    if (!validation.success) {
      const issue = validation.error.issues[0];
      return errorResponse(issue?.message || 'Validation error', 400);
    }

    const {
      bloodGroup,
      priority,
      hospital,
      unitsNeeded,
      contactNumber,
      city,
      patientName,
      notes,
    } = validation.data;

    // Optional user association if logged in
    const authUser = await getAuthUser(req);
    const requesterId = authUser?.userId || null;

    // Create BloodRequest with status OPEN
    const newRequest = await BloodRequest.create({
      requesterId,
      bloodGroup,
      priority,
      status: 'OPEN',
      hospital,
      unitsNeeded,
      contactNumber,
      city,
      patientName,
      notes,
    });

    // Find compatible donor blood groups using BLOOD_COMPATIBILITY table
    const compatibleGroups = getCompatibleDonorGroups(bloodGroup);

    // Query available donors with compatible blood groups
    const compatibleDonorsRaw = await Donor.find({
      bloodGroup: { $in: compatibleGroups },
      availabilityStatus: 'available',
    })
      .populate<{ userId: { name: string; city: string; verificationStatus: string } }>({
        path: 'userId',
        select: 'name city verificationStatus -_id',
      })
      .lean();

    const compatibleDonors = compatibleDonorsRaw
      .filter((d) => Boolean(d.userId))
      .map((d: any) => {
        const user = d.userId || {};
        const nameParts = (user.name || 'Donor').trim().split(' ');
        const initials = nameParts.map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

        return {
          id: d._id.toString(),
          name: nameParts[0] || 'Donor',
          initials,
          bloodGroup: d.bloodGroup,
          city: user.city || '',
          availabilityStatus: d.availabilityStatus,
          isVerified: user.verificationStatus === 'verified',
          reliabilityScore: d.reliabilityScore || 100,
          donationsCompleted: d.donationsCompleted || 0,
        };
      });

    return successResponse(
      {
        request: newRequest,
        compatibleDonors,
      },
      'Blood request created successfully',
      201
    );
  } catch (error: any) {
    console.error('Create blood request error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}

// 9. GET /api/requests?status=X&priority=Y&page=1&limit=20 — Authenticated, role-scoped & paginated list
export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return errorResponse('Unauthorized: Please log in to view blood requests', 401);
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {};

    if (status && REQUEST_STATUS.includes(status as RequestStatus)) {
      query.status = status;
    }

    if (priority && REQUEST_PRIORITY.includes(priority as RequestPriority)) {
      query.priority = priority;
    }

    // Role-scoped query & projection
    if (authUser.role === 'admin') {
      const total = await BloodRequest.countDocuments(query);
      const requests = await BloodRequest.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'requesterId',
          select: 'name city phone email -_id',
        })
        .lean();

      return successResponse(
        {
          requests,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
        'Blood requests fetched successfully',
        200
      );
    }

    if (authUser.role === 'hospital') {
      const hospitalUser = await User.findById(authUser.userId).lean();
      const hospitalName = hospitalUser?.name;

      if (hospitalName) {
        query.$or = [
          { hospital: new RegExp(`^${hospitalName}$`, 'i') },
          { requesterId: authUser.userId },
        ];
      } else {
        query.requesterId = authUser.userId;
      }

      const total = await BloodRequest.countDocuments(query);
      const requests = await BloodRequest.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'requesterId',
          select: 'name city phone email -_id',
        })
        .lean();

      return successResponse(
        {
          requests,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
        'Hospital blood requests fetched successfully',
        200
      );
    }

    if (authUser.role === 'requester') {
      query.requesterId = authUser.userId;

      const total = await BloodRequest.countDocuments(query);
      const requests = await BloodRequest.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'requesterId',
          select: 'name city phone email -_id',
        })
        .lean();

      return successResponse(
        {
          requests,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
        'Your blood requests fetched successfully',
        200
      );
    }

    if (authUser.role === 'donor') {
      const total = await BloodRequest.countDocuments(query);
      const rawRequests = await BloodRequest.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('requestId bloodGroup priority status hospital unitsNeeded city createdAt updatedAt')
        .lean();

      const requests = rawRequests.map((r: any) => ({
        id: r._id.toString(),
        requestId: r.requestId,
        bloodGroup: r.bloodGroup,
        city: r.city || '',
        priority: r.priority,
        status: r.status,
        hospital: r.hospital,
        unitsNeeded: r.unitsNeeded,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      }));

      return successResponse(
        {
          requests,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
        'Available blood requests fetched (donor privacy view)',
        200
      );
    }

    return errorResponse('Forbidden: Invalid role', 403);
  } catch (error: any) {
    console.error('Fetch blood requests error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
