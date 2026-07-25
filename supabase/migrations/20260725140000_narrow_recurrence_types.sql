-- ============================================================================
-- Phase 3: narrow recurrence to daily/weekly
--
-- 'custom' (every N days) is retired. It was the only option that needed a
-- number-entry field, and the creation flow it lived in has been replaced by a
-- three-way Once / Daily / Weekly control in the quest input. 'once' never
-- becomes a recurring_quests row at all -- it is simply a quest with no rule --
-- so it is deliberately NOT part of this constraint.
--
-- Verified before writing: zero rows use 'custom', so no data migration is
-- needed and the constraint cannot fail on existing data.
--
-- recurrence_interval is left in place but is now always 1. Dropping the column
-- is a separate decision and is not made here.
--
-- Idempotent: DROP IF EXISTS + ADD, and the guard re-checks live data.
-- ============================================================================

DO $$
DECLARE
  bad_rows int;
BEGIN
  SELECT count(*) INTO bad_rows
    FROM public.recurring_quests
   WHERE recurrence_type NOT IN ('daily', 'weekly');

  IF bad_rows > 0 THEN
    RAISE EXCEPTION
      'Refusing to narrow recurrence_type: % row(s) still use a retired type. Migrate them first.',
      bad_rows;
  END IF;
END $$;

ALTER TABLE public.recurring_quests
  DROP CONSTRAINT IF EXISTS recurring_quests_recurrence_type_check;

ALTER TABLE public.recurring_quests
  ADD CONSTRAINT recurring_quests_recurrence_type_check
  CHECK (recurrence_type IN ('daily', 'weekly'));
