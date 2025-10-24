import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Gold packages (matches the design from earlier)
const GOLD_PACKAGES = {
  starter: { gold: 1000, price: 199, name: 'Starter Pack' }, // $1.99
  bronze: { gold: 3500, price: 499, name: 'Bronze Pack' },   // $4.99
  silver: { gold: 8000, price: 999, name: 'Silver Pack' },   // $9.99 BEST VALUE
  gold: { gold: 20000, price: 1999, name: 'Gold Pack' },     // $19.99
  platinum: { gold: 50000, price: 3999, name: 'Platinum Pack' }, // $39.99
};

export async function POST(request) {
  try {
    // SECURITY: Authenticate via Bearer token
    const authHeader = request.headers.get('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      console.error('Gold purchase: No bearer token', {
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);

    if (authError || !user) {
      console.error('Gold purchase: Unauthorized', {
        error: authError?.message,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // SECURITY: Validate input
    const { package_id } = await request.json();

    if (!package_id || !GOLD_PACKAGES[package_id]) {
      return NextResponse.json({
        error: 'Invalid package',
        message: 'Package not found',
        valid_packages: Object.keys(GOLD_PACKAGES)
      }, { status: 400 });
    }

    const goldPackage = GOLD_PACKAGES[package_id];

    // Get user profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id, email')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get or create Stripe customer
    let customerId = profile.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || profile.email,
        metadata: {
          supabase_user_id: user.id,
        },
      });

      customerId = customer.id;

      // Save customer ID
      await supabaseAdmin
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    // SECURITY: Create checkout session for one-time payment
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${goldPackage.name} - ${goldPackage.gold.toLocaleString()} Gold`,
              description: `Purchase ${goldPackage.gold.toLocaleString()} gold coins for ARC RPG`,
              images: ['https://via.placeholder.com/300x300.png?text=Gold'], // Replace with actual image
            },
            unit_amount: goldPackage.price, // Amount in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment', // One-time payment, not subscription
      success_url: `${request.headers.get('origin')}/dashboard?gold_purchase=success`,
      cancel_url: `${request.headers.get('origin')}/shop?gold_purchase=cancelled`,
      metadata: {
        supabase_user_id: user.id,
        package_id: package_id,
        gold_amount: goldPackage.gold.toString(),
        transaction_type: 'gold_purchase',
      },
    });

    // Create pending purchase record
    await supabaseAdmin
      .from('gold_purchases')
      .insert({
        user_id: user.id,
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: 'pending', // Will be updated by webhook
        amount_usd: goldPackage.price,
        gold_amount: goldPackage.gold,
        package_name: goldPackage.name,
        payment_status: 'pending',
        gold_granted: false,
      });

    console.log('Gold purchase checkout created', {
      userId: user.id,
      packageId: package_id,
      goldAmount: goldPackage.gold,
      priceUSD: goldPackage.price / 100,
      sessionId: session.id,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      session_id: session.id,
      session_url: session.url,
      package: goldPackage,
    });

  } catch (error) {
    console.error('Gold purchase error:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      error: 'Internal server error',
      message: 'Failed to create checkout session'
    }, { status: 500 });
  }
}
