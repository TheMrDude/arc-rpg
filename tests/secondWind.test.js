/**
 * Second Wind streak state machine — pure unit tests.
 *
 * No API / DB / env needed (unlike the integration suites in tests/security).
 * Covers: state transitions, recovery-window expiry, cooldown enforcement,
 * timezone day boundaries + DST, and multi-day misses.
 */

const {
  SECOND_WIND_CONFIG,
  STREAK_STATE,
  dayKeyInTimeZone,
  calendarDayDiff,
  startOfDayInTimeZone,
  recoveryWindowExpiry,
  cooldownEligible,
  evaluateStreakState,
  applyCompletion,
} = require('../lib/secondWind');

const d = (iso) => new Date(iso);

// A UTC-based fixture so day math is easy to reason about.
function profile(overrides = {}) {
  return {
    last_quest_date: null,
    current_streak: 0,
    longest_streak: 0,
    second_wind_last_used_at: null,
    second_wind_count: 0,
    timezone: 'UTC',
    ...overrides,
  };
}

describe('timezone day helpers', () => {
  test('dayKeyInTimeZone respects the zone, not server UTC', () => {
    // 03:00 UTC is still the previous evening in New York (EDT, UTC-4).
    expect(dayKeyInTimeZone('2026-06-15T03:00:00Z', 'America/New_York')).toBe('2026-06-14');
    expect(dayKeyInTimeZone('2026-06-15T03:00:00Z', 'UTC')).toBe('2026-06-15');
  });

  test('late-night completion then after-midnight completion are different days', () => {
    // 23:30 local, then 00:30 local next day (NY). Crosses local midnight
    // → 1 day apart, even though only an hour of real time passed.
    const before = '2026-06-15T03:30:00Z'; // 2026-06-14 23:30 EDT
    const after = '2026-06-15T04:30:00Z'; // 2026-06-15 00:30 EDT
    expect(calendarDayDiff(before, after, 'America/New_York')).toBe(1);
  });

  test('two completions inside the same local day but across UTC midnight are the same day', () => {
    const a = '2026-06-15T03:00:00Z'; // 2026-06-14 23:00 EDT
    const b = '2026-06-15T03:59:00Z'; // 2026-06-14 23:59 EDT
    expect(calendarDayDiff(a, b, 'America/New_York')).toBe(0);
  });

  test('startOfDayInTimeZone resolves local midnight across a DST spring-forward', () => {
    // NY springs forward 2026-03-08. The 8th is still UTC-5 at 00:00 (before
    // the 02:00 jump); the 9th is UTC-4.
    expect(startOfDayInTimeZone('2026-03-08', 'America/New_York').toISOString())
      .toBe('2026-03-08T05:00:00.000Z');
    expect(startOfDayInTimeZone('2026-03-09', 'America/New_York').toISOString())
      .toBe('2026-03-09T04:00:00.000Z');
  });
});

describe('evaluateStreakState — transitions', () => {
  test('no history → HEALTHY', () => {
    const s = evaluateStreakState(profile(), d('2026-06-10T12:00:00Z'));
    expect(s.state).toBe(STREAK_STATE.HEALTHY);
  });

  test('completed today → HEALTHY', () => {
    const s = evaluateStreakState(
      profile({ last_quest_date: '2026-06-10T09:00:00Z', current_streak: 5 }),
      d('2026-06-10T12:00:00Z')
    );
    expect(s.state).toBe(STREAK_STATE.HEALTHY);
    expect(s.currentStreak).toBe(5);
  });

  test('completed yesterday, today still open → HEALTHY (not yet a miss)', () => {
    const s = evaluateStreakState(
      profile({ last_quest_date: '2026-06-09T12:00:00Z', current_streak: 5 }),
      d('2026-06-10T12:00:00Z')
    );
    expect(s.state).toBe(STREAK_STATE.HEALTHY);
  });

  test('exactly one missed day, inside window, eligible → WOUNDED with countdown', () => {
    const now = d('2026-06-10T12:00:00Z');
    const s = evaluateStreakState(
      profile({ last_quest_date: '2026-06-08T12:00:00Z', current_streak: 12 }),
      now
    );
    expect(s.state).toBe(STREAK_STATE.WOUNDED);
    expect(s.currentStreak).toBe(12); // preserved while wounded
    // Window opened 2026-06-09T00:00Z, closes +48h = 2026-06-11T00:00Z.
    expect(s.windowExpiresAt.toISOString()).toBe('2026-06-11T00:00:00.000Z');
    expect(s.timeRemainingMs).toBe(d('2026-06-11T00:00:00Z') - now);
  });

  test('window expired (two missed days) → RESET, longest preserved', () => {
    const s = evaluateStreakState(
      profile({ last_quest_date: '2026-06-07T12:00:00Z', current_streak: 12, longest_streak: 30 }),
      d('2026-06-10T12:00:00Z')
    );
    expect(s.state).toBe(STREAK_STATE.RESET);
    expect(s.currentStreak).toBe(0);
    expect(s.longestStreak).toBe(30);
  });

  test('multi-day miss → RESET', () => {
    const s = evaluateStreakState(
      profile({ last_quest_date: '2026-06-05T12:00:00Z', current_streak: 12 }),
      d('2026-06-10T12:00:00Z')
    );
    expect(s.state).toBe(STREAK_STATE.RESET);
  });
});

