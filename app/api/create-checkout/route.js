import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profile?.is_premium) {
      return NextResponse.json({ error: 'Already premium' }, { status: 400 });
    }

    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_premium', true);

    if (count >= 25) {
      return NextResponse.json({ error: 'All founder spots taken' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'ARC RPG Founder Access',
              description: 'Lifetime access - recurring quests, weekly AI stories, archetype switching, and all future features. Limited to 25 people.',
            },
            unit_amount: 4700,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
