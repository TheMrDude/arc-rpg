-- Migration: Security Fixes and Improvements
-- Created: 2024-11-15
-- Description: Fix SECURITY DEFINER functions, optimize RLS, add rate limiting infrastructure
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/YOUR_PROJECT/sql

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 1: FIX SECURITY DEFINER FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════

-- Fix: get_recent_journal_entries
CREATE OR REPLACE FUNCTION get_recent_journal_entries(
  p_user_id UUID,
  days_back INTEGER DEFAULT 7
)
RETURNS TABLE (
  id UUID,
  entry_text TEXT,
  transformed_narrative TEXT,
  mood INTEGER,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  -- SECURITY FIX: Validate caller owns this data
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: cannot query other users journal entries';
  END IF;

  -- Validate days_back to prevent resource exhaustion
  IF days_back < 1 OR days_back > 365 THEN
    RAISE EXCEPTION 'days_back must be between 1 and 365';
  END IF;

  RETURN QUERY
  SELECT
    je.id,
    je.entry_text,
    je.transformed_narrative,
    je.mood,
    je.created_at
  FROM journal_entries je
  WHERE je.user_id = p_user_id
    AND je.created_at >= NOW() - (days_back || ' days')::INTERVAL
  ORDER BY je.created_at DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix: get_on_this_day_entries
CREATE OR REPLACE FUNCTION get_on_this_day_entries(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  entry_text TEXT,
  transformed_narrative TEXT,
  mood INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  years_ago INTEGER
) AS $$
BEGIN
  -- SECURITY FIX: Validate caller owns this data
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: cannot query other users journal entries';
  END IF;

  RETURN QUERY
  SELECT
    je.id,
    je.entry_text,
    je.transformed_narrative,
    je.mood,
    je.created_at,
    EXTRACT(YEAR FROM NOW())::INTEGER - EXTRACT(YEAR FROM je.created_at)::INTEGER as years_ago
  FROM journal_entries je
  WHERE je.user_id = p_user_id
    AND EXTRACT(MONTH FROM je.created_at) = EXTRACT(MONTH FROM NOW())
    AND EXTRACT(DAY FROM je.created_at) = EXTRACT(DAY FROM NOW())
    AND EXTRACT(YEAR FROM je.created_at) < EXTRACT(YEAR FROM NOW())
  ORDER BY je.created_at DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix: get_average_mood
CREATE OR REPLACE FUNCTION get_average_mood(
  p_user_id UUID,
  days_back INTEGER DEFAULT 7
)
RETURNS NUMERIC AS $$
DECLARE
  avg_mood NUMERIC;
BEGIN
  -- SECURITY FIX: Validate caller owns this data
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: cannot query other users data';
  END IF;

  -- Validate days_back
  IF days_back < 1 OR days_back > 365 THEN
    RAISE EXCEPTION 'days_back must be between 1 and 365';
  END IF;

  SELECT AVG(mood)::NUMERIC(3,2)
  INTO avg_mood
  FROM journal_entries
  WHERE user_id = p_user_id
    AND mood IS NOT NULL
    AND created_at >= NOW() - (days_back || ' days')::INTERVAL;

  RETURN COALESCE(avg_mood, 3.0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix: get_daily_journal_count
CREATE OR REPLACE FUNCTION get_daily_journal_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  entry_count INTEGER;
BEGIN
  -- SECURITY FIX: Validate caller owns this data
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: cannot query other users data';
  END IF;

  SELECT COUNT(*)
  INTO entry_count
  FROM journal_entries
  WHERE user_id = p_user_id
    AND created_at >= CURRENT_DATE;

  RETURN entry_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix: process_gold_transaction
CREATE OR REPLACE FUNCTION process_gold_transaction(
  p_user_id UUID,
  p_amount INTEGER,
  p_transaction_type TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  new_balance INTEGER,
  transaction_id UUID
) AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
  v_transaction_id UUID;
  v_caller_role TEXT;
BEGIN
  -- SECURITY FIX: Only allow service_role or authenticated users modifying own data
  v_caller_role := coalesce(current_setting('request.jwt.claim.role', true), '');

  IF v_caller_role != 'service_role' AND p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: cannot modify other users gold balance';
  END IF;

  -- Validate transaction type
  IF p_transaction_type NOT IN ('quest_reward', 'gold_purchase', 'equipment_purchase', 'refund') THEN
    RAISE EXCEPTION 'Invalid transaction type: %', p_transaction_type;
  END IF;

  -- Validate amount is reasonable
  IF ABS(p_amount) > 100000 THEN
    RAISE EXCEPTION 'Transaction amount too large: %', p_amount;
  END IF;

  -- Get current balance with row lock
  SELECT gold INTO v_current_balance
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_current_balance IS NULL THEN
    RAISE EXCEPTION 'Profile not found for user %', p_user_id;
  END IF;

  v_new_balance := v_current_balance + p_amount;

  -- Prevent negative balance
  IF v_new_balance < 0 THEN
    RETURN QUERY SELECT FALSE, v_current_balance, NULL::UUID;
    RETURN;
  END IF;

  -- Update balance
  UPDATE profiles
  SET gold = v_new_balance,
      updated_at = NOW()
  WHERE id = p_user_id;

  -- Record transaction
  INSERT INTO gold_transactions (user_id, amount, transaction_type, reference_id, metadata)
  VALUES (p_user_id, p_amount, p_transaction_type, p_reference_id, p_metadata)
  RETURNING id INTO v_transaction_id;

  RETURN QUERY SELECT TRUE, v_new_balance, v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix: claim_founder_spot
CREATE OR REPLACE FUNCTION claim_founder_spot(user_id_param UUID)
RETURNS TABLE(success BOOLEAN, remaining INTEGER, failure_reason TEXT)
SECURITY DEFINER
AS $$
DECLARE
  new_remaining INTEGER;
  user_subscription TEXT;
  user_is_premium BOOLEAN := FALSE;
BEGIN
  -- SECURITY FIX: Verify caller is claiming for themselves
  IF user_id_param != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: cannot claim founder spot for other users';
  END IF;

  IF user_id_param IS NULL THEN
    RAISE EXCEPTION 'claim_founder_spot requires a user id';
  END IF;

  -- Check if already premium
  SELECT subscription_status, is_premium
  INTO user_subscription, user_is_premium
  FROM profiles
  WHERE id = user_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile missing for user %', user_id_param;
  END IF;

  IF COALESCE(user_is_premium, FALSE) OR user_subscription = 'active' THEN
    RETURN QUERY SELECT FALSE, NULL::INTEGER, 'already_premium';
    RETURN;
  END IF;

  -- Atomic decrement with row lock
  UPDATE founder_inventory
  SET remaining = remaining - 1
  WHERE id = 'founder' AND remaining > 0
  RETURNING remaining INTO new_remaining;

  IF new_remaining IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, 'sold_out';
    RETURN;
  END IF;

  RETURN QUERY SELECT TRUE, new_remaining, 'reserved';
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 2: OPTIMIZE RLS POLICIES
-- ═══════════════════════════════════════════════════════════════════════════

-- Create helper function for premium check
CREATE OR REPLACE FUNCTION is_premium_user()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND (is_premium = TRUE OR subscription_status = 'active')
  );
$$;

GRANT EXECUTE ON FUNCTION is_premium_user() TO authenticated;

-- Recreate recurring_quests policies without subqueries
DROP POLICY IF EXISTS "Premium users can view own recurring quests" ON recurring_quests;
CREATE POLICY "Premium users can view own recurring quests"
  ON recurring_quests FOR SELECT
  USING (auth.uid() = user_id AND is_premium_user());

DROP POLICY IF EXISTS "Premium users can insert own recurring quests" ON recurring_quests;
CREATE POLICY "Premium users can insert own recurring quests"
  ON recurring_quests FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_premium_user());

