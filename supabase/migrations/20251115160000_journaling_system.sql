-- ═══════════════════════════════════════════════════════════════════════════
-- HABITQUEST JOURNALING SYSTEM
-- ═══════════════════════════════════════════════════════════════════════════
-- Features:
-- - Free tier: 5 entries/month, 30-day expiry, basic AI transformation
-- - Premium tier: Unlimited entries, permanent storage, deep AI transformation
-- - Equipment unlocks at entry milestones
-- - Boss battles unlocked through journaling
-- - Mood tracking and statistics
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 1: JOURNAL ENTRIES TABLE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Entry content
  entry_text TEXT NOT NULL CHECK (char_length(entry_text) >= 50 AND char_length(entry_text) <= 5000),
  transformed_narrative TEXT, -- AI-generated epic version
  transformation_type TEXT DEFAULT 'basic' CHECK (transformation_type IN ('basic', 'deep')),

  -- Metadata
  mood INTEGER CHECK (mood IS NULL OR (mood >= 1 AND mood <= 5)), -- 1=terrible, 5=amazing
  word_count INTEGER,
  tags TEXT[],
  is_milestone BOOLEAN DEFAULT false, -- marks entries that unlocked equipment/bosses

  -- Media (future expansion)
  media_urls TEXT[],

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Free tier expiry (NULL for premium, NOW() + 30 days for free)
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_journal_user_date ON journal_entries(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_journal_mood ON journal_entries(user_id, mood) WHERE mood IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_journal_expiry ON journal_entries(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_journal_milestones ON journal_entries(user_id, is_milestone) WHERE is_milestone = true;

-- RLS Policies
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own journal entries"
  ON journal_entries FOR SELECT
  USING (
    auth.uid() = user_id
    AND (expires_at IS NULL OR expires_at > NOW()) -- Auto-hide expired free entries
  );

CREATE POLICY "Users can create own journal entries"
  ON journal_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own journal entries"
  ON journal_entries FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own journal entries"
  ON journal_entries FOR DELETE
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 2: JOURNAL EQUIPMENT SYSTEM
-- ═══════════════════════════════════════════════════════════════════════════

-- Equipment catalog
CREATE TABLE IF NOT EXISTS journal_equipment (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('weapon', 'armor', 'accessory', 'companion')),
  rarity TEXT NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  unlock_requirement INTEGER NOT NULL, -- number of journal entries needed
  stat_bonus JSONB DEFAULT '{}'::jsonb, -- {xp_multiplier: 1.1, journal_xp_boost: 1.2, etc}
  image_url TEXT,
  is_premium_only BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User equipment inventory
CREATE TABLE IF NOT EXISTS user_journal_equipment (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  equipment_id UUID REFERENCES journal_equipment(id) ON DELETE CASCADE NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_equipped BOOLEAN DEFAULT false,

  UNIQUE(user_id, equipment_id)
);

CREATE INDEX IF NOT EXISTS idx_user_journal_equipment_user ON user_journal_equipment(user_id);
CREATE INDEX IF NOT EXISTS idx_user_journal_equipment_equipped ON user_journal_equipment(user_id, is_equipped) WHERE is_equipped = true;

-- RLS for equipment
ALTER TABLE user_journal_equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own equipment"
  ON user_journal_equipment FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own equipment"
  ON user_journal_equipment FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Seed equipment data
INSERT INTO journal_equipment (name, description, type, rarity, unlock_requirement, stat_bonus, is_premium_only, sort_order) VALUES
  ('Quill of Clarity', 'Your first tool of reflection. Grants insight into daily struggles. The more you write, the sharper it becomes.', 'weapon', 'common', 10, '{"xp_multiplier": 1.1}'::jsonb, true, 1),
  ('Journal of Ages', 'An ancient tome that remembers all your stories. Unlocks the "On This Day" feature to revisit past reflections.', 'accessory', 'rare', 25, '{"unlocks_feature": "on_this_day"}'::jsonb, true, 2),
  ('Mirror of Truth', 'See your emotional journey reflected across time. Reveals patterns in your mood and growth.', 'accessory', 'rare', 50, '{"unlocks_feature": "mood_charts"}'::jsonb, true, 3),
  ('Memory Keeper', 'A wise owl companion who reminds you to reflect. Sends gentle daily nudges to journal.', 'companion', 'epic', 15, '{"daily_reminder": true}'::jsonb, true, 4),
  ('The Reflection', 'Your shadow self, born from deep introspection. Sees truths you might miss.', 'companion', 'legendary', 40, '{"xp_multiplier": 1.2, "deeper_insights": true}'::jsonb, true, 5),
  ('Phoenix of Growth', 'Rises from the ashes of your struggles. Protects your streak if you miss a day.', 'companion', 'legendary', 75, '{"streak_protection": true, "xp_multiplier": 1.3}'::jsonb, true, 6),
  ('Crown of Insight', 'Worn by those who face themselves daily. The ultimate reward for consistent reflection.', 'armor', 'legendary', 100, '{"xp_multiplier": 1.5, "journal_xp_boost": 2.0}'::jsonb, true, 7)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 3: JOURNAL BOSS BATTLES
-- ═══════════════════════════════════════════════════════════════════════════

-- Boss catalog
CREATE TABLE IF NOT EXISTS journal_bosses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  unlock_requirement INTEGER NOT NULL, -- number of entries needed
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'legendary')),
  hp INTEGER NOT NULL,
  xp_reward INTEGER NOT NULL,
  gold_reward INTEGER NOT NULL,
  special_mechanic TEXT, -- Description of unique boss mechanic
  lore TEXT, -- Story background
  is_premium_only BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User boss progress
