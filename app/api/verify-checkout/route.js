import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseAdminClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_KEY) throw new Error('Missing STRIPE_SECRET_KEY');
const stripe = new Stripe(STRIPE_KEY, { apiVersion: '2024-06-20' });
const supabase = getSupabaseAdminClient();

export async function POST(request) {
  try {
    const { session_id } = await request.json();
    if (!session_id)
      return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });

    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['payment_intent'],
    });

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ status: 'pending' });
    }

    const plan = session.metadata?.plan;
    const currency = (session.currency || session.payment_intent?.currency || '').toLowerCase();
    const amount = session.amount_total ?? session.payment_intent?.amount_received ?? null;

    const isFounderCheckout =
      plan === 'founder_lifetime' &&
      currency === 'usd' &&
      session.mode === 'payment' &&
      typeof amount === 'number' &&
      amount === 250000;

    if (!isFounderCheckout) {
      console.error('Verify checkout: Session failed founder validation', {
        sessionId: session.id,
        plan,
        currency,
        amount,
      });
      return NextResponse.json({ error: 'Invalid session for founder upgrade' }, { status: 400 });
    }

    const userId =
      session.client_reference_id ||
      session.metadata?.userId ||
      session.metadata?.supabase_user_id;

    if (!userId) {
      return NextResponse.json({ error: 'Missing user reference' }, { status: 400 });
    }

    const { error } = await supabase
      .from('profiles')
      .update({ subscription_status: 'active', is_premium: true })
      .eq('user_id', userId);

    if (error) {
      return NextResponse.json({ error: 'Failed to activate plan' }, { status: 500 });
    }

    return NextResponse.json({ status: 'active' });
  } catch (e) {
    console.error('Verify checkout error', e);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
