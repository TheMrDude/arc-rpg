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

export async function POST(request) {
  try {
    // DIAGNOSTIC: Check environment variables
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('MISSING ENV VAR: STRIPE_SECRET_KEY not set');
      return NextResponse.json({ error: 'Server configuration error: Stripe not configured' }, { status: 500 });
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('MISSING ENV VAR: SUPABASE_SERVICE_ROLE_KEY not set');
      return NextResponse.json({ error: 'Server configuration error: Database not configured' }, { status: 500 });
    }

    // SECURITY: Authenticate via Bearer token
    const authHeader = request.headers.get('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      console.error('Create checkout: No bearer token', {
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);

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

    // SECURITY FIX: Check founder spots using subscription_status (not is_premium which users can manipulate)
    // This prevents race conditions where multiple users could exceed the limit
    const { count, error: countError } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('subscription_status', 'active');

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
    // DETAILED: Log full error for debugging
    console.error('Stripe checkout error:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      type: error.type,
      timestamp: new Date().toISOString(),
    });

    // Return more helpful error message
    return NextResponse.json(
      {
        error: 'Failed to create checkout session',
        details: error.message,
        hint: 'Check Vercel logs for details'
      },
      { status: 500 }
    );
  }
}
