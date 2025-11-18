-- Email Waitlist / Newsletter Capture
-- For growth: capture emails from interested users

CREATE TABLE IF NOT EXISTS email_waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL, -- 'footer', 'pricing_exit', 'feature_announcement', etc.
  tags TEXT[] DEFAULT '{}', -- ['new_features', 'founder_updates', etc.]
  metadata JSONB DEFAULT '{}'::jsonb, -- Extra data (referrer, campaign, etc.)
  subscribed BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_email_waitlist_email ON email_waitlist(email);
CREATE INDEX IF NOT EXISTS idx_email_waitlist_created_at ON email_waitlist(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_waitlist_source ON email_waitlist(source);

-- RLS Policies (public can insert, only admins can view all)
ALTER TABLE email_waitlist ENABLE ROW LEVEL SECURITY;

-- Allow anyone to subscribe
CREATE POLICY "Anyone can subscribe to waitlist" ON email_waitlist
  FOR INSERT
  WITH CHECK (true);

-- Only admins can view all emails (for now, no one can view)
-- TODO: Add admin role check when implementing admin dashboard
CREATE POLICY "Only admins can view waitlist" ON email_waitlist
  FOR SELECT
  USING (false);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_email_waitlist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_email_waitlist_updated_at
  BEFORE UPDATE ON email_waitlist
  FOR EACH ROW
  EXECUTE FUNCTION update_email_waitlist_updated_at();

-- Add comment for documentation
COMMENT ON TABLE email_waitlist IS 'Email capture for growth: newsletter, feature announcements, and waitlists';
