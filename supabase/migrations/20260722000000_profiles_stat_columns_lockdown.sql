-- SECURITY (H1): lock down client-writable profile stat columns.
--
-- The existing "Users can update own profile" RLS policy pins only is_premium;
-- every other column (quests_completed, level, xp, longest_streak, gold,
-- story_progress, …) was freely writable by any authenticated user with the
-- public anon key. That let a user set their own stats from the browser —
-- cheating the gamification layer AND spoofing Legendary Badge eligibility
-- (the voucher signer re-verifies against these same columns).
--
-- Postgres RLS is row-level, not column-level. The fix is column-level
-- privileges: revoke blanket UPDATE from the client roles and grant UPDATE
-- back only on the one cosmetic column the browser legitimately writes
-- (shown_premium_welcome, set in app/dashboard/page.js). All real stat writes
-- already go through service-role API routes (complete-quest, etc.), which
-- bypass these grants.

-- Ensure the one allowed column exists before granting on it (idempotent).
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS shown_premium_welcome BOOLEAN DEFAULT FALSE;

-- Remove blanket table-level UPDATE from the client roles.
REVOKE UPDATE ON profiles FROM authenticated;
REVOKE UPDATE ON profiles FROM anon;

-- Grant UPDATE back only on the cosmetic UI-state column. Everything else on
-- profiles is now writable only by the service role. The row-scoping RLS
-- policy (auth.uid() = id) still applies on top of this grant.
GRANT UPDATE (shown_premium_welcome) ON profiles TO authenticated;
