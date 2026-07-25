-- ============================================================================
-- Phase 0: recurring quests — provenance, archive status, and live-data cleanup
--
-- Context: the daily cron at /api/recurring-quests/generate has been inserting
-- one quest instance per active rule per day since 2026-03-23, unconditionally.
-- It never checked whether the previous instance was completed and nothing ever
-- expired the old one, so a single active rule accumulated 110 uncompleted
-- instances in one account.
--
-- This migration does NOT fix the generator (that is Phase 1). It only adds the
-- two columns the fix will need, backfills provenance onto the existing rows so
-- they stay attributable, and archives the existing pile.
--
-- Idempotent. Safe to re-run: DDL is IF NOT EXISTS / DROP+ADD, and both data
-- statements are guarded so a second run is a no-op.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0a) Schema: archive status + provenance link
--
-- `status` is deliberately separate from `completed`. A superseded instance is
-- neither complete nor still-active, and collapsing the two would either grant
-- XP/gold for work never done or silently erase that the day was offered.
-- Default 'active' means this column is inert until Phase 1 teaches the queries
-- to filter on it.
--
-- `recurring_quest_id` is the provenance link that did not exist before. Without
-- it there is no way to tell which quest came from which rule, which is exactly
-- why the generator could not tell it was duplicating work. ON DELETE SET NULL
-- so deleting a rule never destroys completion history.
-- ----------------------------------------------------------------------------
ALTER TABLE public.quests
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS recurring_quest_id uuid
    REFERENCES public.recurring_quests(id) ON DELETE SET NULL;

ALTER TABLE public.quests DROP CONSTRAINT IF EXISTS quests_status_check;
ALTER TABLE public.quests ADD CONSTRAINT quests_status_check
  CHECK (status IN ('active', 'superseded', 'expired'));

-- Partial index: every Phase 1 generator query filters on this pair, and the
-- vast majority of quests have no rule, so the partial form stays small.
CREATE INDEX IF NOT EXISTS idx_quests_recurring
  ON public.quests(recurring_quest_id, status)
  WHERE recurring_quest_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 0b) Backfill provenance BEFORE archiving, so archived rows stay attributable.
--
-- Matching on (user_id, original_text) is the only signal available -- the
-- generator copied the rule's original_text verbatim onto each instance and
-- recorded nothing else. A quest the user typed by hand with identical text
-- would be swept in too; that is acceptable here because it is the same habit
-- either way, and the only consequence is that it becomes archivable.
-- ----------------------------------------------------------------------------
UPDATE public.quests q
   SET recurring_quest_id = rq.id
  FROM public.recurring_quests rq
 WHERE q.user_id = rq.user_id
   AND q.original_text = rq.original_text
   AND q.recurring_quest_id IS NULL;

-- ----------------------------------------------------------------------------
-- 0c) Archive the accumulated backlog. Archive, not delete.
--
-- Completed instances are untouched: they are real history and were really paid
-- out. Only the uncompleted pile is superseded.
--
-- Deleting would have been cheaper but destroys the only record of how the
-- broken generator behaved, and complete-quest pays 150 gold for a medium
-- quest -- 110 rows is 16,500 gold and 2,750 XP sitting one bulk-complete away.
-- A status trail makes an accidental un-archive visible instead of silent.
-- ----------------------------------------------------------------------------
UPDATE public.quests
   SET status = 'superseded'
 WHERE user_id = '42dc28c1-246b-4f09-8a3b-80aa532af24d'
   AND original_text = 'Read for 15 minutes'
   AND completed = false
   AND status = 'active';

-- ----------------------------------------------------------------------------
-- 0d) Deactivate the 2025-10-19 test rule so the cron stops adding to the pile
--     while the generator is rebuilt in Phase 1.
-- ----------------------------------------------------------------------------
UPDATE public.recurring_quests
   SET is_active = false
 WHERE created_at::date = '2025-10-19'
   AND is_active = true;
