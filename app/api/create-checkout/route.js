import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseAdminClient, getSupabaseAnonClient } from '@/lib/supabase-server';
import { getOrCreateProfile } from '@/lib/profile-service';
import { resolveRequestOrigin } from '@/lib/request-origin';
import { buildFounderCheckoutMetadata, buildFounderLineItem } from '@/lib/founder-plan';

export const dynamic = 'force-dynamic';

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_KEY) throw new Error('Missing STRIPE_SECRET_KEY');
const stripe = new Stripe(STRIPE_KEY, { apiVersion: '2024-06-20' });

const supabaseAdmin = getSupabaseAdminClient();
const supabaseAnon = getSupabaseAnonClient();

export async function POST(request) {
  try {
    const authHeader =
      request.headers.get('authorization') ?? request.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : null;

    if (!token)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);
    if (authError || !user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = user.id;

    const { profile, created: profileCreated } = await getOrCreateProfile(userId);
    if (profile?.subscription_status === 'active' || profile?.is_premium)
      return NextResponse.json({ error: 'Already premium' }, { status: 400 });

    let canClaim = true;

    const { data: claimResult, error: claimError } = await supabaseAdmin
      .rpc('claim_founder_spot', { user_id_param: userId });

    if (claimError) {
      const { count } = await supabaseAdmin
        .from('profiles')
        .select('*', { head: true, count: 'exact' })
        .eq('subscription_status', 'active');
      if ((count ?? 0) >= 25) canClaim = false;
    } else {
      const outcome = Array.isArray(claimResult) ? claimResult?.[0] : claimResult;
      if (!outcome?.can_claim) canClaim = false;
    }

    if (!canClaim)
      return NextResponse.json({ error: 'Founder spots full' }, { status: 400 });

    const origin = resolveRequestOrigin(request);
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [buildFounderLineItem()],
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing`,
      client_reference_id: userId,
      metadata: buildFounderCheckoutMetadata(userId),
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
