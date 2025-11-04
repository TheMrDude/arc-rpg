import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(request) {
  console.log('=== CREATE CHECKOUT STARTED ===');

  try {
    // Check for Stripe key
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY is not set in environment variables');
      return NextResponse.json({
        error: 'Stripe configuration missing'
      }, { status: 500 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Parse request body
    const body = await request.json();
    console.log('Request body:', body);

    const { userId } = body;

    if (!userId) {
      console.error('No userId provided in request');
      return NextResponse.json({
        error: 'User ID required'
      }, { status: 400 });
    }

    console.log('Creating Stripe session for userId:', userId);

    // Get origin from headers
    const origin = request.headers.get('origin') || 'https://habitquest.dev';
    console.log('Using origin:', origin);

    // Create Stripe checkout session for $47 ONE-TIME payment
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
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
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing`,
      client_reference_id: userId,
      metadata: {
        userId: userId,
        plan: 'founder_lifetime',
      },
    });

    console.log('Stripe session created successfully:', session.id);
    console.log('Session URL:', session.url);

    return NextResponse.json({ url: session.url }, { status: 200 });

  } catch (error) {
    console.error('=== STRIPE CHECKOUT ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error type:', error.type);
    console.error('Error code:', error.code);
    console.error('Full error:', error);
    console.error('Stack trace:', error.stack);

    return NextResponse.json({
      error: error.message || 'Failed to create checkout session',
      details: {
        type: error.type,
        code: error.code,
      }
    }, { status: 500 });
  }
}
