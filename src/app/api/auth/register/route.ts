import { NextRequest } from 'next/server';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
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
    const lowerEmail = email.toLowerCase().trim();

    if (role === 'admin') {
      return errorResponse('Admin accounts cannot be created through registration', 400);
    }

    const supabaseServer = await createServerSupabase();

    // The database signup trigger creates the matching profiles row from this metadata.
    const { data: authData, error: authError } = await supabaseServer.auth.signUp({
      email: lowerEmail,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin}/auth/callback`,
        data: { name, role, phone, city, bloodGroup },
      },
    });

    if (authError || !authData.user) {
      const errMsg = authError?.message || 'Failed to create user account';
      if (errMsg.includes('already registered') || errMsg.includes('already exists')) {
        return errorResponse('User with this email already exists', 400);
      }
      return errorResponse(errMsg, 400);
    }

    // Create the donor profile through the authenticated client so RLS remains active.
    if (authData.session && (role === 'donor' || bloodGroup)) {
      const { error: donorError } = await supabaseServer.from('donor_profiles').insert({
        user_id: authData.user.id,
        blood_group: (bloodGroup || 'O+') as BloodGroup,
        availability_status: 'available',
      });

      if (donorError) {
        console.error('Donor profile creation error:', donorError);
        return errorResponse('Account created but donor profile setup failed', 500);
      }
    }

    return successResponse(
      { role, requiresEmailConfirmation: !authData.session },
      authData.session
        ? 'Registration successful'
        : 'Registration successful. Please confirm your email before signing in.',
      201
    );
  } catch (error) {
    console.error('Registration error:', error);
    return errorResponse('Registration failed. Please try again.', 500);
  }
}
