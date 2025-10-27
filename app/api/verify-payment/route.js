import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(request) {
  try {
    // SECURITY: Environment variable checks
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('MISSING ENV VAR: STRIPE_SECRET_KEY not set');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // SECURITY: Authenticate via Bearer token
    const authHeader = request.headers.get('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      console.error('Verify payment: No bearer token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);

    if (authError || !user) {
      console.error('Verify payment: Unauthorized access attempt', authError?.message);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // SECURITY FIX: Verify payment server-side by fetching from Stripe
    // This prevents users from faking payment success
    let stripeSession;
    try {
      stripeSession = await stripe.checkout.sessions.retrieve(sessionId);
    } catch (stripeError) {
      console.error('Verify payment: Stripe error', {
        error: stripeError.message,
        sessionId,
        userId: user.id,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({
        error: 'Invalid session ID',
        verified: false
      }, { status: 400 });
    }

    // Verify the session belongs to this user
    const sessionUserId = stripeSession.metadata?.userId || stripeSession.metadata?.supabase_user_id;

    if (sessionUserId !== user.id) {
      console.error('Verify payment: Session user mismatch', {
        sessionUserId,
        requestUserId: user.id,
        sessionId,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({
        error: 'Session does not belong to user',
        verified: false
      }, { status: 403 });
    }

    // Verify payment was completed
    if (stripeSession.payment_status !== 'paid') {
      return NextResponse.json({
        verified: false,
        status: 'pending',
        message: 'Payment not yet completed'
      });
    }

    // Get user profile to check premium status
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('is_premium, subscription_status, premium_since')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Verify payment: Profile fetch error', {
        error: profileError.message,
        userId: user.id,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({
        error: 'Database error',
        verified: false
      }, { status: 500 });
    }

    // Check if webhook has processed the payment
    const isPremium = profile.subscription_status === 'active' && profile.is_premium === true;

    return NextResponse.json({
      verified: true,
      isPremium,
      profile: {
        is_premium: profile.is_premium,
        subscription_status: profile.subscription_status,
        premium_since: profile.premium_since,
      },
      stripeSession: {
        id: stripeSession.id,
        payment_status: stripeSession.payment_status,
        amount_total: stripeSession.amount_total,
      }
    });

  } catch (error) {
    console.error('Verify payment error:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        error: 'Failed to verify payment',
        details: error.message,
        verified: false
      },
      { status: 500 }
    );
  }
}
