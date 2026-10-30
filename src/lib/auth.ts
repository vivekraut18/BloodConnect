import { NextRequest } from 'next/server';
import { createClient as createServerSupabase } from './supabase/server';

export interface TokenPayload {
  userId: string;
  role: string;
}

export interface AuthenticatedUser extends TokenPayload {
  email?: string;
}

/**
 * Retrieves the authenticated Supabase user and role from the profiles table.
 * Identity and authorization data are never accepted from request headers.
 */
export async function getAuthUser(_req?: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Authenticated user profile lookup failed:', profileError);
      return null;
    }

    return {
      userId: user.id,
      role: profile.role,
      email: user.email,
    };
  } catch (error) {
    console.error('Authenticated user lookup failed:', error);
    return null;
  }
}
