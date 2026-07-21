-- ============================================================================
-- HabitQuest — Funnel Measurement Layer
-- ============================================================================
-- A lightweight, privacy-respecting, first-party event layer that answers the
-- three weekly funnel questions (landing -> demo -> signup -> activation)
-- WITHOUT any third-party analytics SaaS, cookies, IP storage, or PII.
--
-- NOTE ON TABLE NAMING:
--   A separate `analytics_events` table already exists in this project. It is
--   a general engagement/revenue log that stores user_agent + ip_address and
--   is written to by existing app code (lib/analytics.js). That schema is
--   incompatible with this layer's hard privacy constraints (no IP, no
--   fingerprinting, uuid session ids, allowlist-only, no client reads).
--   To keep "zero behavior change anywhere" we do NOT touch it. This
--   measurement layer lives in its own purpose-built table, `funnel_events`.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: funnel_events
-- ----------------------------------------------------------------------------
-- Insert-only, append-only funnel event log.
--   * event_name  — constrained to a fixed v1 allowlist (CHECK below)
--   * session_id  — anonymous uuid, generated client-side per visit and kept
--                   in sessionStorage. NOT a persistent identifier.
--   * user_id     — nullable, only set once the visitor is authenticated.
--   * properties  — small jsonb (e.g. {"input_length": 12}). NEVER raw user
--                   text, never PII. Enforced small by the ingest layer.
-- No user_agent, no ip_address, no referrer — intentionally.
CREATE TABLE IF NOT EXISTS funnel_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_name  TEXT NOT NULL,
  session_id  UUID,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  properties  JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Allowlist enforced at the storage layer (defense in depth; the ingest
  -- route and RPC also enforce it). Keep this list small — v1 only.
  CONSTRAINT funnel_events_event_name_allowlist CHECK (
    event_name IN (
      'landing_view',
      'scroll_50',
      'scroll_90',
      'demo_transform_submitted',
      'demo_transform_result_viewed',
      'signup_started',
      'signup_completed',
      'first_habit_created',
      'first_quest_completed'
    )
  )
);

-- Indexes tuned for the weekly rollups (time window + per-event + per-session).
CREATE INDEX IF NOT EXISTS idx_funnel_events_created_at
  ON funnel_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_funnel_events_event_name
  ON funnel_events (event_name);
CREATE INDEX IF NOT EXISTS idx_funnel_events_session
  ON funnel_events (session_id);
CREATE INDEX IF NOT EXISTS idx_funnel_events_name_created
  ON funnel_events (event_name, created_at DESC);

COMMENT ON TABLE funnel_events IS
  'First-party, privacy-respecting funnel event log (landing -> signup -> activation). Insert-only via record_funnel_event(). No PII, no IP, no cookies. Not client-readable.';

-- ----------------------------------------------------------------------------
-- RLS: nobody reads or writes directly.
-- ----------------------------------------------------------------------------
-- No SELECT / INSERT / UPDATE / DELETE policies are created for anon or
-- authenticated, so with RLS enabled those roles get zero access to the table.
-- All writes flow through record_funnel_event() (SECURITY DEFINER); all reads
-- flow through get_weekly_numbers() (SECURITY DEFINER). The table itself is
-- invisible to the client.
ALTER TABLE funnel_events ENABLE ROW LEVEL SECURITY;
-- Belt-and-suspenders: strip any default privileges from client roles.
REVOKE ALL ON funnel_events FROM anon, authenticated;

