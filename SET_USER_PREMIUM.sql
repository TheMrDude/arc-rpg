-- Set user as premium to access skill tree and other premium features
-- Run this in Supabase SQL Editor

UPDATE profiles
SET is_premium = true
WHERE id = '42dc28c1-246b-4f09-8a3b-80aa532af24d';

-- Verify it worked
SELECT id, email, is_admin, is_premium, subscription_status, level, skill_points, total_skill_points_earned
FROM profiles
WHERE id = '42dc28c1-246b-4f09-8a3b-80aa532af24d';
