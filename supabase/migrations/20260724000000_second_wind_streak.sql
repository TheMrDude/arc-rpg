-- ─── Second Wind streak mechanic ────────────────────────────────────
-- Adds three-state streak tracking (HEALTHY / WOUNDED / RESET) on top of
-- the existing global profile streak, plus the persisted fields the state
-- machine (lib/secondWind.js) and the nudge cron need. Anti-shame by
-- design: nothing here deletes earned history — longest_streak is kept and
-- backfilled for existing users.

-- 1. Profile columns -------------------------------------------------------
ALTER TABLE profiles
  -- Derived display state; the app recomputes it, this is the cached value.
  ADD COLUMN IF NOT EXISTS streak_state TEXT NOT NULL DEFAULT 'healthy',
  -- When the current 48h recovery window closes (null unless WOUNDED).
  ADD COLUMN IF NOT EXISTS streak_window_expires_at TIMESTAMPTZ,
  -- Cooldown anchor: last time a Second Wind recovery was granted.
  ADD COLUMN IF NOT EXISTS second_wind_last_used_at TIMESTAMPTZ,
  -- Lifetime Second Wind recoveries — queryable for the future "Phoenix"
  -- badge (survive X Second Winds).
  ADD COLUMN IF NOT EXISTS second_wind_count INTEGER NOT NULL DEFAULT 0,
  -- IANA timezone for day-boundary math; captured client-side on app load.
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC',
  -- Dedupe anchor for the single recovery-window nudge (one per window).
  ADD COLUMN IF NOT EXISTS second_wind_nudge_sent_at TIMESTAMPTZ;

-- Guard the state value.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_streak_state_check'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_streak_state_check
      CHECK (streak_state IN ('healthy', 'wounded', 'reset'));
  END IF;
END $$;

-- Helps the nudge cron scan only the users who could be mid-window.
CREATE INDEX IF NOT EXISTS idx_profiles_streak_window
  ON profiles (streak_window_expires_at)
  WHERE streak_window_expires_at IS NOT NULL;

-- 2. Second Wind event log ------------------------------------------------
-- One row per recovery. Redundant with second_wind_count but gives the
-- badge system and analytics an auditable, timestamped history to query.
CREATE TABLE IF NOT EXISTS second_wind_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  happened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  streak_preserved INTEGER NOT NULL DEFAULT 0, -- streak value carried through
  quest_id UUID
);

CREATE INDEX IF NOT EXISTS idx_second_wind_events_user
  ON second_wind_events (user_id, happened_at DESC);

ALTER TABLE second_wind_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'second_wind_events' AND policyname = 'Users can view own second wind events'
  ) THEN
    CREATE POLICY "Users can view own second wind events" ON second_wind_events
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;
-- Writes happen only via the service-role API route; no user INSERT policy.

-- 3. Backfill longest_streak from historical completions ------------------
-- Classic gaps-and-islands: the longest run of consecutive UTC calendar
-- days on which the user completed at least one quest. Only ever raises
-- longest_streak, never lowers it.
WITH days AS (
  SELECT user_id, (completed_at AT TIME ZONE 'UTC')::date AS day
  FROM quests
  WHERE completed = TRUE AND completed_at IS NOT NULL
  GROUP BY user_id, (completed_at AT TIME ZONE 'UTC')::date
),
islands AS (
  SELECT
    user_id,
    day,
    day - (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY day))::int AS grp
  FROM days
),
runs AS (
  SELECT user_id, grp, COUNT(*) AS run_len
  FROM islands
  GROUP BY user_id, grp
),
best AS (
  SELECT user_id, MAX(run_len) AS longest
  FROM runs
  GROUP BY user_id
)
UPDATE profiles p
SET longest_streak = GREATEST(COALESCE(p.longest_streak, 0), b.longest)
FROM best b
WHERE p.id = b.user_id;
