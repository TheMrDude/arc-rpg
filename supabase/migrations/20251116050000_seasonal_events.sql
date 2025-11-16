-- Seasonal Events System
-- Time-limited special events and challenges

-- Create seasonal events table
CREATE TABLE IF NOT EXISTS seasonal_events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  season TEXT NOT NULL, -- spring, summer, fall, winter, new_year, custom
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT false,
  icon TEXT DEFAULT '🎉',
  theme_colors JSONB DEFAULT '{"primary": "#FFD93D", "secondary": "#FF6B6B"}'::jsonb,
  special_rewards JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create seasonal challenges table
CREATE TABLE IF NOT EXISTS seasonal_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL REFERENCES seasonal_events(id) ON DELETE CASCADE,
  challenge_name TEXT NOT NULL,
  challenge_description TEXT NOT NULL,
  challenge_type TEXT NOT NULL, -- daily_streak, quest_count, level_up, social, community
  target_value INTEGER NOT NULL,
  xp_reward INTEGER DEFAULT 0,
  gold_reward INTEGER DEFAULT 0,
  special_reward TEXT,
  difficulty TEXT DEFAULT 'medium'
);

-- Create user seasonal progress table
CREATE TABLE IF NOT EXISTS user_seasonal_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL REFERENCES seasonal_events(id),
  challenge_id UUID REFERENCES seasonal_challenges(id),
  progress INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  rewards_claimed BOOLEAN DEFAULT false,
  UNIQUE(user_id, challenge_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_seasonal_events_active ON seasonal_events(is_active, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_seasonal_challenges_event ON seasonal_challenges(event_id);
CREATE INDEX IF NOT EXISTS idx_user_seasonal_progress_user ON user_seasonal_progress(user_id, event_id);

-- Seed seasonal events
INSERT INTO seasonal_events (id, name, description, season, start_date, end_date, is_active, icon, special_rewards) VALUES
  ('new_year_2025', 'New Year, New Hero', 'Start the year with purpose and power', 'new_year', '2025-01-01', '2025-01-31', false, '🎊', '{"badge": "new_year_champion", "title": "New Year Hero"}'::jsonb),
  ('spring_awakening', 'Spring Awakening', 'Embrace growth and renewal', 'spring', '2025-03-01', '2025-05-31', false, '🌸', '{"badge": "spring_champion", "title": "Herald of Spring"}'::jsonb),
  ('summer_challenge', 'Summer of Champions', 'Rise to your peak potential', 'summer', '2025-06-01', '2025-08-31', false, '☀️', '{"badge": "summer_champion", "title": "Summer Legend"}'::jsonb),
  ('fall_harvest', 'Harvest of Heroes', 'Reap what you''ve sown', 'fall', '2025-09-01', '2025-11-30', false, '🍂', '{"badge": "fall_champion", "title": "Harvest Hero"}'::jsonb),
  ('winter_trials', 'Winter Trials', 'Prove your dedication in the coldest months', 'winter', '2025-12-01', '2026-02-28', false, '❄️', '{"badge": "winter_warrior", "title": "Winter Warrior"}'::jsonb),
  ('founders_month', 'Founders'' Legacy', 'Limited-time founder celebration', 'custom', '2024-11-01', '2024-12-31', true, '👑', '{"badge": "founder", "bonus_xp_multiplier": 1.5}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Seed seasonal challenges
INSERT INTO seasonal_challenges (event_id, challenge_name, challenge_description, challenge_type, target_value, xp_reward, gold_reward, special_reward, difficulty) VALUES
  -- New Year Challenges
  ('new_year_2025', 'Fresh Start Streak', 'Complete 7 quests in the first week of the year', 'quest_count', 7, 500, 100, 'special_badge', 'easy'),
  ('new_year_2025', 'Resolution Master', 'Maintain a 14-day streak in January', 'daily_streak', 14, 1000, 200, 'special_title', 'medium'),
  ('new_year_2025', 'New Heights', 'Gain 3 levels in January', 'level_up', 3, 750, 150, NULL, 'medium'),

  -- Spring Challenges
  ('spring_awakening', 'Spring Cleaning', 'Complete 30 quests during spring', 'quest_count', 30, 1500, 300, 'spring_badge', 'medium'),
  ('spring_awakening', 'Growth Spurt', 'Gain 5 levels during spring', 'level_up', 5, 2000, 400, 'growth_title', 'hard'),

  -- Summer Challenges
  ('summer_challenge', 'Summer Heat Streak', 'Maintain a 30-day streak in summer', 'daily_streak', 30, 2000, 500, 'summer_badge', 'hard'),
  ('summer_challenge', 'Peak Performance', 'Complete 50 quests in summer', 'quest_count', 50, 2500, 600, 'champion_title', 'hard'),

  -- Fall Challenges
  ('fall_harvest', 'Autumn Achievement', 'Unlock 10 achievements in fall', 'achievement_count', 10, 1500, 300, 'fall_badge', 'medium'),
  ('fall_harvest', 'Harvest Moon', 'Maintain a 21-day streak in fall', 'daily_streak', 21, 1200, 250, NULL, 'medium'),

  -- Winter Challenges
  ('winter_trials', 'Winter Warrior', 'Complete 40 quests in winter', 'quest_count', 40, 2000, 450, 'winter_badge', 'hard'),
  ('winter_trials', 'Unbroken Ice', 'Never miss a day in December', 'daily_streak', 31, 3000, 750, 'legendary_title', 'epic'),

  -- Founder Challenges
  ('founders_month', 'Founding Hero', 'Complete 20 quests in November-December 2024', 'quest_count', 20, 1000, 500, 'founder_badge', 'medium'),
  ('founders_month', 'Original Adventurer', 'Reach level 10 during founder period', 'level_up', 10, 2000, 1000, 'founder_title', 'hard')
ON CONFLICT DO NOTHING;

-- Function to check and update seasonal progress
CREATE OR REPLACE FUNCTION update_seasonal_progress(p_user_id UUID)
RETURNS TABLE(
  challenges_completed INTEGER,
  new_rewards JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event RECORD;
  v_challenge RECORD;
  v_profile RECORD;
  v_user_progress RECORD;
  v_completed_count INTEGER := 0;
  v_new_rewards JSONB := '[]'::jsonb;
  v_quest_count INTEGER;
  v_level_gained INTEGER;
BEGIN
  -- Get user profile
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;

  -- Check all active seasonal events
  FOR v_event IN SELECT * FROM seasonal_events WHERE is_active = true
  LOOP
    -- Check each challenge in the event
    FOR v_challenge IN SELECT * FROM seasonal_challenges WHERE event_id = v_event.id
    LOOP
      -- Get or create progress record
      SELECT * INTO v_user_progress FROM user_seasonal_progress
      WHERE user_id = p_user_id AND challenge_id = v_challenge.id;

      -- Skip if already completed
      IF v_user_progress.completed THEN
        CONTINUE;
      END IF;

      -- Calculate progress based on challenge type
      CASE v_challenge.challenge_type
        WHEN 'quest_count' THEN
          -- Count quests during event period
          SELECT COUNT(*) INTO v_quest_count FROM quests
          WHERE user_id = p_user_id
          AND completed = true
          AND completed_at >= v_event.start_date::TIMESTAMPTZ
          AND completed_at <= (v_event.end_date::TIMESTAMPTZ + interval '1 day');

          -- Update or insert progress
          INSERT INTO user_seasonal_progress (user_id, event_id, challenge_id, progress)
          VALUES (p_user_id, v_event.id, v_challenge.id, v_quest_count)
          ON CONFLICT (user_id, challenge_id)
          DO UPDATE SET progress = v_quest_count;

          -- Check if completed
          IF v_quest_count >= v_challenge.target_value THEN
            UPDATE user_seasonal_progress
            SET completed = true, completed_at = NOW()
            WHERE user_id = p_user_id AND challenge_id = v_challenge.id;

            v_completed_count := v_completed_count + 1;
            v_new_rewards := v_new_rewards || jsonb_build_object(
              'challenge', v_challenge.challenge_name,
              'xp', v_challenge.xp_reward,
              'gold', v_challenge.gold_reward,
              'special', v_challenge.special_reward
            );

            -- Award rewards
            UPDATE profiles
            SET xp = xp + v_challenge.xp_reward, gold = gold + v_challenge.gold_reward
            WHERE id = p_user_id;
          END IF;

        WHEN 'daily_streak' THEN
          -- Check if current streak meets requirement
          IF v_profile.current_streak >= v_challenge.target_value THEN
            INSERT INTO user_seasonal_progress (user_id, event_id, challenge_id, progress, completed, completed_at)
            VALUES (p_user_id, v_event.id, v_challenge.id, v_profile.current_streak, true, NOW())
            ON CONFLICT (user_id, challenge_id)
            DO UPDATE SET completed = true, completed_at = NOW(), progress = v_profile.current_streak;

            v_completed_count := v_completed_count + 1;
            v_new_rewards := v_new_rewards || jsonb_build_object(
              'challenge', v_challenge.challenge_name,
              'xp', v_challenge.xp_reward,
              'gold', v_challenge.gold_reward,
              'special', v_challenge.special_reward
            );

            UPDATE profiles
            SET xp = xp + v_challenge.xp_reward, gold = gold + v_challenge.gold_reward
            WHERE id = p_user_id;
          END IF;

        WHEN 'level_up' THEN
          -- This would need historical level tracking - simplified for now
          IF v_profile.level >= v_challenge.target_value THEN
            INSERT INTO user_seasonal_progress (user_id, event_id, challenge_id, progress, completed, completed_at)
            VALUES (p_user_id, v_event.id, v_challenge.id, v_profile.level, true, NOW())
            ON CONFLICT (user_id, challenge_id)
            DO UPDATE SET completed = true, completed_at = NOW(), progress = v_profile.level;

            v_completed_count := v_completed_count + 1;
            v_new_rewards := v_new_rewards || jsonb_build_object(
              'challenge', v_challenge.challenge_name,
              'xp', v_challenge.xp_reward,
              'gold', v_challenge.gold_reward,
              'special', v_challenge.special_reward
            );

            UPDATE profiles
            SET xp = xp + v_challenge.xp_reward, gold = gold + v_challenge.gold_reward
            WHERE id = p_user_id;
          END IF;
      END CASE;
    END LOOP;
  END LOOP;

  RETURN QUERY SELECT v_completed_count, v_new_rewards;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_seasonal_progress TO authenticated;

-- RLS
ALTER TABLE seasonal_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasonal_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_seasonal_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view seasonal events"
  ON seasonal_events FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view seasonal challenges"
  ON seasonal_challenges FOR SELECT
  USING (true);

CREATE POLICY "Users can view their own seasonal progress"
  ON user_seasonal_progress FOR SELECT
  USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE seasonal_events IS 'Time-limited seasonal events and celebrations';
COMMENT ON TABLE seasonal_challenges IS 'Challenges within seasonal events';
COMMENT ON TABLE user_seasonal_progress IS 'Tracks user progress in seasonal challenges';
COMMENT ON FUNCTION update_seasonal_progress IS 'Checks and updates user progress in active seasonal challenges';
