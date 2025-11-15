-- Daily Login Bonus System
-- Rewards users for returning each day to increase retention

-- Add daily bonus columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_daily_bonus_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_bonus_streak INTEGER DEFAULT 0;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_last_daily_bonus ON profiles(last_daily_bonus_at);

-- Comments
COMMENT ON COLUMN profiles.last_daily_bonus_at IS 'Last time user claimed daily login bonus';
COMMENT ON COLUMN profiles.daily_bonus_streak IS 'Current consecutive days of claiming daily bonus';
