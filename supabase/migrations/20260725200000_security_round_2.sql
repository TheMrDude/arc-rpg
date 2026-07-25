-- ============================================================================
-- Security round 2: close the remaining anon-executable SECURITY DEFINER
-- surface and the last permissive policy we own.
--
-- Idempotent. REVOKE/GRANT are declarative and the policy change is
-- DROP IF EXISTS. Function loops resolve real signatures from pg_proc so
-- overloads are handled without hardcoding argument lists.
--
-- ll_leaderboard and ll_saves are deliberately NOT touched. They belong to a
-- different app sharing this project and no code in this repository references
-- them; tightening them blind would break that app.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) check_rate_limit
--
-- Verified BEFORE revoking, because this one is load-bearing: 11 API routes
-- depend on it and locking it wrongly would 500 the whole write surface.
--
--   * lib/rate-limiter.js calls .rpc('check_rate_limit') on the client from
--     getSupabaseAdminClient(), i.e. the SERVICE ROLE key. Service role is not
--     subject to these grants.
--   * The one NEXT_PUBLIC_SUPABASE_ANON_KEY reference in that file is
--     supabase.auth.getUser(token) -- JWT verification, which is what the anon
--     key is for. It never touches this function.
--   * lib/aiRateLimiting.js also uses SUPABASE_SERVICE_ROLE_KEY and issues no
--     RPC at all.
--
-- So no client-side caller exists and no key switch was needed; the premise
-- that this ran on the anon key was already false.
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- 2) Founder-slot restoration, notification click tracking, onboarding events
--
--   * restore_founder_spot  -> called only from app/api/create-checkout
--                              via supabaseAdmin (service role).
--   * restore_founder_slot  -> no call site anywhere in the repository.
--   * mark_notification_clicked -> no call site anywhere in the repository.
--   * log_onboarding_event  -> no direct call site. It is invoked from
--                              trg_onboarding_profile_events and
--                              trg_onboarding_quest_events, both of which are
--                              SECURITY DEFINER owned by postgres, so they can
--                              call it regardless of what anon/authenticated
--                              may execute. Verified before revoking, because
--                              those triggers fire on ordinary profile and
--                              quest writes and breaking them would break the
--                              app for every signed-in user.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  fn_names text[] := ARRAY[
    'check_rate_limit',
    'restore_founder_slot',
    'restore_founder_spot',
    'mark_notification_clicked',
    'log_onboarding_event'
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
    -- PUBLIC first: PostgreSQL grants EXECUTE to PUBLIC on new functions by
    -- default and anon/authenticated inherit it, so revoking only the roles
    -- leaves the hole open.
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', r.sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', r.sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 3) template_generation_log
--
-- The previous round dropped its INSERT policy, leaving RLS on with exactly
-- one policy: SELECT for `authenticated` USING (true), i.e. any signed-in user
-- could read the whole table.
--
-- No INSERT policy is added, because there is no longer anything to insert:
-- the only writer was /api/generate-from-templates, which was removed with the
-- rest of the recurring-quest-templates implementation. Nothing in the
-- repository references this table at all any more.
--
-- The table also has no user column (id, template_id, generated_at,
-- quests_created), so the SELECT policy cannot be scoped to auth.uid() even in
-- principle. Dropping it outright leaves RLS enabled with zero policies:
-- service_role keeps full access (it bypasses RLS), everyone else gets
-- nothing. Rows are preserved.
--
-- This will surface a new rls_enabled_no_policy INFO lint. That is the
-- intended end state, not a regression -- it is the same posture as
-- funnel_events and testimonial_prompt_log.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can read template_generation_log" ON public.template_generation_log;

-- ----------------------------------------------------------------------------
-- 4) check_and_unlock_achievement / process_completed_referral
--
-- Nothing to revoke: neither function exists in this database. The wrappers in
-- lib/achievements.ts and lib/referrals.ts called RPCs that were never created,
-- so those calls always failed silently. The wrappers are deleted in the
-- accompanying application change; no function is dropped here.
-- ----------------------------------------------------------------------------
