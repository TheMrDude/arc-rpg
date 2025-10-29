import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseAdminClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_KEY) throw new Error('Missing STRIPE_SECRET_KEY');

const stripe = new Stripe(STRIPE_KEY, { apiVersion: '2024-06-20' });
const supabaseAdmin = getSupabaseAdminClient();

export async function POST(request) {
  try {
    const { session_id } = await request.json();
    if (!session_id) {
      return NextResponse.json({ status: 'error', error: 'Missing session_id' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['customer', 'payment_intent'],
    });
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['payment_intent'],
    });
    if (session.payment_status !== 'paid')
      return NextResponse.json({ status: 'pending' });
    if (!session_id) return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });

codex/fix-critical-bug-in-verify-checkout-endpoint-qgrhj9
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['payment_intent'],
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

    const session = await stripe.checkout.sessions.retrieve(session_id, { expand: ['payment_intent'] });
    if (session.payment_status !== 'paid')
      return NextResponse.json({ status: 'pending' });

    const userId = session?.client_reference_id || session?.metadata?.supabase_user_id;
    if (!userId) {
      return NextResponse.json({ status: 'error', error: 'Missing user reference' }, { status: 400 });
    }
    const planMetadata = checkoutSession?.metadata?.plan;
    const transactionType = checkoutSession?.metadata?.transaction_type;
    const amountTotal = checkoutSession?.amount_total;
    const currency = checkoutSession?.currency;

    const qualifiesForFounderUpgrade =
      (planMetadata === 'founder_lifetime' || transactionType === 'founder_lifetime') &&
      currency === 'usd' &&
      typeof amountTotal === 'number' &&
      amountTotal >= 4700;

    if (checkoutSession.payment_status === 'paid' && qualifiesForFounderUpgrade) {
      const premiumSince = profile?.premium_since ?? new Date().toISOString();
    const userId =
      session.client_reference_id ||
      session.metadata?.userId ||
      session.metadata?.supabase_user_id;

    if (session.payment_status === 'paid') {
      const { error: upErr } = await supabaseAdmin
        .from('profiles')
        .update({
          subscription_status: 'active',
          is_premium: true,
          premium_since: new Date().toISOString(),
          last_payment_session_id: session_id,
        })
        .eq('id', userId);

      if (upErr) {
        console.error('Profile update failed:', upErr.message);
        return NextResponse.json({ status: 'error' }, { status: 500 });
      }
      return NextResponse.json({ status: 'active' });
    }

    if (session.status === 'open') {
      return NextResponse.json({ status: 'pending' });
    }

    return NextResponse.json({ status: 'error' }, { status: 400 });
  } catch (error) {
    console.error('Verify checkout error:', { msg: error?.message, stack: error?.stack });
    return NextResponse.json({ status: 'error' }, { status: 500 });
    if (checkoutSession.payment_status === 'paid') {
      console.error('Verify checkout: Paid session did not qualify for upgrade', {
        userId: user.id,
        sessionId,
        timestamp,
        planMetadata,
        transactionType,
        currency,
        amountTotal,
      });

      return NextResponse.json({ status: 'invalid_plan' }, { status: 403 });
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
codex/identify-security-risks-and-payment-issues
    });
    if (session.payment_status !== 'paid') return NextResponse.json({ status: 'pending' });

    const userId =
      session.client_reference_id ||
      session.metadata?.userId ||
      session.metadata?.supabase_user_id;
    if (!userId)
      return NextResponse.json({ error: 'Missing user reference' }, { status: 400 });
    if (!userId) return NextResponse.json({ error: 'Missing user reference' }, { status: 400 });

    const { error } = await supabase
      .from('profiles')
      .update({ subscription_status: 'active', is_premium: true })
      .eq('user_id', userId);
    if (error) return NextResponse.json({ error: 'Failed to activate plan' }, { status: 500 });

    return NextResponse.json({ status: 'active' });
  } catch (e) {
    console.error('Verify checkout error', e);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
