-- Legendary Badge claims (Milestone Badge NFT layer)
--
-- Records the off-chain half of the signed-voucher lazy mint: which user was
-- issued a voucher for which badge, to which wallet, and (once the mint is
-- confirmed) the token id and tx hash. This is a NEW, self-contained table.
-- The badge layer never writes to any existing habit/XP/map table.
--
-- Double-claim protection is layered: this table's UNIQUE(user_id, badge_id)
-- is the off-chain guard; the contract's hasClaimed/voucherUsed mappings are
-- the on-chain guard. Neither is trusted alone.

CREATE TABLE IF NOT EXISTS badge_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id INTEGER NOT NULL CHECK (badge_id BETWEEN 1 AND 5),
  wallet_address TEXT NOT NULL,
  -- Voucher nonce (numeric string). Part of the on-chain replay key
  -- keccak256(to, badgeId, nonce).
  nonce TEXT NOT NULL,
  chain_id INTEGER,
  contract_address TEXT,
  -- 'voucher_issued' once we sign; 'claimed' once the mint is confirmed on-chain.
  status TEXT NOT NULL DEFAULT 'voucher_issued'
    CHECK (status IN ('voucher_issued', 'claimed')),
  token_id TEXT,
  tx_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- One claim record per user per badge. A wallet holds at most one of each badge.
  UNIQUE (user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_badge_claims_user ON badge_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_badge_claims_wallet ON badge_claims(lower(wallet_address));

-- Keep updated_at fresh.
CREATE OR REPLACE FUNCTION set_badge_claims_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_badge_claims_updated_at ON badge_claims;
CREATE TRIGGER trg_badge_claims_updated_at
  BEFORE UPDATE ON badge_claims
  FOR EACH ROW EXECUTE FUNCTION set_badge_claims_updated_at();

-- RLS: users may READ their own claim records (for the /badges gallery).
-- All writes go through the service-role Edge Function, which bypasses RLS;
-- there are deliberately no user INSERT/UPDATE policies so the client can
-- never forge a claim.
ALTER TABLE badge_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own badge claims" ON badge_claims;
CREATE POLICY "Users can view their own badge claims"
  ON badge_claims FOR SELECT
  USING (auth.uid() = user_id);
