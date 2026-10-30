import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
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

    const body = await req.json().catch(() => null);
    if (!body) {
      return errorResponse('Invalid JSON request body', 400);
    }

    const validation = createBloodRequestSchema.safeParse(body);
    if (!validation.success) {
      const issue = validation.error.issues[0];
      return errorResponse(issue?.message || 'Validation error', 400);
    }

    const { bloodGroup, priority, hospital, unitsNeeded, contactNumber, city, patientName, notes } =
      validation.data;

    const authUser = await getAuthUser(req);
    if (!authUser) {
      return errorResponse('Unauthorized: Please log in to create a blood request', 401);
    }
    const requesterId = authUser.userId;

    const year = new Date().getFullYear();
    const rand = Math.floor(10000 + Math.random() * 90000);
    const requestIdStr = `BL-${year}-${rand}`;

    const supabase = await createServerSupabase();

    // Create BloodRequest record
    const { data: newRequest, error: reqErr } = await supabase
      .from('blood_requests')
      .insert({
        request_id: requestIdStr,
        requester_id: requesterId,
        blood_group: bloodGroup,
        priority: priority || 'STANDARD',
        status: 'OPEN',
        hospital,
        units_needed: unitsNeeded,
        contact_number: contactNumber,
        city: city || null,
        patient_name: patientName || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (reqErr || !newRequest) {
      console.error('Create blood request error:', reqErr);
      return errorResponse(reqErr?.message || 'Failed to create blood request', 500);
    }

    // Find compatible donor blood groups using BLOOD_COMPATIBILITY
    const compatibleGroups = getCompatibleDonorGroups(bloodGroup);

    // Query available donors with compatible blood groups
    const { data: compatibleDonorsRaw } = await supabase
      .from('donor_profiles')
      .select('*, profiles!user_id(name, city, verification_status)')
      .in('blood_group', compatibleGroups)
      .eq('availability_status', 'available');

    const compatibleDonors = (compatibleDonorsRaw || [])
      .filter((d: any) => Boolean(d.profiles))
      .map((d: any) => {
        const user = d.profiles || {};
        const nameParts = (user.name || 'Donor').trim().split(' ');
        const initials = nameParts
          .map((n: string) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);

        return {
          id: d.id,
          name: nameParts[0] || 'Donor',
          initials,
          bloodGroup: d.blood_group,
          city: user.city || '',
          availabilityStatus: d.availability_status,
          isVerified: user.verification_status === 'verified',
          reliabilityScore: d.reliability_score || 100,
          donationsCompleted: d.donations_completed || 0,
        };
      });

    return successResponse(
      {
        request: {
          id: newRequest.id,
          requestId: newRequest.request_id,
          requesterId: newRequest.requester_id,
          bloodGroup: newRequest.blood_group,
          priority: newRequest.priority,
          status: newRequest.status,
          hospital: newRequest.hospital,
          unitsNeeded: newRequest.units_needed,
          contactNumber: newRequest.contact_number,
          city: newRequest.city,
          patientName: newRequest.patient_name,
          notes: newRequest.notes,
          createdAt: newRequest.created_at,
          updatedAt: newRequest.updated_at,
        },
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

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return errorResponse('Unauthorized: Please log in to view blood requests', 401);
    }

    const supabase = await createServerSupabase();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let baseQuery = supabase
      .from('blood_requests')
      .select('*, profiles!requester_id(name, city, phone, email)', { count: 'exact' });

    if (status && REQUEST_STATUS.includes(status as RequestStatus)) {
      baseQuery = baseQuery.eq('status', status);
    }

    if (priority && REQUEST_PRIORITY.includes(priority as RequestPriority)) {
      baseQuery = baseQuery.eq('priority', priority);
    }

    const isMineScope = searchParams.get('scope') === 'mine' || searchParams.get('my') === 'true';

    // Role-scoped query rules
    if (isMineScope) {
      baseQuery = baseQuery.eq('requester_id', authUser.userId);
    } else if (authUser.role === 'admin') {
      // Admin gets all requests
    } else if (authUser.role === 'hospital') {
      const { data: hospitalUser } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', authUser.userId)
        .single();
      const hospitalName = hospitalUser?.name;

      if (hospitalName) {
        baseQuery = baseQuery.or(
          `hospital.ilike.${hospitalName},requester_id.eq.${authUser.userId}`
        );
      } else {
        baseQuery = baseQuery.eq('requester_id', authUser.userId);
      }
    } else if (authUser.role === 'requester') {
      baseQuery = baseQuery.eq('requester_id', authUser.userId);
    } else if (authUser.role === 'donor') {
      // Donors see open/active requests
    } else {
      return errorResponse('Forbidden: Invalid role', 403);
    }

    const {
      data: requests,
      count,
      error,
    } = await baseQuery.order('created_at', { ascending: false }).range(from, to);

    if (error) {
      console.error('Fetch requests db error:', error);
      return errorResponse('Failed to fetch blood requests', 500);
    }

    const total = count || 0;

    // Fetch response stats for the returned requests
    const requestIds = (requests || []).map((r: any) => r.id);
    const userResponsesMap = new Map<string, string>();
    const responseCountsMap = new Map<string, number>();

    if (requestIds.length > 0) {
      const { data: allResponses } = await supabase
        .from('request_responses')
        .select('request_id, donor_id, status')
        .in('request_id', requestIds);

      if (allResponses) {
        for (const resp of allResponses) {
          if (resp.donor_id === authUser.userId) {
            userResponsesMap.set(resp.request_id, resp.status);
          }
          if (resp.status === 'accepted') {
            responseCountsMap.set(
              resp.request_id,
              (responseCountsMap.get(resp.request_id) || 0) + 1
            );
          }
        }
      }
    }

    const formattedRequests = (requests || []).map((r: any) => {
      const reqProfile = r.profiles || {};
      const respondedCount = responseCountsMap.get(r.id) || 0;
      const userResponseStatus = userResponsesMap.get(r.id) || null;
      const hasResponded = userResponseStatus === 'accepted';

      if (authUser.role === 'donor' && !isMineScope) {
        // Privacy-safe view for donors with response stats
        return {
          id: r.id,
          requestId: r.request_id,
          bloodGroup: r.blood_group,
          city: r.city || '',
          priority: r.priority,
          status: r.status,
          hospital: r.hospital,
          unitsNeeded: r.units_needed,
          notes: r.notes,
          respondedCount,
          hasResponded,
          userResponseStatus,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        };
      }

      return {
        id: r.id,
        requestId: r.request_id,
        requesterId: r.requester_id,
        requesterName: reqProfile.name || 'Anonymous',
        requesterPhone: reqProfile.phone || r.contact_number,
        bloodGroup: r.blood_group,
        priority: r.priority,
        status: r.status,
        hospital: r.hospital,
        unitsNeeded: r.units_needed,
        contactNumber: r.contact_number,
        patientName: r.patient_name,
        city: r.city,
        notes: r.notes,
        respondedCount,
        hasResponded,
        userResponseStatus,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      };
    });

    return successResponse(
      {
        requests: formattedRequests,
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
  } catch (error: any) {
    console.error('Fetch blood requests error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
