import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { getSupabaseAdminClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { user, error: authError } = await authenticateRequest(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdminClient();

    // Check if user already had a trial or is already pro
    const { data: profile } = await supabase
      .from('profiles')
      .select('trial_ends_at, subscription_tier, is_premium')
      .eq('id', user.id)
      .single();

    if (profile?.trial_ends_at) {
      return NextResponse.json({ error: 'Trial already used' }, { status: 400 });
    }

    if (profile?.is_premium || profile?.subscription_tier === 'pro') {
      return NextResponse.json({ error: 'Already Pro' }, { status: 400 });
    }

    // Start 7-day trial
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 7);

    await supabase
      .from('profiles')
      .update({
        trial_ends_at: trialEnd.toISOString(),
        subscription_tier: 'pro',
      })
      .eq('id', user.id);

    return NextResponse.json({
      success: true,
      trial_ends_at: trialEnd.toISOString(),
      message: 'Your 7-day Pro trial has started!'
    });
  } catch (error) {
    console.error('Trial start error:', error);
    return NextResponse.json({ error: 'Failed to start trial' }, { status: 500 });
  }
}
