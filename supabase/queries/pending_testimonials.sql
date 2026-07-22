-- ============================================================================
-- HabitQuest — Testimonial review queue
-- ============================================================================
-- Run this in the Supabase SQL editor to review quotes users have consented to
-- share publicly but that are not yet live. See TESTIMONIALS.md for the full
-- 5-step review flow.
--
-- Only rows where the user opted in (consented_public = true) and has not
-- revoked appear here. Non-consented reflections are private and never listed.
-- ============================================================================

SELECT
  t.id,
  t.created_at,
  t.milestone,
  t.quote,
  t.display_name,
  t.level_at_time,
  t.archetype,
  t.status
FROM testimonials t
WHERE t.consented_public = TRUE
  AND t.consent_revoked_at IS NULL
  AND t.status = 'pending'
ORDER BY t.created_at ASC;

-- ----------------------------------------------------------------------------
-- To publish a quote (make it appear on the landing page), set it live by id:
--
--   UPDATE testimonials SET status = 'live' WHERE id = '<uuid>';
--
-- To stage without publishing (reviewed, not yet public):
--   UPDATE testimonials SET status = 'approved' WHERE id = '<uuid>';
--
-- To pull a quote back off the site later:
--   UPDATE testimonials SET status = 'retired' WHERE id = '<uuid>';
-- ----------------------------------------------------------------------------
