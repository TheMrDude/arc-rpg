import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { getSupabaseAdminClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    // Authenticate user
    const { user, error: authError } = await authenticateRequest(request);
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdminClient();

    // Check if user is premium
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_premium, last_archetype_switch_date')
      .eq('id', user.id)
      .single();

    if (!profile?.is_premium) {
      return NextResponse.json(
        { error: 'Premium feature - upgrade to switch archetypes' },
        { status: 403 }
      );
    }

    // Check if user can switch (7 day cooldown)
    const lastSwitch = profile.last_archetype_switch_date
      ? new Date(profile.last_archetype_switch_date)
      : null;

    const now = new Date();
    const canSwitch = !lastSwitch || now - lastSwitch >= 7 * 24 * 60 * 60 * 1000;

    const nextSwitchDate = lastSwitch
      ? new Date(lastSwitch.getTime() + 7 * 24 * 60 * 60 * 1000)
      : now;

    return NextResponse.json({
      can_switch: canSwitch,
      next_switch_date: nextSwitchDate.toISOString(),
      last_switch_date: lastSwitch ? lastSwitch.toISOString() : null,
    });
  } catch (error) {
    console.error('Can switch archetype check error:', error);
    return NextResponse.json({ error: 'Failed to check switch eligibility' }, { status: 500 });
  }
}
