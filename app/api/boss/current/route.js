import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateRequest } from '@/lib/api-auth';
import { getIsoWeekKey } from '@/lib/date-utils';
import { retireStaleBosses, getOrCreateWeeklyBoss } from '@/lib/bosses';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * GET /api/boss/current — this week's boss battle for the signed-in user.
 * Lazily retreats last week's unfinished boss (no penalty, it just slips
 * away into the mist) and spawns this week's boss if it doesn't exist.
 */
export async function GET(request) {
  try {
    const { user, error: authError } = await authenticateRequest(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const weekKey = getIsoWeekKey();

    // (a) Any 'active' boss from a previous week retreats. Nothing is lost.
    try {
      await retireStaleBosses(supabaseAdmin, user.id, weekKey);
    } catch (err) {
      console.error('Failed to retire stale bosses:', err);
    }

    // (b) Get or spawn this week's boss (HP scales with level)
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('level')
      .eq('id', user.id)
      .single();

    const row = await getOrCreateWeeklyBoss(
      supabaseAdmin,
      user.id,
      profile?.level || 1,
      weekKey
    );

    if (!row) {
      return NextResponse.json({ error: 'Failed to load boss' }, { status: 500 });
    }

    // (c) Days remaining in the ISO week, including today (Mon=1..Sun=7)
    const dayNum = new Date().getDay() || 7;
    const daysLeft = 8 - dayNum;

    return NextResponse.json({
      boss: {
        boss_id: row.boss_id,
        boss_name: row.boss_name,
        boss_icon: row.boss_icon,
        boss_flavor: row.boss_flavor,
        max_hp: row.max_hp,
        damage_dealt: row.damage_dealt,
        status: row.status,
        reward: row.reward || null,
      },
      week_key: weekKey,
      days_left: daysLeft,
    });
  } catch (error) {
    console.error('Boss current error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