-- ----------------------------------------------------------------------------
-- RPC: record_funnel_event — the ONLY write path.
-- ----------------------------------------------------------------------------
-- Called server-side (service role) from the /api/measure ingest route. Enforces
-- the allowlist again and hard-caps properties size so nothing large or
-- unexpected can be persisted. Returns true on insert, false if rejected —
-- callers ignore the result (analytics must never break UX).
CREATE OR REPLACE FUNCTION record_funnel_event(
  p_event_name TEXT,
  p_session_id UUID DEFAULT NULL,
  p_user_id    UUID DEFAULT NULL,
  p_properties JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_props JSONB;
BEGIN
  -- Allowlist (server-side, authoritative).
  IF p_event_name IS NULL OR p_event_name NOT IN (
      'landing_view',
      'scroll_50',
      'scroll_90',
      'demo_transform_submitted',
      'demo_transform_result_viewed',
      'signup_started',
      'signup_completed',
      'first_habit_created',
      'first_quest_completed'
  ) THEN
    RETURN FALSE;
  END IF;

  -- Properties must be a small json object. Reject anything else / oversized.
  v_props := COALESCE(p_properties, '{}'::jsonb);
  IF jsonb_typeof(v_props) <> 'object' THEN
    v_props := '{}'::jsonb;
  END IF;
  IF length(v_props::text) > 512 THEN
    v_props := '{}'::jsonb;
  END IF;

  INSERT INTO funnel_events (event_name, session_id, user_id, properties)
  VALUES (p_event_name, p_session_id, p_user_id, v_props);

  RETURN TRUE;
END;
$$;

-- Only the service role (the ingest route) may write. Clients cannot call it.
REVOKE ALL ON FUNCTION record_funnel_event(TEXT, UUID, UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION record_funnel_event(TEXT, UUID, UUID, JSONB) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION record_funnel_event(TEXT, UUID, UUID, JSONB) TO service_role;

COMMENT ON FUNCTION record_funnel_event(TEXT, UUID, UUID, JSONB) IS
  'Sole write path for funnel_events. Allowlist + property-size enforced. service_role only.';

-- ----------------------------------------------------------------------------
-- RPC: get_weekly_numbers — the weekly build-in-public content pipeline.
-- ----------------------------------------------------------------------------
-- One row per metric for the trailing 7 days [week_start, week_start + 7),
-- with the prior 7 days [week_start - 7, week_start) for week-over-week delta.
-- Rates are percentages rounded to 1 decimal. Aggregates only — no PII.
--
--   week_start defaults to (current_date - 6) => the last 7 days including today.
CREATE OR REPLACE FUNCTION get_weekly_numbers(week_start DATE DEFAULT (CURRENT_DATE - 6))
RETURNS TABLE (
  metric         TEXT,
  current_value  NUMERIC,
  previous_value NUMERIC,
  delta          NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cur_start  TIMESTAMPTZ := week_start::timestamptz;
  cur_end    TIMESTAMPTZ := (week_start + 7)::timestamptz;
  prev_start TIMESTAMPTZ := (week_start - 7)::timestamptz;
  prev_end   TIMESTAMPTZ := week_start::timestamptz;
BEGIN
  RETURN QUERY
  WITH e AS (
    SELECT
      session_id,
      event_name,
      created_at,
      (created_at >= cur_start  AND created_at < cur_end)  AS is_cur,
      (created_at >= prev_start AND created_at < prev_end) AS is_prev
    FROM funnel_events
    WHERE created_at >= prev_start AND created_at < cur_end
  ),
  -- Session-level rollup (landing / scroll / demo / signup happen in one visit).
  sess AS (
    SELECT
      session_id,
      MIN(created_at) AS first_seen,
      bool_or(event_name = 'landing_view')              AS landed,
      bool_or(event_name = 'scroll_50')                 AS s50,
      bool_or(event_name = 'scroll_90')                 AS s90,
      bool_or(event_name = 'demo_transform_submitted')  AS demo,
      bool_or(event_name = 'signup_completed')          AS signed
    FROM e
    WHERE session_id IS NOT NULL
    GROUP BY session_id
  ),
  sb AS (
    SELECT *,
      CASE
        WHEN first_seen >= cur_start  AND first_seen < cur_end  THEN 'cur'
        WHEN first_seen >= prev_start AND first_seen < prev_end THEN 'prev'
      END AS bucket
    FROM sess
  ),
  s AS (
    SELECT
      COUNT(*) FILTER (WHERE bucket = 'cur'  AND landed)                        AS landing_cur,
      COUNT(*) FILTER (WHERE bucket = 'prev' AND landed)                        AS landing_prev,
      COUNT(*) FILTER (WHERE bucket = 'cur'  AND landed AND s50)                AS s50_cur,
      COUNT(*) FILTER (WHERE bucket = 'prev' AND landed AND s50)                AS s50_prev,
      COUNT(*) FILTER (WHERE bucket = 'cur'  AND landed AND s90)                AS s90_cur,
      COUNT(*) FILTER (WHERE bucket = 'prev' AND landed AND s90)                AS s90_prev,
      COUNT(*) FILTER (WHERE bucket = 'cur'  AND landed AND demo)               AS demo_cur,
      COUNT(*) FILTER (WHERE bucket = 'prev' AND landed AND demo)               AS demo_prev,
      COUNT(*) FILTER (WHERE bucket = 'cur'  AND landed AND signed)             AS signup_cur,
      COUNT(*) FILTER (WHERE bucket = 'prev' AND landed AND signed)             AS signup_prev,
      COUNT(*) FILTER (WHERE bucket = 'cur'  AND landed AND demo AND signed)    AS demo_signup_cur,
      COUNT(*) FILTER (WHERE bucket = 'prev' AND landed AND demo AND signed)    AS demo_signup_prev,
      COUNT(*) FILTER (WHERE bucket = 'cur'  AND landed AND NOT demo AND signed) AS nodemo_signup_cur,
      COUNT(*) FILTER (WHERE bucket = 'prev' AND landed AND NOT demo AND signed) AS nodemo_signup_prev,
      COUNT(*) FILTER (WHERE bucket = 'cur'  AND landed AND NOT demo)           AS nodemo_cur,
      COUNT(*) FILTER (WHERE bucket = 'prev' AND landed AND NOT demo)           AS nodemo_prev
    FROM sb
  ),
  -- Activation events can land in a later visit, so bucket them by event time.
  a AS (
    SELECT
      COUNT(*) FILTER (WHERE is_cur  AND event_name = 'signup_completed')     AS signups_cur,
      COUNT(*) FILTER (WHERE is_prev AND event_name = 'signup_completed')     AS signups_prev,
      COUNT(*) FILTER (WHERE is_cur  AND event_name = 'first_habit_created')  AS habits_cur,
      COUNT(*) FILTER (WHERE is_prev AND event_name = 'first_habit_created')  AS habits_prev,
      COUNT(*) FILTER (WHERE is_cur  AND event_name = 'first_quest_completed') AS quests_cur,
      COUNT(*) FILTER (WHERE is_prev AND event_name = 'first_quest_completed') AS quests_prev
    FROM e
  ),
  m(metric, current_value, previous_value) AS (
    SELECT 'landing_sessions',
           s.landing_cur::numeric,
           s.landing_prev::numeric FROM s
    UNION ALL
    SELECT 'scroll_50_rate_pct',
           ROUND(100.0 * s.s50_cur  / NULLIF(s.landing_cur, 0), 1),
           ROUND(100.0 * s.s50_prev / NULLIF(s.landing_prev, 0), 1) FROM s
    UNION ALL
    SELECT 'scroll_90_rate_pct',
           ROUND(100.0 * s.s90_cur  / NULLIF(s.landing_cur, 0), 1),
           ROUND(100.0 * s.s90_prev / NULLIF(s.landing_prev, 0), 1) FROM s
    UNION ALL
    SELECT 'demo_usage_rate_pct',
           ROUND(100.0 * s.demo_cur  / NULLIF(s.landing_cur, 0), 1),
           ROUND(100.0 * s.demo_prev / NULLIF(s.landing_prev, 0), 1) FROM s
    UNION ALL
    SELECT 'signup_conversion_rate_pct',
           ROUND(100.0 * s.signup_cur  / NULLIF(s.landing_cur, 0), 1),
           ROUND(100.0 * s.signup_prev / NULLIF(s.landing_prev, 0), 1) FROM s
    UNION ALL
    SELECT 'demo_signup_rate_pct',
           ROUND(100.0 * s.demo_signup_cur  / NULLIF(s.demo_cur, 0), 1),
           ROUND(100.0 * s.demo_signup_prev / NULLIF(s.demo_prev, 0), 1) FROM s
    UNION ALL
    SELECT 'no_demo_signup_rate_pct',
           ROUND(100.0 * s.nodemo_signup_cur  / NULLIF(s.nodemo_cur, 0), 1),
           ROUND(100.0 * s.nodemo_signup_prev / NULLIF(s.nodemo_prev, 0), 1) FROM s
    UNION ALL
    -- Activation is reported as raw event counts (not a rate). A same-week
    -- numerator/denominator ratio misattributes users who sign up one week and
    -- activate later (and can read >100%); a true per-user cohort join is
    -- unreliable because signup_completed often has no user_id while email
    -- confirmation is pending. Counts are honest and unambiguous.
    SELECT 'first_habit_created_count',
           a.habits_cur::numeric,
           a.habits_prev::numeric FROM a
    UNION ALL
    SELECT 'first_quest_completed_count',
           a.quests_cur::numeric,
           a.quests_prev::numeric FROM a
  )
  SELECT
    m.metric,
    COALESCE(m.current_value, 0)  AS current_value,
    COALESCE(m.previous_value, 0) AS previous_value,
    ROUND(COALESCE(m.current_value, 0) - COALESCE(m.previous_value, 0), 1) AS delta
  FROM m
  -- Preserve a stable, human-readable order for the weekly post.
  ORDER BY array_position(ARRAY[
    'landing_sessions',
    'scroll_50_rate_pct',
    'scroll_90_rate_pct',
    'demo_usage_rate_pct',
    'signup_conversion_rate_pct',
    'demo_signup_rate_pct',
    'no_demo_signup_rate_pct',
    'first_habit_created_count',
    'first_quest_completed_count'
  ], m.metric);
END;
$$;

-- Restricted to the service role only. In Supabase the `authenticated` role is
-- EVERY signed-in user, so granting it here would let any account read global
-- landing/signup/activation totals with the public anon key. The founder runs
-- this from the SQL editor / weekly pipeline (service role), not as an app user.
REVOKE ALL ON FUNCTION get_weekly_numbers(DATE) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION get_weekly_numbers(DATE) TO service_role;

COMMENT ON FUNCTION get_weekly_numbers(DATE) IS
  'Trailing-7-day funnel metrics with week-over-week deltas. Aggregate-only, no PII. Paste output into the weekly Substack numbers post.';
