import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Admin client with service role (for database operations)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Regular client with anon key (for JWT verification)
const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

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
  try {
    const cookieStore = cookies();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
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
 * Check if user has active premium subscription
 */
export async function checkPremiumStatus(userId) {
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('subscription_status')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error checking premium status:', error);
    return { isPremium: false, error };
  }

  return {
    isPremium: profile?.subscription_status === 'active',
    error: null
  };
}

/**
 * Get admin Supabase client
 */
export function getSupabaseAdmin() {
  return supabaseAdmin;
}
