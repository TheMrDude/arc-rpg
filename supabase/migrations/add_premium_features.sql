-- Add Premium Features System
-- Recurring quests, equipment shop, quest templates, and premium user management

-- ═══════════════════════════════════════════════
-- PART 1: UPDATE PROFILES TABLE FOR PREMIUM
-- ═══════════════════════════════════════════════

-- Add premium-related columns to profiles if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_premium') THEN
    ALTER TABLE profiles ADD COLUMN is_premium BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='shown_premium_welcome') THEN
    ALTER TABLE profiles ADD COLUMN shown_premium_welcome BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='last_archetype_switch_date') THEN
    ALTER TABLE profiles ADD COLUMN last_archetype_switch_date TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='quest_count_this_month') THEN
    ALTER TABLE profiles ADD COLUMN quest_count_this_month INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='last_quest_reset_date') THEN
    ALTER TABLE profiles ADD COLUMN last_quest_reset_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- ═══════════════════════════════════════════════
-- PART 2: RECURRING QUESTS TABLE
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS recurring_quests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  original_text TEXT NOT NULL,
  transformed_text TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  xp_value INTEGER NOT NULL,
  recurrence_type TEXT NOT NULL CHECK (recurrence_type IN ('daily', 'weekly', 'custom')),
  recurrence_interval INTEGER DEFAULT 1, -- For custom: days between occurrences
  recurrence_day_of_week INTEGER, -- For weekly: 0=Sunday, 1=Monday, etc.
  is_active BOOLEAN DEFAULT true,
  last_generated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for recurring quests
