-- Quest Chains System
-- Multi-step quest sequences with branching narratives

CREATE TABLE IF NOT EXISTS quest_chains (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced', 'expert')),
  estimated_duration TEXT, -- '2 weeks', '1 month', etc.
  total_steps INTEGER DEFAULT 0,
  reward_gold INTEGER DEFAULT 0,
  reward_xp INTEGER DEFAULT 0,
  reward_items JSONB, -- array of item objects
  is_premium BOOLEAN DEFAULT FALSE,
  lore TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quest_chain_steps (
  id TEXT PRIMARY KEY,
  chain_id TEXT REFERENCES quest_chains(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  quest_id TEXT, -- references quests table
  unlock_condition TEXT, -- 'previous' or specific step_id
  story_text TEXT, -- narrative text shown when step unlocks
  reward_gold INTEGER DEFAULT 0,
  reward_xp INTEGER DEFAULT 0,
  time_gate_hours INTEGER DEFAULT 0, -- optional wait time before next step
  UNIQUE(chain_id, step_number)
);

CREATE TABLE IF NOT EXISTS user_quest_chain_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  chain_id TEXT REFERENCES quest_chains(id) ON DELETE CASCADE,
  current_step INTEGER DEFAULT 1,
  status TEXT CHECK (status IN ('not_started', 'in_progress', 'completed', 'abandoned')) DEFAULT 'not_started',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_step_completed_at TIMESTAMPTZ,
  metadata JSONB, -- store user choices, branching decisions
  UNIQUE(user_id, chain_id)
);

-- Seed quest chains
INSERT INTO quest_chains (id, name, description, category, difficulty, estimated_duration, total_steps, reward_gold, reward_xp, lore, is_premium) VALUES
  ('founders_journey', 'The Founder''s Journey', 'An epic tale of the realm''s founding heroes', 'Story', 'intermediate', '2 weeks', 5, 1000, 5000, 'Discover the secrets of those who came before you.', FALSE),
  ('mystic_awakening', 'Mystic Awakening', 'Unlock your inner magical potential', 'Magic', 'advanced', '3 weeks', 7, 2000, 8000, 'The ancient arts call to you.', TRUE),
  ('merchants_guild', 'The Merchant''s Guild', 'Build your trading empire', 'Commerce', 'beginner', '1 week', 4, 500, 2000, 'Fortune favors the shrewd.', FALSE);

-- Seed quest chain steps for "The Founder's Journey"
INSERT INTO quest_chain_steps (id, chain_id, step_number, title, description, unlock_condition, story_text, reward_gold, reward_xp, time_gate_hours) VALUES
  ('fj_step1', 'founders_journey', 1, 'The Call to Adventure', 'Complete your first heroic quest', 'start', 'A mysterious letter arrives at your door. The realm needs heroes.', 100, 500, 0),
  ('fj_step2', 'founders_journey', 2, 'Gathering Allies', 'Build your reputation in the starting village', 'fj_step1', 'Word of your deeds has spread. Others wish to join your cause.', 150, 750, 24),
  ('fj_step3', 'founders_journey', 3, 'The Ancient Ruins', 'Explore the forgotten temple', 'fj_step2', 'An old map leads you to ruins older than the realm itself.', 200, 1000, 48),
  ('fj_step4', 'founders_journey', 4, 'Trial of Wisdom', 'Solve the riddle of the ancients', 'fj_step3', 'The temple tests not your strength, but your mind.', 250, 1250, 24),
  ('fj_step5', 'founders_journey', 5, 'Legacy Revealed', 'Claim your founder''s heritage', 'fj_step4', 'You are more than you knew. The founders'' blood runs in your veins.', 300, 1500, 0);

-- Function to start quest chain
CREATE OR REPLACE FUNCTION start_quest_chain(p_user_id UUID, p_chain_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_premium BOOLEAN;
  v_user_premium BOOLEAN;
BEGIN
  -- Check if chain is premium
  SELECT is_premium INTO v_is_premium FROM quest_chains WHERE id = p_chain_id;

  -- Check if user has premium access
  SELECT is_premium INTO v_user_premium FROM user_profiles WHERE id = p_user_id;

  IF v_is_premium AND NOT v_user_premium THEN
    RAISE EXCEPTION 'Premium subscription required';
  END IF;

  -- Start the chain
  INSERT INTO user_quest_chain_progress (user_id, chain_id, status, started_at)
  VALUES (p_user_id, p_chain_id, 'in_progress', NOW())
  ON CONFLICT (user_id, chain_id) DO UPDATE
  SET status = 'in_progress', started_at = NOW()
  WHERE user_quest_chain_progress.status = 'not_started';

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to advance to next step
CREATE OR REPLACE FUNCTION advance_quest_chain_step(p_user_id UUID, p_chain_id TEXT)
RETURNS JSONB AS $$
DECLARE
  v_current_step INTEGER;
  v_total_steps INTEGER;
  v_next_step_info JSONB;
  v_time_gate_hours INTEGER;
  v_can_advance BOOLEAN := TRUE;
BEGIN
  -- Get current progress
  SELECT current_step INTO v_current_step
  FROM user_quest_chain_progress
  WHERE user_id = p_user_id AND chain_id = p_chain_id;

  SELECT total_steps INTO v_total_steps
  FROM quest_chains WHERE id = p_chain_id;

  -- Check if chain is complete
  IF v_current_step >= v_total_steps THEN
    UPDATE user_quest_chain_progress
    SET status = 'completed', completed_at = NOW()
    WHERE user_id = p_user_id AND chain_id = p_chain_id;

    -- Award completion rewards
    UPDATE user_profiles
    SET
      gold = gold + (SELECT reward_gold FROM quest_chains WHERE id = p_chain_id),
      experience_points = experience_points + (SELECT reward_xp FROM quest_chains WHERE id = p_chain_id)
    WHERE id = p_user_id;

    RETURN jsonb_build_object('completed', true, 'message', 'Quest chain completed!');
  END IF;

  -- Check time gate
  SELECT time_gate_hours INTO v_time_gate_hours
  FROM quest_chain_steps
  WHERE chain_id = p_chain_id AND step_number = v_current_step;

  IF v_time_gate_hours > 0 THEN
    IF (SELECT last_step_completed_at FROM user_quest_chain_progress WHERE user_id = p_user_id AND chain_id = p_chain_id) + (v_time_gate_hours || ' hours')::INTERVAL > NOW() THEN
      v_can_advance := FALSE;
    END IF;
  END IF;

  IF v_can_advance THEN
    -- Advance to next step
    UPDATE user_quest_chain_progress
    SET
      current_step = current_step + 1,
      last_step_completed_at = NOW()
    WHERE user_id = p_user_id AND chain_id = p_chain_id;

    -- Get next step info
    SELECT jsonb_build_object(
      'step_number', step_number,
      'title', title,
      'story_text', story_text,
      'reward_gold', reward_gold,
      'reward_xp', reward_xp
    ) INTO v_next_step_info
    FROM quest_chain_steps
    WHERE chain_id = p_chain_id AND step_number = v_current_step + 1;

    -- Award step rewards
    UPDATE user_profiles
    SET
      gold = gold + (v_next_step_info->>'reward_gold')::INTEGER,
      experience_points = experience_points + (v_next_step_info->>'reward_xp')::INTEGER
    WHERE id = p_user_id;

    RETURN v_next_step_info;
  ELSE
    RETURN jsonb_build_object('error', 'Time gate active', 'wait_hours', v_time_gate_hours);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
ALTER TABLE quest_chains ENABLE ROW LEVEL SECURITY;
ALTER TABLE quest_chain_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quest_chain_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Quest chains are visible based on premium status" ON quest_chains
  FOR SELECT USING (
    is_premium = FALSE OR
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_premium = TRUE)
  );

CREATE POLICY "Quest chain steps are public" ON quest_chain_steps FOR SELECT USING (true);

CREATE POLICY "Users can view their own chain progress" ON user_quest_chain_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own chain progress" ON user_quest_chain_progress
  FOR ALL USING (auth.uid() = user_id);
