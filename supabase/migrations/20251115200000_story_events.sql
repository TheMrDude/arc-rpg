-- Random Story Events System
-- Generates unexpected encounters to keep the world feeling alive

CREATE TABLE IF NOT EXISTS story_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  rewards JSONB DEFAULT '{}'::jsonb,
  viewed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_story_events_user_id ON story_events(user_id);
CREATE INDEX IF NOT EXISTS idx_story_events_created_at ON story_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_story_events_viewed ON story_events(viewed) WHERE viewed = false;

-- RLS Policies
ALTER TABLE story_events ENABLE ROW LEVEL SECURITY;

-- Users can read their own events
CREATE POLICY "Users can read own story events"
  ON story_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can update their own events (to mark as viewed)
CREATE POLICY "Users can update own story events"
  ON story_events
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- System can insert events (service role only)
CREATE POLICY "Service role can insert events"
  ON story_events
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Comment
COMMENT ON TABLE story_events IS 'Random story events that occur to keep users engaged';
