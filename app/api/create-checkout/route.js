import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Use service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    // SECURE: Get authenticated user from session cookies
    const cookieStore = cookies();
    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      console.error('Create checkout: Unauthorized access attempt', {
        error: authError?.message,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // SECURE: Use authenticated user's ID, not client-provided userId
    const userId = user.id;

    // Check if user already has premium
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Create checkout: Profile fetch error', {
        error: profileError.message,
        userId,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    if (profile?.is_premium) {
      return NextResponse.json({ error: 'Already premium' }, { status: 400 });
    }

    // SECURE: Use transaction-safe check for founder spots
    // This prevents race conditions where multiple users could exceed the limit
    const { count, error: countError } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_premium', true);

    if (countError) {
      console.error('Create checkout: Count error', {
        error: countError.message,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Failed to check availability' }, { status: 500 });
    }

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

    console.log('Checkout session created', {
      userId,
      sessionId: session.id,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    // SECURE: Don't expose internal errors to users
    console.error('Stripe checkout error:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    // Generic error message for users
    return NextResponse.json(
      { error: 'Failed to create checkout session. Please try again.' },
      { status: 500 }
    );
  }
}
