import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseAdminClient, getSupabaseAnonClient } from '@/lib/supabase-server';
import { getOrCreateProfile } from '@/lib/profile-service';
import { resolveRequestOrigin } from '@/lib/request-origin';
import {
  buildFounderCheckoutMetadata,
  buildFounderLineItem,
} from '@/lib/founder-plan';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY');
}

const stripe = new Stripe(STRIPE_KEY, {
  apiVersion: '2024-06-20',
});

const supabaseAdmin = getSupabaseAdminClient();
const supabaseAnon = getSupabaseAnonClient();

export async function POST(request) {
  try {
    // SECURITY: Authenticate via Bearer token
    const authHeader =
      request.headers.get('authorization') ?? request.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : null;

    if (!token) {
      console.error('Create checkout: No bearer token', {
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    const {
      profile,
      created: profileCreated,
      error: profileError,
    } = await getOrCreateProfile(userId);

    if (profileError) {
      console.error('Create checkout: Profile fetch error', {
        error: profileError.message,
        userId,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    if (profileCreated) {
      console.log('Create checkout: Auto-created missing profile row', {
        userId,
        timestamp: new Date().toISOString(),
      });
    }

    if (profile?.subscription_status === 'active' || profile?.is_premium) {
      return NextResponse.json({ error: 'Already premium' }, { status: 400 });
    }

    // SECURE: Use transaction-safe check for founder spots via RPC to avoid race conditions
    let canClaim = true;

    const { data: claimResult, error: claimError } = await supabaseAdmin
      .rpc('claim_founder_spot', { user_id_param: userId });

    if (claimError) {
      console.warn('Create checkout: Founder RPC unavailable, falling back to count', {
        error: claimError.message,
        userId,
        timestamp: new Date().toISOString(),
      });

      const { count, error: countError } = await supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('subscription_status', 'active');

      if (countError) {
        console.error('Create checkout: Count fallback failed', {
          error: countError.message,
          userId,
          timestamp: new Date().toISOString(),
        });
        return NextResponse.json({ error: 'Failed to check availability' }, { status: 500 });
      }

      const claimedCount = typeof count === 'number' ? count : 0;

      if (claimedCount >= 25) {
        canClaim = false;
      }
    } else {
      const outcome = Array.isArray(claimResult) ? claimResult?.[0] : claimResult;

      if (!outcome?.can_claim) {
        if (outcome?.failure_reason === 'already_premium') {
          return NextResponse.json({ error: 'Already premium' }, { status: 400 });
        }

        if (outcome?.failure_reason === 'sold_out') {
          return NextResponse.json({ error: 'All founder spots taken' }, { status: 400 });
        }

        canClaim = false;
      }
    }

    if (!canClaim) {
      return NextResponse.json({ error: 'Founder spots temporarily unavailable' }, { status: 400 });
    }

    let origin;
    try {
      origin = resolveRequestOrigin(request);
    } catch (originError) {
      console.error('Create checkout: Unable to resolve origin', {
        error: originError.message,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Site configuration error' }, { status: 500 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [buildFounderLineItem()],
      mode: 'payment',
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing`,
      client_reference_id: userId,
      metadata: buildFounderCheckoutMetadata(userId),
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
