import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

export const AUTH_COOKIE_NAME = 'bc_token';

if (!process.env.JWT_SECRET) {
  throw new Error(
    'FATAL: JWT_SECRET environment variable is missing. The application cannot start securely without a configured secret.'
  );
}
const JWT_SECRET: string = process.env.JWT_SECRET;

export interface TokenPayload {
  userId: string;
  role: string;
}

export interface AuthenticatedUser extends TokenPayload {
  iat?: number;
  exp?: number;
}

/**
 * Signs a JWT with userId and role, defaulting to 7 days expiry
 */
export function signAuthToken(payload: TokenPayload, expiresIn: string | number = '7d'): string {
  const options: SignOptions = {
    expiresIn: expiresIn as any,
  };
  return jwt.sign(payload, JWT_SECRET, options);
}

/**
 * Verifies a JWT token string
 */
export function verifyAuthToken(token: string): AuthenticatedUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    if (decoded && decoded.userId) {
      return decoded;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Extracts and verifies auth token from NextRequest (via httpOnly cookie or Bearer header)
 */
export async function getAuthUser(req?: NextRequest): Promise<AuthenticatedUser | null> {
  // If middleware has already verified token and forwarded headers:
  if (req) {
    const forwardedUserId = req.headers.get('x-user-id');
    const forwardedUserRole = req.headers.get('x-user-role');
    if (forwardedUserId && forwardedUserRole) {
      return {
        userId: forwardedUserId,
        role: forwardedUserRole,
      };
    }
  }

  let token: string | undefined;

  // 1. Try from request cookies if req is provided
  if (req) {
    const cookieVal = req.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (cookieVal) {
      token = cookieVal;
    } else {
      // Check Authorization header
      const authHeader = req.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
      }
    }
  }

  // 2. Try from next/headers cookies()
  if (!token) {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    } catch {
      // In non-header context, ignore
    }
  }

  if (!token) {
    return null;
  }

  return verifyAuthToken(token);
}

/**
 * Hashes a plaintext password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compares plaintext password against stored hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Returns cookie options for setting bc_token httpOnly cookie
 */
export function getAuthCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    name: AUTH_COOKIE_NAME,
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  };
}
