import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * AUTH CALLBACK ROUTE
 *
 * Handles Supabase authentication callbacks for:
 * - Email confirmation
 * - Password reset
 * - Magic link sign-in
 * - OAuth providers
 *
 * This route exchanges the auth code from the URL for a proper session.
 */
export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const error_description = requestUrl.searchParams.get('error_description');

  // Handle errors from Supabase
  if (error) {
    console.error('Auth callback error:', error, error_description);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error_description || error)}`, request.url)
    );
  }

  // Exchange the code for a session
  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
          set(name, value, options) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name, options) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );

    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('Error exchanging code for session:', exchangeError);
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(exchangeError.message)}`, request.url)
      );
    }

    // Successfully confirmed email and got session
    if (data.user) {
      console.log('Email confirmed for user:', data.user.email);

      // Check if user has completed archetype selection
      const { data: profile } = await supabase
        .from('profiles')
        .select('archetype')
        .eq('id', data.user.id)
        .single();

      // Redirect to appropriate page
      if (!profile || !profile.archetype) {
        return NextResponse.redirect(new URL('/select-archetype?confirmed=true', request.url));
      } else {
        return NextResponse.redirect(new URL('/dashboard?confirmed=true', request.url));
      }
    }
  }

  // If no code and no error, redirect to home
  return NextResponse.redirect(new URL('/', request.url));
}
