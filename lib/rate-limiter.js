/**
 * RATE LIMITING FOR HABITQUEST
 *
 * Prevents API abuse and controls Claude API costs
 * Uses Supabase database for rate limit tracking (simple, no Redis needed)
 *
 * Usage:
 *   import { checkRateLimit } from '@/lib/rate-limiter';
 *
 *   const rateLimit = await checkRateLimit(userId, 'transform-quest');
 *   if (!rateLimit.allowed) {
 *     return error429Response(rateLimit);
 *   }
 */

import { getSupabaseAdminClient } from './supabase-server';

// Rate limit configurations
const RATE_LIMITS = {
  // Quest transformation (expensive AI calls)
  'transform-quest': {
    free: { limit: 20, window: 24 * 60 }, // 20 per day
    premium: { limit: 200, window: 24 * 60 }, // 200 per day
    burst: { limit: 5, window: 1 }, // Max 5 per minute (burst protection)
  },

  // Journal transformation (expensive AI calls)
  'transform-journal': {
    free: { limit: 5, window: 24 * 60 }, // 5 per day
    premium: { limit: 20, window: 24 * 60 }, // 20 per day
    burst: { limit: 3, window: 1 }, // Max 3 per minute
  },

  // Quest completion (prevent spam)
  'complete-quest': {
    free: { limit: 100, window: 60 }, // 100 per hour
    premium: { limit: 500, window: 60 }, // 500 per hour
    burst: { limit: 10, window: 1 }, // Max 10 per minute
  },

  // Weekly story generation (very expensive)
  'weekly-summary': {
    free: { limit: 1, window: 7 * 24 * 60 }, // Once per week
    premium: { limit: 2, window: 7 * 24 * 60 }, // Twice per week
    burst: { limit: 1, window: 60 }, // Once per hour max
  },

  // Checkout creation (prevent spam)
  'create-checkout': {
    free: { limit: 3, window: 60 }, // 3 per hour
    premium: { limit: 0, window: 1 }, // Premium users can't create checkouts
    burst: { limit: 1, window: 5 }, // Once per 5 minutes
  },

  // General API fallback
  'default': {
    free: { limit: 100, window: 60 }, // 100 per hour
    premium: { limit: 500, window: 60 }, // 500 per hour
    burst: { limit: 20, window: 1 }, // 20 per minute
  },
};

/**
 * Check if user has exceeded rate limit
 *
 * @param {string} userId - User ID (auth.uid())
 * @param {string} endpoint - Endpoint name (e.g., 'transform-quest')
 * @param {Object} options - Optional overrides
 * @returns {Promise<{allowed: boolean, current: number, limit: number, reset_at: string}>}
 */
export async function checkRateLimit(userId, endpoint, options = {}) {
  const supabaseAdmin = getSupabaseAdminClient();

  // Get rate limit config for this endpoint
  const config = RATE_LIMITS[endpoint] || RATE_LIMITS['default'];

  // Check if user is premium (for different limits)
  const isPremium = await isUserPremium(userId);

  // Get appropriate limit
  const tierConfig = isPremium ? config.premium : config.free;
  const limit = options.limit || tierConfig.limit;
  const windowMinutes = options.window || tierConfig.window;

  // Check main rate limit
  const mainLimit = await checkLimit(
    userId,
    endpoint,
    limit,
    windowMinutes
  );

  // Also check burst protection if configured
  if (config.burst && mainLimit.allowed) {
    const burstLimit = await checkLimit(
      userId,
      `${endpoint}:burst`,
      config.burst.limit,
      config.burst.window
    );

    if (!burstLimit.allowed) {
      return {
        ...burstLimit,
        reason: 'burst_limit_exceeded',
      };
    }
  }

  return mainLimit;
}

/**
 * Internal function to check a specific rate limit
 */
async function checkLimit(userId, key, limit, windowMinutes) {
  const supabaseAdmin = getSupabaseAdminClient();

  try {
    // Use database function for atomic rate limit check
    const { data, error } = await supabaseAdmin
      .rpc('check_rate_limit', {
        p_user_id: userId,
        p_endpoint: key,
        p_limit: limit,
        p_window_minutes: windowMinutes,
      });

    if (error) {
      console.error('Rate limit check error:', error);
      // On error, allow request but log for investigation
      return {
        allowed: true,
        current: 0,
        limit: limit,
        reset_at: new Date(Date.now() + windowMinutes * 60 * 1000).toISOString(),
        error: error.message,
      };
    }

    const result = data?.[0];

    return {
      allowed: result.allowed,
      current: result.current_count,
      limit: result.limit_value,
      reset_at: result.reset_at,
    };
  } catch (error) {
    console.error('Rate limit exception:', error);
    // On exception, allow request (fail open)
    return {
      allowed: true,
      current: 0,
      limit: limit,
      reset_at: new Date(Date.now() + windowMinutes * 60 * 1000).toISOString(),
      error: error.message,
    };
  }
}

