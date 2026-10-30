/**
 * Supabase Server Client
 *
 * Creates a Supabase client for use in Server Components, Route Handlers,
 * and Server Actions inside Next.js App Router.
 *
 * Uses @supabase/ssr createServerClient with the Next.js cookies() API
 * to manage the auth session cookie automatically.
 *
 * Usage:
 *   import { createClient } from '@/lib/supabase/server';
 *   const supabase = await createClient();
 */
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.'
    );
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // setAll can be called from a Server Component where cookies
          // are read-only. This is expected and safe to ignore — the
          // middleware will pick up the refreshed session on the next request.
        }
      },
    },
  });
}
