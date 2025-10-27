-- ARC RPG Security & Performance Migrations
-- Run this file in your Supabase SQL Editor

-- ============================================
-- PERFORMANCE INDEXES
-- ============================================

-- Index for user quest lookups (most common query)
CREATE INDEX IF NOT EXISTS idx_quests_user_id_created_at
ON quests(user_id, created_at DESC);

-- Index for completed quests lookups
CREATE INDEX IF NOT EXISTS idx_quests_user_id_completed
ON quests(user_id, completed, completed_at DESC);

-- Index for premium user count (used frequently in checkout)
CREATE INDEX IF NOT EXISTS idx_profiles_is_premium
ON profiles(is_premium)
WHERE is_premium = true;

CREATE INDEX IF NOT EXISTS idx_profiles_subscription_active
ON profiles(subscription_status)
WHERE subscription_status = 'active';

-- Composite index for profile lookups
CREATE INDEX IF NOT EXISTS idx_profiles_id_archetype
ON profiles(id, archetype);

-- Index for Stripe session lookups (payment verification)
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_session_id
ON profiles(stripe_session_id)
WHERE stripe_session_id IS NOT NULL;

-- ============================================
-- SCHEMA UPDATES
-- ============================================

-- Add new columns for payment tracking if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='profiles' AND column_name='stripe_session_id'
    ) THEN
        ALTER TABLE profiles ADD COLUMN stripe_session_id TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='profiles' AND column_name='stripe_customer_id'
    ) THEN
        ALTER TABLE profiles ADD COLUMN stripe_customer_id TEXT;
    END IF;
END $$;

-- ============================================
-- DATABASE FUNCTIONS FOR SECURITY
-- ============================================

-- Function to safely claim founder spot (prevents race conditions)
DROP FUNCTION IF EXISTS claim_founder_spot(uuid);

CREATE OR REPLACE FUNCTION claim_founder_spot(user_id_param uuid)
RETURNS TABLE(can_claim boolean, current_count integer, failure_reason text)
SECURITY DEFINER
AS $$
DECLARE
  premium_count integer := 0;
  user_subscription text;
BEGIN
  -- Lock the profiles table to prevent race conditions
  -- This ensures only one transaction can check/modify at a time
  LOCK TABLE profiles IN SHARE ROW EXCLUSIVE MODE;

  -- Check if user already has an active subscription
  SELECT subscription_status INTO user_subscription
  FROM profiles
  WHERE id = user_id_param;

  IF user_subscription = 'active' THEN
    RETURN QUERY SELECT false, 0, 'already_premium';
    RETURN;
  END IF;

  -- Count current active premium users
  SELECT COUNT(*) INTO premium_count
  FROM profiles
  WHERE subscription_status = 'active';

  -- Return whether spot can be claimed and current count
  IF premium_count >= 25 THEN
    RETURN QUERY SELECT false, premium_count::integer, 'sold_out';
  ELSE
    RETURN QUERY SELECT true, premium_count::integer, 'available';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on profiles table if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can only view their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Users can only update their own profile (excluding premium fields)
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Enable RLS on quests table
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;

-- Users can only view their own quests
DROP POLICY IF EXISTS "Users can view own quests" ON quests;
CREATE POLICY "Users can view own quests"
ON quests FOR SELECT
USING (auth.uid() = user_id);

-- Users can only insert their own quests
DROP POLICY IF EXISTS "Users can insert own quests" ON quests;
CREATE POLICY "Users can insert own quests"
ON quests FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can only update their own quests
DROP POLICY IF EXISTS "Users can update own quests" ON quests;
CREATE POLICY "Users can update own quests"
ON quests FOR UPDATE
USING (auth.uid() = user_id);

-- Users can only delete their own quests
DROP POLICY IF EXISTS "Users can delete own quests" ON quests;
CREATE POLICY "Users can delete own quests"
ON quests FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- AUDIT LOGGING
-- ============================================

-- Create audit log table for payment events
CREATE TABLE IF NOT EXISTS payment_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  event_type text NOT NULL,
  stripe_session_id text,
  stripe_customer_id text,
  amount integer,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Index for audit log queries
