import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Create Stripe checkout session for $47 ONE-TIME payment
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment', // ONE-TIME, not subscription
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'HabitQuest Founder Access',
              description: 'Lifetime premium access. Limited to first 25 people.',
            },
            unit_amount: 4700, // $47.00
          },
          quantity: 1,
        },
      ],
      success_url: `${request.headers.get('origin')}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.headers.get('origin')}/pricing`,
      client_reference_id: userId,
      metadata: {
        userId: userId,
        plan: 'founder_lifetime',
      },
    });

    return NextResponse.json({ url: session.url });

  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to create checkout session'
    }, { status: 500 });
  }
}