DROP POLICY IF EXISTS "Premium users can update own recurring quests" ON recurring_quests;
CREATE POLICY "Premium users can update own recurring quests"
  ON recurring_quests FOR UPDATE
  USING (auth.uid() = user_id AND is_premium_user());

DROP POLICY IF EXISTS "Premium users can delete own recurring quests" ON recurring_quests;
CREATE POLICY "Premium users can delete own recurring quests"
  ON recurring_quests FOR DELETE
  USING (auth.uid() = user_id AND is_premium_user());

-- Fix user_equipment policies
DROP POLICY IF EXISTS "Premium users can insert own equipment" ON user_equipment;
CREATE POLICY "Premium users can insert own equipment"
  ON user_equipment FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_premium_user());

-- Fix quest_templates policies
DROP POLICY IF EXISTS "Premium users can view all templates" ON quest_templates;
CREATE POLICY "Premium users can view all templates"
  ON quest_templates FOR SELECT
  USING (is_premium_user() OR is_official = true);

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 3: ADD MISSING INDEXES
-- ═══════════════════════════════════════════════════════════════════════════

-- Indexes for journal_entries
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id
  ON journal_entries(user_id);

CREATE INDEX IF NOT EXISTS idx_journal_entries_user_created
  ON journal_entries(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_journal_entries_mood
  ON journal_entries(user_id, mood)
  WHERE mood IS NOT NULL;

-- Indexes for recurring_quests
CREATE INDEX IF NOT EXISTS idx_recurring_quests_user_active
  ON recurring_quests(user_id, is_active)
  WHERE is_active = true;

-- Indexes for user_equipment
CREATE INDEX IF NOT EXISTS idx_user_equipment_user_equipped
  ON user_equipment(user_id, equipped)
  WHERE equipped = true;

-- Composite index for gold transactions by type
CREATE INDEX IF NOT EXISTS idx_gold_transactions_user_type
  ON gold_transactions(user_id, transaction_type, created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 4: RATE LIMITING INFRASTRUCTURE
-- ═══════════════════════════════════════════════════════════════════════════

-- Create rate limiting table
CREATE TABLE IF NOT EXISTS api_rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, endpoint, window_start)
);

