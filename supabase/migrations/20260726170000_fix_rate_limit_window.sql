-- ============================================================================
-- Fix check_rate_limit's window arithmetic.
--
-- THE DEFECT
--
--   v_window_start := DATE_TRUNC('hour', NOW())
--     + (FLOOR(EXTRACT(MINUTE FROM NOW()) / p_window_minutes) * p_window_minutes)
--       * INTERVAL '1 minute';
--
-- EXTRACT(MINUTE) only ever returns 0-59. So for any p_window_minutes >= 60 the
-- FLOOR term is always 0 and the window start collapses to the top of the
-- current hour, no matter how long the window was supposed to be. reset_at is
-- then computed from that collapsed start, so the row is abandoned and a fresh
-- one created every hour.
--
-- Effect on the limits actually configured in lib/rate-limiter.js:
--
--   window   endpoint(s)                        intended        actual
--   ------   --------------------------------   -------------   ---------------
--   1 min    every :burst key                   per minute      per minute   OK
--   5 min    create-checkout burst              per 5 min       per 5 min    OK
--   60 min   complete-quest, create-checkout,   per hour        per hour     OK
--            default
--   1440     transform-quest (20 free /         per day         PER HOUR
--            200 premium), transform-journal                    -- 24x too
--            (5 free / 20 premium)                              permissive
--   10080    weekly-summary (1 free / 2         per week        PER HOUR
--            premium)                                           -- 168x too
--                                                               permissive
--
-- So the AI endpoints -- the expensive ones this table exists to cap -- were the
-- only ones broken, and "20 per day" was really 20 per hour.
--
-- THE FIX
--
-- Epoch-floor division, the same arithmetic as check_anon_rate_limit in
-- 20260726160000_anon_rate_limits.sql, which is correct for any window length.
--
-- WHY THIS IS SAFE FOR THE WINDOWS THAT ALREADY WORKED
--
-- For every window currently configured that was NOT broken, epoch-floor gives a
-- byte-identical window_start, so those endpoints see no change at all:
--
--   * 60 divides 3600, and the Unix epoch begins exactly on an hour boundary, so
--     1-minute and 5-minute buckets land on the same instants either way.
--   * A 60-minute window floors to the top of the hour under both formulas.
--
-- Only the >= 60-minute windows move, and they move from wrong to right. This is
-- asserted empirically in the rollback probe rather than taken on trust.
--
-- BEHAVIOUR CHANGES TO EXPECT
--
--   1. Daily caps become real. A free user gets 20 transform-quest calls per UTC
--      day instead of 20 per hour. This TIGHTENS a limit on live users, which is
--      the point, but it is a real change and not a no-op.
--   2. Daily windows now reset at 00:00 UTC; weekly windows reset Thursday
--      00:00 UTC, because Unix epoch day 0 was a Thursday. Both are fixed
--      windows, deterministic, and consistent with the anon limiter.
--   3. Rows written before this migration used hour-aligned window_start values.
--      For daily/weekly endpoints the new key will usually not match them, so
--      those counters effectively restart once at deploy. Harmless: it can only
--      make the first window after deploy more generous, never less.
--
-- WHAT IS DELIBERATELY NOT CHANGED
--
--   * The signature, including `p_window_minutes integer DEFAULT 60`. Six routes
--     call this through lib/rate-limiter.js and two more use clearRateLimit /
--     getRateLimitStatus against the same table; changing the shape would break
--     all of them.
--   * The return columns and their types.
--   * `v_count <= p_limit`, so the Nth request against a limit of N is still
--     allowed. Tightening that off-by-one here would be a second, unrelated
--     behaviour change smuggled into a bug fix.
--   * The ACL. Verified live before writing this: the grants are
--     `postgres=X, service_role=X` -- `authenticated` was already revoked by
--     20260725200000_security_round_2.sql, and this migration must not hand it
--     back. CREATE OR REPLACE preserves the existing ACL, so no GRANT is issued.
--   * `SET search_path TO 'public'`, already present live and preserved here.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id        UUID,
  p_endpoint       TEXT,
  p_limit          INTEGER,
  p_window_minutes INTEGER DEFAULT 60
)
RETURNS TABLE (
  allowed       BOOLEAN,
  current_count INTEGER,
  limit_value   INTEGER,
  reset_at      TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  -- GREATEST(...,1) guards against a 0 or negative window reaching the divisor.
  -- The old formula would have divided by zero there; nothing passes 0 today,
  -- but a rate limiter should not be the thing that 500s a route.
  v_window_seconds INTEGER := GREATEST(p_window_minutes, 1) * 60;
  v_window_start   TIMESTAMP WITH TIME ZONE;
  v_count          INTEGER;
BEGIN
  -- Correct for any window length, unlike EXTRACT(MINUTE), which silently
  -- saturates at 59 and collapses every long window to one hour.
  v_window_start := to_timestamp(
    FLOOR(EXTRACT(EPOCH FROM NOW()) / v_window_seconds) * v_window_seconds
  );

  INSERT INTO api_rate_limits (user_id, endpoint, window_start, request_count)
  VALUES (p_user_id, p_endpoint, v_window_start, 1)
  ON CONFLICT (user_id, endpoint, window_start)
  -- Table-qualified: bare `request_count` in the RETURNING of an upsert is
  -- ambiguous against the OUT parameter names of a RETURNS TABLE function.
  DO UPDATE SET request_count = api_rate_limits.request_count + 1
  RETURNING api_rate_limits.request_count INTO v_count;

  RETURN QUERY SELECT
    v_count <= p_limit,
    v_count,
    p_limit,
    v_window_start + (v_window_seconds * INTERVAL '1 second');
END;
$function$;
