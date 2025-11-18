-- Achievement System Migration
-- Gamification through unlockable badges and milestones

-- Create achievements table (predefined achievements)
CREATE TABLE IF NOT EXISTS achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE, -- 'first_quest', 'level_10', 'streak_7', etc.
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL, -- emoji or icon code
  category TEXT NOT NULL, -- 'quests', 'streaks', 'social', 'levels', 'special'
  rarity TEXT NOT NULL DEFAULT 'common', -- 'common', 'rare', 'epic', 'legendary'
  xp_reward INTEGER DEFAULT 0,
  requirement_value INTEGER, -- e.g., 10 for "complete 10 quests"
  is_secret BOOLEAN DEFAULT false, -- hidden until unlocked
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create user_achievements table (tracks which users unlocked which achievements)
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  progress INTEGER DEFAULT 0, -- for achievements with progress tracking
  notified BOOLEAN DEFAULT false, -- has user been notified of this achievement
  UNIQUE(user_id, achievement_id)
);

-- Add achievement-related columns to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS total_achievements INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS achievement_points INTEGER DEFAULT 0;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_achievements_category ON achievements(category);
CREATE INDEX IF NOT EXISTS idx_achievements_key ON achievements(key);

-- RLS Policies
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view achievements" ON achievements
  FOR SELECT USING (true);

CREATE POLICY "Users can view their own unlocked achievements" ON user_achievements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert user achievements" ON user_achievements
  FOR INSERT WITH CHECK (true);

-- Insert predefined achievements
INSERT INTO achievements (key, title, description, icon, category, rarity, xp_reward, requirement_value) VALUES
-- Quest Achievements
('first_quest', 'First Quest', 'Complete your very first quest', '⚔️', 'quests', 'common', 50, 1),
('quest_10', 'Quest Warrior', 'Complete 10 quests', '🗡️', 'quests', 'common', 100, 10),
('quest_50', 'Quest Master', 'Complete 50 quests', '🏹', 'quests', 'rare', 300, 50),
('quest_100', 'Quest Legend', 'Complete 100 quests', '⚡', 'quests', 'epic', 500, 100),
('quest_500', 'Quest God', 'Complete 500 quests', '👑', 'quests', 'legendary', 2000, 500),

-- Level Achievements
('level_5', 'Level 5 Hero', 'Reach level 5', '🌟', 'levels', 'common', 50, 5),
('level_10', 'Level 10 Champion', 'Reach level 10', '✨', 'levels', 'common', 100, 10),
('level_25', 'Level 25 Master', 'Reach level 25', '💫', 'levels', 'rare', 300, 25),
('level_50', 'Level 50 Legend', 'Reach level 50', '🌠', 'levels', 'epic', 500, 50),
('level_100', 'Level 100 Mythic', 'Reach level 100', '⭐', 'levels', 'legendary', 2000, 100),

-- Streak Achievements
('streak_3', '3-Day Streak', 'Maintain a 3-day login streak', '🔥', 'streaks', 'common', 50, 3),
('streak_7', 'Week Warrior', 'Maintain a 7-day login streak', '🔥🔥', 'streaks', 'common', 100, 7),
('streak_14', '2-Week Champion', 'Maintain a 14-day login streak', '🔥🔥🔥', 'streaks', 'rare', 200, 14),
('streak_30', 'Monthly Master', 'Maintain a 30-day login streak', '💎', 'streaks', 'epic', 500, 30),
('streak_90', '90-Day Legend', 'Maintain a 90-day login streak', '👑', 'streaks', 'legendary', 2000, 90),
('streak_365', 'Yearly Hero', 'Maintain a 365-day login streak', '⭐', 'streaks', 'legendary', 10000, 365),

-- Social Achievements
('first_share', 'Social Butterfly', 'Share your first quest', '🦋', 'social', 'common', 25, 1),
('share_10', 'Influencer', 'Share 10 quests', '📢', 'social', 'rare', 150, 10),
('first_referral', 'Recruiter', 'Invite your first friend', '🎁', 'social', 'common', 100, 1),
('referral_5', 'Community Builder', 'Invite 5 friends', '👥', 'social', 'rare', 300, 5),
('referral_10', 'Guild Master', 'Invite 10 friends', '👑', 'social', 'epic', 1000, 10),

-- Special Achievements
('founder', 'Founder', 'Early supporter of HabitQuest', '🏆', 'special', 'legendary', 500, 1),
('perfectionist', 'Perfectionist', 'Complete 10 quests without skipping any', '💯', 'special', 'epic', 300, 10),
('night_owl', 'Night Owl', 'Complete a quest after midnight', '🦉', 'special', 'rare', 100, 1),
('early_bird', 'Early Bird', 'Complete a quest before 6 AM', '🐦', 'special', 'rare', 100, 1),
('speedrunner', 'Speedrunner', 'Complete 5 quests in one day', '⚡', 'special', 'rare', 200, 5);

