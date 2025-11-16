-- Analytics and Engagement Tracking System
-- This tracks all important user actions for revenue optimization and engagement analysis

-- Add is_admin column to profiles table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Create analytics_events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  user_agent TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_session ON analytics_events(session_id);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_analytics_user_event_date
  ON analytics_events(user_id, event_type, created_at DESC);

-- RLS Policies (admin only for now)
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Admin can read all events
CREATE POLICY "Admins can read analytics"
  ON analytics_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Create analytics aggregation views for dashboards

-- Daily active users
CREATE OR REPLACE VIEW analytics_daily_active_users AS
SELECT
  DATE(created_at) as date,
  COUNT(DISTINCT user_id) as dau,
  COUNT(*) as total_events
FROM analytics_events
WHERE user_id IS NOT NULL
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Conversion funnel for gold purchases
CREATE OR REPLACE VIEW analytics_gold_purchase_funnel AS
SELECT
  DATE(created_at) as date,
  COUNT(*) FILTER (WHERE event_type = 'gold_purchase_viewed') as views,
  COUNT(*) FILTER (WHERE event_type = 'gold_purchase_initiated') as initiations,
  COUNT(*) FILTER (WHERE event_type = 'gold_purchase_completed') as completions,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE event_type = 'gold_purchase_completed') /
    NULLIF(COUNT(*) FILTER (WHERE event_type = 'gold_purchase_viewed'), 0),
    2
  ) as conversion_rate
FROM analytics_events
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- User engagement metrics
CREATE OR REPLACE VIEW analytics_user_engagement AS
SELECT
  user_id,
  COUNT(*) FILTER (WHERE event_type = 'quest_completed') as quests_completed,
  COUNT(*) FILTER (WHERE event_type = 'gold_purchase_completed') as gold_purchases,
  COUNT(*) FILTER (WHERE event_type = 'equipment_purchased') as equipment_purchases,
  COUNT(*) FILTER (WHERE event_type = 'story_milestone') as story_milestones,
  COUNT(*) FILTER (WHERE event_type = 'level_up') as level_ups,
  MAX(created_at) as last_activity,
  MIN(created_at) as first_activity
FROM analytics_events
WHERE user_id IS NOT NULL
GROUP BY user_id;

-- Revenue metrics
CREATE OR REPLACE VIEW analytics_revenue_metrics AS
SELECT
  DATE(e.created_at) as date,
  COUNT(*) as gold_purchases,
  SUM((e.event_data->>'amount_usd')::numeric) as total_revenue_usd,
  COUNT(DISTINCT e.user_id) as unique_buyers,
  AVG((e.event_data->>'amount_usd')::numeric) as avg_transaction_value
FROM analytics_events e
WHERE e.event_type = 'gold_purchase_completed'
  AND e.event_data->>'amount_usd' IS NOT NULL
GROUP BY DATE(e.created_at)
ORDER BY date DESC;

-- Story engagement metrics
CREATE OR REPLACE VIEW analytics_story_engagement AS
SELECT
  DATE(created_at) as date,
  COUNT(DISTINCT user_id) as users_with_story,
  COUNT(*) FILTER (WHERE event_type = 'story_milestone' AND event_data->>'milestone_type' = 'new_story') as new_stories_started,
  COUNT(*) FILTER (WHERE event_type = 'story_milestone' AND event_data->>'milestone_type' = 'story_completed') as stories_completed,
  AVG((event_data->>'thread_completion')::numeric) as avg_story_completion
FROM analytics_events
WHERE event_type = 'story_milestone'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Grant views to authenticated users with admin role
GRANT SELECT ON analytics_daily_active_users TO authenticated;
GRANT SELECT ON analytics_gold_purchase_funnel TO authenticated;
GRANT SELECT ON analytics_user_engagement TO authenticated;
GRANT SELECT ON analytics_revenue_metrics TO authenticated;
GRANT SELECT ON analytics_story_engagement TO authenticated;

-- Function to get retention cohorts
CREATE OR REPLACE FUNCTION get_retention_cohorts(cohort_weeks INT DEFAULT 12)
RETURNS TABLE (
  cohort_week DATE,
  users_acquired INT,
  week_0_retained INT,
  week_1_retained INT,
  week_2_retained INT,
  week_3_retained INT,
  week_4_retained INT
) AS $$
BEGIN
  RETURN QUERY
  WITH user_first_activity AS (
    SELECT
      user_id,
      DATE_TRUNC('week', MIN(created_at)) as cohort_week
    FROM analytics_events
    WHERE user_id IS NOT NULL
    GROUP BY user_id
  ),
  user_weekly_activity AS (
    SELECT
      user_id,
      DATE_TRUNC('week', created_at) as activity_week
    FROM analytics_events
    WHERE user_id IS NOT NULL
    GROUP BY user_id, DATE_TRUNC('week', created_at)
  )
  SELECT
    ufa.cohort_week::DATE,
    COUNT(DISTINCT ufa.user_id)::INT as users_acquired,
    COUNT(DISTINCT CASE WHEN uwa.activity_week = ufa.cohort_week THEN uwa.user_id END)::INT as week_0,
    COUNT(DISTINCT CASE WHEN uwa.activity_week = ufa.cohort_week + INTERVAL '1 week' THEN uwa.user_id END)::INT as week_1,
    COUNT(DISTINCT CASE WHEN uwa.activity_week = ufa.cohort_week + INTERVAL '2 weeks' THEN uwa.user_id END)::INT as week_2,
    COUNT(DISTINCT CASE WHEN uwa.activity_week = ufa.cohort_week + INTERVAL '3 weeks' THEN uwa.user_id END)::INT as week_3,
    COUNT(DISTINCT CASE WHEN uwa.activity_week = ufa.cohort_week + INTERVAL '4 weeks' THEN uwa.user_id END)::INT as week_4
  FROM user_first_activity ufa
  LEFT JOIN user_weekly_activity uwa ON ufa.user_id = uwa.user_id
  WHERE ufa.cohort_week >= CURRENT_DATE - (cohort_weeks || ' weeks')::INTERVAL
  GROUP BY ufa.cohort_week
  ORDER BY ufa.cohort_week DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment on tables and views
COMMENT ON TABLE analytics_events IS 'Tracks all user engagement events for analytics and revenue optimization';
COMMENT ON VIEW analytics_daily_active_users IS 'Daily active users and event counts';
COMMENT ON VIEW analytics_gold_purchase_funnel IS 'Conversion funnel for gold purchases';
COMMENT ON VIEW analytics_user_engagement IS 'Per-user engagement metrics';
COMMENT ON VIEW analytics_revenue_metrics IS 'Revenue and transaction metrics';
COMMENT ON VIEW analytics_story_engagement IS 'Story system engagement metrics';
