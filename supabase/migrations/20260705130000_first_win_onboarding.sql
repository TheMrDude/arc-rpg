-- First-Win Onboarding Sprint (2026-07-05)
-- 1. De-streak welcome_quest chain steps 3 & 7 (active days, not consecutive days)
-- 2. onboarding_events funnel instrumentation table + triggers

-- ────────────────────────────────────────────────────────────────────
-- 1) De-streak the Welcome Quest chain
-- Steps 3 and 7 required consecutive-day streaks, contradicting the
-- no-streaks momentum model. Rewards unchanged.
UPDATE quest_chain_steps SET
  title = 'Momentum Rising',
  description = 'Be active on 3 different days. They don''t need to be in a row.',
  story_text = 'Three days of showing up! The shopkeeper offers you a discount. Word of your dedication is spreading through the realm.'
WHERE chain_id = 'welcome_quest' AND step_number = 3;

UPDATE quest_chain_steps SET
  title = 'Hero Established',
  description = 'Be active on 7 different days. Miss days? Doesn''t matter. You showed up seven times.',
  story_text = 'The village erupts in celebration! Seven days of heroism — you have proven yourself. The realm stretches before you, full of adventures yet to come.'
WHERE chain_id = 'welcome_quest' AND step_number = 7;

-- Advancement is condition-driven (server-side evaluator), not timer-driven.
-- The step conditions themselves pace the chain (3 active days, 7 active days).
UPDATE quest_chain_steps SET time_gate_hours = 0 WHERE chain_id = 'welcome_quest';

-- ────────────────────────────────────────────────────────────────────
-- 2) Onboarding funnel events
-- One row per (user, event): funnel events are first-occurrence-only,
-- which also makes every insert idempotent via ON CONFLICT DO NOTHING.
CREATE TABLE IF NOT EXISTS onboarding_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, event)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_events_event ON onboarding_events(event, created_at);

ALTER TABLE onboarding_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own onboarding events" ON onboarding_events;
CREATE POLICY "Users can view their own onboarding events"
  ON onboarding_events FOR SELECT
  USING (auth.uid() = user_id);
-- Writes come from the service role (API routes) and SECURITY DEFINER triggers only.

CREATE OR REPLACE FUNCTION log_onboarding_event(p_user_id UUID, p_event TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO onboarding_events (user_id, event)
  VALUES (p_user_id, p_event)
  ON CONFLICT (user_id, event) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  NULL; -- funnel logging must never break the write that triggered it
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- profile_created + archetype_selected
-- (archetype is set by client upsert from /select-archetype, so a trigger is
-- the only reliable server-side hook; upsert can INSERT with archetype set)
CREATE OR REPLACE FUNCTION trg_onboarding_profile_events()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_onboarding_event(NEW.id, 'profile_created');
    IF NEW.archetype IS NOT NULL THEN
      PERFORM log_onboarding_event(NEW.id, 'archetype_selected');
    END IF;
  ELSIF OLD.archetype IS NULL AND NEW.archetype IS NOT NULL THEN
    PERFORM log_onboarding_event(NEW.id, 'archetype_selected');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS onboarding_profile_events ON profiles;
CREATE TRIGGER onboarding_profile_events
  AFTER INSERT OR UPDATE OF archetype ON profiles
  FOR EACH ROW EXECUTE FUNCTION trg_onboarding_profile_events();

-- first_quest_created + first_quest_completed
-- (quests are inserted client-side; the UNIQUE constraint keeps only the first)
CREATE OR REPLACE FUNCTION trg_onboarding_quest_events()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_onboarding_event(NEW.user_id, 'first_quest_created');
  ELSIF OLD.completed = FALSE AND NEW.completed = TRUE THEN
    PERFORM log_onboarding_event(NEW.user_id, 'first_quest_completed');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS onboarding_quest_events ON quests;
CREATE TRIGGER onboarding_quest_events
  AFTER INSERT OR UPDATE OF completed ON quests
  FOR EACH ROW EXECUTE FUNCTION trg_onboarding_quest_events();

-- Backfill funnel events for existing users at their historical timestamps
INSERT INTO onboarding_events (user_id, event, created_at)
SELECT id, 'profile_created', created_at FROM profiles
ON CONFLICT (user_id, event) DO NOTHING;

INSERT INTO onboarding_events (user_id, event, created_at)
SELECT id, 'archetype_selected', created_at FROM profiles WHERE archetype IS NOT NULL
ON CONFLICT (user_id, event) DO NOTHING;

INSERT INTO onboarding_events (user_id, event, created_at)
SELECT user_id, 'first_quest_created', MIN(created_at) FROM quests GROUP BY user_id
ON CONFLICT (user_id, event) DO NOTHING;

INSERT INTO onboarding_events (user_id, event, created_at)
SELECT user_id, 'first_quest_completed', MIN(completed_at) FROM quests
WHERE completed = TRUE AND completed_at IS NOT NULL
GROUP BY user_id
ON CONFLICT (user_id, event) DO NOTHING;
