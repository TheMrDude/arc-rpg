export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseAdminClient, getSupabaseAnonClient } from '@/lib/supabase-server';
import { getOrCreateProfile } from '@/lib/profile-service';
import { resolveRequestOrigin } from '@/lib/request-origin';
import { buildFounderCheckoutMetadata, buildFounderLineItem } from '@/lib/founder-plan';

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_KEY) throw new Error('Missing STRIPE_SECRET_KEY');
const stripe = new Stripe(STRIPE_KEY, { apiVersion: '2024-06-20' });

const supabaseAdmin = getSupabaseAdminClient();
const supabaseAnon = getSupabaseAnonClient();

export async function POST(request) {
  try {
    // 1. AUTHENTICATE USER
    const authHeader =
      request.headers.get('authorization') ?? request.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : null;

    if (!token) {
      console.error('Create checkout: Missing Bearer token', { t: new Date().toISOString() });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      data: { user },
      error: authError,
    } = await supabaseAnon.auth.getUser(token);

    if (authError || !user) {
      console.error('Create checkout: Invalid token', {
        error: authError?.message,
        t: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

    // 2. CHECK USER PROFILE
    const { profile, created: profileCreated, error: profileError } =
      await getOrCreateProfile(userId);

    if (profileError) {
      console.error('Create checkout: Profile error', {
        userId,
        error: profileError.message,
        t: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    if (profileCreated) {
      console.log('Create checkout: Auto-created profile row', {
        userId,
        t: new Date().toISOString(),
      });
    }

    if (profile?.subscription_status === 'active' || profile?.is_premium) {
      return NextResponse.json({ error: 'Already premium' }, { status: 400 });
    }

    // 3. CLAIM FOUNDER SPOT (ATOMIC)
    const { data: claimResult, error: claimError } = await supabaseAdmin
      .rpc('claim_founder_spot', { user_id_param: userId });

    if (claimError) {
      console.error('Create checkout: Founder RPC failed', {
        userId,
        error: claimError.message,
        errorCode: claimError.code,
        t: new Date().toISOString(),
      });
      return NextResponse.json({
        error: 'Founder spots unavailable. Try again or contact support.',
      }, { status: 409 });
    }

    // Check RPC result
    const outcome = Array.isArray(claimResult) ? claimResult?.[0] : claimResult;

    console.log('Founder spot check result:', {
      userId,
      success: outcome?.success,
      remaining: outcome?.remaining,
      failureReason: outcome?.failure_reason,
      t: new Date().toISOString(),
    });

    if (!outcome?.success) {
      if (outcome?.failure_reason === 'already_premium') {
        return NextResponse.json({ error: 'Already premium' }, { status: 400 });
      }
      if (outcome?.failure_reason === 'sold_out') {
        return NextResponse.json({ error: 'All founder spots taken' }, { status: 400 });
      }
      return NextResponse.json({
        error: 'Cannot process request at this time.',
      }, { status: 400 });
    }

    // 4. RESOLVE ORIGIN
    let origin;
    try {
      origin = resolveRequestOrigin(request);
    } catch (e) {
      console.error('Create checkout: Origin resolution failed', {
        error: e?.message,
        t: new Date().toISOString(),
      });
      // Restore the spot if we can't proceed
      try {
        await supabaseAdmin.rpc('restore_founder_spot');
      } catch (restoreError) {
        console.error('Failed to restore spot:', restoreError.message);
      }
      return NextResponse.json({ error: 'Configuration error' }, { status: 500 });
    }

    // 5. CREATE STRIPE SESSION
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [buildFounderLineItem()],
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing`,
      client_reference_id: userId,
      metadata: buildFounderCheckoutMetadata(userId),
    });

    console.log('Checkout session created', {
      userId,
      sessionId: session.id,
      t: new Date().toISOString(),
    });

    return NextResponse.json({ url: session.url });

  } catch (error) {
    console.error('Stripe checkout error:', {
      error: error?.message,
      stack: error?.stack,
      t: new Date().toISOString(),
    });
    return NextResponse.json(
      { error: 'Failed to create checkout session. Please try again.' },
      { status: 500 },
    );
  }
}
