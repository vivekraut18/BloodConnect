/**
 * Supabase Admin Client (Service Role)
 *
 * Creates a Supabase client using the service_role key, which bypasses
 * Row Level Security. This should ONLY be used in trusted server-side
 * contexts (Route Handlers, Server Actions, scripts) — never in
 * Client Components or exposed to the browser.
 *
 * Common use cases:
 *   - Creating user profiles in a signup trigger/webhook
 *   - Admin dashboards that need unrestricted data access
 *   - Background jobs and data seeding scripts
 *
 * Usage:
 *   import { createAdminClient } from '@/lib/supabase/admin';
 *   const supabaseAdmin = createAdminClient();
 */
import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing Supabase admin environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.'
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
