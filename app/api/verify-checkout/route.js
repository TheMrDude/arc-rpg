import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseAdminClient, getSupabaseAnonClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_KEY) throw new Error('Missing STRIPE_SECRET_KEY');
const stripe = new Stripe(STRIPE_KEY, { apiVersion: '2024-06-20' });
const supabaseAdmin = getSupabaseAdminClient();
const supabaseAnon = getSupabaseAnonClient();

export async function POST(request) {
  try {
    // SECURITY: Authenticate the request
    const authHeader = request.headers.get('authorization') ?? request.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;

    if (!token) {
      console.error('Verify checkout: Missing Bearer token', { t: new Date().toISOString() });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);
    if (authError || !user) {
      console.error('Verify checkout: Invalid token', {
        error: authError?.message,
        t: new Date().toISOString()
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authenticatedUserId = user.id;

    // Get session_id from request
    const { session_id } = await request.json();
    if (!session_id) {
      return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
    }

    // Retrieve Stripe session
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['payment_intent'],
    });

    // Check if payment is complete
    if (session.payment_status !== 'paid') {
      return NextResponse.json({ status: 'pending' });
    }

    // Get user ID from session
    const sessionUserId =
      session.client_reference_id ||
      session.metadata?.userId ||
      session.metadata?.supabase_user_id;

    if (!sessionUserId) {
      return NextResponse.json({ error: 'Missing user reference in session' }, { status: 400 });
    }

    // SECURITY: Verify the session belongs to the authenticated user
    if (sessionUserId !== authenticatedUserId) {
      console.error('Verify checkout: Session user mismatch', {
        authenticatedUserId,
        sessionUserId,
        sessionId: session_id,
        t: new Date().toISOString()
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if this payment was already processed (idempotency)
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('last_payment_session_id, subscription_status')
      .eq('id', authenticatedUserId)
      .single();

    if (existingProfile?.last_payment_session_id === session_id) {
      console.log('Verify checkout: Payment already processed', {
        userId: authenticatedUserId,
        sessionId: session_id,
        t: new Date().toISOString()
      });
      return NextResponse.json({ status: 'active' });
    }

    // Update profile with premium status
    // SECURITY FIX: Use 'id' column, not 'user_id'
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({
        subscription_status: 'active',
        is_premium: true,
        premium_since: existingProfile?.premium_since || new Date().toISOString(),
        last_payment_session_id: session_id,
      })
      .eq('id', authenticatedUserId);

    if (error) {
      console.error('Verify checkout: Failed to update profile', {
        error: error.message,
        userId: authenticatedUserId,
        t: new Date().toISOString()
      });
      return NextResponse.json({ error: 'Failed to activate plan' }, { status: 500 });
    }

    console.log('Verify checkout: Premium activated', {
      userId: authenticatedUserId,
      sessionId: session_id,
      t: new Date().toISOString()
    });

    return NextResponse.json({ status: 'active' });
  } catch (e) {
    console.error('Verify checkout error', {
      error: e.message,
      stack: e.stack,
      t: new Date().toISOString()
    });
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
