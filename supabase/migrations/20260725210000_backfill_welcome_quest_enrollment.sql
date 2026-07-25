-- ============================================================================
-- Backfill welcome_quest enrolment for accounts that predate the trigger.
--
-- Symptom: a 406 from
--   /rest/v1/user_quest_chain_progress?chain_id=eq.welcome_quest
-- in real browser sessions. PostgREST returns 406 when .single() matches zero
-- rows, and WelcomeQuestChain.tsx uses .single().
--
-- Cause is NOT a broken trigger. trigger_auto_enroll_welcome_quest is attached
-- to public.profiles and enabled, and it works: every account created from
-- 2026-07-05 onward is enrolled (5 of 5). Every account created in 2025 is not
-- (0 of 12). The trigger was added after those accounts existed and no backfill
-- was ever run.
--
-- Idempotent: NOT EXISTS guard, so re-running enrols nobody twice.
-- ============================================================================

-- Column list and values mirror auto_enroll_welcome_quest() exactly, so a
-- backfilled row is indistinguishable from a trigger-created one. started_at
-- is set from the profile's own created_at rather than now(), so the enrolment
-- is not backdated to today for accounts that signed up months ago.
INSERT INTO public.user_quest_chain_progress
  (id, user_id, chain_id, current_step, status, started_at)
SELECT gen_random_uuid(), p.id, 'welcome_quest', 1, 'in_progress', p.created_at
  FROM public.profiles p
 WHERE NOT EXISTS (
         SELECT 1
           FROM public.user_quest_chain_progress w
          WHERE w.user_id = p.id
            AND w.chain_id = 'welcome_quest'
       );
