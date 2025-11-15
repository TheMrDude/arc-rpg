import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16'
});

const GOLD_PACKAGES = {
  starter: {
    gold: 500,
    price: 2.99,
    name: 'Starter Pack',
    description: '500 gold - Skip a few hours of grinding'
  },
  adventurer: {
    gold: 1000,
    price: 4.99,
    name: 'Adventurer Pack',
    description: '1,000 gold - Get a head start on upgrades'
  },
  hero: {
    gold: 2500,
    price: 9.99,
    name: 'Hero Pack',
    description: '2,500 gold - Fast-track to mid-tier gear'
  },
  legend: {
    gold: 6000,
    price: 19.99,
    name: 'Legend Pack',
    description: '6,000 gold - Unlock legendary equipment faster'
  }
};

export async function POST(request) {
  try {
    // Authenticate user
    const { user, error: authError } = await authenticateRequest(request);
    if (authError || !user) {
      console.error('Gold purchase: Authentication failed', {
        error: authError,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const { package_type } = await request.json();

    if (!GOLD_PACKAGES[package_type]) {
      return NextResponse.json({ error: 'Invalid package type' }, { status: 400 });
    }

    const pkg = GOLD_PACKAGES[package_type];

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: pkg.name,
            description: pkg.description,
            images: ['https://habitquest.dev/gold-icon.png'] // You can add your own icon
          },
          unit_amount: Math.round(pkg.price * 100) // Convert to cents
        },
        quantity: 1
      }],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_URL || 'https://habitquest.dev'}/equipment?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL || 'https://habitquest.dev'}/equipment`,
      metadata: {
        user_id: user.id,
        package_type,
        gold_amount: pkg.gold.toString(),
        type: 'gold_purchase'
      },
      customer_email: user.email
    });

    console.log('Gold purchase checkout created', {
      userId: user.id,
      packageType: package_type,
      goldAmount: pkg.gold,
      sessionId: session.id,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      url: session.url,
      sessionId: session.id
    });

  } catch (error) {
    console.error('Gold purchase error:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      { error: 'Failed to create purchase session' },
      { status: 500 }
    );
  }
}
