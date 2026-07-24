// ─── Second Wind: streak state machine ──────────────────────────────
// Replaces the old binary streak + flat "+20 comeback" logic with three
// states — HEALTHY, WOUNDED, RESET — layered onto the EXISTING global
// profile streak (profiles.current_streak / longest_streak /
// last_quest_date). This module is pure and timezone-aware; the API route
// and the nudge cron both derive state from it so there is one source of
// truth.
//
// Anti-shame contract: a miss never deletes earned progress noisily. A
// WOUNDED streak is "hurt but alive"; a RESET keeps longest_streak on the
// books and starts a fresh run. No copy in this layer says "failed".

// Every tunable lives here (spec §5). Callers may pass an override object
// to any function; tests exercise non-default windows/cooldowns this way.
export const SECOND_WIND_CONFIG = Object.freeze({
  windowHours: 48, // recovery window after the first missed day
  multiplier: 1.5, // XP multiplier on the recovering completion
  cooldownDays: 7, // max one Second Wind per rolling N days
  defaultTimeZone: 'UTC',
});

export const STREAK_STATE = Object.freeze({
  HEALTHY: 'healthy',
  WOUNDED: 'wounded',
  RESET: 'reset',
});

// ─── Timezone-aware day math (no external deps; uses Intl) ───────────

function toDate(value) {
  return value instanceof Date ? value : new Date(value);
}

// Calendar day (YYYY-MM-DD) for an instant, as seen in `timeZone`.
export function dayKeyInTimeZone(date, timeZone) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: timeZone || 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(toDate(date)); // 'YYYY-MM-DD'
}

// Whole calendar days between two instants in `timeZone`. Diffing the two
// day-keys in UTC-day space is exact and immune to DST hour drift.
export function calendarDayDiff(from, to, timeZone) {
  const a = Date.parse(`${dayKeyInTimeZone(from, timeZone)}T00:00:00Z`);
  const b = Date.parse(`${dayKeyInTimeZone(to, timeZone)}T00:00:00Z`);
  return Math.round((b - a) / 86400000);
}

// Offset (ms) between wall-clock time in `timeZone` and UTC at `date`.
// Positive east of UTC. Standard Intl technique.
function timeZoneOffsetMs(date, timeZone) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: timeZone || 'UTC',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const map = {};
  for (const part of dtf.formatToParts(date)) map[part.type] = part.value;
  const hour = map.hour === '24' ? '00' : map.hour; // some engines emit '24'
  const asUTC = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(hour),
    Number(map.minute),
    Number(map.second)
  );
  return asUTC - toDate(date).getTime();
}

// The UTC instant of local midnight for a given YYYY-MM-DD in `timeZone`.
// DST-safe: re-checks the offset after the first correction so a day that
// begins on a DST transition still resolves to the correct instant.
export function startOfDayInTimeZone(dayKey, timeZone) {
  const utcGuess = new Date(`${dayKey}T00:00:00Z`);
  const offset = timeZoneOffsetMs(utcGuess, timeZone);
  let result = new Date(utcGuess.getTime() - offset);
  const offset2 = timeZoneOffsetMs(result, timeZone);
  if (offset2 !== offset) {
    result = new Date(utcGuess.getTime() - offset2);
  }
  return result;
}

// Shift a YYYY-MM-DD day-key by n days (exact in UTC-day space).
function addDaysToKey(dayKey, n) {
  const base = Date.parse(`${dayKey}T00:00:00Z`);
  return dayKeyInTimeZone(new Date(base + n * 86400000), 'UTC');
}

// When the recovery window closes. The first missed day is the calendar
// day after the last active day; the window opens at that day's local
// midnight and lasts `windowHours` of real time (so DST is handled — we
// anchor to local midnight, then add an absolute duration).
export function recoveryWindowExpiry(lastQuestDate, timeZone, config = SECOND_WIND_CONFIG) {
  const lastKey = dayKeyInTimeZone(lastQuestDate, timeZone);
  const firstMissedKey = addDaysToKey(lastKey, 1);
  const firstMissedMidnight = startOfDayInTimeZone(firstMissedKey, timeZone);
  return new Date(firstMissedMidnight.getTime() + config.windowHours * 3600000);
}

