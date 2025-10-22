import { NextResponse } from 'next/server';

// Simple in-memory rate limiting
// For production, consider using Redis or a similar distributed cache
const rateLimit = new Map();

// Cleanup old entries periodically
function cleanupRateLimit() {
  const now = Date.now();
  const windowMs = 60000; // 1 minute

  for (const [key, requests] of rateLimit.entries()) {
    const validRequests = requests.filter(time => now - time < windowMs);
    if (validRequests.length === 0) {
      rateLimit.delete(key);
    } else {
      rateLimit.set(key, validRequests);
    }
  }
}

export function middleware(request) {
  // Only apply rate limiting to API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();
    const windowMs = 60000; // 1 minute window
    const maxRequests = 30; // 30 requests per minute

    // Get or initialize request history for this IP
    if (!rateLimit.has(ip)) {
      rateLimit.set(ip, []);
    }

    const requests = rateLimit.get(ip);

    // Filter out requests outside the time window
    const recentRequests = requests.filter(time => now - time < windowMs);

    // Check if rate limit exceeded
    if (recentRequests.length >= maxRequests) {
      console.warn('Rate limit exceeded', {
        ip,
        requests: recentRequests.length,
        path: request.nextUrl.pathname,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': '60',
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(now + windowMs).toISOString(),
          }
        }
      );
    }

    // Add current request to history
    recentRequests.push(now);
    rateLimit.set(ip, recentRequests);

    // Cleanup old entries randomly (1% chance per request)
    if (Math.random() < 0.01) {
      cleanupRateLimit();
    }

    // Add rate limit headers to response
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', (maxRequests - recentRequests.length).toString());
    response.headers.set('X-RateLimit-Reset', new Date(now + windowMs).toISOString());

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
