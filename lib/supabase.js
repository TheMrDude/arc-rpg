import { createBrowserClient } from '@supabase/ssr';

/**
 * CLIENT-SIDE SUPABASE CLIENT (HYBRID AUTHENTICATION)
 *
 * This client supports both:
 * - localStorage (current - works with Bearer tokens)
 * - HttpOnly cookies (production-ready - better XSS protection)
 *
 * Current Mode: localStorage
 * - Session stored in browser localStorage
 * - Sent to API as Bearer token in Authorization header
 * - Compatible with mobile apps and API clients
 *
 * Production Mode (Optional): HttpOnly Cookies
 * - Session stored in secure HttpOnly cookies
 * - Automatically sent with requests
 * - Better protection against XSS attacks
 * - To enable: Configure Supabase project settings
 *
 * Both modes work with the hybrid API authentication system.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
