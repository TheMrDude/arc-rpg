-- Email log table for tracking all transactional emails
CREATE TABLE IF NOT EXISTS email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email_type TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for querying by user and type
CREATE INDEX IF NOT EXISTS idx_email_log_user_id ON email_log(user_id);
CREATE INDEX IF NOT EXISTS idx_email_log_type ON email_log(email_type);
CREATE INDEX IF NOT EXISTS idx_email_log_sent_at ON email_log(sent_at DESC);

-- RLS: only service role can insert/read (no client access)
ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (used by edge functions)
CREATE POLICY "Service role full access to email_log"
  ON email_log FOR ALL
  USING (auth.role() = 'service_role');

-- Database trigger: call welcome-email when a new profile is inserted
CREATE OR REPLACE FUNCTION trigger_welcome_email()
RETURNS TRIGGER AS $$
DECLARE
  user_email TEXT;
  supabase_url TEXT;
  service_role_key TEXT;
BEGIN
  -- Get user email from auth.users
  SELECT email INTO user_email FROM auth.users WHERE id = NEW.id;

  -- Get config from vault or env
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_role_key := current_setting('app.settings.service_role_key', true);

  -- Only fire if we have the required config
  IF supabase_url IS NOT NULL AND service_role_key IS NOT NULL AND user_email IS NOT NULL THEN
    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/welcome-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'email', user_email,
        'name', COALESCE(NEW.display_name, NEW.character_name, ''),
        'archetype', COALESCE(NEW.archetype, ''),
        'user_id', NEW.id::text
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to profiles table
DROP TRIGGER IF EXISTS on_profile_created_send_welcome ON profiles;
CREATE TRIGGER on_profile_created_send_welcome
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_welcome_email();
