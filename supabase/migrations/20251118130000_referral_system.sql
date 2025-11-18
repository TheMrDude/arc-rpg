-- Referral System Migration
-- Enables viral growth through referral tracking and rewards

-- Create referral codes table
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  total_uses INTEGER DEFAULT 0,
  total_rewards_earned INTEGER DEFAULT 0
);

-- Create referrals table to track who referred whom
CREATE TABLE IF NOT EXISTS referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  completed BOOLEAN DEFAULT false, -- true when referred user completes qualification (e.g., first quest)
  reward_granted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(referred_id) -- Each user can only be referred once
);

-- Create quest shares table for social sharing tracking
CREATE TABLE IF NOT EXISTS quest_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_id UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- 'twitter', 'facebook', 'linkedin', 'copy_link'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add referral-related columns to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS referred_by_code TEXT,
ADD COLUMN IF NOT EXISTS referral_bonus_xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_referrals INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_daily_reward TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS streak_updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_referral_codes_user_id ON referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_quest_shares_user_id ON quest_shares(user_id);

-- RLS Policies for referral_codes
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own referral codes" ON referral_codes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own referral codes" ON referral_codes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own referral codes" ON referral_codes
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for referrals
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view referrals they made" ON referrals
  FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "Anyone can create a referral record" ON referrals
  FOR INSERT WITH CHECK (true);

-- RLS Policies for quest_shares
ALTER TABLE quest_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own quest shares" ON quest_shares
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own quest shares" ON quest_shares
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code(user_id_input UUID)
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate a random 8-character alphanumeric code
    new_code := upper(substring(md5(random()::text || user_id_input::text) from 1 for 8));

    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM referral_codes WHERE code = new_code) INTO code_exists;

    EXIT WHEN NOT code_exists;
  END LOOP;

  RETURN new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create referral code for new users (trigger)
CREATE OR REPLACE FUNCTION create_referral_code_for_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_code TEXT;
BEGIN
  -- Generate unique code
  new_code := generate_referral_code(NEW.id);

  -- Insert referral code
  INSERT INTO referral_codes (user_id, code)
  VALUES (NEW.id, new_code);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create referral code when profile is created
CREATE TRIGGER on_profile_created_create_referral_code
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_referral_code_for_new_user();

-- Function to process completed referral (when referred user completes first quest)
CREATE OR REPLACE FUNCTION process_completed_referral(referred_user_id UUID)
RETURNS void AS $$
DECLARE
  referral_record RECORD;
  referrer_profile RECORD;
  reward_xp INTEGER := 100; -- XP reward for successful referral
BEGIN
  -- Find the referral record
  SELECT * INTO referral_record
  FROM referrals
  WHERE referred_id = referred_user_id AND completed = false
  LIMIT 1;

  IF referral_record.id IS NOT NULL THEN
    -- Mark referral as completed
    UPDATE referrals
    SET completed = true,
        completed_at = now(),
        reward_granted = true
    WHERE id = referral_record.id;

    -- Grant reward to referrer
    UPDATE profiles
    SET
      xp = xp + reward_xp,
      referral_bonus_xp = referral_bonus_xp + reward_xp,
      total_referrals = total_referrals + 1
    WHERE id = referral_record.referrer_id;

    -- Update referral code stats
    UPDATE referral_codes
    SET
      total_uses = total_uses + 1,
      total_rewards_earned = total_rewards_earned + reward_xp
    WHERE code = referral_record.referral_code;

    -- Check if referrer leveled up
    SELECT * INTO referrer_profile FROM profiles WHERE id = referral_record.referrer_id;

    IF referrer_profile.xp >= (referrer_profile.level * 100) THEN
      UPDATE profiles
      SET level = level + 1
      WHERE id = referral_record.referrer_id;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
