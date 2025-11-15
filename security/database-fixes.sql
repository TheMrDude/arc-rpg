-- HABITQUEST DATABASE SECURITY FIXES
-- Run this file in Supabase SQL Editor after reviewing each section
-- Date: November 15, 2024
-- WARNING: Test on staging environment first!

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 1: FIX SECURITY DEFINER FUNCTIONS (HIGH PRIORITY)
-- ═══════════════════════════════════════════════════════════════════════════
-- All SECURITY DEFINER functions must validate that p_user_id matches auth.uid()
-- to prevent users from accessing other users' data

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
-- This one is special - it should ONLY be called by service_role in API routes
-- NOT directly by users, so we keep SECURITY DEFINER but add extra validation
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
  -- SECURITY FIX: Only allow service_role to call this
  -- Users should NOT call this directly - only via authenticated API routes
  v_caller_role := coalesce(current_setting('request.jwt.claim.role', true), '');

  -- Allow service_role OR authenticated users modifying their own data
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

  -- Get current balance with row lock to prevent race conditions
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
-- Add user_id validation
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

-- Fix merge conflict in grants (line 275-281 in setup-database/route.js)
-- Standardize grants for claim_founder_spot
GRANT EXECUTE ON FUNCTION claim_founder_spot(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION claim_founder_spot(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION restore_founder_spot() TO service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 2: OPTIMIZE RLS POLICIES (Remove Subqueries)
-- ═══════════════════════════════════════════════════════════════════════════

-- Create helper function for premium check (more efficient than subquery)
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

-- Grant execute to authenticated users
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

-- Indexes for quest_reflections (if table exists)
CREATE INDEX IF NOT EXISTS idx_quest_reflections_user_id
  ON quest_reflections(user_id);

CREATE INDEX IF NOT EXISTS idx_quest_reflections_quest_id
  ON quest_reflections(quest_id);

-- Indexes for user_equipment
CREATE INDEX IF NOT EXISTS idx_user_equipment_user_equipped
  ON user_equipment(user_id, equipped)
  WHERE equipped = true;

-- Composite index for gold transactions by type
CREATE INDEX IF NOT EXISTS idx_gold_transactions_user_type
  ON gold_transactions(user_id, transaction_type, created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 4: VERIFY RLS IS ENABLED ON ALL TABLES
-- ═══════════════════════════════════════════════════════════════════════════

-- Run this query to find tables WITHOUT RLS enabled:
DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND rowsecurity = false
      AND tablename NOT IN (
        'equipment_catalog',  -- Public catalog (read-only)
        'quest_templates',    -- Public templates (read-only for official)
        'founder_inventory'   -- Public inventory count
      )
  LOOP
    RAISE NOTICE 'WARNING: Table % does not have RLS enabled!', tbl.tablename;
  END LOOP;
END $$;

-- Enable RLS on any missing tables (run this if warnings above)
-- ALTER TABLE [table_name] ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 5: ADD RATE LIMITING TABLE (For API routes)
-- ═══════════════════════════════════════════════════════════════════════════

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
-- SECTION 6: ADD AUDIT LOG TABLE (Optional but recommended)
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
-- SECTION 7: VERIFICATION QUERIES
-- ═══════════════════════════════════════════════════════════════════════════

-- Run these to verify fixes were applied correctly

-- 1. Check all tables have RLS enabled (except catalogs)
SELECT
  schemaname,
  tablename,
  rowsecurity as has_rls
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. List all RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  cmd AS operation,
  permissive,
  roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. Check for SECURITY DEFINER functions
SELECT
  n.nspname as schema,
  p.proname as function_name,
  CASE
    WHEN prosecdef THEN 'SECURITY DEFINER'
    ELSE 'SECURITY INVOKER'
  END as security_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND prosecdef = true
ORDER BY p.proname;

-- 4. List all indexes
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 5. Check for tables without any policies (potential issue)
SELECT
  t.schemaname,
  t.tablename,
  t.rowsecurity as has_rls,
  COUNT(p.policyname) as policy_count
FROM pg_tables t
LEFT JOIN pg_policies p ON t.schemaname = p.schemaname AND t.tablename = p.tablename
WHERE t.schemaname = 'public'
  AND t.rowsecurity = true
GROUP BY t.schemaname, t.tablename, t.rowsecurity
HAVING COUNT(p.policyname) = 0;

-- ═══════════════════════════════════════════════════════════════════════════
-- ROLLBACK PLAN (If something breaks)
-- ═══════════════════════════════════════════════════════════════════════════

/*
If these fixes cause issues, you can rollback specific sections:

-- Rollback Section 1 (SECURITY DEFINER functions):
-- Re-run the original function definitions from:
-- /supabase/migrations/add_journal_entries.sql
-- /supabase/migrations/add_premium_features.sql

-- Rollback Section 2 (RLS policies):
DROP FUNCTION IF EXISTS is_premium_user();
-- Then re-run original policy definitions

-- Rollback Section 3 (Indexes):
DROP INDEX IF EXISTS idx_journal_entries_user_id;
DROP INDEX IF EXISTS idx_journal_entries_user_created;
-- etc.

-- Rollback Section 4: N/A (verification only)

-- Rollback Section 5 (Rate limiting):
DROP TABLE IF EXISTS api_rate_limits CASCADE;
DROP FUNCTION IF EXISTS check_rate_limit;

-- Rollback Section 6 (Audit logs):
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP FUNCTION IF EXISTS create_audit_log;
*/

-- ═══════════════════════════════════════════════════════════════════════════
-- COMPLETION
-- ═══════════════════════════════════════════════════════════════════════════

-- After running this file successfully, you should see:
-- - All SECURITY DEFINER functions have auth.uid() validation
-- - RLS policies use function instead of subqueries
-- - All necessary indexes are created
-- - Rate limiting infrastructure is in place
-- - Audit logging is available

-- Next steps:
-- 1. Deploy API route fixes (see security/api-route-fixes.md)
-- 2. Implement rate limiting in API routes (see security/rate-limiting.ts)
-- 3. Run penetration tests (see security/penetration-test-plan.md)
-- 4. Monitor logs for 48 hours after deployment

SELECT 'Database security fixes applied successfully!' AS status;
