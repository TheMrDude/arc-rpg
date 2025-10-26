-- ============================================
-- COMPLETE ARC RPG DATABASE SETUP
-- Run this ONCE in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. CREATE PROFILES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  archetype TEXT,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  gold INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_quest_date TIMESTAMPTZ,
  skill_points INTEGER DEFAULT 0,

  -- Premium/Subscription fields
  is_premium BOOLEAN DEFAULT FALSE,
  subscription_status TEXT DEFAULT 'inactive',
  premium_since TIMESTAMPTZ,
  stripe_customer_id TEXT,
  stripe_session_id TEXT,
  stripe_subscription_id TEXT,

  -- Equipment fields
  equipped_weapon UUID REFERENCES equipment_catalog(id),
  equipped_armor UUID REFERENCES equipment_catalog(id),
  equipped_accessory UUID REFERENCES equipment_catalog(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. CREATE QUESTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_text TEXT NOT NULL,
  transformed_text TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  xp_value INTEGER NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. CREATE EQUIPMENT CATALOG TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS equipment_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('weapon', 'armor', 'accessory')),
  description TEXT,
  xp_multiplier DECIMAL(3,2) DEFAULT 1.00,
  gold_cost INTEGER NOT NULL,
  level_required INTEGER DEFAULT 1,
  rarity TEXT CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. CREATE USER EQUIPMENT INVENTORY
-- ============================================

CREATE TABLE IF NOT EXISTS user_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES equipment_catalog(id) ON DELETE CASCADE,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, equipment_id)
);

-- ============================================
-- 5. CREATE GOLD TRANSACTIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS gold_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  transaction_type TEXT NOT NULL,
  reference_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. CREATE STORY PROGRESS TABLE (Premium)
-- ============================================

CREATE TABLE IF NOT EXISTS story_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_chapter INTEGER DEFAULT 1,
  story_beats JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================
-- 7. CREATE RECURRING QUEST TEMPLATES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS recurring_quest_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  recurrence_type TEXT NOT NULL CHECK (recurrence_type IN ('daily', 'weekly', 'custom')),
  recurrence_interval INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 8. CREATE TEMPLATE TASKS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS template_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES recurring_quest_templates(id) ON DELETE CASCADE,
  task_text TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 9. CREATE TEMPLATE GENERATION LOG
-- ============================================

CREATE TABLE IF NOT EXISTS template_generation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES recurring_quest_templates(id) ON DELETE CASCADE,
  generated_at TIMESTAMPTZ NOT NULL,
  quests_created INTEGER DEFAULT 0
);

-- ============================================
-- 10. CREATE INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_quests_user_id_created_at ON quests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quests_user_id_completed ON quests(user_id, completed, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_is_premium ON profiles(is_premium) WHERE is_premium = true;
CREATE INDEX IF NOT EXISTS idx_profiles_id_archetype ON profiles(id, archetype);
CREATE INDEX IF NOT EXISTS idx_gold_transactions_user_id ON gold_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_equipment_user_id ON user_equipment(user_id);
CREATE INDEX IF NOT EXISTS idx_template_tasks_template_id ON template_tasks(template_id, sort_order);

-- ============================================
-- 11. AUTO-CREATE PROFILE TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 12. GOLD TRANSACTION FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION process_gold_transaction(
  p_user_id UUID,
  p_amount INTEGER,
  p_transaction_type TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  new_balance INTEGER,
  transaction_id UUID
) AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
  v_transaction_id UUID;
BEGIN
  -- Lock the user's profile row
  SELECT gold INTO v_current_balance
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  -- Calculate new balance
  v_new_balance := v_current_balance + p_amount;

  -- Prevent negative balance
  IF v_new_balance < 0 THEN
    RETURN QUERY SELECT FALSE, v_current_balance, NULL::UUID;
    RETURN;
  END IF;

  -- Update balance
  UPDATE profiles
  SET gold = v_new_balance,
      updated_at = NOW()
  WHERE id = p_user_id;

  -- Record transaction
  INSERT INTO gold_transactions (user_id, amount, transaction_type, reference_id, metadata)
  VALUES (p_user_id, p_amount, p_transaction_type, p_reference_id, p_metadata)
  RETURNING id INTO v_transaction_id;

  -- Return success
  RETURN QUERY SELECT TRUE, v_new_balance, v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 13. ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE gold_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_quest_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_generation_log ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 14. RLS POLICIES FOR PROFILES
-- ============================================

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- ============================================
-- 15. RLS POLICIES FOR QUESTS
-- ============================================

DROP POLICY IF EXISTS "Users can view own quests" ON quests;
CREATE POLICY "Users can view own quests"
  ON quests FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own quests" ON quests;
CREATE POLICY "Users can insert own quests"
  ON quests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own quests" ON quests;
CREATE POLICY "Users can update own quests"
  ON quests FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own quests" ON quests;
CREATE POLICY "Users can delete own quests"
  ON quests FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 16. RLS POLICIES FOR USER EQUIPMENT
-- ============================================

DROP POLICY IF EXISTS "Users can view own equipment" ON user_equipment;
CREATE POLICY "Users can view own equipment"
  ON user_equipment FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own equipment" ON user_equipment;
CREATE POLICY "Users can insert own equipment"
  ON user_equipment FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 17. RLS POLICIES FOR TEMPLATES
-- ============================================

DROP POLICY IF EXISTS "Users can view own templates" ON recurring_quest_templates;
CREATE POLICY "Users can view own templates"
  ON recurring_quest_templates FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own templates" ON recurring_quest_templates;
CREATE POLICY "Users can insert own templates"
  ON recurring_quest_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own templates" ON recurring_quest_templates;
CREATE POLICY "Users can update own templates"
  ON recurring_quest_templates FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own templates" ON recurring_quest_templates;
CREATE POLICY "Users can delete own templates"
  ON recurring_quest_templates FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 18. RLS POLICIES FOR TEMPLATE TASKS
-- ============================================

DROP POLICY IF EXISTS "Users can view tasks for own templates" ON template_tasks;
CREATE POLICY "Users can view tasks for own templates"
  ON template_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM recurring_quest_templates
      WHERE id = template_tasks.template_id
      AND user_id = auth.uid()
    )
  );

-- ============================================
-- 19. EQUIPMENT CATALOG IS PUBLIC (READ-ONLY)
-- ============================================

DROP POLICY IF EXISTS "Equipment catalog is viewable by everyone" ON equipment_catalog;
CREATE POLICY "Equipment catalog is viewable by everyone"
  ON equipment_catalog FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- 20. INSERT STARTER EQUIPMENT
-- ============================================

INSERT INTO equipment_catalog (name, type, description, xp_multiplier, gold_cost, level_required, rarity)
VALUES
  ('Rusty Sword', 'weapon', 'A basic warrior weapon', 1.10, 500, 1, 'common'),
  ('Iron Shield', 'armor', 'Basic protection', 1.10, 500, 1, 'common'),
  ('Lucky Coin', 'accessory', 'Increases fortune', 1.05, 300, 1, 'common'),
  ('Steel Blade', 'weapon', 'Sharp and reliable', 1.25, 2000, 5, 'uncommon'),
  ('Chainmail Vest', 'armor', 'Decent protection', 1.25, 2000, 5, 'uncommon'),
  ('Focus Amulet', 'accessory', 'Sharpens the mind', 1.15, 1000, 3, 'uncommon')
ON CONFLICT DO NOTHING;

-- ============================================
-- DONE!
-- ============================================
-- All tables, triggers, and policies created!
-- Users can now sign up and start questing!
-- ============================================
