import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseAdminClient, getSupabaseAnonClient } from '@/lib/supabase-server';
import { getOrCreateProfile } from '@/lib/profile-service';
import { resolveRequestOrigin } from '@/lib/request-origin';
 codex/identify-security-risks-and-payment-issues-fw2pni
import { buildFounderCheckoutMetadata, buildFounderLineItem } from '@/lib/founder-plan';

export const dynamic = 'force-dynamic';

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_KEY) throw new Error('Missing STRIPE_SECRET_KEY');

const stripe = new Stripe(STRIPE_KEY, { apiVersion: '2024-06-20' });


 codex/identify-security-risks-and-payment-issues-0brtde
import { buildFounderCheckoutMetadata, buildFounderLineItem } from '@/lib/founder-plan';

export const dynamic = 'force-dynamic';

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_KEY) throw new Error('Missing STRIPE_SECRET_KEY');
const stripe = new Stripe(STRIPE_KEY, { apiVersion: '2024-06-20' });

 main
const supabaseAdmin = getSupabaseAdminClient();
const supabaseAnon = getSupabaseAnonClient();

export async function POST(request) {
  try {
    // Auth via Bearer token
    const authHeader = request.headers.get('authorization') ?? request.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
    if (!token) {
    const authHeader =
      request.headers.get('authorization') ?? request.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : null;

    if (!token) {
      console.error('Create checkout: Missing Bearer token', { t: new Date().toISOString() });
    if (!token)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      data: { user },
      error: authError,
    } = await supabaseAnon.auth.getUser(token);
    if (authError || !user) {
 codex/identify-security-risks-and-payment-issues-fw2pni
      console.error('Create checkout: Invalid token', { error: authError?.message, t: new Date().toISOString() });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = user.id;

    // 2) Ensure profile & premium status
    const { profile, created: profileCreated, error: profileError } = await getOrCreateProfile(userId);
    if (profileError) {
      console.error('Create checkout: Profile error', { userId, error: profileError.message, t: new Date().toISOString() });
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }
    if (profileCreated) {
      console.log('Create checkout: Auto-created profile row', { userId, t: new Date().toISOString() });
    }

      console.error('Create checkout: Invalid token', {
        error: authError?.message,
        t: new Date().toISOString(),
      });
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = user.id;

    // Ensure profile exists and not already premium
    const { profile, created: profileCreated, error: profileError } = await getOrCreateProfile(userId);
    if (profileError) {
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }
    if (profile?.subscription_status === 'active' || profile?.is_premium) {
    const { profile, created: profileCreated, error: profileError } =
      await getOrCreateProfile(userId);
    const { profile, created: profileCreated, error: profileError } = await getOrCreateProfile(
      userId,
    );
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


    if (profileCreated) {
      console.log('Create checkout: Auto-created missing profile row', {
        userId,
        timestamp: new Date().toISOString(),
      });
    }

 main
main
    if (profile?.subscription_status === 'active' || profile?.is_premium) {
    const { profile, created: profileCreated } = await getOrCreateProfile(userId);
    if (profile?.subscription_status === 'active' || profile?.is_premium)
      return NextResponse.json({ error: 'Already premium' }, { status: 400 });
    }

    // Reserve founder spot via RPC; fallback to count
 codex/identify-security-risks-and-payment-issues-fw2pni
    // 3) Reserve founder spot (RPC first; safe fallback)
    let canClaim = true;


 codex/identify-security-risks-and-payment-issues-0brtde
    // 3) Reserve founder spot (RPC first; safe fallback)
    let canClaim = true;

    // SECURE: Use transaction-safe check for founder spots via RPC to avoid race conditions
    let claimOutcome;
 main

 main
    const { data: claimResult, error: claimError } = await supabaseAdmin
      .rpc('claim_founder_spot', { user_id_param: userId });
    // Reserve founder spot (RPC first; safe fallback)
    let canClaim = true;

    const { data: claimResult, error: claimError } = await supabaseAdmin.rpc(
      'claim_founder_spot',
      { user_id_param: userId },
    );

    if (claimError) {
      const { count, error: countError } = await supabaseAdmin
 codex/identify-security-risks-and-payment-issues-fw2pni
      console.warn('Create checkout: Founder RPC unavailable, falling back to count', { userId, error: claimError.message, t: new Date().toISOString() });

      const { count, error: countError } = await supabaseAdmin
        .from('profiles')
        .select('*', { head: true, count: 'exact' })
        .eq('subscription_status', 'active');

      if (countError) {
        console.error('Create checkout: Count fallback failed', { userId, error: countError.message, t: new Date().toISOString() });
        return NextResponse.json({ error: 'Failed to check availability' }, { status: 500 });
      }


      console.warn('Create checkout: Founder RPC unavailable, falling back to count', {
        userId,
        error: claimError.message,
        t: new Date().toISOString(),
      });

      const { count, error: countError } = await supabaseAdmin
        .from('profiles')
        .select('*', { head: true, count: 'exact' })
        .eq('subscription_status', 'active');

      if (countError) {
        console.error('Create checkout: Count fallback failed', {
          userId,
          error: countError.message,
          t: new Date().toISOString(),
        });
        return NextResponse.json({ error: 'Failed to check availability' }, { status: 500 });
      }

 codex/identify-security-risks-and-payment-issues-0brtde
 main
      const claimedCount = typeof count === 'number' ? count : 0;
      if (claimedCount >= 25) canClaim = false;
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

    // 4) Resolve origin for redirect URLs
    let origin;
    try {
      origin = resolveRequestOrigin(request);
    } catch (e) {
      console.error('Create checkout: Origin resolution failed', { error: e?.message, t: new Date().toISOString() });
      return NextResponse.json({ error: 'Site configuration error' }, { status: 500 });
    }

    // 5) Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
    }

    if (!canClaim) {
      return NextResponse.json({ error: 'Founder spots temporarily unavailable' }, { status: 400 });

      if (count >= 25) {
        return NextResponse.json({ error: 'All founder spots taken' }, { status: 400 });
      }
    } else {
      claimOutcome = claimResult?.[0];

      if (!claimOutcome?.can_claim) {
        if (claimOutcome?.failure_reason === 'already_premium') {
          return NextResponse.json({ error: 'Already premium' }, { status: 400 });
        }

        if (claimOutcome?.failure_reason === 'sold_out') {
          return NextResponse.json({ error: 'All founder spots taken' }, { status: 400 });
        }

        return NextResponse.json({ error: 'Founder spots temporarily unavailable' }, { status: 400 });
      }
    }

    let origin;
    try {
      origin = resolveRequestOrigin(request);
    } catch (e) {
      console.error('Create checkout: Origin resolution failed', {
        error: e?.message,
        t: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Site configuration error' }, { status: 500 });
    }
      const { count } = await supabaseAdmin
        .from('profiles')
        .select('*', { head: true, count: 'exact' })
        .eq('subscription_status', 'active');
      if (countError) {
        return NextResponse.json({ error: 'Failed to check availability' }, { status: 500 });
      }
      if ((count ?? 0) >= 25) {
        return NextResponse.json({ error: 'All founder spots taken' }, { status: 400 });
      }
    } else {
      const outcome = Array.isArray(claimResult) ? claimResult[0] : claimResult;
      if (!outcome?.can_claim) {
        if (outcome?.failure_reason === 'already_premium') {
          return NextResponse.json({ error: 'Already premium' }, { status: 400 });
        }
        if (outcome?.failure_reason === 'sold_out') {
          return NextResponse.json({ error: 'All founder spots taken' }, { status: 400 });
        }
        return NextResponse.json({ error: 'Founder spots temporarily unavailable' }, { status: 400 });
      }
    }

    // URLs
    let origin;
    try {
      origin = resolveRequestOrigin(request);
    } catch {
      return NextResponse.json({ error: 'Site configuration error' }, { status: 500 });
    }

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [buildFounderLineItem()],
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing`,
      client_reference_id: userId,
      metadata: buildFounderCheckoutMetadata(userId),
    });

    console.log('Checkout session created', { userId, sessionId: session.id, t: new Date().toISOString() });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', { msg: error?.message, stack: error?.stack });
  } catch (error) {
    console.error('Stripe checkout error:', { error: error?.message, stack: error?.stack, t: new Date().toISOString() });
    return NextResponse.json({ error: 'Failed to create checkout session. Please try again.' }, { status: 500 });
      client_reference_id: userId,
      metadata: buildFounderCheckoutMetadata(userId),

      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing`,
      client_reference_id: userId,
      metadata: {
        userId: userId,
        supabase_user_id: userId,
        plan: 'founder_lifetime',
      },
 main
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
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return NextResponse.json(
      { error: 'Failed to create checkout session. Please try again.' },
      { status: 500 }
    );
  }
}
