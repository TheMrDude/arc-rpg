import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseAdminClient, getSupabaseAnonClient } from '@/lib/supabase-server';
import { getOrCreateProfile } from '@/lib/profile-service';

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabaseAdmin = getSupabaseAdminClient();
const supabaseAnon = getSupabaseAnonClient();

export async function POST(request) {
  const timestamp = new Date().toISOString();

  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    let checkoutSession;
    try {
      checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
    } catch (error) {
      if (error?.statusCode === 404) {
        return NextResponse.json({ status: 'not_found' }, { status: 404 });
      }

      console.error('Verify checkout: Stripe lookup failed', {
        error: error.message,
        sessionId,
        timestamp,
      });
      return NextResponse.json({ error: 'Stripe lookup failed' }, { status: 500 });
    }

    const expectedUserId =
      checkoutSession?.metadata?.supabase_user_id ||
      checkoutSession?.metadata?.userId ||
      checkoutSession?.client_reference_id;
    if (expectedUserId && expectedUserId !== user.id) {
      console.error('Verify checkout: Session user mismatch', {
        userId: user.id,
        expectedUserId,
        sessionId,
        timestamp,
      });
      return NextResponse.json({ status: 'session_mismatch' }, { status: 403 });
    }

    const {
      profile,
      created: profileCreated,
      error: profileError,
    } = await getOrCreateProfile(user.id);

    if (profileError) {
      console.error('Verify checkout: Failed to load profile', {
        error: profileError.message,
        userId: user.id,
        sessionId,
        timestamp,
      });
      return NextResponse.json({ error: 'Profile lookup failed' }, { status: 500 });
    }

    if (profileCreated) {
      console.log('Verify checkout: Auto-created missing profile row', {
        userId: user.id,
        sessionId,
        timestamp,
      });
    }

    if (profile?.subscription_status === 'active' && profile?.is_premium) {
      return NextResponse.json({
        status: 'activated',
        premiumSince: profile.premium_since,
        stripeSessionId: profile.stripe_session_id,
      });
    }

    const planMetadata = checkoutSession?.metadata ?? {};
    const isFounderCheckout =
      planMetadata.plan === 'founder_lifetime' ||
      planMetadata.transaction_type === 'founder_purchase';

    if (
      checkoutSession.payment_status === 'paid' &&
      !isFounderCheckout
    ) {
      console.error('Verify checkout: Paid session is not a founder purchase', {
        metadata: planMetadata,
        userId: user.id,
        sessionId,
        timestamp,
      });

      return NextResponse.json({
        status: 'wrong_product',
        paymentStatus: checkoutSession.payment_status,
      });
    }

    if (checkoutSession.payment_status === 'paid') {
      const premiumSince = profile?.premium_since ?? new Date().toISOString();

      const { error: upgradeError } = await supabaseAdmin
        .from('profiles')
        .update({
          subscription_status: 'active',
          is_premium: true,
          premium_since: premiumSince,
          stripe_session_id: sessionId,
          stripe_customer_id: checkoutSession.customer,
        })
        .eq('id', user.id);

      if (upgradeError) {
        console.error('Verify checkout: Failed to finalize premium upgrade', {
          error: upgradeError.message,
          userId: user.id,
          sessionId,
          timestamp,
        });
      } else {
        return NextResponse.json({
          status: 'activated',
          premiumSince,
          stripeSessionId: sessionId,
        });
      }

      return NextResponse.json({
        status: 'processing',
        paymentStatus: checkoutSession.payment_status,
      });
    }

    return NextResponse.json({
      status: 'pending',
      paymentStatus: checkoutSession.payment_status ?? 'unknown',
    });
  } catch (error) {
    console.error('Verify checkout error', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
