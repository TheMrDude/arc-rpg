-- Add skill point tracking columns to profiles table
-- Users get 1 skill point every 5 levels (at levels 5, 10, 15, 20, etc.)

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS skill_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_skill_points_earned INTEGER DEFAULT 0;

-- Create index for skill point queries
CREATE INDEX IF NOT EXISTS idx_profiles_skill_points ON profiles(skill_points) WHERE skill_points > 0;

-- Backfill skill points for existing users based on their current level
-- This ensures users who are already at level 5+ get their deserved skill points
UPDATE profiles
SET
  skill_points = FLOOR(level / 5),
  total_skill_points_earned = FLOOR(level / 5)
WHERE
  level >= 5
  AND (skill_points IS NULL OR skill_points = 0);

-- Create unlocked_skills table if it doesn't exist
CREATE TABLE IF NOT EXISTS unlocked_skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL,
  skill_tree TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, skill_id)
);

-- Create index for skill lookups
CREATE INDEX IF NOT EXISTS idx_unlocked_skills_user_id ON unlocked_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_unlocked_skills_skill_tree ON unlocked_skills(user_id, skill_tree);

-- RLS policies for unlocked_skills
ALTER TABLE unlocked_skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own unlocked skills" ON unlocked_skills;
CREATE POLICY "Users can view their own unlocked skills"
  ON unlocked_skills FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own unlocked skills" ON unlocked_skills;
CREATE POLICY "Users can insert their own unlocked skills"
  ON unlocked_skills FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Comment documenting the skill point system
COMMENT ON COLUMN profiles.skill_points IS 'Available skill points to spend in skill tree. Users earn 1 point every 5 levels.';
COMMENT ON COLUMN profiles.total_skill_points_earned IS 'Total skill points earned over lifetime (for tracking/achievements).';
