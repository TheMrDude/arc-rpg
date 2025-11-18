-- AI Usage Rate Limiting
-- Prevents users from abusing expensive AI features

-- Create AI usage log table
CREATE TABLE IF NOT EXISTS ai_usage_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL, -- 'backstory', 'suggestions', 'transform'
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for fast rate limit checks
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_user_feature_date
ON ai_usage_log(user_id, feature, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_usage_log_created_at
ON ai_usage_log(created_at);

-- Enable RLS
ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage
DROP POLICY IF EXISTS "Users can view their own AI usage" ON ai_usage_log;
CREATE POLICY "Users can view their own AI usage"
  ON ai_usage_log FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert usage logs
DROP POLICY IF EXISTS "Service can log AI usage" ON ai_usage_log;
CREATE POLICY "Service can log AI usage"
  ON ai_usage_log FOR INSERT
  WITH CHECK (true);

-- Function to clean up old logs (optional - run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_ai_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM ai_usage_log
  WHERE created_at < NOW() - INTERVAL '30 days'
  RETURNING COUNT(*) INTO deleted_count;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE ai_usage_log IS 'Tracks AI feature usage for rate limiting';
COMMENT ON FUNCTION cleanup_old_ai_logs IS 'Deletes AI usage logs older than 30 days';
