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
