import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

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

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // ==================================================================
  // 1. AUTHENTICATION MIDDLEWARE
  // ==================================================================
  // Handle auth redirects before rate limiting

  // Define route categories
  const publicRoutes = ['/', '/pricing'];
  const authRoutes = ['/login', '/signup', '/confirm-email'];
  const callbackRoutes = ['/auth/callback'];
  const protectedRoutes = [
    '/dashboard',
    '/onboarding',
    '/select-archetype',
    '/setup',
    '/quiz',
    '/history',
    '/skills',
    '/equipment',
    '/shop',
    '/payment-success'
  ];

  // Check if current path matches any protected route
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some(route => pathname === route);
  const isPublicRoute = publicRoutes.some(route => pathname === route);
  const isCallbackRoute = callbackRoutes.some(route => pathname.startsWith(route));

  // Skip auth check for callback routes (they handle auth themselves)
  if (!isCallbackRoute && !pathname.startsWith('/api/')) {
    // Create Supabase client for server-side auth check
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) {
            return request.cookies.get(name)?.value;
          },
          set(name, value, options) {
            request.cookies.set({
              name,
              value,
              ...options,
            });
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            response.cookies.set({
              name,
              value,
              ...options,
            });
          },
          remove(name, options) {
            request.cookies.set({
              name,
              value: '',
              ...options,
            });
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            response.cookies.set({
              name,
              value: '',
              ...options,
            });
          },
        },
      }
    );

    // Check authentication status
    const { data: { user }, error } = await supabase.auth.getUser();
    const isAuthenticated = !!user && !error;

    // REDIRECT LOGIC:
    // 1. Authenticated users trying to access public/auth pages → redirect to /dashboard
    if (isAuthenticated && (isPublicRoute || isAuthRoute)) {
      console.log(`Authenticated user accessing ${pathname}, redirecting to /dashboard`);
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // 2. Unauthenticated users trying to access protected routes → redirect to /login
    if (!isAuthenticated && isProtectedRoute) {
      console.log(`Unauthenticated user accessing ${pathname}, redirecting to /login`);
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Continue with the response (update cookies if needed)
    return response;
  }

  // ==================================================================
  // 2. API RATE LIMITING
  // ==================================================================
  // Only apply rate limiting to API routes
  if (pathname.startsWith('/api/')) {
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
        path: pathname,
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
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