// One Second Wind per rolling `cooldownDays` (true rolling window, not
// calendar days). No prior use → always eligible.
export function cooldownEligible(secondWindLastUsedAt, now, config = SECOND_WIND_CONFIG) {
  if (!secondWindLastUsedAt) return true;
  const elapsed = toDate(now).getTime() - toDate(secondWindLastUsedAt).getTime();
  return elapsed >= config.cooldownDays * 86400000;
}

// ─── The state machine ──────────────────────────────────────────────

// Derive the CURRENT display state from persisted profile fields. Pure and
// side-effect free — safe to call on every dashboard/API read.
//
// profile: { last_quest_date, current_streak, longest_streak,
//            second_wind_last_used_at, timezone }
export function evaluateStreakState(profile, now = new Date(), config = SECOND_WIND_CONFIG) {
  const timeZone = profile.timezone || config.defaultTimeZone;
  const current = profile.current_streak || 0;
  const longest = profile.longest_streak || 0;
  const eligible = cooldownEligible(profile.second_wind_last_used_at, now, config);

  const base = {
    state: STREAK_STATE.HEALTHY,
    currentStreak: current,
    longestStreak: longest,
    windowExpiresAt: null,
    timeRemainingMs: null,
    secondWindEligible: eligible,
    timeZone,
  };

  if (!profile.last_quest_date) return base;

  const days = calendarDayDiff(profile.last_quest_date, now, timeZone);

  // Active today or yesterday → still healthy (today isn't a miss until it
  // ends; the user has all of today to stay HEALTHY).
  if (days <= 1) return base;

  const expiry = recoveryWindowExpiry(profile.last_quest_date, timeZone, config);
  const withinWindow = toDate(now).getTime() < expiry.getTime();

  // Exactly one missed day, still inside the window, and not on cooldown →
  // WOUNDED. Streak count is preserved (not zeroed) while wounded.
  if (eligible && withinWindow) {
    return {
      ...base,
      state: STREAK_STATE.WOUNDED,
      windowExpiresAt: expiry,
      timeRemainingMs: expiry.getTime() - toDate(now).getTime(),
    };
  }

  // Window expired, a second consecutive miss, or the Second Wind is on
  // cooldown → RESET. Current run is zero; longest survives.
  return {
    ...base,
    state: STREAK_STATE.RESET,
    currentStreak: 0,
  };
}

// Resolve what a completion right now does to the streak. Returns the new
// persisted values plus the XP multiplier and whether a Second Wind fired.
// The caller writes these onto the profile and feeds `multiplier` into the
// existing XP award path (it does NOT touch the leveling curve).
export function applyCompletion(profile, now = new Date(), config = SECOND_WIND_CONFIG) {
  const timeZone = profile.timezone || config.defaultTimeZone;
  const current = profile.current_streak || 0;
  const longest = profile.longest_streak || 0;
  const priorUsedAt = profile.second_wind_last_used_at || null;
  const priorCount = profile.second_wind_count || 0;

  const unchanged = (streak, extra = {}) => ({
    newStreak: streak,
    newState: STREAK_STATE.HEALTHY,
    longestStreak: Math.max(longest, streak),
    multiplier: 1,
    secondWindTriggered: false,
    secondWindUsedAt: priorUsedAt,
    secondWindCount: priorCount,
    windowExpiresAt: null,
    ...extra,
  });

  // Already completed something today → no streak change, no bonus.
  if (
    profile.last_quest_date &&
    calendarDayDiff(profile.last_quest_date, now, timeZone) === 0
  ) {
    return unchanged(current);
  }

  const pre = evaluateStreakState(profile, now, config);

  // WOUNDED recovery inside the window → the Second Wind. Streak preserved
  // and continued (+1 for today), 1.5x XP, cooldown stamped, count bumped.
  if (pre.state === STREAK_STATE.WOUNDED) {
    const newStreak = current + 1;
    return {
      newStreak,
      newState: STREAK_STATE.HEALTHY,
      longestStreak: Math.max(longest, newStreak),
      multiplier: config.multiplier,
      secondWindTriggered: true,
      secondWindUsedAt: toDate(now).toISOString(),
      secondWindCount: priorCount + 1,
      windowExpiresAt: null,
    };
  }

  // RESET → a brand-new run starts at 1. Longest is preserved.
  if (pre.state === STREAK_STATE.RESET) {
    return unchanged(1);
  }

  // HEALTHY (first ever completion, or a normal consecutive day) → +1.
  return unchanged(current + 1);
}