CREATE TABLE IF NOT EXISTS user_boss_battles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  boss_id UUID REFERENCES journal_bosses(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'locked' CHECK (status IN ('locked', 'available', 'in_progress', 'defeated')),
  damage_dealt INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 0,
  defeated_at TIMESTAMP WITH TIME ZONE,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, boss_id)
);

CREATE INDEX IF NOT EXISTS idx_user_boss_battles_user ON user_boss_battles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_boss_battles_status ON user_boss_battles(user_id, status);

ALTER TABLE user_boss_battles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own boss battles"
  ON user_boss_battles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own boss battles"
  ON user_boss_battles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can create own boss battles"
  ON user_boss_battles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Seed boss data
INSERT INTO journal_bosses (name, description, unlock_requirement, difficulty, hp, xp_reward, gold_reward, special_mechanic, lore, is_premium_only, sort_order) VALUES
  (
    'The Shadow of Doubt',
    'Your inner critic takes physical form, whispering your fears and failures.',
    20,
    'medium',
    500,
    200,
    100,
    'Each attack references your actual journal struggles. Damage dealt based on your mood improvements.',
    'Born from the darkest corners of self-reflection, this shadow feeds on negativity. Only by confronting your fears through honest journaling can you weaken its power.',
    true,
    1
  ),
  (
    'The Procrastination Dragon',
    'A beast that feeds on delayed dreams. Grows stronger when you avoid reflection.',
    50,
    'hard',
    1000,
    500,
    250,
    'Difficulty adapts based on your journaling consistency. Miss days and it grows stronger.',
    'This ancient dragon hoards stolen time and forgotten aspirations. It thrives in the space between intention and action. Defeat it by maintaining a strong journal streak.',
    true,
    2
  ),
  (
    'Your Former Self',
    'An echo from your past journals. Shows how far you''ve come - or haven''t.',
    100,
    'legendary',
    2000,
    1000,
    500,
    'Uses your old journal entries as attacks and defense. Victory requires showing genuine growth.',
    'A mirror battle against who you once were. The boss literally quotes your past entries, challenging you to prove you''ve evolved. The ultimate test of personal growth.',
    true,
    3
  )
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 4: PROFILE EXTENSIONS FOR JOURNALING
-- ═══════════════════════════════════════════════════════════════════════════

