import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { User, Donor } from '@/models';
import { hashPassword } from '@/lib/auth';
import { registerSchema, BloodGroup } from '@/lib/validations';
import { successResponse, errorResponse } from '@/lib/api-response';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 5 attempts per IP per 10 minutes to prevent automated abuse
    const rateLimit = checkRateLimit(req, 'auth_register', 5, 10 * 60 * 1000);
    if (!rateLimit.allowed) {
      const waitMinutes = Math.ceil((rateLimit.resetTime - Date.now()) / (60 * 1000));
      return errorResponse(
        `Too many registration attempts. Please try again in ${waitMinutes} minute(s).`,
        429
      );
    }

    await connectDB();

    const body = await req.json().catch(() => null);
    if (!body) {
      return errorResponse('Invalid JSON request body', 400);
    }

    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      const issue = validation.error.issues[0];
      return errorResponse(issue?.message || 'Validation error', 400);
    }

    const { name, email, password, role, city, phone, bloodGroup } = validation.data;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return errorResponse('User with this email already exists', 400);
    }

    const passwordHash = await hashPassword(password);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role,
      city,
      phone,
      verificationStatus: 'verified',
    });

    if (role === 'donor' || bloodGroup) {
      await Donor.create({
        userId: user._id,
        bloodGroup: (bloodGroup || 'O+') as BloodGroup,
        availabilityStatus: 'available',
        lastDonationDate: null,
      });
    }

    return successResponse(
      { role: user.role },
      'Registration successful',
      201
    );
  } catch (error: any) {
    console.error('Registration error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
