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
 * Authenticate user from either Authorization header (Bearer token) or cookies
 * This handles both client-side (localStorage/Bearer) and server-side (cookies) auth
 */
export async function authenticateRequest(request) {
  console.log('=== authenticateRequest called ===');

  // Try Authorization header first (for localStorage-based auth)
  const authHeader = request.headers.get('Authorization');
  console.log('Authorization header present:', !!authHeader);

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    console.log('Attempting JWT verification with token length:', token.length);

    // IMPORTANT: Use anon key to verify JWT tokens, not service role
    const { data, error } = await supabaseAnon.auth.getUser(token);

    if (error) {
      console.error('JWT verification error:', error);
    }

    if (!error && data.user) {
      console.log('✅ Auth successful via Bearer token for user:', data.user.id);
      return { user: data.user, error: null };
    }

    console.log('JWT verification failed, trying cookie fallback');
  }

  // Fallback to cookie-based auth (for SSR)
  console.log('Attempting cookie-based auth');
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
      console.log('✅ Auth successful via cookies for user:', user.id);
      return { user, error: null };
    }

    console.log('Cookie auth failed:', error);
  } catch (cookieError) {
    console.error('Cookie auth exception:', cookieError);
  }

  console.log('❌ All auth methods failed, returning Unauthorized');
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
