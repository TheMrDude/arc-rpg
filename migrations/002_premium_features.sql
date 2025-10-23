-- ARC RPG Premium Features Database Migrations
-- Run this in Supabase SQL Editor

-- ============================================
-- SUBSCRIPTION TRACKING
-- ============================================

-- Add subscription fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ;

-- Index for subscription lookups
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status
ON profiles(subscription_status);

-- ============================================
-- RECURRING QUEST TEMPLATES (PREMIUM)
-- ============================================

-- Update existing recurring_quests table or create if not exists
CREATE TABLE IF NOT EXISTS recurring_quest_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  recurrence_type TEXT NOT NULL CHECK (recurrence_type IN ('daily', 'weekly', 'custom')),
  recurrence_interval INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Template tasks (one template has many tasks)
CREATE TABLE IF NOT EXISTS template_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES recurring_quest_templates(id) ON DELETE CASCADE,
  task_text TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Track when templates last generated quests
CREATE TABLE IF NOT EXISTS template_generation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES recurring_quest_templates(id) ON DELETE CASCADE,
  generated_at TIMESTAMPTZ DEFAULT now(),
  quests_created INTEGER DEFAULT 0
);

-- Indexes for template queries
CREATE INDEX IF NOT EXISTS idx_recurring_templates_user_id
ON recurring_quest_templates(user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_template_tasks_template_id
ON template_tasks(template_id, sort_order);

-- ============================================
-- SKILL TREE SYSTEM (PREMIUM)
-- ============================================

-- Add skill points to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS skill_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_skill_points_earned INTEGER DEFAULT 0;

-- Track unlocked skills
CREATE TABLE IF NOT EXISTS unlocked_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL,
  skill_tree TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, skill_id)
);

-- Index for skill lookups
CREATE INDEX IF NOT EXISTS idx_unlocked_skills_user_id
ON unlocked_skills(user_id);

-- ============================================
-- EQUIPMENT SYSTEM (PREMIUM)
-- ============================================

-- Equipment catalog (all available equipment)
CREATE TABLE IF NOT EXISTS equipment_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  slot TEXT NOT NULL CHECK (slot IN ('weapon', 'armor', 'accessory')),
  rarity TEXT NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  xp_multiplier DECIMAL(3,2) DEFAULT 1.00,
  required_level INTEGER DEFAULT 1,
  icon_emoji TEXT DEFAULT '⚔️',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User's equipment inventory
CREATE TABLE IF NOT EXISTS user_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES equipment_catalog(id),
  acquired_at TIMESTAMPTZ DEFAULT now(),
  is_equipped BOOLEAN DEFAULT false,
  UNIQUE(user_id, equipment_id)
);

-- Track equipped items separately for quick lookup
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS equipped_weapon UUID REFERENCES equipment_catalog(id),
ADD COLUMN IF NOT EXISTS equipped_armor UUID REFERENCES equipment_catalog(id),
ADD COLUMN IF NOT EXISTS equipped_accessory UUID REFERENCES equipment_catalog(id);

-- Indexes for equipment queries
CREATE INDEX IF NOT EXISTS idx_user_equipment_user_id
ON user_equipment(user_id, is_equipped);

-- ============================================
-- AI DUNGEON MASTER / STORY TRACKING
-- ============================================

-- Track user's story progress for AI context
CREATE TABLE IF NOT EXISTS story_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  current_chapter INTEGER DEFAULT 1,
  story_beats JSONB DEFAULT '[]'::jsonb,
  last_summary_generated TIMESTAMPTZ,
  total_summaries INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Weekly story summaries archive
CREATE TABLE IF NOT EXISTS weekly_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  summary_type TEXT NOT NULL CHECK (summary_type IN ('free', 'premium')),
  summary_text TEXT NOT NULL,
  quests_completed INTEGER DEFAULT 0,
  xp_gained INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, week_start_date)
);

-- Index for summary queries
CREATE INDEX IF NOT EXISTS idx_weekly_summaries_user_id_date
ON weekly_summaries(user_id, week_start_date DESC);

CREATE INDEX IF NOT EXISTS idx_story_progress_user_id
ON story_progress(user_id);

-- ============================================
-- BOSS BATTLES (ENHANCED)
-- ============================================

-- Track active boss battles
CREATE TABLE IF NOT EXISTS boss_battles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  boss_name TEXT NOT NULL,
  boss_type TEXT NOT NULL,
  required_quests INTEGER NOT NULL,
  quests_completed INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed')),
  rewards JSONB DEFAULT '{}'::jsonb
);

-- Index for active boss battles
CREATE INDEX IF NOT EXISTS idx_boss_battles_user_status
ON boss_battles(user_id, status);

-- ============================================
-- SEED DATA: EQUIPMENT CATALOG
-- ============================================

