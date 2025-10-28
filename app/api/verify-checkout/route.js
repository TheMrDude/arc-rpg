import { NextResponse } from 'next/server';
import Stripe from 'stripe';
 codex/identify-security-risks-and-payment-issues-0brtde
import { getSupabaseAdminClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_KEY) throw new Error('Missing STRIPE_SECRET_KEY');
const stripe = new Stripe(STRIPE_KEY, { apiVersion: '2024-06-20' });
const supabase = getSupabaseAdminClient();

export async function POST(request) {
  try {
    const { session_id } = await request.json();
    if (!session_id) return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });

    const session = await stripe.checkout.sessions.retrieve(session_id, { expand: ['payment_intent'] });
    if (session.payment_status !== 'paid') return NextResponse.json({ status: 'pending' });

    const userId = session.client_reference_id || session.metadata?.userId || session.metadata?.supabase_user_id;
    if (!userId) return NextResponse.json({ error: 'Missing user reference' }, { status: 400 });

    const { error } = await supabase
      .from('profiles')
      .update({ subscription_status: 'active', is_premium: true })
      .eq('user_id', userId);
    if (error) return NextResponse.json({ error: 'Failed to activate plan' }, { status: 500 });

    return NextResponse.json({ status: 'active' });
  } catch (e) {
    console.error('Verify checkout error', e);

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
 main
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
