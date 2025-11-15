import { createServerClient } from '@supabase/ssr';
import { NextResponse, NextRequest } from 'next/server';
import { cookies } from 'next/headers';

/**
 * AUTH CALLBACK ROUTE HANDLER
 *
 * Handles Supabase authentication callbacks for:
 * - Email confirmation (signup)
 * - Password reset
 * - Magic link sign-in
 * - OAuth providers
 *
 * Flow:
 * 1. User clicks link in email
 * 2. Supabase redirects to this route with code/token_hash
 * 3. Exchange code for session
 * 4. Check if user has completed onboarding (archetype exists)
 * 5. Redirect to /dashboard or /onboarding accordingly
 */

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);

  // Extract parameters from URL
  const code = requestUrl.searchParams.get('code');
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');
  const next = requestUrl.searchParams.get('next') || '/dashboard';
  const error = requestUrl.searchParams.get('error');
  const error_description = requestUrl.searchParams.get('error_description');

  console.log('Auth callback invoked:', {
    hasCode: !!code,
    hasTokenHash: !!token_hash,
    type,
    next,
    error,
  });

  // Handle errors from Supabase
  if (error) {
    console.error('Auth callback error from Supabase:', error, error_description);
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(error_description || error)}`,
        request.url
      )
    );
  }

  // Determine which auth parameter to use (code for PKCE, token_hash for legacy)
  const authToken = code || token_hash;

  if (!authToken) {
    console.error('No auth token (code or token_hash) provided');
    return NextResponse.redirect(
      new URL('/login?error=missing_auth_token', request.url)
    );
  }

  try {
    // Create Supabase server client with cookie handling
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            try {
              cookieStore.set({ name, value, ...options });
            } catch (error) {
              // Handle cookies in middleware edge runtime
              console.warn('Failed to set cookie:', name, error);
            }
          },
          remove(name: string, options: any) {
            try {
              cookieStore.set({ name, value: '', ...options });
            } catch (error) {
              console.warn('Failed to remove cookie:', name, error);
            }
          },
        },
      }
    );

    // Exchange auth token for session
    // Note: exchangeCodeForSession works for both PKCE codes and token_hash
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(authToken);

    if (exchangeError) {
      console.error('Error exchanging code for session:', exchangeError);
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent(exchangeError.message || 'confirmation_failed')}`,
          request.url
        )
      );
    }

    // Verify we have a valid user
    if (!data?.user) {
      console.error('No user data after successful token exchange');
      return NextResponse.redirect(
        new URL('/login?error=invalid_session', request.url)
      );
    }

    console.log('✅ Email confirmed for user:', data.user.email);

    // Check if user has completed onboarding by looking for archetype
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('archetype, email')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      // Profile might not exist yet, redirect to onboarding
      return NextResponse.redirect(
        new URL('/onboarding?confirmed=true', request.url)
      );
    }

    // Determine redirect destination based on onboarding status
    if (!profile || !profile.archetype) {
      console.log('User has no archetype, redirecting to onboarding');
      return NextResponse.redirect(
        new URL('/onboarding?confirmed=true', request.url)
      );
    }

    // User has completed onboarding, send to dashboard
    console.log('User has archetype:', profile.archetype, '→ redirecting to dashboard');
    return NextResponse.redirect(
      new URL('/dashboard?confirmed=true', request.url)
    );

  } catch (error: any) {
    console.error('Unexpected error in auth callback:', error);
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(error?.message || 'unexpected_error')}`,
        request.url
      )
    );
  }
}