-- Insert starter equipment
INSERT INTO equipment_catalog (name, description, slot, rarity, xp_multiplier, required_level, icon_emoji) VALUES
  ('Rusty Sword', 'A well-worn blade, but reliable', 'weapon', 'common', 1.05, 1, '🗡️'),
  ('Iron Sword', 'A sturdy weapon for any warrior', 'weapon', 'common', 1.10, 5, '⚔️'),
  ('Sword of Focus', 'Sharpens the mind as well as the blade', 'weapon', 'rare', 1.15, 10, '⚡'),
  ('Legendary Excalibur', 'The blade of legends', 'weapon', 'legendary', 1.30, 25, '✨'),

  ('Leather Tunic', 'Basic protection for adventurers', 'armor', 'common', 1.05, 1, '🛡️'),
  ('Iron Armor', 'Solid defense against procrastination', 'armor', 'common', 1.10, 5, '🔰'),
  ('Armor of Routine', 'Protects your daily habits', 'armor', 'rare', 1.15, 10, '💎'),
  ('Dragon Scale Mail', 'Forged from defeated dragons', 'armor', 'legendary', 1.30, 25, '🐉'),

  ('Simple Ring', 'A basic trinket', 'accessory', 'common', 1.05, 1, '💍'),
  ('Amulet of Wisdom', 'Grants insight into your journey', 'accessory', 'rare', 1.10, 8, '📿'),
  ('Ring of Balance', 'Harmonizes all your efforts', 'accessory', 'epic', 1.20, 15, '🔮'),
  ('Crown of Mastery', 'Worn by true legends', 'accessory', 'legendary', 1.35, 30, '👑')
ON CONFLICT DO NOTHING;

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Recurring quest templates
ALTER TABLE recurring_quest_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own templates" ON recurring_quest_templates;
CREATE POLICY "Users can view own templates"
ON recurring_quest_templates FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own templates" ON recurring_quest_templates;
CREATE POLICY "Users can manage own templates"
ON recurring_quest_templates FOR ALL
USING (auth.uid() = user_id);

-- Template tasks
ALTER TABLE template_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own template tasks" ON template_tasks;
CREATE POLICY "Users can view own template tasks"
ON template_tasks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM recurring_quest_templates
    WHERE id = template_tasks.template_id
    AND user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can manage own template tasks" ON template_tasks;
CREATE POLICY "Users can manage own template tasks"
ON template_tasks FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM recurring_quest_templates
    WHERE id = template_tasks.template_id
    AND user_id = auth.uid()
  )
);

-- Unlocked skills
ALTER TABLE unlocked_skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own skills" ON unlocked_skills;
CREATE POLICY "Users can view own skills"
ON unlocked_skills FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unlock skills" ON unlocked_skills;
CREATE POLICY "Users can unlock skills"
ON unlocked_skills FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- User equipment
ALTER TABLE user_equipment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own equipment" ON user_equipment;
CREATE POLICY "Users can view own equipment"
ON user_equipment FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own equipment" ON user_equipment;
CREATE POLICY "Users can manage own equipment"
ON user_equipment FOR ALL
USING (auth.uid() = user_id);

-- Equipment catalog (everyone can view)
ALTER TABLE equipment_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view equipment catalog" ON equipment_catalog;
CREATE POLICY "Anyone can view equipment catalog"
ON equipment_catalog FOR SELECT
TO authenticated
USING (true);

-- Story progress
ALTER TABLE story_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own story" ON story_progress;
CREATE POLICY "Users can view own story"
ON story_progress FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own story" ON story_progress;
CREATE POLICY "Users can manage own story"
ON story_progress FOR ALL
USING (auth.uid() = user_id);

-- Weekly summaries
ALTER TABLE weekly_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own summaries" ON weekly_summaries;
CREATE POLICY "Users can view own summaries"
ON weekly_summaries FOR SELECT
USING (auth.uid() = user_id);

-- Boss battles
ALTER TABLE boss_battles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own boss battles" ON boss_battles;
CREATE POLICY "Users can view own boss battles"
ON boss_battles FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own boss battles" ON boss_battles;
CREATE POLICY "Users can manage own boss battles"
ON boss_battles FOR ALL
USING (auth.uid() = user_id);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to check if user is premium
CREATE OR REPLACE FUNCTION is_premium_user(user_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id_param
    AND (
      is_premium = true
      OR subscription_status = 'active'
    )
  );
END;
$$;

-- Function to grant skill point on level up
CREATE OR REPLACE FUNCTION grant_skill_point_on_level()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Every 5 levels, grant 1 skill point
  IF NEW.level % 5 = 0 AND NEW.level > OLD.level THEN
    UPDATE profiles
    SET skill_points = skill_points + 1,
        total_skill_points_earned = total_skill_points_earned + 1
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for skill point grants
DROP TRIGGER IF EXISTS trigger_grant_skill_point ON profiles;
CREATE TRIGGER trigger_grant_skill_point
AFTER UPDATE OF level ON profiles
FOR EACH ROW
EXECUTE FUNCTION grant_skill_point_on_level();

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE recurring_quest_templates IS 'Premium feature: User-created quest templates that auto-generate';
COMMENT ON TABLE template_tasks IS 'Individual tasks within a recurring template';
COMMENT ON TABLE unlocked_skills IS 'Tracks which skills users have unlocked in skill trees';
COMMENT ON TABLE equipment_catalog IS 'Master list of all available equipment';
COMMENT ON TABLE user_equipment IS 'Equipment owned by users';
COMMENT ON TABLE story_progress IS 'Tracks user story progression for AI DM context';
COMMENT ON TABLE weekly_summaries IS 'Archive of weekly progress summaries';
COMMENT ON TABLE boss_battles IS 'Active and completed boss battles';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Run these to verify migration success:

-- Check new tables exist
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- AND table_name IN ('recurring_quest_templates', 'template_tasks', 'unlocked_skills', 'equipment_catalog', 'user_equipment', 'story_progress', 'weekly_summaries', 'boss_battles');

-- Check equipment catalog has items
-- SELECT COUNT(*) as equipment_count FROM equipment_catalog;

-- Check RLS policies
-- SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;

-- Test premium check function
-- SELECT is_premium_user('00000000-0000-0000-0000-000000000000');