/**
 * Check if user is premium (cached for performance)
 */
const premiumCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function isUserPremium(userId) {
  // Check cache first
  const cached = premiumCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.isPremium;
  }

  // Fetch from database
  const supabaseAdmin = getSupabaseAdminClient();

  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('is_premium, subscription_status')
      .eq('id', userId)
      .single();

    if (error || !data) {
      console.error('Failed to check premium status:', error);
      return false; // Default to free tier on error
    }

    const isPremium = data.is_premium || data.subscription_status === 'active';

    // Cache result
    premiumCache.set(userId, {
      isPremium,
      timestamp: Date.now(),
    });

    return isPremium;
  } catch (error) {
    console.error('Exception checking premium status:', error);
    return false;
  }
}

/**
 * Helper to create 429 response with rate limit headers
 */
export function createRateLimitResponse(rateLimitResult) {
  const resetDate = new Date(rateLimitResult.reset_at);
  const retryAfterSeconds = Math.ceil((resetDate - new Date()) / 1000);

  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      message: `You've reached your ${rateLimitResult.reason === 'burst_limit_exceeded' ? 'burst' : 'daily'} limit. Please try again later.`,
      limit: rateLimitResult.limit,
      current: rateLimitResult.current,
      reset_at: rateLimitResult.reset_at,
      retry_after: retryAfterSeconds,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': Math.max(0, rateLimitResult.limit - rateLimitResult.current).toString(),
        'X-RateLimit-Reset': rateLimitResult.reset_at,
        'Retry-After': retryAfterSeconds.toString(),
      },
    }
  );
}

/**
 * Middleware helper for Next.js API routes
 *
 * Usage:
 *   export async function POST(request) {
 *     const rateLimitCheck = await withRateLimit(request, 'transform-quest');
 *     if (rateLimitCheck) return rateLimitCheck; // Returns 429 response
 *
 *     // Continue with normal request handling
 *   }
 */
export async function withRateLimit(request, endpoint, options = {}) {
  // Extract user from request (assumes authentication already happened)
  const userId = options.userId || await getUserIdFromRequest(request);

  if (!userId) {
    // No user ID - skip rate limiting (will be caught by auth check)
    return null;
  }

  const rateLimitResult = await checkRateLimit(userId, endpoint, options);

  if (!rateLimitResult.allowed) {
    console.warn('Rate limit exceeded:', {
      userId,
      endpoint,
      current: rateLimitResult.current,
      limit: rateLimitResult.limit,
      reset_at: rateLimitResult.reset_at,
      timestamp: new Date().toISOString(),
    });

    return createRateLimitResponse(rateLimitResult);
  }

  // Rate limit passed
  return null;
}

/**
 * Extract user ID from request (helper)
 */
async function getUserIdFromRequest(request) {
  try {
    // Try Bearer token
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );
      const { data: { user } } = await supabase.auth.getUser(token);
      return user?.id;
    }

    // Try cookie-based auth (server components)
    // This requires more complex cookie parsing
    // For now, return null and let caller provide userId
    return null;
  } catch (error) {
    console.error('Error extracting user ID:', error);
    return null;
  }
}

/**
 * Clear rate limit for a user (admin function)
 *
 * Usage: For testing or support purposes
 */
export async function clearRateLimit(userId, endpoint) {
  const supabaseAdmin = getSupabaseAdminClient();

  try {
    const { error } = await supabaseAdmin
      .from('api_rate_limits')
      .delete()
      .eq('user_id', userId)
      .eq('endpoint', endpoint);

    if (error) {
      console.error('Failed to clear rate limit:', error);
      return { success: false, error: error.message };
    }

    // Clear premium cache too
    premiumCache.delete(userId);

    return { success: true };
  } catch (error) {
    console.error('Exception clearing rate limit:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get rate limit status for a user (for dashboard display)
 */
export async function getRateLimitStatus(userId) {
  const supabaseAdmin = getSupabaseAdminClient();

  try {
    const { data, error } = await supabaseAdmin
      .from('api_rate_limits')
      .select('*')
      .eq('user_id', userId)
      .gte('window_start', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('window_start', { ascending: false });

    if (error) {
      console.error('Failed to get rate limit status:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Exception getting rate limit status:', error);
    return [];
  }
}

// Export configuration for reference
export { RATE_LIMITS };
