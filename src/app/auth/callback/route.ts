import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { UserRole } from '@/lib/validations';

const ROLE_REDIRECTS: Record<UserRole, string> = {
  donor: '/donor-dashboard',
  requester: '/find-blood-search',
  hospital: '/find-blood-search',
  admin: '/donor-dashboard',
};

// Internal paths that the `next` parameter is allowed to redirect to
const ALLOWED_NEXT_PATHS = ['/reset-password'];

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const next = req.nextUrl.searchParams.get('next');
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;

  if (!code) {
    return NextResponse.redirect(new URL('/?authError=verification_failed', siteUrl));
  }

  try {
    const supabase = await createServerSupabase();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('Email verification session exchange failed:', exchangeError);
      return NextResponse.redirect(new URL('/?authError=verification_failed', siteUrl));
    }

    // If a valid `next` path was provided (e.g. password recovery → /reset-password),
    // redirect there instead of performing the role-based redirect.
    if (next && ALLOWED_NEXT_PATHS.includes(next)) {
      return NextResponse.redirect(new URL(next, siteUrl));
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('Verified user lookup failed:', userError);
      return NextResponse.redirect(new URL('/?authError=verification_failed', siteUrl));
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Verified user profile lookup failed:', profileError);
      return NextResponse.redirect(new URL('/?authError=verification_failed', siteUrl));
    }

    if (profile.role === 'donor') {
      const { data: donorProfile, error: donorLookupError } = await supabase
        .from('donor_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (donorLookupError) {
        console.error('Verified donor profile lookup failed:', donorLookupError);
        return NextResponse.redirect(new URL('/?authError=verification_failed', siteUrl));
      }

      if (!donorProfile) {
        const { error: donorInsertError } = await supabase.from('donor_profiles').insert({
          user_id: user.id,
          blood_group: user.user_metadata?.bloodGroup || 'O+',
          availability_status: 'available',
        });

        if (donorInsertError) {
          console.error('Verified donor profile creation failed:', donorInsertError);
          return NextResponse.redirect(new URL('/?authError=verification_failed', siteUrl));
        }
      }
    }

    const redirectPath = ROLE_REDIRECTS[profile.role as UserRole] || '/find-blood-search';
    return NextResponse.redirect(new URL(redirectPath, siteUrl));
  } catch (error) {
    console.error('Email verification callback failed:', error);
    return NextResponse.redirect(new URL('/?authError=verification_failed', siteUrl));
  }
}

