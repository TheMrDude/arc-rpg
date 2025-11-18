-- Seasonal Events System
-- Time-limited events with exclusive rewards and FOMO mechanics

CREATE TABLE IF NOT EXISTS seasonal_events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  theme TEXT, -- 'winter', 'founders_month', 'halloween', etc.
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  banner_image_url TEXT,
  background_color TEXT,
  icon TEXT,
  lore TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS seasonal_challenges (
  id TEXT PRIMARY KEY,
  event_id TEXT REFERENCES seasonal_events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  challenge_type TEXT CHECK (challenge_type IN ('daily', 'weekly', 'milestone', 'leaderboard')),
  requirement_type TEXT, -- 'quest_count', 'gold_earned', 'streak_days', etc.
  requirement_value INTEGER,
  reward_type TEXT CHECK (reward_type IN ('badge', 'title', 'gold', 'xp', 'item', 'premium_currency')),
  reward_value TEXT, -- JSON string or simple value
  is_repeatable BOOLEAN DEFAULT FALSE,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard', 'extreme')),
  points INTEGER DEFAULT 10, -- event points for leaderboard
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS seasonal_rewards (
  id TEXT PRIMARY KEY,
  event_id TEXT REFERENCES seasonal_events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  reward_type TEXT,
  cost_event_points INTEGER, -- cost in event currency
  limited_quantity INTEGER, -- NULL = unlimited
  remaining_quantity INTEGER,
  icon TEXT,
  rarity TEXT CHECK (rarity IN ('common', 'rare', 'epic', 'legendary', 'exclusive')),
  metadata JSONB -- additional reward data
);

CREATE TABLE IF NOT EXISTS user_seasonal_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id TEXT REFERENCES seasonal_events(id) ON DELETE CASCADE,
  event_points INTEGER DEFAULT 0,
  challenges_completed INTEGER DEFAULT 0,
  rewards_claimed JSONB DEFAULT '[]'::JSONB, -- array of reward IDs
  first_participation TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, event_id)
);

CREATE TABLE IF NOT EXISTS user_seasonal_challenge_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id TEXT REFERENCES seasonal_challenges(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  times_completed INTEGER DEFAULT 0, -- for repeatable challenges
  UNIQUE(user_id, challenge_id)
);

-- Seed Founders Month Event
INSERT INTO seasonal_events (id, name, description, theme, start_date, end_date, is_active, icon, lore) VALUES
  ('founders_month', 'Founders Month', 'Celebrate the founding of the realm with exclusive challenges and legendary rewards!', 'founders', '2025-11-01', '2025-11-30', FALSE, '🎊', 'In the beginning, heroes rose to forge a new world. Honor their legacy.');

-- Seed Founders Month Challenges
INSERT INTO seasonal_challenges (id, event_id, title, description, challenge_type, requirement_type, requirement_value, reward_type, reward_value, difficulty, points) VALUES
  ('fm_daily_quest', 'founders_month', 'Daily Dedication', 'Complete 1 quest today', 'daily', 'quest_count', 1, 'gold', '100', 'easy', 10),
  ('fm_weekly_warrior', 'founders_month', 'Weekly Warrior', 'Complete 10 quests this week', 'weekly', 'quest_count', 10, 'badge', 'weekly_champion', 'medium', 50),
  ('fm_legend_10', 'founders_month', 'Rise of a Legend', 'Reach level 10 during the event', 'milestone', 'level', 10, 'title', 'Founder', 'hard', 100),
  ('fm_streak_7', 'founders_month', 'Commitment Keeper', 'Maintain a 7-day streak', 'milestone', 'streak_days', 7, 'xp', '1000', 'medium', 75),
  ('fm_gold_master', 'founders_month', 'Gold Rush', 'Earn 5000 gold during the event', 'milestone', 'gold_earned', 5000, 'premium_currency', '500', 'hard', 150);

-- Seed Founders Month Rewards
INSERT INTO seasonal_rewards (id, event_id, name, description, reward_type, cost_event_points, limited_quantity, remaining_quantity, rarity) VALUES
  ('fm_badge_founder', 'founders_month', 'Founder Badge', 'Exclusive badge proving you were there at the beginning', 'badge', 100, NULL, NULL, 'legendary'),
  ('fm_title_pioneer', 'founders_month', 'Pioneer Title', 'Display "Pioneer" as your title', 'title', 200, NULL, NULL, 'epic'),
  ('fm_avatar_frame', 'founders_month', 'Founders Frame', 'Exclusive golden avatar frame', 'cosmetic', 300, NULL, NULL, 'legendary'),
  ('fm_pet_phoenix', 'founders_month', 'Phoenix Companion', 'A legendary phoenix pet (SUPER RARE!)', 'pet', 1000, 50, 50, 'exclusive');

-- Function to check and update seasonal challenge progress
CREATE OR REPLACE FUNCTION update_seasonal_challenge_progress(
  p_user_id UUID,
  p_event_id TEXT,
  p_requirement_type TEXT,
  p_increment INTEGER DEFAULT 1
)
RETURNS VOID AS $$
DECLARE
  v_challenge RECORD;
