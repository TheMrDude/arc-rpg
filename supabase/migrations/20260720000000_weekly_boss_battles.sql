-- Weekly Boss Battles
--
-- One boss per user per ISO week. Every completed quest deals 1 damage; kill
-- it before the week ends for rewards. An unbeaten boss only ever "retreats"
-- at week's end — never damage to the player, never a loss, never guilt.
--
-- This table has been written by app code (lib/bosses.js, app/api/complete-quest,
-- app/api/boss/current) but was never captured in a committed migration. This
-- backfills the schema so a fresh environment has it. It is idempotent
-- (CREATE ... IF NOT EXISTS) and safe to run where the table already exists.
--
-- The Bossbreaker Legendary Badge reads this table (status = 'defeated') to
-- determine eligibility, so it needs to exist for that check to work.

CREATE TABLE IF NOT EXISTS weekly_boss_battles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- ISO week key (e.g. '2026-W30'), deterministic per user+week.
  week_key TEXT NOT NULL,
  boss_id TEXT NOT NULL,
  boss_name TEXT NOT NULL,
  boss_icon TEXT,
  boss_flavor TEXT,
  max_hp INTEGER NOT NULL DEFAULT 5,
  damage_dealt INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'defeated', 'retreated')),
  defeated_at TIMESTAMPTZ,
  -- Reward summary persisted on defeat: { gold, equipment, bonus_gold }.
  reward JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- One boss per user per week (also the race guard for concurrent creation).
  UNIQUE (user_id, week_key)
);

CREATE INDEX IF NOT EXISTS idx_weekly_boss_battles_user ON weekly_boss_battles(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_boss_battles_status
  ON weekly_boss_battles(user_id, status);

-- RLS: all writes happen through the service-role client (quest completion,
-- boss spawn/retire), which bypasses RLS. Users may READ their own boss rows;
-- there are deliberately no client INSERT/UPDATE/DELETE policies so damage and
-- rewards can only ever be written server-side.
ALTER TABLE weekly_boss_battles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own boss battles" ON weekly_boss_battles;
CREATE POLICY "Users can view their own boss battles"
  ON weekly_boss_battles FOR SELECT
  USING (auth.uid() = user_id);
