-- ============================================================================
-- Let an account delete its own profile row.
--
-- profiles had SELECT, INSERT and UPDATE policies for the owner and no DELETE
-- policy at all, so a parent had no way to remove their child's account. That is
-- the real gap; CI residue from the smoke test is a side effect of the same
-- missing policy, not the reason for it.
--
-- Scope note: this removes the PROFILE row and everything that cascades from it.
-- Deleting the auth.users row still requires the service role, so a full account
-- erasure is a two-step job -- this is the half a signed-in user can do for
-- themselves, and it is the half that holds the child's data.
--
-- Everything referencing profiles(id) is already ON DELETE CASCADE (journal
-- entries, reflections, boss battles, encounters, campaigns, party members,
-- email log, active effects, rate limits), except audit_logs which is
-- ON DELETE SET NULL and deliberately survives as an anonymised record.
--
-- Idempotent.
-- ============================================================================

DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;

CREATE POLICY "Users can delete own profile"
  ON public.profiles
  FOR DELETE
  USING (auth.uid() = id);

COMMENT ON POLICY "Users can delete own profile" ON public.profiles IS
  'A signed-in account may delete its own profile row, and everything that cascades from it. Added because a parent had no way to delete their child''s account. Removing the auth.users row still needs the service role.';
