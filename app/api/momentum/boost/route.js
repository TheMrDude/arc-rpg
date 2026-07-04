import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateRequest, checkPremiumStatus } from '@/lib/api-auth';
import { getIsoWeekKey } from '@/lib/date-utils';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// One Momentum Boost per ISO week: counts as a virtual active day toward
// the 4/7 Momentum meter without requiring a quest completion. Replaces
// the old streak-freeze premium perk now that there's no streak to freeze.
export async function POST(request) {
  try {
    const { user, error: authError } = await authenticateRequest(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { isPremium } = await checkPremiumStatus(user.id);
    if (!isPremium) {
      return NextResponse.json(
        { error: 'Premium feature', message: 'Momentum Boost is a Pro feature.' },
        { status: 403 }
      );
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('momentum_boost_week')
      .eq('id', user.id)
      .single();

    const currentWeek = getIsoWeekKey();

    if (profile?.momentum_boost_week === currentWeek) {
      return NextResponse.json(
        { error: 'Already used', message: 'You already used this week\'s Momentum Boost.' },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ momentum_boost_week: currentWeek })
      .eq('id', user.id);

    if (updateError) {
      console.error('Failed to consume momentum boost:', updateError);
      return NextResponse.json({ error: 'Failed to use Momentum Boost' }, { status: 500 });
    }

    return NextResponse.json({ success: true, week: currentWeek });
  } catch (error) {
    console.error('Momentum boost error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