-- Function to check and unlock achievements
CREATE OR REPLACE FUNCTION check_and_unlock_achievement(
  p_user_id UUID,
  p_achievement_key TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_achievement_id UUID;
  v_already_unlocked BOOLEAN;
  v_xp_reward INTEGER;
BEGIN
  -- Get achievement details
  SELECT id, xp_reward INTO v_achievement_id, v_xp_reward
  FROM achievements
  WHERE key = p_achievement_key;

  IF v_achievement_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check if already unlocked
  SELECT EXISTS(
    SELECT 1 FROM user_achievements
    WHERE user_id = p_user_id AND achievement_id = v_achievement_id
  ) INTO v_already_unlocked;

  IF v_already_unlocked THEN
    RETURN false;
  END IF;

  -- Unlock achievement
  INSERT INTO user_achievements (user_id, achievement_id, progress)
  VALUES (p_user_id, v_achievement_id, 100);

  -- Grant XP reward and update profile
  UPDATE profiles
  SET
    xp = xp + v_xp_reward,
    achievement_points = achievement_points + v_xp_reward,
    total_achievements = total_achievements + 1
  WHERE id = p_user_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check multiple achievement criteria at once
CREATE OR REPLACE FUNCTION check_achievements_for_user(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_profile RECORD;
  v_quest_count INTEGER;
  v_share_count INTEGER;
  v_referral_count INTEGER;
BEGIN
  -- Get profile data
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;

  IF v_profile IS NULL THEN
    RETURN;
  END IF;

  -- Count completed quests
  SELECT COUNT(*) INTO v_quest_count
  FROM quests
  WHERE user_id = p_user_id AND status = 'completed';

  -- Count shares
  SELECT COUNT(*) INTO v_share_count
  FROM quest_shares
  WHERE user_id = p_user_id;

  -- Count completed referrals
  SELECT COUNT(*) INTO v_referral_count
  FROM referrals
  WHERE referrer_id = p_user_id AND completed = true;

  -- Check quest achievements
  IF v_quest_count >= 1 THEN
    PERFORM check_and_unlock_achievement(p_user_id, 'first_quest');
  END IF;
  IF v_quest_count >= 10 THEN
    PERFORM check_and_unlock_achievement(p_user_id, 'quest_10');
  END IF;
  IF v_quest_count >= 50 THEN
    PERFORM check_and_unlock_achievement(p_user_id, 'quest_50');
  END IF;
  IF v_quest_count >= 100 THEN
    PERFORM check_and_unlock_achievement(p_user_id, 'quest_100');
  END IF;
  IF v_quest_count >= 500 THEN
    PERFORM check_and_unlock_achievement(p_user_id, 'quest_500');
  END IF;

  -- Check level achievements
  IF v_profile.level >= 5 THEN
    PERFORM check_and_unlock_achievement(p_user_id, 'level_5');
  END IF;
  IF v_profile.level >= 10 THEN
    PERFORM check_and_unlock_achievement(p_user_id, 'level_10');
  END IF;
  IF v_profile.level >= 25 THEN
    PERFORM check_and_unlock_achievement(p_user_id, 'level_25');
  END IF;
  IF v_profile.level >= 50 THEN
    PERFORM check_and_unlock_achievement(p_user_id, 'level_50');
  END IF;
  IF v_profile.level >= 100 THEN
    PERFORM check_and_unlock_achievement(p_user_id, 'level_100');
  END IF;

  -- Check streak achievements
  IF v_profile.current_streak >= 3 THEN
    PERFORM check_and_unlock_achievement(p_user_id, 'streak_3');
  END IF;
  IF v_profile.current_streak >= 7 THEN
    PERFORM check_and_unlock_achievement(p_user_id, 'streak_7');
  END IF;
  IF v_profile.current_streak >= 14 THEN
    PERFORM check_and_unlock_achievement(p_user_id, 'streak_14');
  END IF;
  IF v_profile.current_streak >= 30 THEN
    PERFORM check_and_unlock_achievement(p_user_id, 'streak_30');
  END IF;
  IF v_profile.current_streak >= 90 THEN
    PERFORM check_and_unlock_achievement(p_user_id, 'streak_90');
  END IF;
  IF v_profile.current_streak >= 365 THEN
    PERFORM check_and_unlock_achievement(p_user_id, 'streak_365');
  END IF;

  -- Check social achievements
  IF v_share_count >= 1 THEN
    PERFORM check_and_unlock_achievement(p_user_id, 'first_share');
  END IF;
  IF v_share_count >= 10 THEN
    PERFORM check_and_unlock_achievement(p_user_id, 'share_10');
  END IF;
  IF v_referral_count >= 1 THEN
    PERFORM check_and_unlock_achievement(p_user_id, 'first_referral');
  END IF;
  IF v_referral_count >= 5 THEN
    PERFORM check_and_unlock_achievement(p_user_id, 'referral_5');
  END IF;
  IF v_referral_count >= 10 THEN
    PERFORM check_and_unlock_achievement(p_user_id, 'referral_10');
  END IF;

  -- Check if user is a founder (has premium)
  IF v_profile.is_premium THEN
    PERFORM check_and_unlock_achievement(p_user_id, 'founder');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
