-- Add backstory column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS backstory TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_backstory ON profiles(id) WHERE backstory IS NOT NULL;
