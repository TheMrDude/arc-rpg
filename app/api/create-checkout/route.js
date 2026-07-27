import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { authenticateRequest } from '@/lib/api-auth';
import { getSupabaseAdminClient } from '@/lib/supabase-server';
import { isPremium as resolveIsPremium } from '@/lib/premium';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  console.log('=== CREATE CHECKOUT STARTED ===');

  try {
    // SECURITY FIX: Authenticate user
    const { user, error: authError } = await authenticateRequest(request);

    if (authError || !user) {
      console.error('Checkout: Unauthorized attempt', {
        hasAuth: !!authError,
        timestamp: new Date().toISOString()
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // SECURITY FIX: Use authenticated user ID (don't trust client)
    const userId = user.id;

    // Check Stripe configuration
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY not configured');
      return NextResponse.json({
        error: 'Payment system unavailable'
      }, { status: 500 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const supabaseAdmin = getSupabaseAdminClient();

    console.log('Creating checkout for user:', userId);

    // SECURITY FIX: Check if user is already premium
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('is_premium, subscription_status')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Failed to fetch profile:', profileError);
      return NextResponse.json({
        error: 'Unable to verify account status'
      }, { status: 500 });
    }

    if (resolveIsPremium(profile)) {
      console.log('User already has premium access:', userId);
      return NextResponse.json({
        error: 'Already premium',
        message: 'You already have premium access'
      }, { status: 400 });
    }

    // SECURITY FIX: Reserve founder spot BEFORE creating Stripe session
    const { data: reservation, error: reservationError } = await supabaseAdmin
      .rpc('claim_founder_spot', { user_id_param: userId });

    if (reservationError) {
      console.error('Founder spot claim failed:', reservationError);
      return NextResponse.json({
        error: 'Unable to reserve founder spot'
      }, { status: 500 });
    }

    const reservationResult = reservation?.[0];

    if (!reservationResult?.success) {
      const reason = reservationResult?.failure_reason || 'unknown';

      if (reason === 'sold_out') {
        console.log('Founder spots sold out');
        return NextResponse.json({
          error: 'Sold out',
          message: 'All 25 founder spots have been claimed'
        }, { status: 410 });
      }

      if (reason === 'already_premium') {
        console.log('User already premium (race condition)');
        return NextResponse.json({
          error: 'Already premium',
          message: 'You already have premium access'
        }, { status: 400 });
      }

      console.error('Unknown founder spot claim failure:', reason);
      return NextResponse.json({
        error: 'Unable to reserve founder spot'
      }, { status: 500 });
    }

    console.log('Founder spot reserved, remaining:', reservationResult.remaining);

    // Get origin from headers
    const origin = request.headers.get('origin') || 'https://habitquest.dev';

    // Create Stripe checkout session for the one-time $47 Founders Lifetime
    // purchase. Reuses the existing live one-time price (HabitQuest – Founder
    // Access (Lifetime), CAD $47) so nothing new is created in Stripe and the
    // $5/mo and $29/yr wiring is untouched. mode: 'payment' (not 'subscription')
    // because there is no subscription behind a lifetime buyer.
    const founderPriceId =
      process.env.STRIPE_FOUNDER_LIFETIME_PRICE_ID || 'price_1SPMTlBFnAGLolxgQXw4f9yD';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{ price: founderPriceId, quantity: 1 }],
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing`,
      client_reference_id: userId,
      customer_email: user.email || undefined,
      metadata: {
        supabase_user_id: userId,          // webhook + verify-checkout read this
        transaction_type: 'founder_lifetime',
        spots_remaining: String(reservationResult.remaining),
      },
      payment_intent_data: {
        metadata: {
          supabase_user_id: userId,
          transaction_type: 'founder_lifetime',
        },
      },
      // Expire session after 30 minutes. On expiry the webhook restores the spot.
      expires_at: Math.floor(Date.now() / 1000) + (30 * 60),
    });

    // Record the reservation in the ledger so the webhook can idempotently grant
    // on payment or restore the spot on expiry, keyed by this session id. If this
    // fails we must NOT leave a claimed spot with no ledger row (restore-on-expiry
    // would then no-op and the spot would be burned), so roll the claim back.
    const { error: ledgerError } = await supabaseAdmin
      .from('founder_claims')
      .insert({ stripe_session_id: session.id, user_id: userId, status: 'reserved' });

    if (ledgerError) {
      console.error('Founder ledger insert failed, rolling back reservation:', {
        error: ledgerError.message,
        userId,
        sessionId: session.id,
        timestamp: new Date().toISOString(),
      });
      try {
        await stripe.checkout.sessions.expire(session.id);
      } catch (expireError) {
        console.error('Failed to expire orphaned session:', expireError);
      }
      await supabaseAdmin.rpc('restore_founder_spot');
      return NextResponse.json({
        error: 'Unable to reserve founder spot'
      }, { status: 500 });
    }

    // Log successful checkout creation
    console.log('Founder checkout session created:', {
      sessionId: session.id,
      userId,
      spotsRemaining: reservationResult.remaining,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      url: session.url,
      spots_remaining: reservationResult.remaining
    }, { status: 200 });

  } catch (error) {
    console.error('=== STRIPE CHECKOUT ERROR ===');
    console.error('Error:', error);

    // If Stripe session creation failed, restore the founder spot
    try {
      const supabaseAdmin = getSupabaseAdminClient();
      await supabaseAdmin.rpc('restore_founder_spot');
      console.log('Founder spot restored after error');
    } catch (restoreError) {
      console.error('Failed to restore founder spot:', restoreError);
      // This is serious - manual intervention may be needed
    }

    return NextResponse.json({
      error: 'Unable to create checkout session',
      message: 'Please try again later'
    }, { status: 500 });
  }
}
