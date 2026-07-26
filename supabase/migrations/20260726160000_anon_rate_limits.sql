-- ============================================================================
-- Durable rate limiting for UNAUTHENTICATED endpoints.
--
-- Why this exists: /api/preview-quest is the landing-page demo. It is
-- unauthenticated, it calls a paid Anthropic API, and its rate limiting was a
-- module-scope `new Map()` in lib/rate-limit.ts. On Vercel that does not limit
-- anything meaningful:
--
--   1. Each serverless instance has its own Map. Concurrent requests land on
--      different instances, each starting empty, so "3 per 5 minutes" is really
--      "3 per 5 minutes per instance" -- and the platform creates instances on
--      demand under exactly the burst you are trying to stop.
--   2. Instances are recycled constantly, so the counter resets on its own.
--
-- The existing api_rate_limits table cannot be reused: its user_id is
-- `UUID REFERENCES profiles(id) NOT NULL`, and an anonymous visitor has no
-- profile row. Hence a separate table keyed by an opaque text bucket.
--
-- Buckets hold a SHA-256 of the client IP, never the IP itself. Visitors here
-- are parents evaluating a children's app; there is no reason to keep a log of
-- their addresses to enforce a counter.
-- ============================================================================

CREATE TABLE IF NOT EXISTS anon_rate_limits (
  bucket_key    TEXT        NOT NULL,
  endpoint      TEXT        NOT NULL,
  window_start  TIMESTAMPTZ NOT NULL,
  request_count INTEGER     NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (bucket_key, endpoint, window_start)
);

CREATE INDEX IF NOT EXISTS idx_anon_rate_limits_sweep
  ON anon_rate_limits (window_start);

-- No policies are created, so with RLS enabled nothing but the service role can
-- read or write this. Anonymous visitors must never be able to enumerate or
-- clear their own counters.
ALTER TABLE anon_rate_limits ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- check_anon_rate_limit
--
-- Atomic increment-and-test, same shape as check_rate_limit but keyed on text.
--
-- The window arithmetic is deliberately NOT copied from check_rate_limit, which
-- has a real defect worth recording here rather than propagating:
--
--   DATE_TRUNC('hour', NOW())
--     + FLOOR(EXTRACT(MINUTE FROM NOW()) / p_window_minutes) * p_window_minutes
--
-- EXTRACT(MINUTE) only ever returns 0-59, so for any window of 60 minutes or
-- more the FLOOR term is 0 and the window collapses to the start of the current
-- hour. A "20 per day" limit therefore resets every hour, i.e. it is really 480
-- per day. That function is load-bearing for 11 authenticated routes and is left
-- alone here; this one uses epoch-floor division, which is correct for any
-- window length.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_anon_rate_limit(
  p_bucket_key      TEXT,
  p_endpoint        TEXT,
  p_limit           INTEGER,
  p_window_minutes  INTEGER
)
RETURNS TABLE (
  allowed       BOOLEAN,
  current_count INTEGER,
  limit_value   INTEGER,
  reset_at      TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_seconds INTEGER := GREATEST(p_window_minutes, 1) * 60;
  v_window_start   TIMESTAMPTZ;
  v_count          INTEGER;
BEGIN
  v_window_start := to_timestamp(
    FLOOR(EXTRACT(EPOCH FROM NOW()) / v_window_seconds) * v_window_seconds
  );

  INSERT INTO anon_rate_limits (bucket_key, endpoint, window_start, request_count)
  VALUES (p_bucket_key, p_endpoint, v_window_start, 1)
  ON CONFLICT (bucket_key, endpoint, window_start)
  DO UPDATE SET request_count = anon_rate_limits.request_count + 1
  RETURNING anon_rate_limits.request_count INTO v_count;

  RETURN QUERY SELECT
    v_count <= p_limit,
    v_count,
    p_limit,
    v_window_start + (v_window_seconds * INTERVAL '1 second');
END;
$$;

-- Service role only. There is no authenticated or anon grant on purpose: the
-- only caller is a server route holding the service-role key, and granting this
-- to anon would let a visitor inflate or inspect someone else's bucket.
REVOKE ALL ON FUNCTION check_anon_rate_limit(TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION check_anon_rate_limit(TEXT, TEXT, INTEGER, INTEGER) TO service_role;

-- ----------------------------------------------------------------------------
-- Housekeeping. Rows are worthless once their window has passed, and this table
-- takes a write per anonymous request, so it would grow without bound.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sweep_anon_rate_limits(p_older_than INTERVAL DEFAULT '2 days')
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM anon_rate_limits WHERE window_start < NOW() - p_older_than;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION sweep_anon_rate_limits(INTERVAL) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sweep_anon_rate_limits(INTERVAL) TO service_role;
