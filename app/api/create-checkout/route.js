import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { authenticateRequest } from '@/lib/api-auth';
import { getSupabaseAdminClient } from '@/lib/supabase-server';

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

    if (profile?.is_premium || profile?.subscription_status === 'active') {
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

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'HabitQuest Founder Access',
              description: `Lifetime premium access. ${reservationResult.remaining} of 25 spots remaining.`,
            },
            unit_amount: 4700, // $47.00 - server-side only!
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing`,
      client_reference_id: userId,
      metadata: {
        supabase_user_id: userId,  // FIX: Match webhook expectation
        transaction_type: 'premium_subscription',
        spots_remaining: reservationResult.remaining,
      },
      // Expire session after 30 minutes
      expires_at: Math.floor(Date.now() / 1000) + (30 * 60),
    });

    // Log successful checkout creation
    console.log('Stripe session created:', {
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
