-- Push Notifications System
-- Web push subscription management and notification triggers

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(user_id, endpoint)
);

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  quest_reminders BOOLEAN DEFAULT TRUE,
  streak_reminders BOOLEAN DEFAULT TRUE,
  achievement_unlocks BOOLEAN DEFAULT TRUE,
  story_events BOOLEAN DEFAULT TRUE,
  seasonal_events BOOLEAN DEFAULT TRUE,
  daily_bonus BOOLEAN DEFAULT TRUE,
  quest_chain_updates BOOLEAN DEFAULT TRUE,
  premium_offers BOOLEAN DEFAULT FALSE,
  reminder_time TIME DEFAULT '09:00:00', -- preferred notification time
  quiet_hours_start TIME DEFAULT '22:00:00',
  quiet_hours_end TIME DEFAULT '08:00:00',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  icon TEXT,
  badge TEXT,
  data JSONB, -- additional data like quest_id, event_id, etc.
  scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('pending', 'sent', 'failed')) DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  clicked BOOLEAN DEFAULT FALSE,
  clicked_at TIMESTAMPTZ,
  dismissed BOOLEAN DEFAULT FALSE,
  dismissed_at TIMESTAMPTZ
);

-- Function to register push subscription
CREATE OR REPLACE FUNCTION register_push_subscription(
  p_user_id UUID,
  p_endpoint TEXT,
  p_auth_key TEXT,
  p_p256dh_key TEXT,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_subscription_id UUID;
BEGIN
  INSERT INTO push_subscriptions (user_id, endpoint, auth_key, p256dh_key, user_agent)
  VALUES (p_user_id, p_endpoint, p_auth_key, p_p256dh_key, p_user_agent)
  ON CONFLICT (user_id, endpoint) DO UPDATE
  SET
    auth_key = p_auth_key,
    p256dh_key = p_p256dh_key,
    last_used_at = NOW(),
    is_active = TRUE
  RETURNING id INTO v_subscription_id;

  -- Create default notification preferences if not exists
  INSERT INTO notification_preferences (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN v_subscription_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to queue notification
CREATE OR REPLACE FUNCTION queue_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT,
  p_icon TEXT DEFAULT NULL,
  p_data JSONB DEFAULT NULL,
  p_scheduled_for TIMESTAMPTZ DEFAULT NOW()
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
  v_prefs RECORD;
  v_should_send BOOLEAN := TRUE;
  v_current_time TIME;
BEGIN
  -- Get user preferences
  SELECT * INTO v_prefs FROM notification_preferences WHERE user_id = p_user_id;

  -- Check if user wants this type of notification
  IF v_prefs IS NOT NULL THEN
    CASE p_type
      WHEN 'quest_reminder' THEN v_should_send := v_prefs.quest_reminders;
      WHEN 'streak_reminder' THEN v_should_send := v_prefs.streak_reminders;
      WHEN 'achievement' THEN v_should_send := v_prefs.achievement_unlocks;
      WHEN 'story_event' THEN v_should_send := v_prefs.story_events;
      WHEN 'seasonal_event' THEN v_should_send := v_prefs.seasonal_events;
      WHEN 'daily_bonus' THEN v_should_send := v_prefs.daily_bonus;
      WHEN 'quest_chain' THEN v_should_send := v_prefs.quest_chain_updates;
      WHEN 'premium_offer' THEN v_should_send := v_prefs.premium_offers;
    END CASE;

    -- Check quiet hours
    v_current_time := p_scheduled_for::TIME;
    IF v_prefs.quiet_hours_start < v_prefs.quiet_hours_end THEN
      IF v_current_time >= v_prefs.quiet_hours_start AND v_current_time < v_prefs.quiet_hours_end THEN
        -- Reschedule to end of quiet hours
        p_scheduled_for := DATE_TRUNC('day', p_scheduled_for) + v_prefs.quiet_hours_end;
      END IF;
    ELSE
      -- Quiet hours span midnight
      IF v_current_time >= v_prefs.quiet_hours_start OR v_current_time < v_prefs.quiet_hours_end THEN
        p_scheduled_for := DATE_TRUNC('day', p_scheduled_for) + v_prefs.quiet_hours_end;
      END IF;
    END IF;
  END IF;

  IF NOT v_should_send THEN
    RETURN NULL;
  END IF;

  -- Queue the notification
  INSERT INTO notification_queue (user_id, notification_type, title, body, icon, data, scheduled_for)
  VALUES (p_user_id, p_type, p_title, p_body, p_icon, p_data, p_scheduled_for)
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- NOTE: The following triggers reference tables that don't exist yet (achievements, quest_chains)
-- They are commented out until those features are implemented
-- Uncomment them once you create the achievements and quest_chains tables

/*
-- Auto-queue notification on achievement unlock
CREATE OR REPLACE FUNCTION notify_achievement_unlock()
RETURNS TRIGGER AS $$
DECLARE
  v_achievement_name TEXT;
BEGIN
  SELECT name INTO v_achievement_name FROM achievements WHERE id = NEW.achievement_id;

  PERFORM queue_notification(
    NEW.user_id,
    'achievement',
    'Achievement Unlocked! 🏆',
    'You earned: ' || v_achievement_name,
    '🏆',
    jsonb_build_object('achievement_id', NEW.achievement_id)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_achievement ON user_achievements;

CREATE TRIGGER trigger_notify_achievement
AFTER INSERT ON user_achievements
FOR EACH ROW
EXECUTE FUNCTION notify_achievement_unlock();

-- Auto-queue notification on quest chain step unlock
CREATE OR REPLACE FUNCTION notify_quest_chain_step()
RETURNS TRIGGER AS $$
DECLARE
  v_chain_name TEXT;
  v_step_title TEXT;
BEGIN
  IF NEW.current_step > OLD.current_step THEN
    SELECT qc.name, qcs.title INTO v_chain_name, v_step_title
    FROM quest_chains qc
    JOIN quest_chain_steps qcs ON qcs.chain_id = qc.id
    WHERE qc.id = NEW.chain_id AND qcs.step_number = NEW.current_step;

    PERFORM queue_notification(
      NEW.user_id,
      'quest_chain',
      'Quest Chain Update! ⚔️',
      v_chain_name || ': ' || v_step_title,
      '⚔️',
      jsonb_build_object('chain_id', NEW.chain_id, 'step', NEW.current_step)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_quest_chain ON user_quest_chain_progress;

CREATE TRIGGER trigger_notify_quest_chain
AFTER UPDATE ON user_quest_chain_progress
FOR EACH ROW
EXECUTE FUNCTION notify_quest_chain_step();
*/

-- Auto-queue daily bonus reminder
-- FIXED: Changed user_profiles to profiles table
CREATE OR REPLACE FUNCTION schedule_daily_reminders()
RETURNS void AS $$
BEGIN
  -- Queue daily bonus reminders for users who haven't claimed today
  INSERT INTO notification_queue (user_id, notification_type, title, body, icon, scheduled_for)
  SELECT
    p.id,
    'daily_bonus',
    'Don''t Forget Your Daily Bonus! 🎁',
    'Claim your reward to keep your streak alive!',
    '🎁',
    (DATE_TRUNC('day', NOW()) + COALESCE(np.reminder_time, '09:00:00'::TIME))
  FROM profiles p
  LEFT JOIN notification_preferences np ON np.user_id = p.id
  WHERE COALESCE(np.daily_bonus, TRUE) = TRUE
    AND p.last_quest_date < CURRENT_DATE
    AND NOT EXISTS (
      SELECT 1 FROM notification_queue nq
      WHERE nq.user_id = p.id
        AND nq.notification_type = 'daily_bonus'
        AND nq.scheduled_for::DATE = CURRENT_DATE
    );
END;
$$ LANGUAGE plpgsql;

-- Mark notification as clicked
CREATE OR REPLACE FUNCTION mark_notification_clicked(p_notification_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE notification_history
  SET clicked = TRUE, clicked_at = NOW()
  WHERE id = p_notification_id AND clicked = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own subscriptions" ON push_subscriptions;
CREATE POLICY "Users can manage their own subscriptions" ON push_subscriptions
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own preferences" ON notification_preferences;
CREATE POLICY "Users can manage their own preferences" ON notification_preferences
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their notification queue" ON notification_queue;
CREATE POLICY "Users can view their notification queue" ON notification_queue
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their notification history" ON notification_history;
CREATE POLICY "Users can view their notification history" ON notification_history
  FOR ALL USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled ON notification_queue(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_notification_queue_user ON notification_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_notification_history_user ON notification_history(user_id);

COMMENT ON TABLE push_subscriptions IS 'Web push notification subscriptions for users';
COMMENT ON TABLE notification_preferences IS 'User preferences for notification types and timing';
COMMENT ON TABLE notification_queue IS 'Queue of pending notifications to be sent';
COMMENT ON TABLE notification_history IS 'History of sent notifications and user interactions';
