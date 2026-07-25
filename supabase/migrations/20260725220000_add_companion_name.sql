-- ============================================================================
-- Companion naming: profiles.companion_name
--
-- Where it goes and why: there is no companion table. getCompanion() in
-- lib/companions.js derives the whole companion from two columns already on
-- profiles -- `archetype` picks the species and `quests_completed` picks the
-- life stage. Nothing about a companion is persisted per-user today, so the
-- name belongs on profiles alongside the two fields that already define it.
--
-- Nullable on purpose. NULL means "never named", and every render falls back to
-- the species stage name, so existing users are completely unaffected and the
-- feature is opt-in by doing nothing.
--
-- The 20-character cap is enforced in the database as well as in the API,
-- because this is a children's app and the column is the last line of defence.
-- Length is checked on the trimmed value so 20 spaces cannot pass.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS + DROP/ADD constraint.
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS companion_name text;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_companion_name_length;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_companion_name_length
  CHECK (companion_name IS NULL OR char_length(btrim(companion_name)) BETWEEN 1 AND 20);

COMMENT ON COLUMN public.profiles.companion_name IS
  'User-chosen name for their companion. NULL means unnamed; renders fall back to the species stage name. Private to the account -- never exposed on any shared or multi-user surface.';
