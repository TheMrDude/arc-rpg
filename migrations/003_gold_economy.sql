-- GOLD ECONOMY SYSTEM
-- Secure implementation with audit trails

-- Add gold to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS gold INTEGER DEFAULT 0 CHECK (gold >= 0);

-- Index for gold lookups
CREATE INDEX IF NOT EXISTS idx_profiles_gold ON profiles(gold);

-- Add cost to equipment catalog
ALTER TABLE equipment_catalog
ADD COLUMN IF NOT EXISTS cost INTEGER DEFAULT 0 CHECK (cost >= 0);

-- GOLD TRANSACTIONS AUDIT TABLE
-- Track all gold movements for security

CREATE TABLE IF NOT EXISTS gold_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- Positive for credits, negative for debits
  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    'quest_reward',
    'equipment_purchase',
    'gold_purchase',
    'admin_grant',
    'admin_deduct',
    'refund'
  )),
  reference_id UUID, -- Quest ID, equipment ID, or purchase ID
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for transaction queries
CREATE INDEX IF NOT EXISTS idx_gold_transactions_user_id
ON gold_transactions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gold_transactions_type
ON gold_transactions(transaction_type);

-- GOLD PURCHASES TABLE
-- Track real money purchases

CREATE TABLE IF NOT EXISTS gold_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT UNIQUE NOT NULL,
  stripe_checkout_session_id TEXT,
  amount_usd INTEGER NOT NULL, -- Cents (e.g., 1999 = $19.99)
  gold_amount INTEGER NOT NULL CHECK (gold_amount > 0),
  package_name TEXT NOT NULL,
  payment_status TEXT NOT NULL CHECK (payment_status IN (
    'pending',
    'completed',
    'failed',
    'refunded'
  )),
  gold_granted BOOLEAN DEFAULT false,
  granted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for purchase lookups
CREATE INDEX IF NOT EXISTS idx_gold_purchases_user_id
ON gold_purchases(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gold_purchases_stripe_intent
ON gold_purchases(stripe_payment_intent_id);

CREATE INDEX IF NOT EXISTS idx_gold_purchases_status
ON gold_purchases(payment_status);

-- SECURE GOLD TRANSACTION FUNCTION
-- Atomic operations to prevent race conditions

CREATE OR REPLACE FUNCTION process_gold_transaction(
  p_user_id UUID,
  p_amount INTEGER,
  p_transaction_type TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE(success BOOLEAN, new_balance INTEGER, error_message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Lock the user's profile row to prevent race conditions
  SELECT gold INTO v_current_balance
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  -- Check if user exists
  IF v_current_balance IS NULL THEN
    RETURN QUERY SELECT false, 0, 'User not found'::TEXT;
    RETURN;
  END IF;

  -- Calculate new balance
  v_new_balance := v_current_balance + p_amount;

  -- Prevent negative balance
  IF v_new_balance < 0 THEN
    RETURN QUERY SELECT false, v_current_balance, 'Insufficient gold'::TEXT;
    RETURN;
  END IF;

  -- Update user's gold balance
  UPDATE profiles
  SET gold = v_new_balance
  WHERE id = p_user_id;

  -- Record transaction in audit log
  INSERT INTO gold_transactions (
    user_id,
    amount,
    transaction_type,
    reference_id,
    balance_before,
    balance_after,
    metadata
  ) VALUES (
    p_user_id,
    p_amount,
    p_transaction_type,
    p_reference_id,
    v_current_balance,
    v_new_balance,
    p_metadata
  );

  -- Return success
  RETURN QUERY SELECT true, v_new_balance, ''::TEXT;
END;
$$;

-- ROW LEVEL SECURITY POLICIES

-- Enable RLS on gold tables
ALTER TABLE gold_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gold_purchases ENABLE ROW LEVEL SECURITY;

-- Users can view their own gold transactions
DROP POLICY IF EXISTS "Users can view own gold transactions" ON gold_transactions;
CREATE POLICY "Users can view own gold transactions"
ON gold_transactions FOR SELECT
USING (auth.uid() = user_id);

-- Users cannot insert/update/delete transactions (only server can)
DROP POLICY IF EXISTS "Only server can modify gold transactions" ON gold_transactions;
CREATE POLICY "Only server can modify gold transactions"
ON gold_transactions FOR INSERT
WITH CHECK (false); -- Only service role can insert

-- Users can view their own gold purchases
DROP POLICY IF EXISTS "Users can view own gold purchases" ON gold_purchases;
CREATE POLICY "Users can view own gold purchases"
ON gold_purchases FOR SELECT
USING (auth.uid() = user_id);

-- Users cannot modify purchase records (only server can)
DROP POLICY IF EXISTS "Only server can modify gold purchases" ON gold_purchases;
CREATE POLICY "Only server can modify gold purchases"
ON gold_purchases FOR INSERT
WITH CHECK (false); -- Only service role can insert

-- UPDATE EQUIPMENT COSTS
-- Balanced pricing by rarity

-- Update existing equipment with costs
UPDATE equipment_catalog
SET cost = CASE rarity
  WHEN 'common' THEN 750
  WHEN 'rare' THEN 3000
  WHEN 'epic' THEN 9000
  WHEN 'legendary' THEN 25000
  ELSE 500
END
WHERE cost = 0 OR cost IS NULL;

-- GRANT PERMISSIONS

-- Grant service role full access
GRANT ALL ON gold_transactions TO service_role;
GRANT ALL ON gold_purchases TO service_role;
GRANT EXECUTE ON FUNCTION process_gold_transaction TO service_role;

-- Grant authenticated users read access to their own data
GRANT SELECT ON gold_transactions TO authenticated;
GRANT SELECT ON gold_purchases TO authenticated;

-- COMMENTS FOR DOCUMENTATION

COMMENT ON TABLE gold_transactions IS 'Audit trail for all gold movements - quest rewards, purchases, spending';
COMMENT ON TABLE gold_purchases IS 'Real money purchases of gold via Stripe';
COMMENT ON FUNCTION process_gold_transaction IS 'Atomic function to safely credit/debit gold with audit trail';
COMMENT ON COLUMN profiles.gold IS 'User gold balance - CHECK constraint prevents negative values';
COMMENT ON COLUMN equipment_catalog.cost IS 'Gold cost to unlock equipment';
