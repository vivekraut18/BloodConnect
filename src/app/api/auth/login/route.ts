import { NextRequest } from 'next/server';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { loginSchema } from '@/lib/validations';
import { successResponse, errorResponse } from '@/lib/api-response';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 5 attempts per IP per 10 minutes to protect against brute-force
    const rateLimit = checkRateLimit(req, 'auth_login', 5, 10 * 60 * 1000);
    if (!rateLimit.allowed) {
      const waitMinutes = Math.ceil((rateLimit.resetTime - Date.now()) / (60 * 1000));
      return errorResponse(
        `Too many login attempts. Please try again in ${waitMinutes} minute(s).`,
        429
      );
    }

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

    // Sign in via Supabase Auth
    const supabaseServer = await createServerSupabase();
    const { data: authData, error: authError } = await supabaseServer.auth.signInWithPassword({
      email: lowerEmail,
      password,
    });

    if (authError || !authData.user) {
      // Surface actionable messages from Supabase (e.g. "Email not confirmed")
      // while keeping credential errors generic to prevent account enumeration.
      const lowerMsg = (authError?.message || '').toLowerCase();
      let userMessage = 'Invalid email or password';

      if (lowerMsg.includes('email not confirmed')) {
        userMessage = 'Please verify your email address before signing in. Check your inbox for a confirmation link.';
      } else if (lowerMsg.includes('too many requests')) {
        userMessage = 'Too many sign-in attempts. Please wait a moment and try again.';
      }

      return errorResponse(userMessage, 401);
    }

    const { data: profile, error: profileError } = await supabaseServer
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profile) {
      console.error('Login profile lookup failed:', profileError);
      await supabaseServer.auth.signOut();
      return errorResponse('User profile not found', 500);
    }

    return successResponse({ role: profile.role }, 'Login successful', 200);
  } catch (error) {
    console.error('Login error:', error);
    return errorResponse('Unable to sign in right now. Please try again.', 500);
  }
}
