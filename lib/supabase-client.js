import { createBrowserClient } from '@supabase/ssr';

/**
 * CLIENT-SIDE SUPABASE CLIENT
 *
 * This client works in the browser and supports:
 * - localStorage for session storage (current implementation)
 * - Automatic session refresh
 * - Bearer token authentication
 *
 * For production with HttpOnly cookies, you can configure this client
 * to use cookies instead of localStorage for better XSS protection.
 */

let supabaseClient = null;

export function getSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  supabaseClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        // Current: Uses localStorage (works everywhere)
        // Production option: Configure to use HttpOnly cookies for better security
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    }
  );

  return supabaseClient;
}

// Export singleton instance for backward compatibility
export const supabase = getSupabaseClient();
