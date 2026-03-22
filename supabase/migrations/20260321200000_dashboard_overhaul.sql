-- Dashboard Overhaul: Progressive Reveal + Random Encounter System

-- 1. Add quests_completed to profiles for progressive reveal
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS quests_completed INTEGER DEFAULT 0;

-- Backfill from existing data
UPDATE profiles p SET quests_completed = (
  SELECT COUNT(*) FROM quests q WHERE q.user_id = p.id AND q.completed = true
);

-- 2. Active effects table (buffs from random encounters)
CREATE TABLE IF NOT EXISTS active_effects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  effect_type TEXT NOT NULL,
  effect_value INTEGER NOT NULL,
  quests_remaining INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_active_effects_user ON active_effects(user_id);

ALTER TABLE active_effects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own effects" ON active_effects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own effects" ON active_effects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own effects" ON active_effects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own effects" ON active_effects
  FOR DELETE USING (auth.uid() = user_id);

-- 3. Encounter log table
CREATE TABLE IF NOT EXISTS encounter_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  roll_value INTEGER NOT NULL,
  encounter_name TEXT NOT NULL,
  encounter_rarity TEXT NOT NULL,
  reward_type TEXT NOT NULL,
  reward_value INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE encounter_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own encounters" ON encounter_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own encounters" ON encounter_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);
