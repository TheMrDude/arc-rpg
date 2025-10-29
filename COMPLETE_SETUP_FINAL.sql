-- COMPLETE ARC RPG DATABASE SETUP - FINAL VERSION
-- Run this ONCE in Supabase SQL Editor

-- STEP 1: DROP EXISTING TABLES (CLEAN SLATE)

DROP TABLE IF EXISTS template_generation_log CASCADE;
DROP TABLE IF EXISTS template_tasks CASCADE;
DROP TABLE IF EXISTS recurring_quest_templates CASCADE;
DROP TABLE IF EXISTS story_progress CASCADE;
DROP TABLE IF EXISTS gold_transactions CASCADE;
DROP TABLE IF EXISTS user_equipment CASCADE;
DROP TABLE IF EXISTS quests CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS equipment_catalog CASCADE;

-- Drop existing functions
DROP FUNCTION IF EXISTS process_gold_transaction(UUID, INTEGER, TEXT, UUID, JSONB);
DROP FUNCTION IF EXISTS handle_new_user();

-- STEP 2: CREATE EQUIPMENT CATALOG (NO DEPENDENCIES)

CREATE TABLE equipment_catalog (
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

-- STEP 3: CREATE PROFILES TABLE

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  archetype TEXT,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  gold INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_quest_date TIMESTAMPTZ,
  skill_points INTEGER DEFAULT 0,
  is_premium BOOLEAN DEFAULT FALSE,
  subscription_status TEXT DEFAULT 'inactive',
  premium_since TIMESTAMPTZ,
  stripe_customer_id TEXT,
  stripe_session_id TEXT,
  stripe_subscription_id TEXT,
  equipped_weapon UUID REFERENCES equipment_catalog(id),
  equipped_armor UUID REFERENCES equipment_catalog(id),
  equipped_accessory UUID REFERENCES equipment_catalog(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- STEP 4: CREATE QUESTS TABLE

CREATE TABLE quests (
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

-- STEP 5: CREATE USER EQUIPMENT TABLE

CREATE TABLE user_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES equipment_catalog(id) ON DELETE CASCADE,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, equipment_id)
);

-- STEP 6: CREATE GOLD TRANSACTIONS TABLE

CREATE TABLE gold_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  transaction_type TEXT NOT NULL,
  reference_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- STEP 7: CREATE STORY PROGRESS TABLE

CREATE TABLE story_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_chapter INTEGER DEFAULT 1,
  story_beats JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- STEP 8: CREATE RECURRING QUEST TEMPLATES TABLE

CREATE TABLE recurring_quest_templates (
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

-- STEP 9: CREATE TEMPLATE TASKS TABLE

CREATE TABLE template_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES recurring_quest_templates(id) ON DELETE CASCADE,
  task_text TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- STEP 10: CREATE TEMPLATE GENERATION LOG TABLE

CREATE TABLE template_generation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES recurring_quest_templates(id) ON DELETE CASCADE,
  generated_at TIMESTAMPTZ NOT NULL,
  quests_created INTEGER DEFAULT 0
);

-- STEP 11: CREATE INDEXES

CREATE INDEX idx_quests_user_id_created_at ON quests(user_id, created_at DESC);
CREATE INDEX idx_quests_user_id_completed ON quests(user_id, completed, completed_at DESC);
CREATE INDEX idx_profiles_is_premium ON profiles(is_premium) WHERE is_premium = true;
CREATE INDEX idx_profiles_id_archetype ON profiles(id, archetype);
CREATE INDEX idx_gold_transactions_user_id ON gold_transactions(user_id, created_at DESC);
CREATE INDEX idx_user_equipment_user_id ON user_equipment(user_id);
CREATE INDEX idx_template_tasks_template_id ON template_tasks(template_id, sort_order);

-- STEP 12: CREATE AUTO-PROFILE TRIGGER

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- STEP 13: CREATE GOLD TRANSACTION FUNCTION

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
  SELECT gold INTO v_current_balance
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  v_new_balance := v_current_balance + p_amount;

  IF v_new_balance < 0 THEN
    RETURN QUERY SELECT FALSE, v_current_balance, NULL::UUID;
    RETURN;
  END IF;

  UPDATE profiles
  SET gold = v_new_balance,
      updated_at = NOW()
  WHERE id = p_user_id;

  INSERT INTO gold_transactions (user_id, amount, transaction_type, reference_id, metadata)
  VALUES (p_user_id, p_amount, p_transaction_type, p_reference_id, p_metadata)
  RETURNING id INTO v_transaction_id;

  RETURN QUERY SELECT TRUE, v_new_balance, v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 14: ENABLE ROW LEVEL SECURITY

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE gold_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_quest_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_generation_log ENABLE ROW LEVEL SECURITY;

-- STEP 15: CREATE RLS POLICIES

-- Profiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Quests
CREATE POLICY "Users can view own quests" ON quests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quests" ON quests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quests" ON quests
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own quests" ON quests
  FOR DELETE USING (auth.uid() = user_id);

-- User equipment
CREATE POLICY "Users can view own equipment" ON user_equipment
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own equipment" ON user_equipment
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Templates
CREATE POLICY "Users can view own templates" ON recurring_quest_templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own templates" ON recurring_quest_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates" ON recurring_quest_templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates" ON recurring_quest_templates
  FOR DELETE USING (auth.uid() = user_id);

-- Template tasks
CREATE POLICY "Users can view tasks for own templates" ON template_tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM recurring_quest_templates
      WHERE id = template_tasks.template_id
      AND user_id = auth.uid()
    )
  );

-- Equipment catalog is public
CREATE POLICY "Equipment catalog is viewable by everyone" ON equipment_catalog
  FOR SELECT TO authenticated USING (true);

-- STEP 16: INSERT STARTER EQUIPMENT

INSERT INTO equipment_catalog (name, type, description, xp_multiplier, gold_cost, level_required, rarity)
VALUES
  ('Rusty Sword', 'weapon', 'A basic warrior weapon', 1.10, 500, 1, 'common'),
  ('Iron Shield', 'armor', 'Basic protection', 1.10, 500, 1, 'common'),
  ('Lucky Coin', 'accessory', 'Increases fortune', 1.05, 300, 1, 'common'),
  ('Steel Blade', 'weapon', 'Sharp and reliable', 1.25, 2000, 5, 'uncommon'),
  ('Chainmail Vest', 'armor', 'Decent protection', 1.25, 2000, 5, 'uncommon'),
  ('Focus Amulet', 'accessory', 'Sharpens the mind', 1.15, 1000, 3, 'uncommon');

-- DONE! 🎉
-- Your ARC RPG database is now fully set up!
-- The archetype selection loop is FIXED!
-- Users can now sign up, select archetype, and start questing!