CREATE INDEX IF NOT EXISTS idx_payment_audit_log_user_id_created
ON payment_audit_log(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_audit_log_event_type
ON payment_audit_log(event_type, created_at DESC);

-- Function to log payment events
CREATE OR REPLACE FUNCTION log_payment_event(
  user_id_param uuid,
  event_type_param text,
  stripe_session_id_param text DEFAULT NULL,
  stripe_customer_id_param text DEFAULT NULL,
  amount_param integer DEFAULT NULL,
  metadata_param jsonb DEFAULT NULL
)
RETURNS uuid
SECURITY DEFINER
AS $$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO payment_audit_log (
    user_id,
    event_type,
    stripe_session_id,
    stripe_customer_id,
    amount,
    metadata
  ) VALUES (
    user_id_param,
    event_type_param,
    stripe_session_id_param,
    stripe_customer_id_param,
    amount_param,
    metadata_param
  )
  RETURNING id INTO log_id;

  RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PREMIUM FIELD GUARDS
-- ============================================

CREATE OR REPLACE FUNCTION enforce_premium_field_guard()
RETURNS trigger
SECURITY DEFINER
AS $$
DECLARE
  requester_role text := coalesce(current_setting('request.jwt.claim.role', true), '');
BEGIN
  -- Ensure non-service callers cannot tamper with premium fields
  IF requester_role <> 'service_role' THEN
    IF TG_OP = 'INSERT' THEN
      NEW.is_premium := false;
      NEW.subscription_status := coalesce(NEW.subscription_status, 'inactive');
      NEW.stripe_session_id := NULL;
      NEW.stripe_customer_id := NULL;
      NEW.premium_since := NULL;
    ELSE
      IF NEW.is_premium IS DISTINCT FROM OLD.is_premium
        OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
        OR NEW.stripe_session_id IS DISTINCT FROM OLD.stripe_session_id
        OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
        OR NEW.premium_since IS DISTINCT FROM OLD.premium_since THEN
          RAISE EXCEPTION 'Only privileged service role may modify premium fields';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_premium_field_guard_update ON profiles;
CREATE TRIGGER trg_enforce_premium_field_guard_update
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION enforce_premium_field_guard();

DROP TRIGGER IF EXISTS trg_enforce_premium_field_guard_insert ON profiles;
CREATE TRIGGER trg_enforce_premium_field_guard_insert
BEFORE INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION enforce_premium_field_guard();

-- ============================================
-- SECURITY CONSTRAINTS
-- ============================================

-- Ensure premium users have a premium_since date
ALTER TABLE profiles
ADD CONSTRAINT check_premium_since
CHECK (
  (is_premium = false AND premium_since IS NULL)
  OR
  (is_premium = true AND premium_since IS NOT NULL)
);

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON INDEX idx_quests_user_id_created_at IS 'Speeds up dashboard quest queries';
COMMENT ON INDEX idx_quests_user_id_completed IS 'Speeds up history page queries';
COMMENT ON INDEX idx_profiles_is_premium IS 'Legacy index retained for backward compatibility checks';
COMMENT ON INDEX idx_profiles_subscription_active IS 'Speeds up founder spot availability checks';
COMMENT ON FUNCTION claim_founder_spot IS 'Thread-safe function to check and claim founder spots';
COMMENT ON TABLE payment_audit_log IS 'Audit trail for all payment-related events';

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant execute permission on functions to authenticated users
GRANT EXECUTE ON FUNCTION claim_founder_spot(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION log_payment_event TO service_role;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Run these queries to verify the migration was successful:

-- Check indexes
-- SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename, indexname;

-- Check RLS policies
-- SELECT tablename, policyname, cmd, qual FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;

-- Check current premium count
-- SELECT COUNT(*) as premium_users FROM profiles WHERE is_premium = true;

-- Test founder spot claim function
-- SELECT * FROM claim_founder_spot('00000000-0000-0000-0000-000000000000');
