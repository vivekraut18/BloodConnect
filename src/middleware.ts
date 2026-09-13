import { NextRequest, NextResponse } from 'next/server';
import { verifyJwtEdge } from './lib/jwt-edge';

const PUBLIC_API_ROUTES = [
  '/api/auth/register',
  '/api/auth/login',
  '/api/auth/logout',
];

if (!process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is missing.');
}
const JWT_SECRET: string = process.env.JWT_SECRET;

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only apply to /api/ routes
  if (!pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Allow public auth endpoints
  if (PUBLIC_API_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Extract token from httpOnly cookie "bc_token" or Authorization header
  let token = req.cookies.get('bc_token')?.value;

  if (!token) {
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }
  }

  if (!token) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        message: 'Unauthorized: Authentication required. Please provide a valid bc_token cookie or Bearer token.',
      },
      { status: 401 }
    );
  }

  // Verify JWT token using Web Crypto API
  const user = await verifyJwtEdge(token, JWT_SECRET);

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        message: 'Unauthorized: Invalid or expired authentication token',
      },
      { status: 401 }
    );
  }

  // Forward user context to downstream handlers via headers
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-user-id', user.userId);
  requestHeaders.set('x-user-role', user.role);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ['/api/:path*'],
};
