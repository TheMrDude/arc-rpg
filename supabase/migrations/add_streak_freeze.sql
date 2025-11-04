-- Add Streak Freeze System to HabitQuest
-- This implements Duolingo's "Streak Freeze" mechanic to reduce churn by 21%

-- Add streak freeze columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS streak_freeze_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS streak_freeze_active BOOLEAN DEFAULT false;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_streak_freeze
ON profiles(streak_freeze_active, last_activity_date);

-- Add comments for documentation
COMMENT ON COLUMN profiles.streak_freeze_count IS 'Number of streak freezes the user has banked (purchased but not yet used)';
COMMENT ON COLUMN profiles.streak_freeze_active IS 'Whether a streak freeze is currently protecting the user''s streak';

-- Create a function to automatically activate streak freeze when needed
CREATE OR REPLACE FUNCTION check_and_activate_streak_freeze()
RETURNS TRIGGER AS $$
BEGIN
  -- If user has missed a day and has freeze available, activate it
  IF NEW.last_activity_date < (CURRENT_DATE - INTERVAL '1 day')
     AND NEW.streak_freeze_count > 0
     AND NEW.streak_freeze_active = false
  THEN
    NEW.streak_freeze_active := true;
    NEW.streak_freeze_count := NEW.streak_freeze_count - 1;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-activate freeze
DROP TRIGGER IF EXISTS activate_streak_freeze_trigger ON profiles;
CREATE TRIGGER activate_streak_freeze_trigger
  BEFORE UPDATE OF last_activity_date ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_and_activate_streak_freeze();

-- Create a function to purchase streak freeze
CREATE OR REPLACE FUNCTION purchase_streak_freeze(user_id UUID)
RETURNS JSON AS $$
DECLARE
  current_xp INTEGER;
  freeze_cost INTEGER := 50;
  result JSON;
BEGIN
  -- Get current XP
  SELECT xp INTO current_xp FROM profiles WHERE id = user_id;

  -- Check if user has enough XP
  IF current_xp < freeze_cost THEN
    result := json_build_object(
      'success', false,
      'error', 'Insufficient XP',
      'current_xp', current_xp,
      'required_xp', freeze_cost
    );
    RETURN result;
  END IF;

  -- Deduct XP and add freeze
  UPDATE profiles
  SET
    xp = xp - freeze_cost,
    streak_freeze_count = streak_freeze_count + 1
  WHERE id = user_id
  RETURNING xp, streak_freeze_count INTO current_xp, result;

  result := json_build_object(
    'success', true,
    'new_xp', current_xp,
    'freeze_count', (SELECT streak_freeze_count FROM profiles WHERE id = user_id)
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check streak status
CREATE OR REPLACE FUNCTION check_streak_status(user_id UUID)
RETURNS JSON AS $$
DECLARE
  user_profile RECORD;
  days_since_activity INTEGER;
  result JSON;
BEGIN
  -- Get user profile
  SELECT * INTO user_profile FROM profiles WHERE id = user_id;

  -- Calculate days since last activity
  days_since_activity := CURRENT_DATE - user_profile.last_activity_date;

  -- Determine streak status
  IF days_since_activity = 0 THEN
    -- User is active today, streak is safe
    result := json_build_object(
      'status', 'safe',
      'streak_count', user_profile.streak_count,
      'message', 'Your streak is active!'
    );
  ELSIF days_since_activity = 1 THEN
    IF user_profile.streak_freeze_active THEN
      -- Streak was saved by freeze
      result := json_build_object(
        'status', 'froze',
        'streak_count', user_profile.streak_count,
        'message', 'Your streak freeze protected your progress!',
        'freeze_used', true
      );

      -- Deactivate the freeze
      UPDATE profiles
      SET streak_freeze_active = false
      WHERE id = user_id;
    ELSE
      -- Streak is broken
      result := json_build_object(
        'status', 'broke',
        'streak_count', 0,
        'previous_streak', user_profile.streak_count,
        'message', 'Your streak has ended. Start a new one today!'
      );

      -- Reset streak
      UPDATE profiles
      SET streak_count = 0
      WHERE id = user_id;
    END IF;
  ELSE
    -- Multiple days missed, streak is definitely broken
    result := json_build_object(
      'status', 'broke',
      'streak_count', 0,
      'previous_streak', user_profile.streak_count,
      'message', 'Your streak has ended. Start a new one today!'
    );

    -- Reset streak
    UPDATE profiles
    SET
      streak_count = 0,
      streak_freeze_active = false
    WHERE id = user_id;
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION purchase_streak_freeze(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_streak_status(UUID) TO authenticated;

-- Insert test data for development (optional, remove in production)
-- UPDATE profiles SET xp = 1000 WHERE id IN (SELECT id FROM profiles LIMIT 5);
