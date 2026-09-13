import { NextRequest } from 'next/server';
import { AUTH_COOKIE_NAME } from '@/lib/auth';
import { successResponse } from '@/lib/api-response';

export async function POST(_req: NextRequest) {
  const response = successResponse(null, 'Logged out successfully', 200);

  // Clear httpOnly cookie
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: '',
    path: '/',
    maxAge: 0,
    httpOnly: true,
    expires: new Date(0),
  });

  return response;
}
