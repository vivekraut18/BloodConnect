import { NextRequest } from 'next/server';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api-response';

export async function POST(_req: NextRequest) {
  try {
    const supabaseServer = await createServerSupabase();
    const { error } = await supabaseServer.auth.signOut();
    if (error) {
      console.error('Logout error:', error);
      return errorResponse('Unable to log out. Please try again.', 500);
    }
  } catch (error) {
    console.error('Logout error:', error);
    return errorResponse('Unable to log out. Please try again.', 500);
  }

  return successResponse(null, 'Logged out successfully', 200);
}
