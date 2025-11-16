-- Achievements and Badges System
-- Implements a comprehensive achievement system to boost engagement and retention

-- Create achievements definition table
CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL, -- quest_master, level_up, streak, social, exploration, combat, wisdom
  tier TEXT DEFAULT 'bronze', -- bronze, silver, gold, platinum, diamond
  icon TEXT NOT NULL, -- emoji or icon identifier
  requirement_type TEXT NOT NULL, -- quest_count, level_reached, streak_days, gold_earned, regions_explored, etc.
  requirement_value INTEGER NOT NULL,
  xp_reward INTEGER DEFAULT 0,
  gold_reward INTEGER DEFAULT 0,
  unlock_order INTEGER DEFAULT 0,
  hidden BOOLEAN DEFAULT false, -- secret achievements
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user achievements tracking table
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL REFERENCES achievements(id),
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  progress INTEGER DEFAULT 0, -- current progress towards unlocking
  notified BOOLEAN DEFAULT false, -- whether user has been notified
  UNIQUE(user_id, achievement_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id, unlocked_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement ON user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_achievements_category ON achievements(category, tier);

-- Add achievement stats to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS total_achievements_unlocked INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS achievement_points INTEGER DEFAULT 0;

-- Seed achievement definitions
INSERT INTO achievements (id, name, description, category, tier, icon, requirement_type, requirement_value, xp_reward, gold_reward, unlock_order) VALUES
  -- Quest Master Series
  ('first_quest', 'First Steps', 'Complete your very first quest', 'quest_master', 'bronze', '🎯', 'quest_count', 1, 50, 10, 1),
  ('quest_novice', 'Quest Novice', 'Complete 10 quests', 'quest_master', 'bronze', '📋', 'quest_count', 10, 100, 25, 2),
  ('quest_apprentice', 'Quest Apprentice', 'Complete 25 quests', 'quest_master', 'silver', '⚔️', 'quest_count', 25, 250, 50, 3),
  ('quest_journeyman', 'Quest Journeyman', 'Complete 50 quests', 'quest_master', 'silver', '🗡️', 'quest_count', 50, 500, 100, 4),
  ('quest_expert', 'Quest Expert', 'Complete 100 quests', 'quest_master', 'gold', '🏆', 'quest_count', 100, 1000, 200, 5),
  ('quest_master', 'Quest Master', 'Complete 250 quests', 'quest_master', 'platinum', '👑', 'quest_count', 250, 2500, 500, 6),
  ('quest_legend', 'Legendary Hero', 'Complete 500 quests', 'quest_master', 'diamond', '⭐', 'quest_count', 500, 5000, 1000, 7),

  -- Level Up Series
  ('level_5', 'Rising Star', 'Reach level 5', 'level_up', 'bronze', '🌟', 'level_reached', 5, 100, 25, 10),
  ('level_10', 'Veteran Adventurer', 'Reach level 10', 'level_up', 'silver', '💫', 'level_reached', 10, 250, 75, 11),
  ('level_15', 'Elite Warrior', 'Reach level 15', 'level_up', 'gold', '✨', 'level_reached', 15, 500, 150, 12),
  ('level_20', 'Champion', 'Reach level 20', 'level_up', 'platinum', '🎖️', 'level_reached', 20, 1000, 300, 13),
  ('level_25', 'Ascended', 'Reach level 25', 'level_up', 'diamond', '👼', 'level_reached', 25, 2000, 600, 14),

  -- Streak Series
  ('streak_3', 'Building Momentum', 'Maintain a 3-day streak', 'streak', 'bronze', '🔥', 'streak_days', 3, 75, 15, 20),
  ('streak_7', 'Week Warrior', 'Maintain a 7-day streak', 'streak', 'silver', '📅', 'streak_days', 7, 200, 40, 21),
  ('streak_14', 'Fortnight Fighter', 'Maintain a 14-day streak', 'streak', 'silver', '🗓️', 'streak_days', 14, 400, 80, 22),
  ('streak_30', 'Monthly Master', 'Maintain a 30-day streak', 'streak', 'gold', '📆', 'streak_days', 30, 800, 160, 23),
  ('streak_60', 'Unstoppable', 'Maintain a 60-day streak', 'streak', 'platinum', '💪', 'streak_days', 60, 1600, 320, 24),
  ('streak_100', 'Century Club', 'Maintain a 100-day streak', 'streak', 'diamond', '💯', 'streak_days', 100, 3000, 600, 25),

  -- Wealth Series
  ('gold_100', 'Penny Pincher', 'Accumulate 100 gold', 'wealth', 'bronze', '💰', 'gold_total', 100, 50, 0, 30),
  ('gold_500', 'Treasure Hunter', 'Accumulate 500 gold', 'wealth', 'silver', '💎', 'gold_total', 500, 150, 0, 31),
  ('gold_1000', 'Gold Hoarder', 'Accumulate 1000 gold', 'wealth', 'gold', '🪙', 'gold_total', 1000, 300, 0, 32),
  ('gold_5000', 'Dragon''s Fortune', 'Accumulate 5000 gold', 'wealth', 'platinum', '🐉', 'gold_total', 5000, 1000, 0, 33),

  -- Exploration Series
  ('explorer_3', 'Curious Traveler', 'Discover 3 map regions', 'exploration', 'bronze', '🗺️', 'regions_explored', 3, 100, 20, 40),
  ('explorer_5', 'Seasoned Explorer', 'Discover 5 map regions', 'exploration', 'silver', '🧭', 'regions_explored', 5, 250, 50, 41),
  ('explorer_7', 'Master Cartographer', 'Discover 7 map regions', 'exploration', 'gold', '🌍', 'regions_explored', 7, 500, 100, 42),
  ('explorer_all', 'World Walker', 'Discover all map regions', 'exploration', 'diamond', '🌌', 'regions_explored', 10, 2000, 400, 43),

  -- Special/Hidden Achievements
  ('night_owl', 'Night Owl', 'Complete a quest after midnight', 'special', 'silver', '🦉', 'quest_midnight', 1, 100, 25, 50),
  ('early_bird', 'Early Bird', 'Complete a quest before 6 AM', 'special', 'silver', '🐦', 'quest_early', 1, 100, 25, 51),
  ('speed_demon', 'Speed Demon', 'Complete 5 quests in one day', 'special', 'gold', '⚡', 'quests_one_day', 5, 300, 75, 52),
  ('journal_keeper', 'Journal Keeper', 'Write 10 journal entries', 'wisdom', 'silver', '📖', 'journal_entries', 10, 200, 50, 53),
  ('reflection_master', 'Master of Reflection', 'Write 25 journal entries', 'wisdom', 'gold', '🧘', 'journal_entries', 25, 500, 125, 54),
  ('comeback_kid', 'Comeback Kid', 'Return after 7+ days absence', 'special', 'gold', '🎭', 'comeback_bonus', 1, 250, 50, 55)
ON CONFLICT (id) DO NOTHING;

-- Function to check and unlock achievements
CREATE OR REPLACE FUNCTION check_achievements(p_user_id UUID)
RETURNS TABLE(
  newly_unlocked JSONB,
  total_unlocked INTEGER,
  achievement_points INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile RECORD;
  v_quest_count INTEGER;
  v_journal_count INTEGER;
  v_regions_count INTEGER;
  v_achievement RECORD;
  v_unlocked_achievements JSONB := '[]'::jsonb;
  v_total_unlocked INTEGER := 0;
  v_achievement_points INTEGER := 0;
  v_new_unlock BOOLEAN;
BEGIN
  -- Get user profile stats
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;

  -- Get quest count
  SELECT COUNT(*) INTO v_quest_count FROM quests WHERE user_id = p_user_id AND completed = true;

  -- Get journal count
  SELECT COALESCE(v_profile.journal_entry_count, 0) INTO v_journal_count;

  -- Get explored regions count
  SELECT jsonb_array_length(COALESCE(v_profile.map_regions_revealed, '[]'::jsonb)) INTO v_regions_count;

  -- Check each achievement
  FOR v_achievement IN SELECT * FROM achievements ORDER BY unlock_order ASC
  LOOP
    v_new_unlock := false;

    -- Check if already unlocked
    IF EXISTS (SELECT 1 FROM user_achievements WHERE user_id = p_user_id AND achievement_id = v_achievement.id) THEN
      CONTINUE;
    END IF;

    -- Check requirement based on type
    CASE v_achievement.requirement_type
      WHEN 'quest_count' THEN
        IF v_quest_count >= v_achievement.requirement_value THEN
          v_new_unlock := true;
        END IF;
      WHEN 'level_reached' THEN
        IF v_profile.level >= v_achievement.requirement_value THEN
          v_new_unlock := true;
        END IF;
      WHEN 'streak_days' THEN
        IF v_profile.current_streak >= v_achievement.requirement_value THEN
          v_new_unlock := true;
        END IF;
      WHEN 'gold_total' THEN
        IF COALESCE(v_profile.gold, 0) >= v_achievement.requirement_value THEN
          v_new_unlock := true;
        END IF;
      WHEN 'regions_explored' THEN
        IF v_regions_count >= v_achievement.requirement_value THEN
          v_new_unlock := true;
        END IF;
      WHEN 'journal_entries' THEN
        IF v_journal_count >= v_achievement.requirement_value THEN
          v_new_unlock := true;
        END IF;
      ELSE
        -- Other types handled separately
        CONTINUE;
    END CASE;

    -- Unlock achievement if requirements met
    IF v_new_unlock THEN
      INSERT INTO user_achievements (user_id, achievement_id, progress, notified)
      VALUES (p_user_id, v_achievement.id, v_achievement.requirement_value, false);

      -- Add to unlocked list
      v_unlocked_achievements := v_unlocked_achievements || jsonb_build_object(
        'id', v_achievement.id,
        'name', v_achievement.name,
        'description', v_achievement.description,
        'icon', v_achievement.icon,
        'tier', v_achievement.tier,
        'xp_reward', v_achievement.xp_reward,
        'gold_reward', v_achievement.gold_reward
      );

      -- Award rewards
      UPDATE profiles
      SET
        xp = xp + v_achievement.xp_reward,
        gold = gold + v_achievement.gold_reward,
        total_achievements_unlocked = total_achievements_unlocked + 1,
        achievement_points = achievement_points +
          CASE v_achievement.tier
            WHEN 'bronze' THEN 10
            WHEN 'silver' THEN 25
            WHEN 'gold' THEN 50
            WHEN 'platinum' THEN 100
            WHEN 'diamond' THEN 250
            ELSE 5
          END
      WHERE id = p_user_id;
    END IF;
  END LOOP;

  -- Get updated stats
  SELECT total_achievements_unlocked, achievement_points
  INTO v_total_unlocked, v_achievement_points
  FROM profiles
  WHERE id = p_user_id;

  RETURN QUERY SELECT v_unlocked_achievements, v_total_unlocked, v_achievement_points;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION check_achievements TO authenticated;

-- RLS policies
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view achievements"
  ON achievements FOR SELECT
  USING (true);

CREATE POLICY "Users can view their own unlocked achievements"
  ON user_achievements FOR SELECT
  USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE achievements IS 'Defines all available achievements and their unlock requirements';
COMMENT ON TABLE user_achievements IS 'Tracks which achievements each user has unlocked';
COMMENT ON FUNCTION check_achievements IS 'Checks and unlocks any achievements the user has earned';
