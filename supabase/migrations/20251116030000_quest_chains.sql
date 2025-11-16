-- Quest Chains and Story Arcs System
-- Implements multi-quest storylines that unfold over time

-- Create quest chains definition table
CREATE TABLE IF NOT EXISTS quest_chains (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  archetype TEXT, -- null means available to all archetypes
  category TEXT DEFAULT 'personal_growth', -- personal_growth, adventure, mastery, social, mystery
  total_steps INTEGER NOT NULL,
  difficulty TEXT DEFAULT 'medium',
  icon TEXT DEFAULT '📜',
  lore_intro TEXT,
  completion_reward_xp INTEGER DEFAULT 500,
  completion_reward_gold INTEGER DEFAULT 100,
  unlocks_at_level INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create quest chain steps table
CREATE TABLE IF NOT EXISTS quest_chain_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_id TEXT NOT NULL REFERENCES quest_chains(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  step_title TEXT NOT NULL,
  step_description TEXT NOT NULL,
  suggested_quest_text TEXT, -- AI suggestion for quest creation
  lore_text TEXT, -- Story progression text
  min_time_between_steps_hours INTEGER DEFAULT 0, -- Prevent rushing through
  xp_reward INTEGER DEFAULT 0,
  gold_reward INTEGER DEFAULT 0,
  UNIQUE(chain_id, step_number)
);

-- Create user quest chain progress table
CREATE TABLE IF NOT EXISTS user_quest_chain_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chain_id TEXT NOT NULL REFERENCES quest_chains(id),
  current_step INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_step_completed_at TIMESTAMPTZ,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, chain_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quest_chain_steps_chain ON quest_chain_steps(chain_id, step_number);
CREATE INDEX IF NOT EXISTS idx_user_chain_progress_user ON user_quest_chain_progress(user_id, completed);
CREATE INDEX IF NOT EXISTS idx_user_chain_progress_chain ON user_quest_chain_progress(chain_id);

-- Add quest chain tracking to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS quest_chains_completed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_quest_chain TEXT REFERENCES quest_chains(id);

-- Seed quest chains
INSERT INTO quest_chains (id, name, description, archetype, category, total_steps, difficulty, icon, lore_intro, completion_reward_xp, completion_reward_gold, unlocks_at_level) VALUES
  ('hero_origin', 'Hero''s Origin Story', 'Discover the beginning of your heroic journey', NULL, 'adventure', 5, 'easy', '🌟', 'Every hero has an origin. This is yours.', 500, 100, 1),
  ('morning_mastery', 'Master of Mornings', 'Build an unstoppable morning routine', NULL, 'personal_growth', 7, 'medium', '🌅', 'The way you start your day shapes your destiny.', 750, 150, 3),
  ('focus_forge', 'The Focus Forge', 'Eliminate distractions and forge deep focus', NULL, 'mastery', 6, 'medium', '🔥', 'In the forge of focus, greatness is tempered.', 800, 200, 5),
  ('social_quest', 'Bonds of Fellowship', 'Strengthen your connections with others', NULL, 'social', 5, 'medium', '🤝', 'No hero''s journey is complete alone.', 600, 150, 1),
  ('creative_spark', 'The Creative Awakening', 'Unlock your creative potential', NULL, 'personal_growth', 8, 'hard', '🎨', 'Creativity lies dormant in all of us, waiting to awaken.', 1000, 250, 7),
  ('health_champion', 'Champion of Vitality', 'Build unshakeable health habits', NULL, 'mastery', 10, 'hard', '💪', 'Your body is the vessel of your adventure.', 1200, 300, 1),
  ('mindful_warrior', 'The Mindful Warrior', 'Master mindfulness and meditation', NULL, 'personal_growth', 7, 'medium', '🧘', 'True strength comes from inner peace.', 850, 200, 5),
  ('productivity_titan', 'Titan of Productivity', 'Achieve peak productivity', NULL, 'mastery', 9, 'hard', '⚡', 'Productivity is not about doing more, but doing what matters.', 1100, 275, 8),
  ('mystery_shadows', 'Shadows of the Past', 'Uncover hidden aspects of yourself', NULL, 'mystery', 6, 'medium', '🔍', 'Your past holds keys to your future.', 700, 175, 10),
  ('legendary_path', 'Path to Legend', 'The ultimate test of dedication', NULL, 'adventure', 12, 'epic', '👑', 'Only the most dedicated heroes walk this path.', 2000, 500, 15)
ON CONFLICT (id) DO NOTHING;

-- Seed quest chain steps
INSERT INTO quest_chain_steps (chain_id, step_number, step_title, step_description, suggested_quest_text, lore_text, xp_reward, gold_reward) VALUES
  -- Hero's Origin Story
  ('hero_origin', 1, 'The Call to Adventure', 'Begin your journey', 'Complete your first meaningful task today', 'You hear the call. Will you answer?', 50, 10),
  ('hero_origin', 2, 'Crossing the Threshold', 'Step out of your comfort zone', 'Do something you''ve been avoiding', 'The threshold awaits. Step through.', 75, 15),
  ('hero_origin', 3, 'Meeting the Mentor', 'Seek wisdom', 'Learn something new from a book, course, or person', 'Wisdom comes to those who seek it.', 100, 20),
  ('hero_origin', 4, 'The First Trial', 'Face a challenge', 'Tackle a difficult task you''ve been postponing', 'Every hero faces trials. This is yours.', 125, 25),
  ('hero_origin', 5, 'Claiming Victory', 'Celebrate your growth', 'Reflect on how far you''ve come', 'You''ve proven yourself. The journey continues.', 150, 30),

  -- Morning Mastery
  ('morning_mastery', 1, 'The Early Rise', 'Wake up at a consistent time', 'Wake up at your target time for 3 days', 'Dawn breaks. Will you meet it?', 60, 15),
  ('morning_mastery', 2, 'Hydration First', 'Start with water', 'Drink water immediately upon waking for 3 days', 'Hydrate your vessel.', 70, 15),
  ('morning_mastery', 3, 'Movement Ritual', 'Add morning movement', 'Do 5-10 min of movement/stretching for 3 days', 'A body in motion stays in motion.', 80, 20),
  ('morning_mastery', 4, 'Mindful Start', 'Practice morning mindfulness', 'Meditate or journal for 5 minutes each morning for 3 days', 'Clarity comes from stillness.', 90, 20),
  ('morning_mastery', 5, 'Priority Focus', 'Identify daily priorities', 'List your top 3 priorities each morning for 3 days', 'Know what matters.', 100, 25),
  ('morning_mastery', 6, 'No Phone Zone', 'Delay phone checking', 'Don''t check phone for first 30 min after waking for 3 days', 'Master your attention.', 110, 25),
  ('morning_mastery', 7, 'The Full Routine', 'Execute complete morning routine', 'Complete all morning elements for 5 days straight', 'You are now a master of mornings.', 150, 35),

  -- Focus Forge
  ('focus_forge', 1, 'Environment Audit', 'Analyze your workspace', 'Remove 5 distractions from your workspace', 'A clear space creates a clear mind.', 70, 15),
  ('focus_forge', 2, 'Digital Detox', 'Tame your devices', 'Disable non-essential notifications', 'Reclaim your attention.', 80, 20),
  ('focus_forge', 3, 'Deep Work Block', 'Schedule focused time', 'Block out 90 minutes of uninterrupted work time', 'Deep work requires deep commitment.', 100, 25),
  ('focus_forge', 4, 'Single-Tasking', 'Eliminate multitasking', 'Work on one task at a time for an entire day', 'Do one thing with all your being.', 110, 25),
  ('focus_forge', 5, 'Focus Music', 'Create focus environment', 'Use focus music or sounds during work sessions', 'Sound shapes state.', 90, 20),
  ('focus_forge', 6, 'The Forge Trial', 'Ultimate focus challenge', 'Complete 3 deep work sessions of 90 min each this week', 'In the forge of focus, you are reborn.', 200, 50),

  -- Social Quest (Bonds of Fellowship)
  ('social_quest', 1, 'Reaching Out', 'Reconnect with someone', 'Message or call someone you haven''t talked to in a while', 'Fellowship begins with reaching out.', 60, 15),
  ('social_quest', 2, 'Deep Conversation', 'Have a meaningful talk', 'Have a 30+ minute deep conversation with someone', 'True connection requires vulnerability.', 80, 20),
  ('social_quest', 3, 'Acts of Service', 'Help someone', 'Do something helpful for someone without being asked', 'The bonds we forge through service last forever.', 90, 20),
  ('social_quest', 4, 'Express Gratitude', 'Show appreciation', 'Tell 3 people specifically what you appreciate about them', 'Gratitude strengthens all bonds.', 85, 20),
  ('social_quest', 5, 'Community Building', 'Bring people together', 'Organize or attend a social gathering', 'The fellowship is complete.', 120, 30)
ON CONFLICT DO NOTHING;

-- Function to start a quest chain for user
CREATE OR REPLACE FUNCTION start_quest_chain(p_user_id UUID, p_chain_id TEXT)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  current_step INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_level INTEGER;
  v_chain_level_req INTEGER;
  v_existing RECORD;
BEGIN
  -- Get user level
  SELECT level INTO v_user_level FROM profiles WHERE id = p_user_id;

  -- Get chain level requirement
  SELECT unlocks_at_level INTO v_chain_level_req FROM quest_chains WHERE id = p_chain_id;

  -- Check level requirement
  IF v_user_level < v_chain_level_req THEN
    RETURN QUERY SELECT false, format('Level %s required', v_chain_level_req), 0;
    RETURN;
  END IF;

  -- Check if already started
  SELECT * INTO v_existing FROM user_quest_chain_progress
  WHERE user_id = p_user_id AND chain_id = p_chain_id;

  IF FOUND THEN
    RETURN QUERY SELECT false, 'Chain already started', v_existing.current_step;
    RETURN;
  END IF;

  -- Start the chain
  INSERT INTO user_quest_chain_progress (user_id, chain_id, current_step)
  VALUES (p_user_id, p_chain_id, 0);

  -- Update profile
  UPDATE profiles SET current_quest_chain = p_chain_id WHERE id = p_user_id;

  RETURN QUERY SELECT true, 'Quest chain started!', 0;
END;
$$;

-- Function to advance quest chain step
CREATE OR REPLACE FUNCTION advance_quest_chain(p_user_id UUID, p_chain_id TEXT)
RETURNS TABLE(
  success BOOLEAN,
  new_step INTEGER,
  chain_completed BOOLEAN,
  step_info JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_progress RECORD;
  v_chain RECORD;
  v_next_step RECORD;
  v_chain_completed BOOLEAN := false;
BEGIN
  -- Get current progress
  SELECT * INTO v_progress FROM user_quest_chain_progress
  WHERE user_id = p_user_id AND chain_id = p_chain_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, false, '{}'::jsonb;
    RETURN;
  END IF;

  -- Get chain info
  SELECT * INTO v_chain FROM quest_chains WHERE id = p_chain_id;

  -- Calculate next step
  v_progress.current_step := v_progress.current_step + 1;

  -- Check if chain completed
  IF v_progress.current_step >= v_chain.total_steps THEN
    v_chain_completed := true;

    -- Mark as completed
    UPDATE user_quest_chain_progress
    SET
      current_step = v_progress.current_step,
      completed = true,
      completed_at = NOW(),
      last_step_completed_at = NOW()
    WHERE user_id = p_user_id AND chain_id = p_chain_id;

    -- Award completion rewards
    UPDATE profiles
    SET
      xp = xp + v_chain.completion_reward_xp,
      gold = gold + v_chain.completion_reward_gold,
      quest_chains_completed = quest_chains_completed + 1,
      current_quest_chain = NULL
    WHERE id = p_user_id;
  ELSE
    -- Just advance step
    UPDATE user_quest_chain_progress
    SET
      current_step = v_progress.current_step,
      last_step_completed_at = NOW()
    WHERE user_id = p_user_id AND chain_id = p_chain_id;
  END IF;

  -- Get next step info if not completed
  IF NOT v_chain_completed THEN
    SELECT * INTO v_next_step FROM quest_chain_steps
    WHERE chain_id = p_chain_id AND step_number = v_progress.current_step + 1;
  END IF;

  RETURN QUERY SELECT
    true,
    v_progress.current_step,
    v_chain_completed,
    CASE
      WHEN v_chain_completed THEN
        jsonb_build_object(
          'message', 'Quest chain completed!',
          'xp_reward', v_chain.completion_reward_xp,
          'gold_reward', v_chain.completion_reward_gold
        )
      WHEN v_next_step.id IS NOT NULL THEN
        jsonb_build_object(
          'step_title', v_next_step.step_title,
          'step_description', v_next_step.step_description,
          'lore_text', v_next_step.lore_text,
          'suggested_quest', v_next_step.suggested_quest_text
        )
      ELSE '{}'::jsonb
    END;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION start_quest_chain TO authenticated;
GRANT EXECUTE ON FUNCTION advance_quest_chain TO authenticated;

-- RLS policies
ALTER TABLE quest_chains ENABLE ROW LEVEL SECURITY;
ALTER TABLE quest_chain_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quest_chain_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view quest chains"
  ON quest_chains FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view quest chain steps"
  ON quest_chain_steps FOR SELECT
  USING (true);

CREATE POLICY "Users can view their own chain progress"
  ON user_quest_chain_progress FOR SELECT
  USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE quest_chains IS 'Defines multi-step quest storylines';
COMMENT ON TABLE quest_chain_steps IS 'Individual steps within quest chains';
COMMENT ON TABLE user_quest_chain_progress IS 'Tracks user progress through quest chains';
COMMENT ON FUNCTION start_quest_chain IS 'Starts a quest chain for a user';
COMMENT ON FUNCTION advance_quest_chain IS 'Advances user to next step in quest chain';
