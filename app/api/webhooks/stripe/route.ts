import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY not configured');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env vars');
  return createClient(url, key);
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // ─── checkout.session.completed ────────────────────────────────────
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const transactionType = session.metadata?.transaction_type;

    // ── Founders Lifetime one-time payment ──────────────────────────
    // A $47 one-time purchase (mode: 'payment'). Grant permanent Pro via the
    // idempotent RPC, keyed by session id — a re-delivered event cannot grant
    // twice or consume a second spot. Entitlement is is_premium (not
    // subscription_status), so a lifetime buyer never lapses.
    if (transactionType === 'founder_lifetime') {
      if (session.payment_status !== 'paid') {
        // Not actually paid — do nothing. Expiry/abandonment is handled by the
        // checkout.session.expired branch below, which restores the spot.
        return NextResponse.json({ received: true });
      }

      const userId =
        (session.client_reference_id as string | null) ||
        session.metadata?.supabase_user_id;

      if (!userId) {
        console.error('Webhook: founder_lifetime session has no user reference', {
          sessionId: session.id,
        });
        return NextResponse.json({ error: 'No user reference' }, { status: 400 });
      }

      const { data, error } = await supabase.rpc('grant_founder_lifetime', {
        p_session_id: session.id,
        p_user_id: userId,
        p_customer_id: typeof session.customer === 'string' ? session.customer : null,
      });

      if (error) {
        console.error('Webhook: grant_founder_lifetime failed', {
          error: error.message,
          userId,
          sessionId: session.id,
        });
        return NextResponse.json({ error: 'Founder grant failed' }, { status: 500 });
      }

      const result = Array.isArray(data) ? data[0] : data;
      console.log('Webhook: founder lifetime processed', {
        userId,
        sessionId: session.id,
        granted: result?.granted,
        alreadyProcessed: result?.already_processed,
      });
      return NextResponse.json({ received: true });
    }

    if (session.mode !== 'subscription') {
      // Not a subscription checkout — let other webhook handlers deal with it
      return NextResponse.json({ received: true });
    }

    const customerEmail = session.customer_details?.email || session.customer_email;
    const stripeCustomerId = session.customer as string;
    const stripeSubscriptionId = session.subscription as string;

    if (!customerEmail) {
      console.error('Webhook: No email in checkout session', { sessionId: session.id });
      return NextResponse.json({ error: 'No email' }, { status: 400 });
    }

    // Find user in Supabase auth by email
    const { data: authUsers } = await supabase.auth.admin.listUsers() as { data: { users: Array<{ id: string; email?: string }> } };
    const matchedUser = authUsers?.users?.find(
      (u: { id: string; email?: string }) => u.email?.toLowerCase() === customerEmail.toLowerCase()
    );

    if (!matchedUser) {
      console.error('Webhook: No Supabase user found for email', { email: customerEmail });
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Upgrade to pro
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        subscription_tier: 'pro',
        subscription_status: 'active',
        is_premium: true,
        premium_since: new Date().toISOString(),
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
      })
      .eq('id', matchedUser.id);

    if (updateError) {
      console.error('Webhook: Failed to upgrade user', {
        userId: matchedUser.id,
        error: updateError.message,
      });
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }

    console.log('Webhook: User upgraded to pro', {
      userId: matchedUser.id,
      email: customerEmail,
      subscriptionId: stripeSubscriptionId,
    });
  }

  // ─── checkout.session.expired ──────────────────────────────────────
  // A founder checkout that was abandoned or timed out. Give the reserved spot
  // back so an abandoned cart never permanently burns inventory. Idempotent:
  // restore_founder_checkout only acts on a still-'reserved' session, so a
  // duplicate delivery — or an expiry arriving after a (paid) grant — is a no-op.
  if (event.type === 'checkout.session.expired') {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.metadata?.transaction_type === 'founder_lifetime') {
      const { data, error } = await supabase.rpc('restore_founder_checkout', {
        p_session_id: session.id,
      });

      if (error) {
        console.error('Webhook: restore_founder_checkout failed', {
          error: error.message,
          sessionId: session.id,
        });
        return NextResponse.json({ error: 'Restore failed' }, { status: 500 });
      }

      const result = Array.isArray(data) ? data[0] : data;
      console.log('Webhook: founder checkout expired', {
        sessionId: session.id,
        restored: result?.restored,
        remaining: result?.remaining,
      });
    }

    return NextResponse.json({ received: true });
  }

  // ─── customer.subscription.deleted ─────────────────────────────────
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;
    const stripeCustomerId = subscription.customer as string;

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', stripeCustomerId)
      .single();

    if (profile) {
      await supabase
        .from('profiles')
        .update({
          subscription_tier: 'free',
          subscription_status: 'canceled',
          is_premium: false,
          stripe_subscription_id: null,
        })
        .eq('id', profile.id);

      console.log('Webhook: Subscription canceled, reverted to free', {
        userId: profile.id,
        subscriptionId: subscription.id,
      });
    }
  }

  // ─── customer.subscription.updated ─────────────────────────────────
  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as Stripe.Subscription;
    const stripeCustomerId = subscription.customer as string;

    // If status changed to canceled or unpaid, revert to free
    if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', stripeCustomerId)
        .single();

      if (profile) {
        await supabase
          .from('profiles')
          .update({
            subscription_tier: 'free',
            subscription_status: 'canceled',
            is_premium: false,
            stripe_subscription_id: null,
          })
          .eq('id', profile.id);

        console.log('Webhook: Subscription status changed, reverted to free', {
          userId: profile.id,
          status: subscription.status,
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
