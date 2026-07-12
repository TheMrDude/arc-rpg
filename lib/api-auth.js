import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseAdminClient, getSupabaseAnonClient } from './supabase-server';

// Admin client with service role (for database operations)
const supabaseAdmin = getSupabaseAdminClient();

// Regular client with anon key (for JWT verification)
const supabaseAnon = getSupabaseAnonClient();

/**
 * HYBRID AUTHENTICATION
 * Authenticate user from either Authorization header (Bearer token) or cookies
 *
 * Supports:
 * - Bearer tokens (from localStorage, mobile apps, API clients)
 * - HttpOnly cookies (from SSR, browser sessions)
 *
 * This makes the API compatible with both client-side and server-side auth
 */
export async function authenticateRequest(request) {
  // Try Authorization header first (Bearer token from localStorage/API clients)
  const authHeader = request.headers.get('Authorization');

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);

    // IMPORTANT: Use anon key to verify JWT tokens, not service role
    const { data, error } = await supabaseAnon.auth.getUser(token);

    if (!error && data.user) {
      return { user: data.user, error: null };
    }
  }

  // Fallback to cookie-based auth (for SSR and HttpOnly cookies)
  // supabase-js's createClient() silently ignores a `cookies` option — it
  // only exists on createServerClient() from @supabase/ssr. Using the wrong
  // one here meant this fallback always failed and never authenticated
  // cookie-only requests.
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {}, // read-only in API routes
        },
      }
    );

    const { data: { user }, error } = await supabase.auth.getUser();

    if (!error && user) {
      return { user, error: null };
    }
  } catch (cookieError) {
    // Cookie auth failed
  }

  return { user: null, error: 'Unauthorized' };
}

/**
 * Check if user has Pro access.
 *
 * Must match the dashboard's definition of Pro: is_premium covers founder
 * and comped accounts that have no active Stripe subscription. A PRO badge
 * in the UI and a 403 from the API for the same user is a bug, not a plan.
 */
export async function checkPremiumStatus(userId) {
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('is_premium, subscription_status, subscription_tier')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error checking premium status:', error);
    return { isPremium: false, error };
  }

  return {
    isPremium:
      profile?.is_premium === true ||
      profile?.subscription_status === 'active' ||
      profile?.subscription_tier === 'pro',
    error: null
  };
}

/**
 * Get admin Supabase client
 */
export function getSupabaseAdmin() {
  return supabaseAdmin;
}