describe('cooldown guardrail (one Second Wind per rolling 7 days)', () => {
  test('a miss within cooldown skips WOUNDED and goes straight to RESET', () => {
    const s = evaluateStreakState(
      profile({
        last_quest_date: '2026-06-08T12:00:00Z', // d==2, would be WOUNDED
        current_streak: 12,
        second_wind_last_used_at: '2026-06-09T12:00:00Z', // used 1 day ago
      }),
      d('2026-06-10T12:00:00Z')
    );
    expect(s.state).toBe(STREAK_STATE.RESET);
  });

  test('cooldown clears exactly at the 7-day boundary', () => {
    expect(cooldownEligible('2026-06-03T12:00:00Z', d('2026-06-10T12:00:00Z'))).toBe(true);
    expect(cooldownEligible('2026-06-03T12:00:01Z', d('2026-06-10T12:00:00Z'))).toBe(false);
    expect(cooldownEligible(null, d('2026-06-10T12:00:00Z'))).toBe(true);
  });
});

describe('applyCompletion — award resolution', () => {
  test('first ever completion → streak 1, no bonus', () => {
    const r = applyCompletion(profile(), d('2026-06-10T12:00:00Z'));
    expect(r).toMatchObject({ newStreak: 1, newState: STREAK_STATE.HEALTHY, multiplier: 1, secondWindTriggered: false });
  });

  test('second completion same day → no change, no bonus', () => {
    const r = applyCompletion(
      profile({ last_quest_date: '2026-06-10T08:00:00Z', current_streak: 4 }),
      d('2026-06-10T20:00:00Z')
    );
    expect(r.newStreak).toBe(4);
    expect(r.multiplier).toBe(1);
    expect(r.secondWindTriggered).toBe(false);
  });

  test('consecutive day → streak + 1, HEALTHY', () => {
    const r = applyCompletion(
      profile({ last_quest_date: '2026-06-09T12:00:00Z', current_streak: 4 }),
      d('2026-06-10T12:00:00Z')
    );
    expect(r.newStreak).toBe(5);
    expect(r.multiplier).toBe(1);
  });

  test('WOUNDED recovery → Second Wind: streak preserved + continued, 1.5x, cooldown stamped, count bumped', () => {
    const now = d('2026-06-10T12:00:00Z');
    const r = applyCompletion(
      profile({ last_quest_date: '2026-06-08T12:00:00Z', current_streak: 12, longest_streak: 12, second_wind_count: 2 }),
      now
    );
    expect(r.secondWindTriggered).toBe(true);
    expect(r.newStreak).toBe(13); // preserved 12, +1 for today
    expect(r.newState).toBe(STREAK_STATE.HEALTHY);
    expect(r.multiplier).toBe(1.5);
    expect(r.secondWindUsedAt).toBe(now.toISOString());
    expect(r.secondWindCount).toBe(3); // queryable for the future Phoenix badge
    expect(r.longestStreak).toBe(13);
  });

  test('RESET completion → new run at 1, longest preserved, no bonus', () => {
    const r = applyCompletion(
      profile({ last_quest_date: '2026-06-07T12:00:00Z', current_streak: 12, longest_streak: 30 }),
      d('2026-06-10T12:00:00Z')
    );
    expect(r.newStreak).toBe(1);
    expect(r.longestStreak).toBe(30);
    expect(r.multiplier).toBe(1);
    expect(r.secondWindTriggered).toBe(false);
  });

  test('miss within cooldown → RESET, no Second Wind (no double-dip)', () => {
    const r = applyCompletion(
      profile({
        last_quest_date: '2026-06-08T12:00:00Z',
        current_streak: 12,
        second_wind_last_used_at: '2026-06-09T12:00:00Z',
      }),
      d('2026-06-10T12:00:00Z')
    );
    expect(r.secondWindTriggered).toBe(false);
    expect(r.newStreak).toBe(1);
  });
});

describe('configurable tunables', () => {
  test('shorter window closes recovery sooner', () => {
    const config = { ...SECOND_WIND_CONFIG, windowHours: 24 };
    // d==2; with 24h window the recovery closed at 2026-06-10T00:00Z.
    const s = evaluateStreakState(
      profile({ last_quest_date: '2026-06-08T12:00:00Z', current_streak: 5 }),
      d('2026-06-10T12:00:00Z'),
      config
    );
    expect(s.state).toBe(STREAK_STATE.RESET);
  });

  test('custom multiplier is honored on recovery', () => {
    const config = { ...SECOND_WIND_CONFIG, multiplier: 2 };
    const r = applyCompletion(
      profile({ last_quest_date: '2026-06-08T12:00:00Z', current_streak: 5 }),
      d('2026-06-10T12:00:00Z'),
      config
    );
    expect(r.secondWindTriggered).toBe(true);
    expect(r.multiplier).toBe(2);
  });

  test('custom cooldown window', () => {
    const config = { ...SECOND_WIND_CONFIG, cooldownDays: 3 };
    // used 4 days ago → eligible again under a 3-day cooldown.
    expect(cooldownEligible('2026-06-06T12:00:00Z', d('2026-06-10T12:00:00Z'), config)).toBe(true);
  });
});

describe('DST-safe recovery window', () => {
  test('window is an absolute 48h anchored to local midnight across spring-forward', () => {
    // Last active 2026-03-07 (NY). First missed day = 03-08 (DST starts).
    // Local midnight 03-08 = 2026-03-08T05:00:00Z; +48h absolute.
    const expiry = recoveryWindowExpiry('2026-03-07T18:00:00Z', 'America/New_York');
    expect(expiry.toISOString()).toBe('2026-03-10T05:00:00.000Z');
  });
});
