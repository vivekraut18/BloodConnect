import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { User } from '@/models';
import { comparePassword, signAuthToken, getAuthCookieOptions } from '@/lib/auth';
import { loginSchema } from '@/lib/validations';
import { successResponse, errorResponse } from '@/lib/api-response';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 5 attempts per IP per 10 minutes to protect against brute-force & credential stuffing
    const rateLimit = checkRateLimit(req, 'auth_login', 5, 10 * 60 * 1000);
    if (!rateLimit.allowed) {
      const waitMinutes = Math.ceil((rateLimit.resetTime - Date.now()) / (60 * 1000));
      return errorResponse(
        `Too many login attempts. Please try again in ${waitMinutes} minute(s).`,
        429
      );
    }

    await connectDB();

    const body = await req.json().catch(() => null);
    if (!body) {
      return errorResponse('Invalid JSON request body', 400);
    }

    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      const issue = validation.error.issues[0];
      return errorResponse(issue?.message || 'Email and password are required', 400);
    }

    const { email, password } = validation.data;
    const lowerEmail = email.toLowerCase().trim();

    // Query user including passwordHash
    const user = await User.findOne({ email: lowerEmail }).select('+passwordHash');
    if (!user) {
      return errorResponse('Invalid email or password', 401);
    }

    // Verify password
    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return errorResponse('Invalid email or password', 401);
    }

    // Sign JWT
    const token = signAuthToken({
      userId: user._id.toString(),
      role: user.role,
    });

    // Build response with httpOnly cookie
    const response = successResponse(
      { role: user.role },
      'Login successful',
      200
    );

    const cookieOptions = getAuthCookieOptions();
    response.cookies.set(cookieOptions.name, token, cookieOptions);

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
