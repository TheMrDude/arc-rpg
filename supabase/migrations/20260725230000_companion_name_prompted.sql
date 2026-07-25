-- ============================================================================
-- companion_name_prompted: replace the localStorage don't-nag flag
--
-- The naming prompt previously remembered its dismissal in localStorage, so a
-- child on a second device was asked again. This moves that state to the
-- profile, where it belongs -- it is a fact about the account, not the browser.
--
-- Default false so every existing user is treated as "never prompted" and gets
-- the naming moment once, which is the point: 15 of 17 accounts are level 1 and
-- never reached the old level-3 trigger.
--
-- Backfill: anyone who already has a companion_name has, by definition, been
-- through the prompt, so they are marked prompted and will not be asked again.
--
-- Idempotent.
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS companion_name_prompted boolean NOT NULL DEFAULT false;

UPDATE public.profiles
   SET companion_name_prompted = true
 WHERE companion_name IS NOT NULL
   AND companion_name_prompted = false;

COMMENT ON COLUMN public.profiles.companion_name_prompted IS
  'True once the companion naming prompt has been shown and answered or skipped. Account-level so a second device does not re-ask. Naming stays available from the companion card regardless.';
