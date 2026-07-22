-- SECURITY (H2): remove the client INSERT path into testimonials.
--
-- The "Users insert own testimonials" policy only constrained user_id, not
-- status/consented_public. Because authenticated retained table-level INSERT,
-- any logged-in user could POST directly to PostgREST with status='live',
-- consented_public=true and land arbitrary, unmoderated, potentially
-- impersonating content straight into the public live_testimonials feed —
-- fully bypassing the "only Dan moves quotes forward" moderation model.
--
-- The real save path (app/api/testimonials/save) uses the service-role client
-- and forces status='pending', so no app code relies on the client INSERT
-- policy. Remove it entirely and revoke residual write privileges from the
-- client roles.

DROP POLICY IF EXISTS "Users insert own testimonials" ON testimonials;

-- No client role should be able to write this table directly; the service role
-- (which bypasses RLS and grants) remains the sole write path.
REVOKE INSERT, UPDATE, DELETE ON testimonials FROM authenticated;
REVOKE ALL ON testimonials FROM anon;

-- Defense in depth: bound display_name at the DB level too (the app route
-- already slices to 60, but a direct write must not be able to exceed it).
-- NOT VALID avoids failing on any pre-existing rows; it still enforces on all
-- new writes.
ALTER TABLE testimonials
  ADD CONSTRAINT testimonials_display_name_len
  CHECK (display_name IS NULL OR char_length(display_name) <= 60) NOT VALID;