CREATE INDEX IF NOT EXISTS idx_recurring_quests_user ON recurring_quests(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_recurring_quests_generation ON recurring_quests(is_active, last_generated_at);

-- RLS for recurring quests
ALTER TABLE recurring_quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Premium users can view own recurring quests"
  ON recurring_quests FOR SELECT
  USING (auth.uid() = user_id AND (SELECT is_premium FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Premium users can insert own recurring quests"
  ON recurring_quests FOR INSERT
  WITH CHECK (auth.uid() = user_id AND (SELECT is_premium FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Premium users can update own recurring quests"
  ON recurring_quests FOR UPDATE
  USING (auth.uid() = user_id AND (SELECT is_premium FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Premium users can delete own recurring quests"
  ON recurring_quests FOR DELETE
  USING (auth.uid() = user_id AND (SELECT is_premium FROM profiles WHERE id = auth.uid()));

-- ═══════════════════════════════════════════════
-- PART 3: QUEST TEMPLATES TABLE
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS quest_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('fitness', 'work', 'learning', 'health', 'creative', 'productivity', 'mindfulness', 'social')),
  quests JSONB NOT NULL, -- Array of quest objects: [{text, difficulty}]
  difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  is_official BOOLEAN DEFAULT true, -- Official vs user-created
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  usage_count INTEGER DEFAULT 0
);

-- Index for template browsing
CREATE INDEX IF NOT EXISTS idx_quest_templates_category ON quest_templates(category, is_official);

-- RLS for quest templates (read-only for all premium users, official templates public)
ALTER TABLE quest_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All users can view official templates"
  ON quest_templates FOR SELECT
  USING (is_official = true);

CREATE POLICY "Premium users can view all templates"
  ON quest_templates FOR SELECT
  USING ((SELECT is_premium FROM profiles WHERE id = auth.uid()));

-- ═══════════════════════════════════════════════
-- PART 4: EQUIPMENT CATALOG TABLE
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS equipment_catalog (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('weapon', 'armor', 'accessory', 'companion_skin')),
  description TEXT NOT NULL,
  gold_price INTEGER NOT NULL,
  stat_bonus JSONB, -- {xp_multiplier: 1.1, streak_protection: true, gold_bonus: 1.2}
  image_url TEXT,
  emoji TEXT, -- Fallback if no image
  rarity TEXT NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  archetype_restriction TEXT, -- NULL = all archetypes, or specific archetype
  level_requirement INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for equipment browsing
CREATE INDEX IF NOT EXISTS idx_equipment_catalog_type ON equipment_catalog(type, is_active);
CREATE INDEX IF NOT EXISTS idx_equipment_catalog_rarity ON equipment_catalog(rarity);

-- RLS for equipment catalog (read-only for all users)
ALTER TABLE equipment_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All users can view equipment catalog"
  ON equipment_catalog FOR SELECT
  USING (is_active = true);

-- ═══════════════════════════════════════════════
-- PART 5: USER EQUIPMENT (INVENTORY)
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_equipment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  equipment_id UUID REFERENCES equipment_catalog(id) ON DELETE CASCADE NOT NULL,
  equipped BOOLEAN DEFAULT false,
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, equipment_id)
);

-- Index for user inventory
CREATE INDEX IF NOT EXISTS idx_user_equipment_user ON user_equipment(user_id, equipped);

-- RLS for user equipment
ALTER TABLE user_equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own equipment"
  ON user_equipment FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Premium users can insert own equipment"
  ON user_equipment FOR INSERT
  WITH CHECK (auth.uid() = user_id AND (SELECT is_premium FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own equipment"
  ON user_equipment FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own equipment"
  ON user_equipment FOR DELETE
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════
-- HELPER FUNCTIONS
-- ═══════════════════════════════════════════════

-- Function to check if user can create quest (free tier limit)
CREATE OR REPLACE FUNCTION can_create_quest(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_premium_user BOOLEAN;
  quest_count INTEGER;
  last_reset DATE;
BEGIN
  -- Check if user is premium
  SELECT is_premium, quest_count_this_month, last_quest_reset_date
  INTO is_premium_user, quest_count, last_reset
  FROM profiles
  WHERE id = p_user_id;

  -- Premium users have unlimited quests
  IF is_premium_user THEN
    RETURN true;
  END IF;

  -- Reset counter if new month
  IF last_reset IS NULL OR EXTRACT(MONTH FROM last_reset) != EXTRACT(MONTH FROM NOW()) THEN
    UPDATE profiles
    SET quest_count_this_month = 0,
        last_quest_reset_date = NOW()
    WHERE id = p_user_id;
    RETURN true;
  END IF;

  -- Free tier: 10 quests per month
  RETURN quest_count < 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment quest count
CREATE OR REPLACE FUNCTION increment_quest_count(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  is_premium_user BOOLEAN;
BEGIN
  SELECT is_premium INTO is_premium_user FROM profiles WHERE id = p_user_id;

  -- Only increment for free users
  IF NOT is_premium_user THEN
    UPDATE profiles
    SET quest_count_this_month = quest_count_this_month + 1
    WHERE id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can switch archetype
CREATE OR REPLACE FUNCTION can_switch_archetype(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_premium_user BOOLEAN;
  last_switch TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT is_premium, last_archetype_switch_date
  INTO is_premium_user, last_switch
  FROM profiles
  WHERE id = p_user_id;

  -- Must be premium
  IF NOT is_premium_user THEN
    RETURN false;
  END IF;

  -- First time switching
  IF last_switch IS NULL THEN
    RETURN true;
  END IF;

  -- 7 day cooldown
  RETURN last_switch + INTERVAL '7 days' <= NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get next archetype switch date
CREATE OR REPLACE FUNCTION get_next_archetype_switch_date(p_user_id UUID)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
DECLARE
  last_switch TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT last_archetype_switch_date INTO last_switch
  FROM profiles
  WHERE id = p_user_id;

  IF last_switch IS NULL THEN
    RETURN NOW();
  END IF;

  RETURN last_switch + INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION can_create_quest(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_quest_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_switch_archetype(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_archetype_switch_date(UUID) TO authenticated;

-- Comments for documentation
COMMENT ON TABLE recurring_quests IS 'Premium feature: Auto-generating recurring quests (daily/weekly/custom intervals)';
COMMENT ON TABLE quest_templates IS 'Premium feature: Pre-built quest templates users can clone';
COMMENT ON TABLE equipment_catalog IS 'Premium feature: Purchasable equipment for cosmetics and stat boosts';
COMMENT ON TABLE user_equipment IS 'Premium feature: User inventory of purchased/equipped items';