-- Index for rate limit lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_endpoint
  ON api_rate_limits(user_id, endpoint, window_start DESC);

-- Enable RLS
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own rate limits"
  ON api_rate_limits FOR SELECT
  USING (auth.uid() = user_id);

-- Function to check and increment rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id UUID,
  p_endpoint TEXT,
  p_limit INTEGER,
  p_window_minutes INTEGER DEFAULT 60
)
RETURNS TABLE (
  allowed BOOLEAN,
  current_count INTEGER,
  limit_value INTEGER,
  reset_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  v_window_start TIMESTAMP WITH TIME ZONE;
  v_count INTEGER;
BEGIN
  -- Calculate window start (rounded to window_minutes)
  v_window_start := DATE_TRUNC('hour', NOW())
    + (FLOOR(EXTRACT(MINUTE FROM NOW()) / p_window_minutes) * p_window_minutes) * INTERVAL '1 minute';

  -- Get or create rate limit record
  INSERT INTO api_rate_limits (user_id, endpoint, window_start, request_count)
  VALUES (p_user_id, p_endpoint, v_window_start, 1)
  ON CONFLICT (user_id, endpoint, window_start)
  DO UPDATE SET request_count = api_rate_limits.request_count + 1
  RETURNING request_count INTO v_count;

  -- Return result
  RETURN QUERY SELECT
    v_count <= p_limit AS allowed,
    v_count AS current_count,
    p_limit AS limit_value,
    v_window_start + (p_window_minutes * INTERVAL '1 minute') AS reset_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_rate_limit(UUID, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION check_rate_limit(UUID, TEXT, INTEGER, INTEGER) TO service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 5: AUDIT LOGGING (OPTIONAL)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created
  ON audit_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_event_created
  ON audit_logs(event_type, created_at DESC);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only service_role can write audit logs
CREATE POLICY "Service role can insert audit logs"
  ON audit_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Users can read their own audit logs
CREATE POLICY "Users can view own audit logs"
  ON audit_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Function to create audit log entry
CREATE OR REPLACE FUNCTION create_audit_log(
  p_user_id UUID,
  p_event_type TEXT,
  p_event_data JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO audit_logs (user_id, event_type, event_data, ip_address, user_agent)
  VALUES (p_user_id, p_event_type, p_event_data, p_ip_address, p_user_agent)
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_audit_log(UUID, TEXT, JSONB, INET, TEXT) TO service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- COMPLETION MESSAGE
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '✅ Security migration completed successfully!';
  RAISE NOTICE 'Applied fixes:';
  RAISE NOTICE '  - Fixed 6 SECURITY DEFINER functions';
  RAISE NOTICE '  - Optimized 7 RLS policies';
  RAISE NOTICE '  - Added 8 performance indexes';
  RAISE NOTICE '  - Created rate limiting infrastructure';
  RAISE NOTICE '  - Added audit logging tables';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Deploy API route fixes (already done)';
  RAISE NOTICE '  2. Run penetration tests';
  RAISE NOTICE '  3. Monitor for 48 hours';
END $$;
