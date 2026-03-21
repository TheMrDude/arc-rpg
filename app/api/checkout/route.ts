import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { authenticateRequest } from '@/lib/api-auth';
import { getSupabaseAdminClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const ALLOWED_PRICE_IDS = [
  process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
  process.env.STRIPE_PRO_YEARLY_PRICE_ID,
].filter(Boolean);

export async function POST(request: Request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Payment system unavailable' },
        { status: 500 }
      );
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const supabaseAdmin = getSupabaseAdminClient();

    // Authenticate user
    const { user, error: authError } = await authenticateRequest(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { priceId } = body;

    // Validate priceId against allowed values
    if (!priceId || !ALLOWED_PRICE_IDS.includes(priceId)) {
      return NextResponse.json(
        { error: 'Invalid price selected' },
        { status: 400 }
      );
    }

    // Check if user already has an active subscription
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_premium, subscription_status, subscription_tier, stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (profile?.subscription_tier === 'pro' && profile?.subscription_status === 'active') {
      return NextResponse.json(
        { error: 'Already subscribed', message: 'You already have a Pro subscription' },
        { status: 400 }
      );
    }

    const origin = request.headers.get('origin') || 'https://habitquest.dev';

    // Reuse existing Stripe customer if we have one
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing`,
      client_reference_id: user.id,
      metadata: {
        supabase_user_id: user.id,
        transaction_type: 'pro_subscription',
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
        },
      },
    };

    if (profile?.stripe_customer_id) {
      sessionParams.customer = profile.stripe_customer_id;
    } else {
      sessionParams.customer_email = user.email;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Unable to create checkout session' },
      { status: 500 }
    );
  }
}
