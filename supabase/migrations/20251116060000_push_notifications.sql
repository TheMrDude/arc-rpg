-- Push Notifications System
-- Manages push notification subscriptions and scheduled notifications

-- Create push subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_data JSONB NOT NULL, -- Contains endpoint, keys, etc.
  device_type TEXT, -- ios, android, web
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, subscription_data)
);

-- Create notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  streak_reminders BOOLEAN DEFAULT true,
  daily_encouragement BOOLEAN DEFAULT true,
  achievement_unlocks BOOLEAN DEFAULT true,
  quest_chain_updates BOOLEAN DEFAULT true,
  seasonal_events BOOLEAN DEFAULT true,
  reminder_time TIME DEFAULT '09:00:00', -- Default 9 AM
  timezone TEXT DEFAULT 'America/New_York',
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create scheduled notifications table
CREATE TABLE IF NOT EXISTS scheduled_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- streak_reminder, daily_boost, achievement, event
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending', -- pending, sent, failed, cancelled
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create notification templates table
CREATE TABLE IF NOT EXISTS notification_templates (
  id TEXT PRIMARY KEY,
  notification_type TEXT NOT NULL,
  title_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  priority TEXT DEFAULT 'normal', -- low, normal, high, urgent
  icon TEXT,
  badge TEXT,
  category TEXT, -- reminder, achievement, social, event
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_user ON scheduled_notifications(user_id, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_status ON scheduled_notifications(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_notification_templates_type ON notification_templates(notification_type);

-- Add notification stats to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_notification_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS total_notifications_sent INTEGER DEFAULT 0;

-- Seed notification templates
INSERT INTO notification_templates (id, notification_type, title_template, body_template, priority, icon, category) VALUES
  -- Streak Reminders
  ('streak_reminder_1', 'streak_reminder', 'Keep Your Streak Alive! 🔥', 'You''re on a {streak}-day streak! Don''t break it now - complete today''s quest!', 'high', '🔥', 'reminder'),
  ('streak_reminder_2', 'streak_reminder', 'Your Quest Awaits! ⚔️', '{streak} days strong! Your daily quest is waiting. Keep the momentum going!', 'high', '⚔️', 'reminder'),
  ('streak_reminder_3', 'streak_reminder', 'Don''t Break The Chain! ⛓️', '{streak}-day streak on the line! A few minutes now = legend status later.', 'high', '⛓️', 'reminder'),

  -- Daily Encouragement
  ('daily_boost_1', 'daily_boost', 'Rise and Shine, Hero! 🌅', 'A new day, a new quest. What will you accomplish today?', 'normal', '🌅', 'reminder'),
  ('daily_boost_2', 'daily_boost', 'Your Adventure Continues! 🗺️', 'Level {level} and climbing! Today''s quest is ready for you.', 'normal', '🗺️', 'reminder'),
  ('daily_boost_3', 'daily_boost', 'Forge Your Legend! ⚒️', 'Every quest completed is another step toward greatness. Start today!', 'normal', '⚒️', 'reminder'),

  -- Achievement Notifications
  ('achievement_unlock', 'achievement', 'Achievement Unlocked! 🏆', 'Congratulations! You''ve unlocked: {achievement_name}', 'high', '🏆', 'achievement'),
  ('milestone_reached', 'milestone', 'Milestone Reached! 🎯', 'You''ve reached level {level}! Amazing progress!', 'high', '🎯', 'achievement'),

  -- Quest Chain Updates
  ('chain_step_ready', 'quest_chain', 'Next Chapter Awaits! 📖', '{chain_name}: {step_title} is ready. Continue your story!', 'normal', '📖', 'reminder'),
  ('chain_completed', 'quest_chain', 'Quest Chain Complete! ⭐', 'You finished {chain_name}! Claim your rewards!', 'high', '⭐', 'achievement'),

  -- Seasonal Events
  ('event_started', 'seasonal_event', 'New Event Live! 🎉', '{event_name} has begun! Complete challenges for exclusive rewards!', 'high', '🎉', 'event'),
  ('event_ending', 'seasonal_event', 'Event Ending Soon! ⏰', '{event_name} ends in 24 hours! Last chance for rewards!', 'urgent', '⏰', 'event'),

  -- Comeback Encouragement
  ('comeback_1', 'comeback', 'We Missed You! 👋', 'It''s been {days} days. Your quests are waiting - welcome back, hero!', 'normal', '👋', 'reminder'),
  ('comeback_2', 'comeback', 'Ready to Return? 🎮', 'Your character misses you! Jump back in and reclaim your streak.', 'normal', '🎮', 'reminder'),
  ('comeback_3', 'comeback', 'Your Journey Awaits! 🧭', 'Level {level} hero! Time to continue your adventure.', 'normal', '🧭', 'reminder')
ON CONFLICT (id) DO NOTHING;

-- Function to subscribe to push notifications
CREATE OR REPLACE FUNCTION subscribe_to_push(
  p_user_id UUID,
  p_subscription_data JSONB,
  p_device_type TEXT DEFAULT 'web'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_subscription_id UUID;
BEGIN
  -- Insert or update subscription
  INSERT INTO push_subscriptions (user_id, subscription_data, device_type, is_active)
  VALUES (p_user_id, p_subscription_data, p_device_type, true)
  ON CONFLICT (user_id, subscription_data)
  DO UPDATE SET is_active = true, last_used_at = NOW()
  RETURNING id INTO v_subscription_id;

  -- Enable notifications for user
  UPDATE profiles
  SET notifications_enabled = true
  WHERE id = p_user_id;

  -- Create default preferences if not exist
  INSERT INTO notification_preferences (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN v_subscription_id;
END;
$$;

-- Function to schedule a notification
CREATE OR REPLACE FUNCTION schedule_notification(
  p_user_id UUID,
  p_notification_type TEXT,
  p_title TEXT,
  p_body TEXT,
  p_scheduled_for TIMESTAMPTZ,
  p_data JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id UUID;
  v_prefs RECORD;
BEGIN
  -- Check user preferences
  SELECT * INTO v_prefs FROM notification_preferences WHERE user_id = p_user_id;

  -- Check if this notification type is enabled
  IF NOT FOUND THEN
    RETURN NULL; -- No preferences set
  END IF;

  -- Check specific preference based on type
  CASE p_notification_type
    WHEN 'streak_reminder' THEN
      IF NOT v_prefs.streak_reminders THEN RETURN NULL; END IF;
    WHEN 'daily_boost' THEN
      IF NOT v_prefs.daily_encouragement THEN RETURN NULL; END IF;
    WHEN 'achievement' THEN
      IF NOT v_prefs.achievement_unlocks THEN RETURN NULL; END IF;
    WHEN 'quest_chain' THEN
      IF NOT v_prefs.quest_chain_updates THEN RETURN NULL; END IF;
    WHEN 'seasonal_event' THEN
      IF NOT v_prefs.seasonal_events THEN RETURN NULL; END IF;
  END CASE;

  -- Schedule the notification
  INSERT INTO scheduled_notifications (
    user_id,
    notification_type,
    title,
    body,
    data,
    scheduled_for
  ) VALUES (
    p_user_id,
    p_notification_type,
    p_title,
    p_body,
    p_data,
    p_scheduled_for
  ) RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

-- Function to auto-schedule streak reminders
CREATE OR REPLACE FUNCTION schedule_streak_reminders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user RECORD;
  v_template RECORD;
  v_reminder_time TIMESTAMPTZ;
  v_count INTEGER := 0;
BEGIN
  -- Loop through users with active streaks who haven't completed today's quest
  FOR v_user IN
    SELECT p.*, np.reminder_time, np.timezone
    FROM profiles p
    LEFT JOIN notification_preferences np ON np.user_id = p.id
    WHERE p.notifications_enabled = true
    AND p.current_streak > 0
    AND p.last_activity_date < CURRENT_DATE
    AND NOT EXISTS (
      SELECT 1 FROM scheduled_notifications
      WHERE user_id = p.id
      AND notification_type = 'streak_reminder'
      AND scheduled_for::DATE = CURRENT_DATE
      AND status = 'pending'
    )
  LOOP
    -- Pick random template
    SELECT * INTO v_template FROM notification_templates
    WHERE notification_type = 'streak_reminder'
    ORDER BY random()
    LIMIT 1;

    -- Calculate reminder time (default 9 AM user's timezone)
    v_reminder_time := (CURRENT_DATE + COALESCE(v_user.reminder_time, '09:00:00'::TIME))::TIMESTAMPTZ;

    -- Schedule notification
    PERFORM schedule_notification(
      v_user.id,
      'streak_reminder',
      v_template.title_template,
      replace(v_template.body_template, '{streak}', v_user.current_streak::TEXT),
      v_reminder_time,
      jsonb_build_object('streak', v_user.current_streak)
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION subscribe_to_push TO authenticated;
GRANT EXECUTE ON FUNCTION schedule_notification TO authenticated;
GRANT EXECUTE ON FUNCTION schedule_streak_reminders TO service_role;

-- RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own push subscriptions"
  ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own notification preferences"
  ON notification_preferences FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own scheduled notifications"
  ON scheduled_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view notification templates"
  ON notification_templates FOR SELECT
  USING (true);

-- Comments
COMMENT ON TABLE push_subscriptions IS 'Stores push notification subscription data for users';
COMMENT ON TABLE notification_preferences IS 'User preferences for different notification types';
COMMENT ON TABLE scheduled_notifications IS 'Queue of notifications to be sent';
COMMENT ON TABLE notification_templates IS 'Templates for different notification types';
COMMENT ON FUNCTION subscribe_to_push IS 'Subscribes a user to push notifications';
COMMENT ON FUNCTION schedule_notification IS 'Schedules a notification for a user';
COMMENT ON FUNCTION schedule_streak_reminders IS 'Auto-schedules streak reminder notifications';
