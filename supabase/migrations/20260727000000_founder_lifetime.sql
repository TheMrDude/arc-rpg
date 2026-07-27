-- ═══════════════════════════════════════════════════════════════════════════
-- Founders Lifetime offer — inventory-safe, idempotent purchase ledger.
--
-- Context: /api/create-checkout already claims a founder spot (claim_founder_spot)
-- before opening Stripe Checkout, but nothing ever restored a spot when a buyer
-- abandoned or let the session expire, and there was no server-side, idempotent
-- path to grant lifetime Pro on a confirmed one-time payment. This migration adds:
--
--   * founder_claims          — one row per founder checkout session, tracking its
--                               lifecycle: reserved -> granted | restored.
--   * grant_founder_lifetime  — idempotent grant of permanent Pro (is_premium),
--                               keyed by Stripe session id.
--   * restore_founder_checkout— idempotent give-back of a reserved spot, so an
--                               abandoned/expired checkout never permanently burns
--                               inventory and a double-delivered webhook cannot
--                               restore twice.
--
-- Idempotency is enforced by a per-session row + SELECT ... FOR UPDATE, so both
-- the grant and the restore are safe against Stripe delivering the same event
-- more than once. Card-only checkout means a session is terminal at either
-- 'completed' or 'expired', never both, so grant and restore cannot race.
--
-- Additive and idempotent. Safe to re-run. Does NOT touch the $5/mo or $29/yr
-- wiring, claim_founder_spot, or restore_founder_spot.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Fix a latent bug in claim_founder_spot ─────────────────────────────────
-- Its RETURNS TABLE(... remaining ...) OUT column shadows founder_inventory.remaining,
-- so the UPDATE's `remaining = remaining - 1 ... RETURNING remaining` is ambiguous
-- and raises "column reference \"remaining\" is ambiguous" at runtime (plpgsql
-- variable_conflict defaults to error). The claim therefore always failed when
-- actually invoked. Behavior is otherwise unchanged: same auth.uid() guard, same
-- already-premium short-circuit, same atomic sold-out handling. Fix = qualify the
-- table column so it can never be read as the OUT variable.
CREATE OR REPLACE FUNCTION claim_founder_spot(user_id_param uuid)
RETURNS TABLE(success boolean, remaining integer, failure_reason text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_remaining integer;
  user_subscription text;
  user_is_premium boolean := false;
BEGIN
  IF user_id_param != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: cannot claim founder spot for other users';
  END IF;
  IF user_id_param IS NULL THEN
    RAISE EXCEPTION 'claim_founder_spot requires a user id';
  END IF;

  SELECT subscription_status, is_premium
  INTO user_subscription, user_is_premium
  FROM profiles WHERE id = user_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile missing for user %', user_id_param;
  END IF;

  IF COALESCE(user_is_premium, false) OR user_subscription = 'active' THEN
    RETURN QUERY SELECT false, NULL::integer, 'already_premium';
    RETURN;
  END IF;

  UPDATE founder_inventory
  SET remaining = founder_inventory.remaining - 1
  WHERE id = 'founder' AND founder_inventory.remaining > 0
  RETURNING founder_inventory.remaining INTO new_remaining;

  IF new_remaining IS NULL THEN
    RETURN QUERY SELECT false, 0, 'sold_out';
    RETURN;
  END IF;

  RETURN QUERY SELECT true, new_remaining, 'reserved';
END;
$$;

-- ─── Ledger ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS founder_claims (
  stripe_session_id text PRIMARY KEY,
  user_id           uuid NOT NULL,
  status            text NOT NULL DEFAULT 'reserved'
                    CHECK (status IN ('reserved', 'granted', 'restored')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Service-role-only. No policies + RLS enabled means anon/authenticated cannot
-- read or write it; the service role (create-checkout, the webhook) bypasses RLS.
ALTER TABLE founder_claims ENABLE ROW LEVEL SECURITY;

-- ─── Grant permanent Pro on a confirmed one-time payment ─────────────────────
-- Grants via is_premium (the Stripe-independent comp/founder flag) so a lifetime
-- buyer never lapses — there is no subscription behind them, and nothing resets
-- is_premium except subscription-cancellation webhooks, which key off a
-- subscription id a founder does not have. Deliberately does NOT set
-- subscription_status.
CREATE OR REPLACE FUNCTION grant_founder_lifetime(
  p_session_id  text,
  p_user_id     uuid,
  p_customer_id text
)
RETURNS TABLE(granted boolean, already_processed boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_status text;
BEGIN
  IF p_session_id IS NULL OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'grant_founder_lifetime requires a session id and user id';
  END IF;

  -- Serialize concurrent deliveries of the same session.
  SELECT status INTO v_status
  FROM founder_claims
  WHERE stripe_session_id = p_session_id
  FOR UPDATE;

  IF FOUND AND v_status = 'granted' THEN
    -- Already granted: idempotent no-op, no second grant.
    RETURN QUERY SELECT false, true;
    RETURN;
  END IF;

  IF FOUND THEN
    UPDATE founder_claims
    SET status = 'granted', updated_at = now()
    WHERE stripe_session_id = p_session_id;
  ELSE
    -- No reservation row (e.g. session created out of band). Record it.
    INSERT INTO founder_claims (stripe_session_id, user_id, status)
    VALUES (p_session_id, p_user_id, 'granted')
    ON CONFLICT (stripe_session_id)
      DO UPDATE SET status = 'granted', updated_at = now();
  END IF;

  -- Permanent Pro. premium_since is preserved if already set.
  UPDATE profiles
  SET is_premium         = true,
      subscription_tier  = 'founder',
      premium_since      = COALESCE(premium_since, now()),
      stripe_customer_id = COALESCE(p_customer_id, stripe_customer_id),
      stripe_session_id  = p_session_id
  WHERE id = p_user_id;

  RETURN QUERY SELECT true, false;
END;
$$;

-- ─── Restore a reserved spot on abandoned / expired checkout ──────────────────
-- Only a 'reserved' session gives a spot back, and only once: a granted session
-- (paid) or an already-restored session is a no-op. This makes both an abandoned
-- checkout AND a double-delivered checkout.session.expired safe.
CREATE OR REPLACE FUNCTION restore_founder_checkout(p_session_id text)
RETURNS TABLE(restored boolean, remaining integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_status    text;
  v_remaining integer;
BEGIN
  IF p_session_id IS NULL THEN
    RAISE EXCEPTION 'restore_founder_checkout requires a session id';
  END IF;

  SELECT status INTO v_status
  FROM founder_claims
  WHERE stripe_session_id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    -- No reservation recorded for this session; nothing to restore.
    SELECT fi.remaining INTO v_remaining FROM founder_inventory fi WHERE fi.id = 'founder';
    RETURN QUERY SELECT false, v_remaining;
    RETURN;
  END IF;

  IF v_status <> 'reserved' THEN
    -- Already granted (paid) or already restored: idempotent no-op.
    SELECT fi.remaining INTO v_remaining FROM founder_inventory fi WHERE fi.id = 'founder';
    RETURN QUERY SELECT false, v_remaining;
    RETURN;
  END IF;

  UPDATE founder_claims
  SET status = 'restored', updated_at = now()
  WHERE stripe_session_id = p_session_id;

  UPDATE founder_inventory
  SET remaining = founder_inventory.remaining + 1, updated_at = now()
  WHERE id = 'founder'
  RETURNING founder_inventory.remaining INTO v_remaining;

  RETURN QUERY SELECT true, v_remaining;
END;
$$;

-- ─── Grants: service role only (mirrors claim/restore_founder_spot) ───────────
REVOKE ALL ON FUNCTION grant_founder_lifetime(text, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION grant_founder_lifetime(text, uuid, text) FROM anon;
REVOKE ALL ON FUNCTION grant_founder_lifetime(text, uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION grant_founder_lifetime(text, uuid, text) TO service_role;

REVOKE ALL ON FUNCTION restore_founder_checkout(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION restore_founder_checkout(text) FROM anon;
REVOKE ALL ON FUNCTION restore_founder_checkout(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION restore_founder_checkout(text) TO service_role;

COMMENT ON TABLE founder_claims IS 'Lifecycle ledger for founder lifetime checkouts: reserved -> granted | restored. One row per Stripe session; enforces spot + grant idempotency.';
COMMENT ON FUNCTION grant_founder_lifetime IS 'Idempotently grants permanent Pro (is_premium) for a confirmed founder one-time payment, keyed by Stripe session id.';
COMMENT ON FUNCTION restore_founder_checkout IS 'Idempotently restores a reserved founder spot on abandoned/expired checkout; no-op once granted or already restored.';
