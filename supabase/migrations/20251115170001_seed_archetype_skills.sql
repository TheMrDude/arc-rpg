-- ═══════════════════════════════════════════════════════════════════════════
-- ARCHETYPE SKILLS SEED
-- ═══════════════════════════════════════════════════════════════════════════
-- Creates archetype_skills table and seeds with 25 skills (5 archetypes × 5 levels)
-- Skills unlock at levels: 5, 10, 15, 20, 25
-- Each archetype has unique progression path
-- ═══════════════════════════════════════════════════════════════════════════

-- Create archetype_skills table
CREATE TABLE IF NOT EXISTS archetype_skills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  archetype TEXT NOT NULL CHECK (archetype IN ('warrior', 'seeker', 'builder', 'shadow', 'sage')),
  level_requirement INTEGER NOT NULL CHECK (level_requirement IN (5, 10, 15, 20, 25)),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT, -- emoji or image URL
  stat_bonus JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(archetype, level_requirement)
);

-- Clear existing skills (if reseeding)
TRUNCATE archetype_skills CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════
-- WARRIOR SKILLS - Focus on strength, endurance, direct confrontation
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO archetype_skills (archetype, level_requirement, name, description, icon, stat_bonus) VALUES
('warrior', 5, 'Iron Will', 'Your determination hardens like steel. Gain +10% streak protection against single failures.', '🛡️', '{"streak_protection": 0.10}'::jsonb),
('warrior', 10, 'Battle Fury', 'Channel rage into focus. Gain +15% XP when completing hard difficulty quests.', '⚔️', '{"hard_quest_xp_bonus": 0.15}'::jsonb),
('warrior', 15, 'Unbreakable', 'The warrior stands when others fall. +20% defense against streak loss from missed days.', '🏔️', '{"streak_defense": 0.20}'::jsonb),
('warrior', 20, 'Berserker Mode', 'Momentum fuels power. Gain +25% XP for completing 3 quests in a row within 3 days.', '💥', '{"combo_xp_bonus": 0.25, "combo_requirement": 3}'::jsonb),
('warrior', 25, 'Titan''s Endurance', 'Legendary stamina. Automatically complete 1 easy quest per week when streak is active.', '⚡', '{"auto_complete_easy": 1, "weekly_reset": true}'::jsonb);

-- ═══════════════════════════════════════════════════════════════════════════
-- SEEKER SKILLS - Focus on exploration, discovery, curiosity
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO archetype_skills (archetype, level_requirement, name, description, icon, stat_bonus) VALUES
('seeker', 5, 'Path Finder', 'The unknown calls to you. Gain +10% XP when trying new quest categories for the first time.', '🧭', '{"new_quest_xp_bonus": 0.10}'::jsonb),
('seeker', 10, 'Curiosity Boost', 'Questions lead to treasure. Gain +15% gold from exploration and learning-based quests.', '💎', '{"exploration_gold_bonus": 0.15}'::jsonb),
('seeker', 15, 'Knowledge Hunter', 'Every discovery adds to your legend. Unlock bonus lore entries in your story arc.', '📚', '{"unlock_bonus_lore": true, "lore_entries": 3}'::jsonb),
('seeker', 20, 'Insight', 'See patterns others miss. Gain +20% XP on quests tagged with "learning" or "skill development".', '👁️', '{"learning_quest_xp_bonus": 0.20}'::jsonb),
('seeker', 25, 'Master Explorer', 'You''ve seen it all... or have you? Unlock hidden quests and secret story branches.', '🗺️', '{"unlock_hidden_quests": true, "secret_branches": true}'::jsonb);

-- ═══════════════════════════════════════════════════════════════════════════
-- BUILDER SKILLS - Focus on systems, consistency, long-term planning
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO archetype_skills (archetype, level_requirement, name, description, icon, stat_bonus) VALUES
('builder', 5, 'Foundation', 'Strong systems start here. Gain +10% XP on recurring quests (completed more than once).', '🧱', '{"recurring_quest_xp_bonus": 0.10}'::jsonb),
('builder', 10, 'Architect''s Eye', 'You see the bigger picture. Gain +15% bonus XP when completing quest chains (3+ related quests).', '📐', '{"quest_chain_bonus": 0.15, "chain_minimum": 3}'::jsonb),
('builder', 15, 'System Master', 'Organization is your superpower. Gain +20% XP when completing quests in planned order.', '⚙️', '{"organized_completion_bonus": 0.20}'::jsonb),
('builder', 20, 'Constructor', 'Building things is in your DNA. Gain +25% XP on creation, building, and production quests.', '🏗️', '{"creation_quest_xp_bonus": 0.25}'::jsonb),
('builder', 25, 'Grand Design', 'Your masterpiece unfolds. Gain double XP on Sundays (the day of rest becomes the day of power).', '🌟', '{"sunday_xp_multiplier": 2.0}'::jsonb);

