import { NextRequest } from 'next/server';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// In-memory sliding window rate limiter
const ipStore = new Map<string, RateLimitRecord>();

// Cleanup stale records periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of ipStore.entries()) {
    if (now > record.resetTime) {
      ipStore.delete(key);
    }
  }
}, 60 * 1000);

/**
 * Checks if the request exceeds maxRequests within the windowMs
 */
export function checkRateLimit(
  req: NextRequest,
  prefix = 'req',
  maxRequests = 5,
  windowMs = 10 * 60 * 1000 // 10 minutes
): { allowed: boolean; remaining: number; resetTime: number } {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1';
  const key = `${prefix}:${ip}`;
  const now = Date.now();

  const record = ipStore.get(key);

  if (!record || now > record.resetTime) {
    // Start new window
    const newRecord: RateLimitRecord = {
      count: 1,
      resetTime: now + windowMs,
    };
    ipStore.set(key, newRecord);
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: newRecord.resetTime,
    };
  }

  if (record.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
    };
  }

  record.count += 1;
  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetTime: record.resetTime,
  };
}
