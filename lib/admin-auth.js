/**
 * ADMIN AUTHENTICATION HELPER
 *
 * Simple email-based admin access control
 * Set ADMIN_EMAILS environment variable with comma-separated admin emails
 *
 * Example: ADMIN_EMAILS="admin@habitquest.com,founder@habitquest.com"
 */

import { createClient } from '@supabase/supabase-js';

const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/**
 * Check if authenticated user is an admin
 *
 * @param {Request} request - Next.js request object
 * @returns {Promise<{isAdmin: boolean, user: object|null, error: string|null}>}
 */
export async function checkAdminAuth(request) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return {
        isAdmin: false,
        user: null,
        error: 'No authorization header'
      };
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);

    if (authError || !user) {
      return {
        isAdmin: false,
        user: null,
        error: 'Invalid token'
      };
    }

    // Check if user email is in admin list OR if is_admin flag is set in database
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(e => e);
    const isEmailAdmin = adminEmails.length > 0 && adminEmails.includes(user.email);

    // Also check database is_admin column
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    const isDbAdmin = profile?.is_admin === true;
    const isAdmin = isEmailAdmin || isDbAdmin;

    if (!isAdmin) {
      console.warn('Unauthorized admin access attempt:', {
        email: user.email,
        userId: user.id,
        timestamp: new Date().toISOString()
      });
    }

    return {
      isAdmin,
      user,
      error: isAdmin ? null : 'Not authorized as admin'
    };
  } catch (error) {
    console.error('Admin auth error:', error);
    return {
      isAdmin: false,
      user: null,
      error: 'Authentication failed'
    };
  }
}

/**
 * Middleware wrapper for admin-only routes
 *
 * Usage:
 *   export async function GET(request) {
 *     const adminCheck = await requireAdmin(request);
 *     if (adminCheck.error) return adminCheck.error;
 *
 *     // Admin logic here...
 *   }
 */
export async function requireAdmin(request) {
  const { isAdmin, user, error } = await checkAdminAuth(request);

  if (!isAdmin) {
    return {
      error: new Response(
        JSON.stringify({
          error: 'Forbidden',
          message: error || 'Admin access required'
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      ),
      user: null
    };
  }

  return {
    error: null,
    user
  };
}
