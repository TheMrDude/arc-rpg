import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseAdminClient } from '@/lib/supabase-server';
import { getOrCreateProfile } from '@/lib/profile-service';

// Force dynamic rendering to avoid build-time execution
export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Lazy initialization - client will be created when first needed
let supabaseAdmin = null;
function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    supabaseAdmin = getSupabaseAdminClient();
  }
  return supabaseAdmin;
}

// SECURITY: Handle gold purchases (idempotent)
async function handleGoldPurchase(session, userId) {
  const paymentIntentId = session.payment_intent;
  const goldAmount = parseInt(session.metadata.gold_amount);
  const packageType = session.metadata.package_type;
  const priceUSD = session.amount_total / 100;

  if (!goldAmount || goldAmount <= 0) {
    console.error('Webhook error: Invalid gold amount', {
      sessionId: session.id,
      userId,
      goldAmount,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json({ error: 'Invalid gold amount' }, { status: 400 });
  }

  // SECURITY: Check if purchase record exists (idempotency)
  const { data: existingPurchase } = await getSupabaseAdmin()
    .from('gold_purchases')
    .select('id, status')
    .eq('stripe_checkout_session_id', session.id)
    .single();

  if (existingPurchase?.status === 'completed') {
    console.log('Webhook: Gold already granted for this payment, skipping', {
      userId,
      purchaseId: existingPurchase.id,
      sessionId: session.id,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json({ received: true });
  }

  // Create or update purchase record
  let purchaseId = existingPurchase?.id;

  if (!existingPurchase) {
    const { data: newPurchase, error: insertError } = await getSupabaseAdmin()
      .from('gold_purchases')
      .insert({
        user_id: userId,
        package_type: packageType,
        gold_amount: goldAmount,
        price_usd: priceUSD,
        stripe_payment_intent_id: paymentIntentId,
        stripe_checkout_session_id: session.id,
        status: 'pending',
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Webhook error: Failed to create purchase record', {
        error: insertError.message,
        userId,
        sessionId: session.id,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Failed to create purchase record' }, { status: 500 });
    }

    purchaseId = newPurchase.id;
  }

  // SECURITY: Grant gold using atomic transaction
  const { data: goldTransaction, error: goldError } = await getSupabaseAdmin()
    .rpc('process_gold_transaction', {
      p_user_id: userId,
      p_amount: goldAmount,
      p_transaction_type: 'gold_purchase',
      p_reference_id: purchaseId,
      p_metadata: {
        package_type: packageType,
        stripe_session_id: session.id,
        stripe_payment_intent: paymentIntentId,
        amount_usd: priceUSD,
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

    // Mark purchase as failed
    await getSupabaseAdmin()
      .from('gold_purchases')
      .update({ status: 'failed' })
      .eq('id', purchaseId);

    return NextResponse.json({ error: 'Failed to grant gold' }, { status: 500 });
  }

  // Mark purchase as completed
  await getSupabaseAdmin()
    .from('gold_purchases')
    .update({
      status: 'completed',
      stripe_payment_intent_id: paymentIntentId,
    })
    .eq('id', purchaseId);

  const result = goldTransaction?.[0];

  console.log('Webhook: Gold successfully granted', {
    userId,
    goldAmount,
    newBalance: result?.new_balance,
    packageType,
    purchaseId,
    sessionId: session.id,
    amountUSD: priceUSD,
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
    const userId = session.metadata.user_id || session.metadata.supabase_user_id || session.metadata.userId;
    const transactionType = session.metadata.type || session.metadata.transaction_type;

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
    const {
      profile,
      created: profileCreated,
      error: profileError,
    } = await getOrCreateProfile(userId);

    if (profileError) {
      console.error('Webhook error: Failed to fetch profile', {
        error: profileError.message,
        userId,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (profileCreated) {
      console.log('Webhook: Auto-created missing profile row', {
        userId,
        sessionId: session.id,
        timestamp: new Date().toISOString(),
      });
    }

    if (profile?.subscription_status === 'active') {
      console.log('Webhook: User already premium, skipping upgrade', {
        userId,
        sessionId: session.id,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ received: true });
    }

    // Upgrade user to premium
    const { error: updateError } = await getSupabaseAdmin()
      .from('profiles')
      .update({
        subscription_status: 'active',
        premium_since: new Date().toISOString(),
        is_premium: true,
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
