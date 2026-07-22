-- SECURITY (hardening): pin search_path on the badge_claims updated_at trigger
-- function, consistent with the other SECURITY DEFINER/utility functions in
-- this project. Low risk (it runs on service-role writes), but a mutable
-- search_path on a trigger function is an unnecessary footgun.

CREATE OR REPLACE FUNCTION set_badge_claims_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
