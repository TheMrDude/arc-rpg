-- Ensure process_gold_transaction RPC function exists
-- This function handles atomic gold transactions with transaction history

-- Create gold_transactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS gold_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  transaction_type TEXT NOT NULL,
  reference_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for user transactions
CREATE INDEX IF NOT EXISTS idx_gold_transactions_user_id ON gold_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gold_transactions_type ON gold_transactions(user_id, transaction_type);

-- RLS policies for gold_transactions
ALTER TABLE gold_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own gold transactions" ON gold_transactions;
CREATE POLICY "Users can view their own gold transactions"
  ON gold_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Create or replace the process_gold_transaction function
CREATE OR REPLACE FUNCTION process_gold_transaction(
  p_user_id UUID,
  p_amount INTEGER,
  p_transaction_type TEXT,
  p_reference_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE(
  transaction_id UUID,
  new_balance INTEGER,
  success BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_gold INTEGER;
  v_new_gold INTEGER;
  v_transaction_id UUID;
BEGIN
  -- Get current gold balance with row lock
  SELECT gold INTO v_current_gold
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  -- Check if user exists
  IF v_current_gold IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- Calculate new balance
  v_new_gold := v_current_gold + p_amount;

  -- Prevent negative balance for withdrawals
  IF v_new_gold < 0 THEN
    RAISE EXCEPTION 'Insufficient gold balance';
  END IF;

  -- Update gold balance
  UPDATE profiles
  SET gold = v_new_gold
  WHERE id = p_user_id;

  -- Record transaction
  INSERT INTO gold_transactions (user_id, amount, transaction_type, reference_id, metadata)
  VALUES (p_user_id, p_amount, p_transaction_type, p_reference_id, p_metadata)
  RETURNING id INTO v_transaction_id;

  -- Return result
  RETURN QUERY SELECT v_transaction_id, v_new_gold, TRUE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION process_gold_transaction TO authenticated;

-- Comment on function
COMMENT ON FUNCTION process_gold_transaction IS 'Atomically process gold transactions with full transaction history tracking. Prevents race conditions and ensures balance integrity.';
