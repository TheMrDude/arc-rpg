import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseAdminClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY');
}
const stripe = new Stripe(STRIPE_KEY, { apiVersion: '2024-06-20' });

const supabase = getSupabaseAdminClient();

export async function POST(request) {
  try {
    const { session_id: sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent', 'customer'],
    });

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ status: 'pending' });
    }

    const userId =
      session.client_reference_id ||
      session.metadata?.supabase_user_id ||
      session.metadata?.userId;

    if (!userId) {
      console.error('Verify checkout: Missing userId in session metadata', { sessionId });
      return NextResponse.json({ error: 'Missing user reference' }, { status: 400 });
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        subscription_status: 'active',
        is_premium: true,
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Verify checkout: DB update failed', {
        userId,
        error: error.message,
      });
      return NextResponse.json({ error: 'Failed to activate plan' }, { status: 500 });
    }

    return NextResponse.json({ status: 'active' });
  } catch (error) {
    console.error('Verify checkout error', {
      error: error?.message,
      stack: error?.stack,
    });
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