-- Add journal stats to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS journal_entry_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS journal_streak INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_journal_date DATE,
  ADD COLUMN IF NOT EXISTS longest_journal_streak INTEGER DEFAULT 0;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 5: FUNCTIONS AND TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════

-- Function to auto-set expiry for free tier entries
CREATE OR REPLACE FUNCTION set_journal_expiry()
RETURNS TRIGGER AS $$
DECLARE
  user_premium BOOLEAN;
BEGIN
  -- Check if user is premium
  SELECT (is_premium = true OR subscription_status = 'active') INTO user_premium
  FROM profiles
  WHERE id = NEW.user_id;

  -- Set expiry for free users only
  IF user_premium = false THEN
    NEW.expires_at := NOW() + INTERVAL '30 days';
  ELSE
    NEW.expires_at := NULL; -- Premium entries never expire
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS set_journal_expiry_trigger ON journal_entries;
CREATE TRIGGER set_journal_expiry_trigger
  BEFORE INSERT ON journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION set_journal_expiry();

-- Function to update journal stats on profile
CREATE OR REPLACE FUNCTION update_journal_stats()
RETURNS TRIGGER AS $$
DECLARE
  current_date DATE := CURRENT_DATE;
  last_date DATE;
  current_streak INTEGER;
BEGIN
  -- Get current stats
  SELECT last_journal_date, journal_streak
  INTO last_date, current_streak
  FROM profiles
  WHERE id = NEW.user_id;

  -- Update profile
  UPDATE profiles
  SET
    journal_entry_count = journal_entry_count + 1,
    last_journal_date = current_date,
    journal_streak = CASE
      -- Same day, no change to streak
      WHEN last_date = current_date THEN journal_streak
      -- Yesterday, increment streak
      WHEN last_date = current_date - INTERVAL '1 day' THEN journal_streak + 1
      -- Streak broken, reset to 1
      ELSE 1
    END,
    -- Track longest streak
    longest_journal_streak = GREATEST(
      longest_journal_streak,
      CASE
        WHEN last_date = current_date THEN journal_streak
        WHEN last_date = current_date - INTERVAL '1 day' THEN journal_streak + 1
        ELSE 1
      END
    ),
    updated_at = NOW()
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_journal_stats_trigger ON journal_entries;
CREATE TRIGGER update_journal_stats_trigger
  AFTER INSERT ON journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_journal_stats();

