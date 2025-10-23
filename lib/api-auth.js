import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Admin client with service role
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Authenticate user from either Authorization header (Bearer token) or cookies
 * This handles both client-side (localStorage/Bearer) and server-side (cookies) auth
 */
export async function authenticateRequest(request) {
  // Try Authorization header first (for localStorage-based auth)
  const authHeader = request.headers.get('Authorization');

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (!error && data.user) {
      return { user: data.user, error: null };
    }
  }

  // Fallback to cookie-based auth (for SSR)
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
    // Cookie auth failed, continue to error
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
