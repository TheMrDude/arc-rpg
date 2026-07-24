-- Schedule the Second Wind recovery nudge. Runs hourly so the "~24h into
-- the 48h window" moment is caught within the hour. The edge function
-- dedupes per window and honors notification prefs + quiet hours, so an
-- hourly cadence never means hourly notifications.
--
-- Mirrors the invocation pattern in 20260403000000_cron_edge_functions.sql
-- (pg_cron + pg_net, service-role auth via app.settings).

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Idempotent: drop any prior schedule of the same name before re-adding.
DO $$
BEGIN
  PERFORM cron.unschedule('invoke-second-wind-nudge');
EXCEPTION WHEN OTHERS THEN
  -- No existing job; ignore.
  NULL;
END $$;

SELECT cron.schedule(
  'invoke-second-wind-nudge',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/second-wind-nudge',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
