-- ============================================================================
-- HabitQuest — Real-Testimonial Engine
-- ============================================================================
-- Captures real user quotes ethically: an in-app reflection prompt fired at
-- genuine milestone moments, with explicit, opt-in, unchecked-by-default consent
-- for public use. Brand law: no guilt, no nagging.
--
--   * testimonials            — the quotes + consent + moderation status
--   * testimonial_prompt_log  — one row per (user, milestone); backs the
--                               "impossible to see twice" + 7-day global cooldown
--   * live_testimonials       — the ONLY public read surface (anon-readable view)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: testimonials
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS testimonials (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Which of the four earned-pride moments produced this quote.
  milestone          TEXT NOT NULL CHECK (milestone IN (
                       'first_boss_win',
                       'quests_30',
                       'first_region_unlock',
                       'quests_100'
                     )),

  quote              TEXT NOT NULL CHECK (char_length(quote) >= 1 AND char_length(quote) <= 280),

  -- Opt-in, unchecked by default. Public display requires this true.
  consented_public   BOOLEAN NOT NULL DEFAULT FALSE,

  -- First name + last initial, generated from profile at save time, editable by
  -- the user in the prompt. Only shown publicly when consented + live.
  display_name       TEXT,
  level_at_time      INTEGER,
  archetype          TEXT,

  -- Moderation: only Dan (service role / SQL) moves quotes forward.
  status             TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
                       'pending', 'approved', 'live', 'retired'
                     )),

  -- Frictionless revocation: set this and the quote leaves the public view.
  consent_revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_testimonials_user ON testimonials (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_testimonials_status ON testimonials (status);
-- Powers the public view lookup.
CREATE INDEX IF NOT EXISTS idx_testimonials_live
  ON testimonials (status, consented_public, consent_revoked_at);

COMMENT ON TABLE testimonials IS
  'Real user milestone quotes with explicit opt-in consent + moderation status. Public reads only via live_testimonials.';

-- ----------------------------------------------------------------------------
-- RLS: users may INSERT their own rows; nobody may SELECT the raw table as
-- anon/authenticated (the service role reads it, and the public view exposes
-- only live+consented rows). Consent revocation happens through a constrained
-- SECURITY DEFINER RPC so users can only ever touch consent_revoked_at.
-- ----------------------------------------------------------------------------
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users insert own testimonials" ON testimonials;
CREATE POLICY "Users insert own testimonials"
  ON testimonials FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- No SELECT / UPDATE / DELETE policies for anon or authenticated: the raw table
-- is not client-readable. Reads go through the service role or the public view.
REVOKE ALL ON testimonials FROM anon;

-- ----------------------------------------------------------------------------
-- Table: testimonial_prompt_log
-- ----------------------------------------------------------------------------
-- One row per (user, milestone). The UNIQUE constraint makes it structurally
-- impossible to prompt the same milestone twice; created_at drives the 7-day
-- global cooldown. Written server-side (service role) at prompt time.
CREATE TABLE IF NOT EXISTS testimonial_prompt_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone  TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, milestone)
);

CREATE INDEX IF NOT EXISTS idx_testimonial_prompt_log_user
  ON testimonial_prompt_log (user_id, created_at DESC);

-- Service-role only: enable RLS, add no client policies.
ALTER TABLE testimonial_prompt_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON testimonial_prompt_log FROM anon, authenticated;

COMMENT ON TABLE testimonial_prompt_log IS
  'Backs once-per-milestone + 7-day global cooldown for the testimonial prompt. Service-role only.';

-- ----------------------------------------------------------------------------
-- Public view: live_testimonials — the ONLY surface the landing page reads.
-- ----------------------------------------------------------------------------
-- Exposes just the display fields, and only for rows that are live, consented,
-- and not revoked. No user_id, no milestone, no status. The view runs with the
-- owner's rights (default, not security_invoker), so it can read past RLS while
-- still filtering to public-safe rows.
CREATE OR REPLACE VIEW live_testimonials AS
SELECT
  id,
  quote,
  display_name,
  level_at_time,
  archetype,
  created_at
FROM testimonials
WHERE status = 'live'
  AND consented_public = TRUE
  AND consent_revoked_at IS NULL;

GRANT SELECT ON live_testimonials TO anon, authenticated;

COMMENT ON VIEW live_testimonials IS
  'Public, anon-readable feed of approved+consented, non-revoked testimonials. Consumed by the landing page.';

-- ----------------------------------------------------------------------------
-- RPC: revoke_testimonial — the user-facing "Stop sharing this" action.
-- ----------------------------------------------------------------------------
-- Lets a user set consent_revoked_at on their OWN row and nothing else. No
-- friction, no guilt, idempotent. SECURITY DEFINER so it can update past RLS,
-- but scoped to auth.uid().
CREATE OR REPLACE FUNCTION revoke_testimonial(p_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_rows INT;
BEGIN
  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE testimonials
  SET consent_revoked_at = NOW()
  WHERE id = p_id
    AND user_id = v_uid
    AND consent_revoked_at IS NULL;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows > 0;
END;
$$;

REVOKE ALL ON FUNCTION revoke_testimonial(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION revoke_testimonial(UUID) TO authenticated;

COMMENT ON FUNCTION revoke_testimonial(UUID) IS
  'User revokes public consent on their own testimonial (sets consent_revoked_at). Scoped to auth.uid().';
