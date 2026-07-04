-- Applied to production 2026-07-04 (via MCP apply_migration "cron_secret_to_vault").
--
-- Context: the email edge functions (re-engagement, onboarding-nurture,
-- weekly-digest, welcome-email) previously contained a hardcoded cron secret and
-- a hardcoded Resend API key fallback, and the pg_cron jobs embedded the same
-- secret in plaintext. The rotated cron secret now lives in Vault as
-- 'edge_cron_secret' (created separately with vault.create_secret — not in this
-- migration since it is data, not schema).
--
-- Related non-DDL change applied alongside this migration: cron jobs 1-3
-- (weekly-digest-email, onboarding-nurture-daily, re-engagement-daily) were
-- updated via cron.alter_job to read the header value from Vault:
--   headers := jsonb_build_object(
--     'Content-Type', 'application/json',
--     'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets
--                       where name = 'edge_cron_secret')
--   )

-- Cron secret now lives in Vault ('edge_cron_secret'). Edge functions read it via
-- this service-role-only RPC when the CRON_SECRET env var is not set.
create or replace function public.get_cron_secret()
returns text
language sql
security definer
set search_path = ''
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'edge_cron_secret'
$$;

revoke all on function public.get_cron_secret() from public;
revoke all on function public.get_cron_secret() from anon;
revoke all on function public.get_cron_secret() from authenticated;
grant execute on function public.get_cron_secret() to service_role;

-- Welcome-email trigger previously called the edge function with no auth header,
-- which forced the function to stay publicly invocable. Now sends the Vault secret.
create or replace function public.notify_welcome_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform net.http_post(
    url := 'https://vxzholcypozuurmsmbub.supabase.co/functions/v1/welcome-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'edge_cron_secret')
    ),
    body := jsonb_build_object('id', NEW.id, 'email', NEW.email)
  );
  return NEW;
end;
$$;