-- Function to get recent journal entries (for AI context)
CREATE OR REPLACE FUNCTION get_recent_journal_entries(
  p_user_id UUID,
  days_back INTEGER DEFAULT 7
)
RETURNS TABLE (
  id UUID,
  entry_text TEXT,
  transformed_narrative TEXT,
  mood INTEGER,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  -- SECURITY: Validate caller owns this data
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: cannot query other users journal entries';
  END IF;

  -- Validate days_back
  IF days_back < 1 OR days_back > 365 THEN
    RAISE EXCEPTION 'days_back must be between 1 and 365';
  END IF;

  RETURN QUERY
  SELECT
    je.id,
    je.entry_text,
    je.transformed_narrative,
    je.mood,
    je.created_at
  FROM journal_entries je
  WHERE je.user_id = p_user_id
    AND je.created_at >= NOW() - (days_back || ' days')::INTERVAL
    AND (je.expires_at IS NULL OR je.expires_at > NOW())
  ORDER BY je.created_at DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_recent_journal_entries(UUID, INTEGER) TO authenticated;

-- Function to get "On This Day" entries (premium feature)
CREATE OR REPLACE FUNCTION get_on_this_day_entries(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  entry_text TEXT,
  transformed_narrative TEXT,
  mood INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  years_ago INTEGER
) AS $$
BEGIN
  -- SECURITY: Validate caller owns this data
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: cannot query other users journal entries';
  END IF;

  RETURN QUERY
  SELECT
    je.id,
    je.entry_text,
    je.transformed_narrative,
    je.mood,
    je.created_at,
    EXTRACT(YEAR FROM NOW())::INTEGER - EXTRACT(YEAR FROM je.created_at)::INTEGER as years_ago
  FROM journal_entries je
  WHERE je.user_id = p_user_id
    AND EXTRACT(MONTH FROM je.created_at) = EXTRACT(MONTH FROM NOW())
    AND EXTRACT(DAY FROM je.created_at) = EXTRACT(DAY FROM NOW())
    AND EXTRACT(YEAR FROM je.created_at) < EXTRACT(YEAR FROM NOW())
    AND (je.expires_at IS NULL OR je.expires_at > NOW())
  ORDER BY je.created_at DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_on_this_day_entries(UUID) TO authenticated;

-- Function to get average mood over time period
CREATE OR REPLACE FUNCTION get_average_mood(
  p_user_id UUID,
  days_back INTEGER DEFAULT 7
)
RETURNS NUMERIC AS $$
DECLARE
  avg_mood NUMERIC;
BEGIN
  -- SECURITY: Validate caller owns this data
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: cannot query other users data';
  END IF;

  -- Validate days_back
  IF days_back < 1 OR days_back > 365 THEN
    RAISE EXCEPTION 'days_back must be between 1 and 365';
  END IF;

  SELECT AVG(mood)::NUMERIC(3,2)
  INTO avg_mood
  FROM journal_entries
  WHERE user_id = p_user_id
    AND mood IS NOT NULL
    AND created_at >= NOW() - (days_back || ' days')::INTERVAL
    AND (expires_at IS NULL OR expires_at > NOW());

  RETURN COALESCE(avg_mood, 3.0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_average_mood(UUID, INTEGER) TO authenticated;

-- Function to get daily journal count (for rate limiting free tier)
CREATE OR REPLACE FUNCTION get_daily_journal_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  entry_count INTEGER;
BEGIN
  -- SECURITY: Validate caller owns this data
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: cannot query other users data';
  END IF;

  SELECT COUNT(*)
  INTO entry_count
  FROM journal_entries
  WHERE user_id = p_user_id
    AND created_at >= CURRENT_DATE;

  RETURN entry_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_daily_journal_count(UUID) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 6: CLEANUP FUNCTION FOR EXPIRED ENTRIES
-- ═══════════════════════════════════════════════════════════════════════════

-- Function to delete expired free tier entries (run via cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_journal_entries()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM journal_entries
  WHERE expires_at IS NOT NULL
    AND expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: Set up a cron job in Supabase to run this daily:
-- SELECT cron.schedule('cleanup-expired-journals', '0 2 * * *', 'SELECT cleanup_expired_journal_entries()');

-- ═══════════════════════════════════════════════════════════════════════════
-- COMPLETION MESSAGE
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '✅ Journaling system migration completed successfully!';
  RAISE NOTICE 'Created:';
  RAISE NOTICE '  - journal_entries table with RLS';
  RAISE NOTICE '  - journal_equipment catalog (7 items)';
  RAISE NOTICE '  - journal_bosses catalog (3 bosses)';
  RAISE NOTICE '  - user_journal_equipment inventory';
  RAISE NOTICE '  - user_boss_battles progress tracking';
  RAISE NOTICE '  - 6 helper functions for queries';
  RAISE NOTICE '  - Auto-expiry for free tier entries';
  RAISE NOTICE '  - Journal stats tracking on profiles';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Deploy API routes';
  RAISE NOTICE '  2. Add Journal tab to dashboard';
  RAISE NOTICE '  3. Test free vs premium flows';
  RAISE NOTICE '  4. Set up cron for cleanup_expired_journal_entries()';
END $$;
