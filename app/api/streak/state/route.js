import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateRequest } from '@/lib/api-auth';
import { evaluateStreakState } from '@/lib/secondWind';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Validate an IANA timezone id via Intl (throws on unknown zones).
function isValidTimeZone(tz) {
  if (!tz || typeof tz !== 'string' || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * POST /api/streak/state — return the live streak state for the current
 * user (HEALTHY / WOUNDED / RESET), lazily derived from stored fields so
 * the WOUNDED recovery window and countdown are always current without a
 * completion having to run.
 *
 * Optional body { timezone } backfills profiles.timezone (captured
 * client-side from Intl) so day boundaries use the user's local calendar.
 *
 * Any drift between the derived state and the persisted columns is written
 * back, which is also how a passive RESET (window expired with no
 * completion) gets recorded for the nudge cron.
 */
export async function POST(request) {
  try {
    const { user, error: authError } = await authenticateRequest(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body = {};
    try {
      body = await request.json();
    } catch {
      // No body is fine — treat as a plain state read.
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('current_streak, longest_streak, last_quest_date, streak_state, streak_window_expires_at, second_wind_last_used_at, second_wind_count, timezone')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Capture / update the user's timezone if the client sent a valid one.
    if (body.timezone && isValidTimeZone(body.timezone) && body.timezone !== profile.timezone) {
      profile.timezone = body.timezone;
      await supabaseAdmin
        .from('profiles')
        .update({ timezone: body.timezone })
        .eq('id', user.id);
    }

    const now = new Date();
    const state = evaluateStreakState(profile, now);

    // Persist derived state when it drifts from what's stored, so the nudge
    // cron and other readers see a consistent value. A passive RESET also
    // zeroes current_streak here (longest_streak is untouched).
    const windowIso = state.windowExpiresAt ? state.windowExpiresAt.toISOString() : null;
    const storedWindowIso = profile.streak_window_expires_at
      ? new Date(profile.streak_window_expires_at).toISOString()
      : null;
    const patch = {};
    if (state.state !== profile.streak_state) patch.streak_state = state.state;
    if (windowIso !== storedWindowIso) patch.streak_window_expires_at = windowIso;
    if (state.state === 'reset' && (profile.current_streak || 0) !== 0) patch.current_streak = 0;
    if (Object.keys(patch).length > 0) {
      await supabaseAdmin.from('profiles').update(patch).eq('id', user.id);
    }

    return NextResponse.json({
      state: state.state,
      current_streak: state.currentStreak,
      longest_streak: state.longestStreak,
      window_expires_at: windowIso,
      time_remaining_ms: state.timeRemainingMs,
      second_wind_eligible: state.secondWindEligible,
      second_wind_count: profile.second_wind_count || 0,
      timezone: state.timeZone,
    });
  } catch (error) {
    console.error('Streak state error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
