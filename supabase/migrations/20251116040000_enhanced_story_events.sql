-- Enhanced Story Events System
-- Adds more variety and depth to random story events

-- Create story event templates table
CREATE TABLE IF NOT EXISTS story_event_templates (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL, -- encounter, discovery, challenge, opportunity, companion, revelation
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  narrative_text TEXT NOT NULL,
  archetype TEXT, -- null = available to all
  rarity TEXT DEFAULT 'common', -- common, uncommon, rare, epic, legendary
  trigger_condition TEXT, -- level_milestone, streak_threshold, completion_count, random
  min_level INTEGER DEFAULT 1,
  effects JSONB DEFAULT '{}'::jsonb, -- {xp_bonus: 50, gold_bonus: 25, buff: "focus"}
  choices JSONB DEFAULT '[]'::jsonb, -- Optional player choices
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed enhanced story events
INSERT INTO story_event_templates (id, event_type, title, description, narrative_text, archetype, rarity, trigger_condition, min_level, effects) VALUES
  -- Common Encounters
  ('wise_stranger', 'encounter', 'The Wise Stranger', 'A mysterious traveler shares wisdom', 'A cloaked figure approaches you on the road. "I''ve been watching your progress," they say. "You have potential. Remember: the journey shapes the hero more than the destination."', NULL, 'common', 'random', 1, '{"xp_bonus": 25, "wisdom": 1}'::jsonb),
  ('helpful_merchant', 'encounter', 'The Helpful Merchant', 'A generous merchant offers assistance', 'A cheerful merchant waves you over. "You look like someone with purpose! Here, take this - you''ll need it more than I do." They hand you a small pouch of gold.', NULL, 'common', 'random', 1, '{"gold_bonus": 30}'::jsonb),
  ('training_montage', 'discovery', 'Training Montage', 'Time seems to accelerate as you train', 'Hours feel like minutes as you lose yourself in practice. When you emerge, you feel significantly stronger. This is what they call being "in the zone."', NULL, 'uncommon', 'completion_count', 5, '{"xp_bonus": 50, "buff": "motivated"}'::jsonb),

  -- Uncommon Events
  ('hidden_shrine', 'discovery', 'Hidden Shrine', 'You discover an ancient shrine', 'Pushing aside overgrown vines, you reveal a forgotten shrine. Ancient runes glow softly, pulsing with power. As you touch them, you feel knowledge flowing into you.', NULL, 'uncommon', 'random', 3, '{"xp_bonus": 75, "gold_bonus": 40, "wisdom": 2}'::jsonb),
  ('rival_challenge', 'challenge', 'The Rival''s Challenge', 'A rival challenges you to improve', 'Your rival appears with a confident smirk. "Still working hard? Good. Because I''m not slowing down. Try to keep up!" Their competitiveness drives you to push harder.', NULL, 'uncommon', 'streak_threshold', 5, '{"xp_bonus": 60, "motivation": 2}'::jsonb),
  ('mentor_appears', 'encounter', 'The Mentor Appears', 'A master of your path offers guidance', 'Someone who has walked your path before sits beside you. "I see myself in you," they say. "Let me share what I''ve learned." Their wisdom is invaluable.', NULL, 'uncommon', 'level_milestone', 5, '{"xp_bonus": 100, "skill_point": 1}'::jsonb),

  -- Rare Events
  ('time_traveler', 'revelation', 'Message from Future Self', 'Your future self sends a message', 'In a moment of clarity, you see your future self. They smile and say, "Keep going. I promise you - it''s worth it. Trust the process." The vision fades, but the conviction remains.', NULL, 'rare', 'streak_threshold', 14, '{"xp_bonus": 150, "gold_bonus": 75, "inspiration": 3}'::jsonb),
  ('ancient_library', 'discovery', 'The Ancient Library', 'You find a repository of lost knowledge', 'Hidden beneath old floorboards, you discover a sealed room filled with ancient tomes. Each one contains wisdom accumulated over centuries. You emerge hours later, transformed.', NULL, 'rare', 'level_milestone', 10, '{"xp_bonus": 200, "wisdom": 5, "skill_point": 1}'::jsonb),
  ('phoenix_rising', 'revelation', 'Phoenix Rising', 'You experience a profound transformation', 'Like a phoenix from ashes, you feel yourself transforming. Old doubts burn away. What remains is pure determination, refined by fire.', NULL, 'rare', 'comeback_bonus', 7, '{"xp_bonus": 250, "gold_bonus": 100, "buff": "phoenix_blessing"}'::jsonb),

  -- Epic Events
  ('dragon_wisdom', 'encounter', 'Counsel of the Ancient Dragon', 'An ancient dragon shares its wisdom', 'The ancient dragon regards you with eyes that have seen millennia. "You possess the flame within," it rumbles. "Feed it with action. Nurture it with consistency. Let it burn away what no longer serves you."', NULL, 'epic', 'level_milestone', 15, '{"xp_bonus": 300, "gold_bonus": 150, "dragon_blessing": 1}'::jsonb),
  ('cosmic_alignment', 'revelation', 'Cosmic Alignment', 'The stars align in your favor', 'Tonight, the stars align in a pattern seen once in a lifetime. You feel the universe itself supporting your journey. Everything seems possible.', NULL, 'epic', 'streak_threshold', 30, '{"xp_bonus": 400, "gold_bonus": 200, "luck_bonus": 7}'::jsonb),
  ('legendary_artifact', 'discovery', 'Legendary Artifact', 'You discover a legendary artifact', 'Your dedication has led you to something extraordinary - an artifact of legend. Its power resonates with your journey, amplifying everything you do.', NULL, 'epic', 'completion_count', 100, '{"xp_bonus": 500, "gold_bonus": 250, "legendary_item": 1}'::jsonb),

  -- Legendary Events
  ('hero_transcendence', 'revelation', 'Hero''s Transcendence', 'You transcend mortal limitations', 'In this moment, you understand what it means to be truly legendary. Every struggle, every victory, every moment of doubt - they''ve all led here. You are no longer becoming a hero. You ARE a hero.', NULL, 'legendary', 'level_milestone', 20, '{"xp_bonus": 1000, "gold_bonus": 500, "transcendence": 1}'::jsonb),
  ('eternal_flame', 'revelation', 'The Eternal Flame', 'You discover your unquenchable spirit', 'Deep within, you find a flame that cannot be extinguished. No matter what challenges come, this inner fire will burn eternal. You carry it forward, a beacon in the darkness.', NULL, 'legendary', 'streak_threshold', 100, '{"xp_bonus": 1500, "gold_bonus": 750, "eternal_blessing": 1}'::jsonb),

  -- Archetype-Specific Events
  ('warrior_trial', 'challenge', 'Trial of the Warrior', 'Face the ultimate test of strength', 'The ancient warrior spirit appears before you. "Strength without discipline is chaos. Show me your mastery." The trial begins.', 'warrior', 'rare', 'level_milestone', 10, '{"xp_bonus": 200, "strength": 3}'::jsonb),
  ('mage_revelation', 'revelation', 'Arcane Revelation', 'Unlock deep magical understanding', 'The fabric of reality shimmers before you. For a moment, you see the underlying patterns of magic itself. Knowledge floods your consciousness.', 'mage', 'rare', 'level_milestone', 10, '{"xp_bonus": 200, "intelligence": 3}'::jsonb),
  ('rogue_heist', 'opportunity', 'The Perfect Opportunity', 'A unique opportunity presents itself', 'Your keen eye spots something others miss - a perfect opportunity. Your instincts were right. Fortune favors the bold.', 'rogue', 'uncommon', 'random', 5, '{"gold_bonus": 150, "cunning": 2}'::jsonb),

  -- Seasonal/Special Events
  ('new_dawn', 'revelation', 'A New Dawn', 'Each day brings new possibilities', 'As dawn breaks, you realize: today is a gift. Yesterday''s failures are lessons. Tomorrow''s worries are illusions. All that matters is now, and what you choose to do with it.', NULL, 'common', 'random', 1, '{"xp_bonus": 30, "motivation": 1}'::jsonb),
  ('storm_trial', 'challenge', 'Trial by Storm', 'Weather the storm and emerge stronger', 'Dark clouds gather, but you stand firm. This storm will pass, as all storms do. What matters is not avoiding the storm, but learning to dance in the rain.', NULL, 'uncommon', 'random', 3, '{"xp_bonus": 80, "resilience": 2}'::jsonb),
  ('fellowship_found', 'encounter', 'Fellowship Found', 'Find companionship on the journey', 'You realize you''re not alone. Others walk similar paths. In their stories, you find your own reflected. In their struggles, you find kinship. Together, you are stronger.', NULL, 'rare', 'random', 7, '{"xp_bonus": 150, "social_bond": 2, "gold_bonus": 50}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Create user story events log
CREATE TABLE IF NOT EXISTS user_story_events_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL REFERENCES story_event_templates(id),
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  quest_id UUID REFERENCES quests(id),
  effects_applied JSONB,
  user_choice TEXT
);

CREATE INDEX IF NOT EXISTS idx_user_story_events_user ON user_story_events_log(user_id, triggered_at DESC);

-- Function to trigger a random story event
CREATE OR REPLACE FUNCTION trigger_story_event(p_user_id UUID, p_quest_id UUID DEFAULT NULL)
RETURNS TABLE(
  event_triggered BOOLEAN,
  event_data JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile RECORD;
  v_event RECORD;
  v_roll NUMERIC;
  v_rarity_weights JSONB := '{"common": 0.50, "uncommon": 0.30, "rare": 0.15, "epic": 0.04, "legendary": 0.01}'::jsonb;
  v_selected_rarity TEXT;
  v_random_rarity NUMERIC;
BEGIN
  -- Get user profile
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;

  -- Random chance (20% base chance for event)
  IF random() > 0.20 THEN
    RETURN QUERY SELECT false, '{}'::jsonb;
    RETURN;
  END IF;

  -- Determine rarity based on weighted random
  v_random_rarity := random();
  IF v_random_rarity < 0.50 THEN v_selected_rarity := 'common';
  ELSIF v_random_rarity < 0.80 THEN v_selected_rarity := 'uncommon';
  ELSIF v_random_rarity < 0.95 THEN v_selected_rarity := 'rare';
  ELSIF v_random_rarity < 0.99 THEN v_selected_rarity := 'epic';
  ELSE v_selected_rarity := 'legendary';
  END IF;

  -- Select random event matching criteria
  SELECT * INTO v_event FROM story_event_templates
  WHERE
    (archetype IS NULL OR archetype = v_profile.archetype)
    AND rarity = v_selected_rarity
    AND min_level <= v_profile.level
  ORDER BY random()
  LIMIT 1;

  IF NOT FOUND THEN
    -- Fallback to any common event
    SELECT * INTO v_event FROM story_event_templates
    WHERE rarity = 'common' AND min_level <= v_profile.level
    ORDER BY random()
    LIMIT 1;
  END IF;

  IF FOUND THEN
    -- Log the event
    INSERT INTO user_story_events_log (user_id, event_id, quest_id, effects_applied)
    VALUES (p_user_id, v_event.id, p_quest_id, v_event.effects);

    -- Apply effects
    UPDATE profiles
    SET
      xp = xp + COALESCE((v_event.effects->>'xp_bonus')::INTEGER, 0),
      gold = gold + COALESCE((v_event.effects->>'gold_bonus')::INTEGER, 0)
    WHERE id = p_user_id;

    RETURN QUERY SELECT
      true,
      jsonb_build_object(
        'id', v_event.id,
        'title', v_event.title,
        'description', v_event.description,
        'narrative_text', v_event.narrative_text,
        'event_type', v_event.event_type,
        'rarity', v_event.rarity,
        'effects', v_event.effects
      );
  ELSE
    RETURN QUERY SELECT false, '{}'::jsonb;
  END IF;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION trigger_story_event TO authenticated;

-- RLS
ALTER TABLE story_event_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_story_events_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view story event templates"
  ON story_event_templates FOR SELECT
  USING (true);

CREATE POLICY "Users can view their own story events"
  ON user_story_events_log FOR SELECT
  USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE story_event_templates IS 'Templates for random story events with varying rarity';
COMMENT ON TABLE user_story_events_log IS 'Log of story events triggered for each user';
COMMENT ON FUNCTION trigger_story_event IS 'Triggers a random story event for a user with weighted rarity';
