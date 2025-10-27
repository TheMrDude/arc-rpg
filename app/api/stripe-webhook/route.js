import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Use service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// SECURITY: Handle gold purchases (idempotent)
async function handleGoldPurchase(session, userId) {
  const paymentIntentId = session.payment_intent;
  const goldAmount = parseInt(session.metadata.gold_amount);
  const packageId = session.metadata.package_id;

  if (!goldAmount || goldAmount <= 0) {
    console.error('Webhook error: Invalid gold amount', {
      sessionId: session.id,
      userId,
      goldAmount,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json({ error: 'Invalid gold amount' }, { status: 400 });
  }

  // SECURITY: Check if gold already granted (idempotency)
  const { data: existingPurchase } = await supabaseAdmin
    .from('gold_purchases')
    .select('id, gold_granted')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .single();

  if (existingPurchase?.gold_granted) {
    console.log('Webhook: Gold already granted for this payment, skipping', {
      userId,
      paymentIntentId,
      sessionId: session.id,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json({ received: true });
  }

  // Update purchase record with payment intent
  await supabaseAdmin
    .from('gold_purchases')
    .update({
      stripe_payment_intent_id: paymentIntentId,
      payment_status: 'completed',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_checkout_session_id', session.id);

  // SECURITY: Grant gold using atomic transaction
  const { data: goldTransaction, error: goldError } = await supabaseAdmin
    .rpc('process_gold_transaction', {
      p_user_id: userId,
      p_amount: goldAmount,
      p_transaction_type: 'gold_purchase',
      p_reference_id: existingPurchase?.id || null,
      p_metadata: {
        package_id: packageId,
        stripe_session_id: session.id,
        stripe_payment_intent: paymentIntentId,
        amount_usd: session.amount_total / 100,
      }
    });

  if (goldError) {
    console.error('Webhook error: Failed to grant gold', {
      error: goldError.message,
      userId,
      goldAmount,
      sessionId: session.id,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json({ error: 'Failed to grant gold' }, { status: 500 });
  }

  // Mark gold as granted
  await supabaseAdmin
    .from('gold_purchases')
    .update({
      gold_granted: true,
      granted_at: new Date().toISOString(),
    })
    .eq('stripe_checkout_session_id', session.id);

  const result = goldTransaction?.[0];

  console.log('Webhook: Gold successfully granted', {
    userId,
    goldAmount,
    newBalance: result?.new_balance,
    packageId,
    sessionId: session.id,
    amountUSD: session.amount_total / 100,
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json({ received: true, gold_granted: goldAmount });
}

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
    const userId = session.metadata.supabase_user_id || session.metadata.userId;
    const transactionType = session.metadata.transaction_type;

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

    // SECURITY: Handle gold purchases separately from subscriptions
    if (transactionType === 'gold_purchase') {
      return await handleGoldPurchase(session, userId);
    }

    // Handle premium subscription (original code)
    // Check if user is already premium (idempotency)
    const { data: profile, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('subscription_status')
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

    if (profile?.subscription_status === 'active') {
      console.log('Webhook: User already premium, skipping upgrade', {
        userId,
        sessionId: session.id,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ received: true });
    }

    // SECURITY FIX: Upgrade user to premium - set BOTH subscription_status AND is_premium
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        subscription_status: 'active',
        is_premium: true,  // CRITICAL FIX: Must set this for payment success to work
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
