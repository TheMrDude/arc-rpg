-- ============================================================================
-- security: revoke anon RPC access and tighten RLS
--
-- Idempotent. Safe to re-run: REVOKE/GRANT/ALTER are all declarative, every
-- policy change is DROP IF EXISTS + CREATE, and function loops resolve real
-- signatures from pg_proc so overloads are handled without hardcoding args.
--
-- Scope note: only the objects explicitly listed in the security review are
-- touched. Other anon-executable functions found during the audit are reported
-- separately rather than silently changed.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- A) SECURITY DEFINER view -> security_invoker (ERROR level lint)
--
-- Recreated with security_invoker = true so it enforces the *querying* user's
-- permissions, not the view creator's. Definition is byte-for-byte what is
-- live today (captured via pg_get_viewdef), so this only changes the option.
-- CREATE OR REPLACE preserves existing grants on the view.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.live_testimonials
WITH (security_invoker = true) AS
  SELECT id,
         quote,
         display_name,
         level_at_time,
         archetype,
         created_at
    FROM testimonials
   WHERE status = 'live'::text
     AND consented_public = true
     AND consent_revoked_at IS NULL;

-- ----------------------------------------------------------------------------
-- B) Anon-executable SECURITY DEFINER functions
--
-- Grouped by how the application actually calls them (see call-site map).
-- REVOKE ... FROM PUBLIC is what actually closes the hole: PostgreSQL grants
-- EXECUTE to PUBLIC on new functions by default, and anon/authenticated
-- inherit it. Revoking the role without revoking PUBLIC leaves it open.
-- ----------------------------------------------------------------------------

-- B1. Server-only: invoked exclusively from API routes using the service role
--     key (or not invoked at all). No client, logged in or not, should call
--     these directly. Revoked from anon, authenticated and PUBLIC.
DO $$
DECLARE
  fn_names text[] := ARRAY[
    'process_gold_transaction',
    'claim_founder_slot',
    'claim_founder_spot',
    'unlock_map_location',
    'update_map_progression',
    'check_unlock_achievement',
    'check_achievements_for_user',
    'advance_quest_chain_step',
    'start_quest_chain',
    'resolve_story_event',
    'trigger_random_story_event',
    'claim_seasonal_reward',
    'update_seasonal_challenge_progress',
    'create_quest_reflection',
    'register_push_subscription',
    'queue_notification',
    'create_audit_log',
    'is_premium_user',              -- two overloads; the loop handles both
    'can_create_quest',
    -- journal / mood getters
    'get_on_this_day_entries',
    'get_average_mood',
    'get_daily_journal_count',
    'get_recent_journal_entries',
    'get_recent_reflections'
  ];
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND p.proname = ANY (fn_names)
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', r.sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', r.sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;

-- B2. Genuinely client-callable: a logged-in user claims their own daily
--     reward straight from the browser (app/components/DailyLoginReward.tsx
--     -> supabase.rpc('claim_daily_login_reward')). anon and PUBLIC lose
--     EXECUTE; `authenticated` keeps it.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f'
      AND p.proname = 'claim_daily_login_reward'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', r.sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;

-- B3. Trigger functions: fired by the trigger regardless of EXECUTE grants,
--     so no client role needs to call them. Revoked from anon AND
--     authenticated (and PUBLIC).
DO $$
DECLARE
  fn_names text[] := ARRAY[
    'handle_new_user',
    'trigger_welcome_email',
    'notify_welcome_email',
    'auto_enroll_welcome_quest',
    'set_journal_expiry',
    'update_journal_stats',
    'trg_onboarding_profile_events',
    'trg_onboarding_quest_events',
    'll_touch_updated_at',
    'set_badge_claims_updated_at'
  ];
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f'
      AND p.proname = ANY (fn_names)
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', r.sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', r.sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', r.sig);
  END LOOP;
END $$;

