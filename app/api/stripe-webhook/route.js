import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Use service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', {
      error: err.message,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Handle successful checkout
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata.userId;

    if (!userId) {
      console.error('Webhook error: No userId in session metadata', {
        sessionId: session.id,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'No userId in metadata' }, { status: 400 });
    }

    // Verify payment was actually completed
    if (session.payment_status !== 'paid') {
      console.error('Webhook error: Payment not completed', {
        sessionId: session.id,
        userId,
        paymentStatus: session.payment_status,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 });
    }

    // Check if user is already premium (idempotency)
    const { data: profile, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('is_premium')
      .eq('id', userId)
      .single();

    if (fetchError) {
      console.error('Webhook error: Failed to fetch profile', {
        error: fetchError.message,
        userId,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (profile?.is_premium) {
      console.log('Webhook: User already premium, skipping upgrade', {
        userId,
        sessionId: session.id,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ received: true });
    }

    // Upgrade user to premium
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        is_premium: true,
        premium_since: new Date().toISOString(),
        stripe_session_id: session.id,
        stripe_customer_id: session.customer,
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Webhook error: Failed to upgrade user', {
        error: updateError.message,
        userId,
        sessionId: session.id,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Upgrade failed' }, { status: 500 });
    }

    console.log('Webhook: User successfully upgraded to premium', {
      userId,
      sessionId: session.id,
      amount: session.amount_total / 100,
      timestamp: new Date().toISOString(),
    });
  }

  return NextResponse.json({ received: true });
}
