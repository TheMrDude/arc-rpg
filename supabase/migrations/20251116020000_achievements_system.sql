-- Achievements System
-- Unlockable badges and rewards for completing milestones

CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- emoji or icon identifier
  category TEXT CHECK (category IN ('quest', 'social', 'exploration', 'mastery', 'special')),
  rarity TEXT CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  points INTEGER DEFAULT 10,
  requirement_type TEXT, -- 'quest_count', 'streak_days', 'level', 'custom'
  requirement_value INTEGER,
  hidden BOOLEAN DEFAULT FALSE, -- secret achievements
  reward_gold INTEGER DEFAULT 0,
  reward_xp INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  progress INTEGER DEFAULT 0, -- for incremental achievements
  UNIQUE(user_id, achievement_id)
);

-- Seed achievements
INSERT INTO achievements (id, name, description, icon, category, rarity, points, requirement_type, requirement_value, reward_gold, reward_xp) VALUES
  ('first_quest', 'First Steps', 'Complete your first quest', '🎯', 'quest', 'common', 10, 'quest_count', 1, 50, 100),
  ('quest_master_10', 'Quest Master', 'Complete 10 quests', '⭐', 'quest', 'rare', 25, 'quest_count', 10, 200, 500),
  ('quest_legend_50', 'Quest Legend', 'Complete 50 quests', '🏆', 'quest', 'epic', 50, 'quest_count', 50, 500, 1000),
  ('week_warrior', 'Week Warrior', 'Maintain a 7-day streak', '🔥', 'social', 'rare', 20, 'streak_days', 7, 150, 300),
  ('streak_champion', 'Streak Champion', 'Maintain a 30-day streak', '💪', 'social', 'epic', 75, 'streak_days', 30, 1000, 2000),
  ('level_10', 'Rising Star', 'Reach level 10', '⚡', 'mastery', 'rare', 30, 'level', 10, 300, 0),
  ('level_20', 'Hero of the Realm', 'Reach level 20', '👑', 'mastery', 'epic', 60, 'level', 20, 750, 0),
  ('explorer', 'Explorer', 'Unlock 5 map locations', '🗺️', 'exploration', 'rare', 25, 'custom', 5, 200, 400),
  ('cartographer', 'Master Cartographer', 'Unlock all map locations', '🧭', 'exploration', 'legendary', 100, 'custom', 10, 1500, 3000),
  ('early_adopter', 'Founder', 'Joined during Founders Month', '🎊', 'special', 'legendary', 150, 'custom', 1, 0, 0);

-- Function to check and unlock achievements
CREATE OR REPLACE FUNCTION check_unlock_achievement(p_user_id UUID, p_achievement_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_requirement_type TEXT;
  v_requirement_value INTEGER;
  v_user_quest_count INTEGER;
  v_user_streak INTEGER;
  v_user_level INTEGER;
  v_can_unlock BOOLEAN := FALSE;
BEGIN
  -- Get achievement requirements
  SELECT requirement_type, requirement_value
  INTO v_requirement_type, v_requirement_value
  FROM achievements WHERE id = p_achievement_id;

  -- Check quest count
  IF v_requirement_type = 'quest_count' THEN
    SELECT COUNT(*) INTO v_user_quest_count
    FROM user_quests WHERE user_id = p_user_id AND status = 'completed';

    IF v_user_quest_count >= v_requirement_value THEN
      v_can_unlock := TRUE;
    END IF;
  END IF;

  -- Check streak
  IF v_requirement_type = 'streak_days' THEN
    SELECT streak_count INTO v_user_streak
    FROM user_profiles WHERE id = p_user_id;

    IF v_user_streak >= v_requirement_value THEN
      v_can_unlock := TRUE;
    END IF;
  END IF;

  -- Check level
  IF v_requirement_type = 'level' THEN
    SELECT level INTO v_user_level
    FROM user_profiles WHERE id = p_user_id;

    IF v_user_level >= v_requirement_value THEN
      v_can_unlock := TRUE;
    END IF;
  END IF;

  -- Unlock achievement
  IF v_can_unlock THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    VALUES (p_user_id, p_achievement_id)
    ON CONFLICT (user_id, achievement_id) DO NOTHING;

    -- Award rewards
    UPDATE user_profiles
    SET
      gold = gold + (SELECT reward_gold FROM achievements WHERE id = p_achievement_id),
      experience_points = experience_points + (SELECT reward_xp FROM achievements WHERE id = p_achievement_id)
    WHERE id = p_user_id;

    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-check achievements on quest completion
CREATE OR REPLACE FUNCTION auto_check_achievements()
RETURNS TRIGGER AS $$
BEGIN
  -- Check quest-related achievements
  PERFORM check_unlock_achievement(NEW.user_id, 'first_quest');
  PERFORM check_unlock_achievement(NEW.user_id, 'quest_master_10');
  PERFORM check_unlock_achievement(NEW.user_id, 'quest_legend_50');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_achievements_on_quest_complete
AFTER UPDATE ON user_quests
FOR EACH ROW
WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
EXECUTE FUNCTION auto_check_achievements();

-- RLS Policies
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Achievements are public (except hidden)" ON achievements
  FOR SELECT USING (hidden = FALSE OR id IN (SELECT achievement_id FROM user_achievements WHERE user_id = auth.uid()));

CREATE POLICY "Users can view their own achievements" ON user_achievements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can unlock achievements" ON user_achievements
  FOR INSERT WITH CHECK (auth.uid() = user_id);