-- B4. service_role only: analytics / maintenance. Called from server routes
--     or cron, never from a browser.
DO $$
DECLARE
  fn_names text[] := ARRAY[
    'get_retention_cohorts',
    'get_leaderboard_stats',
    'cleanup_expired_journal_entries'
  ];
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f'
      AND p.proname = ANY (fn_names)
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', r.sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', r.sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- C) Mutable search_path
--
-- Pins search_path so a caller-controlled path cannot redirect an unqualified
-- object reference inside a SECURITY DEFINER body. pg_temp last is the
-- recommended form.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  fn_names text[] := ARRAY[
    'trigger_welcome_email',
    'get_leaderboard_stats',
    'auto_enroll_welcome_quest',
    'log_onboarding_event',
    'trg_onboarding_profile_events',
    'trg_onboarding_quest_events',
    'll_touch_updated_at',
    'set_badge_claims_updated_at',
    'claim_daily_login_reward'
  ];
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f'
      AND p.proname = ANY (fn_names)
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', r.sig);
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- D) funnel_events / testimonial_prompt_log RLS
--
-- INTENTIONALLY NOT CHANGED IN THIS MIGRATION - awaiting confirmation of the
-- write path. Both tables have RLS enabled with zero policies, which is
-- correct *if* all writes go through the service role (RLS is bypassed by
-- service_role, and zero policies means anon/authenticated can do nothing).
--
-- Evidence gathered during this audit points to server-side writes:
--   * funnel_events is written via record_funnel_event(), which is already
--     revoked from anon AND authenticated (service_role only) and is called
--     from app/api/measure/route.ts using the service role key.
--   * No client component references either table directly.
-- If that is confirmed, the correct action is to leave RLS exactly as is.
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- E) Overly permissive policies
-- ----------------------------------------------------------------------------

-- E1. email_subscribers
--
-- The signup INSERT stays public (it is a public newsletter form), but the two
-- policies *named* "Service role can ..." are granted to PUBLIC with
-- USING (true), so anon can currently SELECT the entire subscriber list and
-- UPDATE arbitrary rows. Re-scope both to service_role only. The public
-- INSERT policy is deliberately left untouched.
DROP POLICY IF EXISTS "Service role can read all subscriptions" ON public.email_subscribers;
CREATE POLICY "Service role can read all subscriptions"
  ON public.email_subscribers
  FOR SELECT
  TO service_role
  USING (true);

DROP POLICY IF EXISTS "Service role can update subscriptions" ON public.email_subscribers;
CREATE POLICY "Service role can update subscriptions"
  ON public.email_subscribers
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- E2. template_generation_log
--
-- INSERT was WITH CHECK (true) for authenticated: any logged-in user could
-- write arbitrary rows. It cannot be scoped to the caller, because the table
-- has no user column at all (id, template_id, generated_at, quests_created).
--
-- Both the read and the write come from a single server route,
-- app/api/generate-from-templates/route.js, using the service role client
-- (supabaseAdmin), which bypasses RLS. No browser code touches this table. The
-- authenticated INSERT policy therefore has no legitimate caller and is
-- dropped outright rather than replaced.
--
-- NOT changed here: the SELECT policy is USING (true) for authenticated, so any
-- logged-in user can still read the whole table. Left for the follow-up queue.
DROP POLICY IF EXISTS "Authenticated users can insert template_generation_log" ON public.template_generation_log;

-- E3. ll_leaderboard - remove the destructive anon capability.
--
-- "anon delete own score" was USING (true): any visitor could delete any row.
-- There is no per-player secret in the schema (columns: player_id, display_name,
-- valuation, jobs_completed, best_combo, prestige_level, fastest_100k_seconds,
-- updated_at), so ownership cannot be verified for anon. Dropping anon DELETE
-- outright, as agreed.
DROP POLICY IF EXISTS "anon delete own score" ON public.ll_leaderboard;

-- NOTE: "anon update own score" (USING/WITH CHECK true) on ll_leaderboard and
-- "anon upsert own save" (ALL, USING/WITH CHECK true) on ll_saves are the same
-- class of hole, but they cannot be scoped without a per-player secret column,
-- and NO code in this repository references either table - they appear to
-- belong to a different app sharing this Supabase project. Tightening them
-- blind would likely break that app, so they are left for a follow-up once the
-- owning client is identified. See the report accompanying this migration.
