-- ============================================================================
-- HabitQuest — Weekly Numbers
-- ============================================================================
-- The build-in-public content pipeline. Run this once a week, paste the output
-- into Claude, and it comes back as a Substack numbers post.
--
-- Everything here is powered by get_weekly_numbers(week_start date), defined in
-- the migration 20260721000000_funnel_measurement_layer.sql. It reads only the
-- aggregate funnel — no PII, no raw user text, no IPs.
--
-- Metrics returned (one row each), for the trailing 7 days with the prior 7
-- days for a week-over-week delta:
--   landing_sessions                 unique landing sessions
--   scroll_50_rate_pct               % of landing sessions reaching 50% depth
--   scroll_90_rate_pct               % of landing sessions reaching 90% depth
--   demo_usage_rate_pct              % of landing sessions that ran the demo
--   signup_conversion_rate_pct       % of landing sessions that signed up
--   demo_signup_rate_pct             signup rate among sessions that ran demo
--   no_demo_signup_rate_pct          signup rate among sessions that did NOT
--   first_habit_created_count        weekly count of first-habit activations
--   first_quest_completed_count      weekly count of first-quest activations
--                                    (counts, not rates: avoids cross-week
--                                     cohort misattribution)
-- ============================================================================

-- Default: the trailing 7 days including today (week_start = current_date - 6).
SELECT
  metric,
  current_value,
  previous_value,
  delta
FROM get_weekly_numbers();

-- ----------------------------------------------------------------------------
-- Pin a specific week (e.g. the 7 days starting 2026-07-14):
--   SELECT * FROM get_weekly_numbers(DATE '2026-07-14');
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- Raw reference query (same logic as the RPC), in case you want to run it
-- directly against funnel_events without the function. Adjust :week_start.
-- ----------------------------------------------------------------------------
-- WITH params AS (
--   SELECT (CURRENT_DATE - 6)::timestamptz AS cur_start,
--          (CURRENT_DATE - 6 + 7)::timestamptz AS cur_end
-- ),
-- sess AS (
--   SELECT session_id,
--     bool_or(event_name = 'landing_view')             AS landed,
--     bool_or(event_name = 'scroll_50')                AS s50,
--     bool_or(event_name = 'scroll_90')                AS s90,
--     bool_or(event_name = 'demo_transform_submitted') AS demo,
--     bool_or(event_name = 'signup_completed')         AS signed
--   FROM funnel_events, params
--   WHERE created_at >= params.cur_start AND created_at < params.cur_end
--     AND session_id IS NOT NULL
--   GROUP BY session_id
-- )
-- SELECT
--   count(*) FILTER (WHERE landed)                          AS landing_sessions,
--   round(100.0 * count(*) FILTER (WHERE landed AND s50)
--         / nullif(count(*) FILTER (WHERE landed), 0), 1)   AS scroll_50_rate_pct,
--   round(100.0 * count(*) FILTER (WHERE landed AND s90)
--         / nullif(count(*) FILTER (WHERE landed), 0), 1)   AS scroll_90_rate_pct,
--   round(100.0 * count(*) FILTER (WHERE landed AND demo)
--         / nullif(count(*) FILTER (WHERE landed), 0), 1)   AS demo_usage_rate_pct,
--   round(100.0 * count(*) FILTER (WHERE landed AND signed)
--         / nullif(count(*) FILTER (WHERE landed), 0), 1)   AS signup_conversion_rate_pct
-- FROM sess;
