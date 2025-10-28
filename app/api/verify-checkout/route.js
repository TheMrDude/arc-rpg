import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseAdminClient } from '@/lib/supabase-server';
import {
  FOUNDER_PLAN_METADATA,
  FOUNDER_PRICE,
  isFounderCheckoutSession,
} from '@/lib/founder-plan';

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

    const founderCheck = isFounderCheckoutSession(session);

    if (
      !founderCheck.metadataMatches ||
      !founderCheck.amountMatches ||
      !founderCheck.currencyMatches
    ) {
      console.error('Verify checkout: Session does not match founder product', {
        sessionId,
        metadata: founderCheck.metadata,
        amount: founderCheck.amount,
        currency: founderCheck.currency,
      });

      return NextResponse.json(
        {
          status: 'wrong_product',
          expected: {
            plan: FOUNDER_PLAN_METADATA.plan,
            transaction_type: FOUNDER_PLAN_METADATA.transactionType,
            amount: FOUNDER_PRICE.amount,
            currency: FOUNDER_PRICE.currency,
          },
          observed: {
            plan: founderCheck.metadata?.plan,
            transaction_type: founderCheck.metadata?.transaction_type,
            amount: founderCheck.amount,
            currency: founderCheck.currency,
          },
        },
        { status: 400 }
      );
    }

    const userId =
      session.client_reference_id ||
      session.metadata?.supabase_user_id ||
      session.metadata?.userId;

    if (!userId) {
      console.error('Verify checkout: Missing userId in session metadata', { sessionId });
      return NextResponse.json({ error: 'Missing user reference' }, { status: 400 });
    }

    const premiumSince = new Date().toISOString();

    const { error } = await supabase
      .from('profiles')
      .update({
        subscription_status: 'active',
        is_premium: true,
        premium_since: premiumSince,
        stripe_session_id: sessionId,
      })
      .eq('id', userId);

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