-- ═══════════════════════════════════════════════════════════════════════════
-- SHADOW SKILLS - Focus on introspection, transformation, depth
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO archetype_skills (archetype, level_requirement, name, description, icon, stat_bonus) VALUES
('shadow', 5, 'Dark Insight', 'Face your inner demons. Gain +10% XP on introspective and journaling quests.', '🌑', '{"introspective_quest_xp_bonus": 0.10, "journal_xp_bonus": 0.10}'::jsonb),
('shadow', 10, 'Hidden Power', 'Absence makes you stronger. Gain +15% XP bonus when returning after 3+ day absence.', '🔮', '{"return_xp_bonus": 0.15, "absence_threshold": 3}'::jsonb),
('shadow', 15, 'Shadow Step', 'Move through failure like smoke. Skip 1 quest penalty per week (missed day won''t break streak).', '👤', '{"skip_penalty": 1, "weekly_reset": true}'::jsonb),
('shadow', 20, 'Void Walker', 'Isolation breeds strength. Gain +25% XP on solo reflection and meditation quests.', '🌌', '{"solo_quest_xp_bonus": 0.25}'::jsonb),
('shadow', 25, 'Embrace Darkness', 'Transform pain into power. Failed quests award 50% XP (instead of 0%) if journaled about.', '⚫', '{"failure_xp_conversion": 0.50, "requires_journal": true}'::jsonb);

-- ═══════════════════════════════════════════════════════════════════════════
-- SAGE SKILLS - Focus on wisdom, teaching, enlightenment
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO archetype_skills (archetype, level_requirement, name, description, icon, stat_bonus) VALUES
('sage', 5, 'Ancient Wisdom', 'Learn from the past. Gain +10% XP on reflection and review quests.', '📖', '{"reflection_quest_xp_bonus": 0.10}'::jsonb),
('sage', 10, 'Meditation', 'Stillness brings clarity. Gain +15% XP bonus after completing journal entries.', '🧘', '{"post_journal_xp_bonus": 0.15}'::jsonb),
('sage', 15, 'Enlightenment', 'Knowledge illuminates the path. Gain +20% XP on wisdom and philosophy-based quests.', '💡', '{"wisdom_quest_xp_bonus": 0.20}'::jsonb),
('sage', 20, 'Mystic Knowledge', 'Teaching others multiplies your own growth. Gain +25% bonus when helping/mentoring in quests.', '✨', '{"teaching_xp_bonus": 0.25, "mentor_bonus": true}'::jsonb),
('sage', 25, 'Transcendence', 'You''ve moved beyond the ordinary. Access legendary story arcs and ultimate challenges.', '🌠', '{"unlock_legendary_arcs": true, "ultimate_challenges": true}'::jsonb);

-- ═══════════════════════════════════════════════════════════════════════════
-- USER SKILLS TRACKING TABLE
-- ═══════════════════════════════════════════════════════════════════════════

-- Track which skills users have unlocked
CREATE TABLE IF NOT EXISTS user_skills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  skill_id UUID REFERENCES archetype_skills(id) ON DELETE CASCADE NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,

  UNIQUE(user_id, skill_id)
);

-- RLS policies for user_skills
ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own skills"
  ON user_skills FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own skills"
  ON user_skills FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_archetype_skills_archetype ON archetype_skills(archetype);
CREATE INDEX IF NOT EXISTS idx_archetype_skills_level ON archetype_skills(level_requirement);
CREATE INDEX IF NOT EXISTS idx_user_skills_user ON user_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_user_skills_active ON user_skills(user_id, is_active) WHERE is_active = true;

-- ═══════════════════════════════════════════════════════════════════════════
-- AUTO-UNLOCK FUNCTION
-- ═══════════════════════════════════════════════════════════════════════════

-- Function to auto-unlock skills when user levels up
CREATE OR REPLACE FUNCTION auto_unlock_skills()
RETURNS TRIGGER AS $$
DECLARE
  user_archetype TEXT;
  available_skills UUID[];
BEGIN
  -- Only trigger when level increases
  IF NEW.level > OLD.level THEN
    -- Get user's archetype
    SELECT archetype INTO user_archetype FROM profiles WHERE id = NEW.id;

    -- Get skills that should be unlocked at this level
    SELECT ARRAY_AGG(id) INTO available_skills
    FROM archetype_skills
    WHERE archetype = user_archetype
      AND level_requirement <= NEW.level
      AND id NOT IN (
        SELECT skill_id FROM user_skills WHERE user_id = NEW.id
      );

    -- Unlock new skills
    IF available_skills IS NOT NULL THEN
      INSERT INTO user_skills (user_id, skill_id)
      SELECT NEW.id, unnest(available_skills)
      ON CONFLICT (user_id, skill_id) DO NOTHING;

      RAISE NOTICE 'Unlocked % new skills for user %', array_length(available_skills, 1), NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS auto_unlock_skills_trigger ON profiles;
CREATE TRIGGER auto_unlock_skills_trigger
  AFTER UPDATE OF level ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_unlock_skills();

-- ═══════════════════════════════════════════════════════════════════════════
-- COMPLETION
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '✅ Archetype skills seeded with 25 skills!';
  RAISE NOTICE '   - Warrior: 5 skills (combat & endurance)';
  RAISE NOTICE '   - Seeker: 5 skills (exploration & discovery)';
  RAISE NOTICE '   - Builder: 5 skills (systems & consistency)';
  RAISE NOTICE '   - Shadow: 5 skills (introspection & transformation)';
  RAISE NOTICE '   - Sage: 5 skills (wisdom & enlightenment)';
  RAISE NOTICE '';
  RAISE NOTICE 'Skills unlock at levels: 5, 10, 15, 20, 25';
  RAISE NOTICE 'Auto-unlock trigger created for level-ups';
END $$;