BEGIN
  -- Loop through active challenges of this type
  FOR v_challenge IN
    SELECT c.*
    FROM seasonal_challenges c
    JOIN seasonal_events e ON e.id = c.event_id
    WHERE c.event_id = p_event_id
      AND c.requirement_type = p_requirement_type
      AND e.is_active = TRUE
  LOOP
    -- Update or create progress
    INSERT INTO user_seasonal_challenge_progress (user_id, challenge_id, progress)
    VALUES (p_user_id, v_challenge.id, p_increment)
    ON CONFLICT (user_id, challenge_id) DO UPDATE
    SET progress = user_seasonal_challenge_progress.progress + p_increment;

    -- Check if challenge is now complete
    UPDATE user_seasonal_challenge_progress
    SET
      completed = TRUE,
      completed_at = NOW(),
      times_completed = times_completed + 1
    WHERE user_id = p_user_id
      AND challenge_id = v_challenge.id
      AND progress >= v_challenge.requirement_value
      AND completed = FALSE;

    -- Award event points if newly completed
    IF (SELECT completed FROM user_seasonal_challenge_progress WHERE user_id = p_user_id AND challenge_id = v_challenge.id) THEN
      INSERT INTO user_seasonal_progress (user_id, event_id, event_points, challenges_completed)
      VALUES (p_user_id, p_event_id, v_challenge.points, 1)
      ON CONFLICT (user_id, event_id) DO UPDATE
      SET
        event_points = user_seasonal_progress.event_points + v_challenge.points,
        challenges_completed = user_seasonal_progress.challenges_completed + 1,
        last_activity = NOW();
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to claim seasonal reward
CREATE OR REPLACE FUNCTION claim_seasonal_reward(p_user_id UUID, p_reward_id TEXT)
RETURNS JSONB AS $$
DECLARE
  v_reward RECORD;
  v_user_points INTEGER;
  v_event_id TEXT;
BEGIN
  -- Get reward details
  SELECT * INTO v_reward FROM seasonal_rewards WHERE id = p_reward_id;

  IF v_reward IS NULL THEN
    RETURN jsonb_build_object('error', 'Reward not found');
  END IF;

  -- Check if event is active
  IF NOT EXISTS (SELECT 1 FROM seasonal_events WHERE id = v_reward.event_id AND is_active = TRUE) THEN
    RETURN jsonb_build_object('error', 'Event is not active');
  END IF;

  -- Check if user has enough points
  SELECT event_points, event_id INTO v_user_points, v_event_id
  FROM user_seasonal_progress
  WHERE user_id = p_user_id AND event_id = v_reward.event_id;

  IF v_user_points < v_reward.cost_event_points THEN
    RETURN jsonb_build_object('error', 'Insufficient event points');
  END IF;

  -- Check if limited quantity available
  IF v_reward.limited_quantity IS NOT NULL AND v_reward.remaining_quantity <= 0 THEN
    RETURN jsonb_build_object('error', 'Reward sold out');
  END IF;

  -- Deduct points
  UPDATE user_seasonal_progress
  SET
    event_points = event_points - v_reward.cost_event_points,
    rewards_claimed = rewards_claimed || jsonb_build_object('reward_id', p_reward_id, 'claimed_at', NOW())
  WHERE user_id = p_user_id AND event_id = v_reward.event_id;

  -- Decrease quantity if limited
  IF v_reward.limited_quantity IS NOT NULL THEN
    UPDATE seasonal_rewards
    SET remaining_quantity = remaining_quantity - 1
    WHERE id = p_reward_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'reward_name', v_reward.name,
    'reward_type', v_reward.reward_type
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-track quest completions for seasonal events
CREATE OR REPLACE FUNCTION track_seasonal_quest_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Update seasonal challenge progress for active events
  PERFORM update_seasonal_challenge_progress(
    NEW.user_id,
    e.id,
    'quest_count',
    1
  )
  FROM seasonal_events e
  WHERE e.is_active = TRUE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_seasonal_quest_tracking
AFTER UPDATE ON user_quests
FOR EACH ROW
WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
EXECUTE FUNCTION track_seasonal_quest_completion();

-- RLS Policies
ALTER TABLE seasonal_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasonal_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasonal_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_seasonal_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_seasonal_challenge_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active seasonal events are public" ON seasonal_events FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Seasonal challenges are public" ON seasonal_challenges FOR SELECT USING (true);
CREATE POLICY "Seasonal rewards are public" ON seasonal_rewards FOR SELECT USING (true);
CREATE POLICY "Users can view their seasonal progress" ON user_seasonal_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their seasonal progress" ON user_seasonal_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view their challenge progress" ON user_seasonal_challenge_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their challenge progress" ON user_seasonal_challenge_progress FOR ALL USING (auth.uid() = user_id);
