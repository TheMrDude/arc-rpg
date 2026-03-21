ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz DEFAULT NULL;
