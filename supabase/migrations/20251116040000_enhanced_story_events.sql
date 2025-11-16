-- Enhanced Story Events System
-- Random narrative events with choices and consequences

CREATE TABLE IF NOT EXISTS story_event_templates (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  story_text TEXT NOT NULL,
  event_type TEXT CHECK (event_type IN ('random', 'triggered', 'seasonal', 'rare')),
  rarity TEXT CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  trigger_condition TEXT, -- 'level:10', 'location:mystic_forest', etc.
  cooldown_hours INTEGER DEFAULT 24,
  min_level INTEGER DEFAULT 1,
  max_level INTEGER,
  category TEXT, -- 'combat', 'social', 'mystery', 'humor', etc.
  lore TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS story_event_choices (
  id TEXT PRIMARY KEY,
  event_id TEXT REFERENCES story_event_templates(id) ON DELETE CASCADE,
  choice_text TEXT NOT NULL,
  choice_order INTEGER,
  outcome_type TEXT CHECK (outcome_type IN ('reward', 'penalty', 'neutral', 'mixed')),
  outcome_description TEXT,
  gold_change INTEGER DEFAULT 0,
  xp_change INTEGER DEFAULT 0,
  item_reward TEXT,
  stat_effects JSONB, -- {'strength': 1, 'wisdom': -1}
  unlock_achievement TEXT,
  personality_alignment TEXT -- 'heroic', 'pragmatic', 'cunning', etc.
);

CREATE TABLE IF NOT EXISTS user_story_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id TEXT REFERENCES story_event_templates(id) ON DELETE CASCADE,
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  choice_id TEXT REFERENCES story_event_choices(id),
  resolved_at TIMESTAMPTZ,
  outcome_applied BOOLEAN DEFAULT FALSE
);

-- Seed story event templates
INSERT INTO story_event_templates (id, title, description, story_text, event_type, rarity, min_level, category, lore) VALUES
  ('mysterious_merchant', 'The Mysterious Merchant', 'A hooded figure offers you a deal', 'A cloaked merchant approaches, their wares glinting in the moonlight. "I have something... special for someone like you."', 'random', 'uncommon', 5, 'social', 'The merchant appears in different forms across the ages.'),
  ('forest_spirit', 'Spirit of the Forest', 'An ancient spirit tests your wisdom', 'The trees part to reveal a shimmering figure. "Answer my riddle, and be rewarded. Fail, and face the consequences."', 'random', 'rare', 10, 'mystery', 'The forest remembers all who enter.'),
  ('goblin_ambush', 'Goblin Ambush!', 'Goblins demand your gold', 'You hear rustling in the bushes. Three goblins leap out, brandishing rusty daggers. "Your gold or your life!"', 'random', 'common', 3, 'combat', 'Goblins are more afraid of you than you are of them.'),
  ('ancient_treasure', 'Ancient Treasure', 'You discover a sealed chest', 'Half-buried in the earth, you find an ornate chest. Ancient runes warn of curses... but also promise great rewards.', 'random', 'epic', 15, 'mystery', 'Some treasures are best left undisturbed.'),
  ('time_traveler', 'The Time Traveler', 'A strange visitor from another era', 'A portal tears open before you. A figure steps through, dressed in impossible garments. "I bring a warning from the future."', 'random', 'legendary', 20, 'mystery', 'Time is not as linear as you think.');

-- Seed choices for "Mysterious Merchant"
INSERT INTO story_event_choices (id, event_id, choice_text, choice_order, outcome_type, outcome_description, gold_change, xp_change) VALUES
  ('mm_buy', 'mysterious_merchant', 'Buy the mysterious item (100 gold)', 1, 'mixed', 'You purchase a strange amulet. It feels warm to the touch.', -100, 200),
  ('mm_refuse', 'mysterious_merchant', 'Politely refuse and walk away', 2, 'neutral', 'The merchant nods knowingly and disappears into the shadows.', 0, 50),
  ('mm_haggle', 'mysterious_merchant', 'Try to haggle for a better price', 3, 'reward', 'The merchant chuckles and offers a discount. "I like your spirit!"', -50, 150);

-- Seed choices for "Forest Spirit"
INSERT INTO story_event_choices (id, event_id, choice_text, choice_order, outcome_type, outcome_description, gold_change, xp_change) VALUES
  ('fs_correct', 'forest_spirit', 'Answer: "The truth lies in silence"', 1, 'reward', 'The spirit smiles. "Wise beyond your years." You feel knowledge flowing into you.', 0, 500),
  ('fs_wrong', 'forest_spirit', 'Answer: "The answer is courage"', 2, 'penalty', 'The spirit frowns. "You have much to learn." You feel weakened.', -50, -100),
  ('fs_humble', 'forest_spirit', 'Admit you don''t know', 3, 'neutral', 'The spirit appreciates your honesty and offers a hint for next time.', 0, 100);

-- Seed choices for "Goblin Ambush"
INSERT INTO story_event_choices (id, event_id, choice_text, choice_order, outcome_type, outcome_description, gold_change, xp_change) VALUES
  ('ga_fight', 'goblin_ambush', 'Stand and fight!', 1, 'reward', 'You defeat the goblins and loot their camp!', 75, 150),
  ('ga_pay', 'goblin_ambush', 'Give them 50 gold', 2, 'penalty', 'The goblins snatch your gold and flee, laughing.', -50, 25),
  ('ga_intimidate', 'goblin_ambush', 'Intimidate them with a war cry', 3, 'mixed', 'Your fierce display scares them off, but you strain your voice.', 0, 100);

-- Function to trigger random story event
CREATE OR REPLACE FUNCTION trigger_random_story_event(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_user_level INTEGER;
  v_event RECORD;
  v_choices JSONB;
  v_last_event_time TIMESTAMPTZ;
BEGIN
  -- Get user level
  SELECT level INTO v_user_level FROM user_profiles WHERE id = p_user_id;

  -- Check cooldown (prevent spam)
  SELECT MAX(triggered_at) INTO v_last_event_time
  FROM user_story_events WHERE user_id = p_user_id;

  IF v_last_event_time IS NOT NULL AND v_last_event_time + INTERVAL '1 hour' > NOW() THEN
    RETURN jsonb_build_object('error', 'Event cooldown active');
  END IF;

  -- Select random event based on level and rarity
  SELECT * INTO v_event
  FROM story_event_templates
  WHERE min_level <= v_user_level
    AND (max_level IS NULL OR max_level >= v_user_level)
    AND event_type = 'random'
    AND id NOT IN (
      SELECT event_id FROM user_story_events
      WHERE user_id = p_user_id
      AND triggered_at > NOW() - (SELECT cooldown_hours FROM story_event_templates WHERE id = event_id) * INTERVAL '1 hour'
    )
  ORDER BY
    CASE rarity
      WHEN 'legendary' THEN RANDOM() * 0.01
      WHEN 'epic' THEN RANDOM() * 0.05
      WHEN 'rare' THEN RANDOM() * 0.15
      WHEN 'uncommon' THEN RANDOM() * 0.35
      ELSE RANDOM()
    END DESC
  LIMIT 1;

  IF v_event IS NULL THEN
    RETURN jsonb_build_object('error', 'No events available');
  END IF;

  -- Get choices for this event
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'text', choice_text,
      'outcome_type', outcome_type
    ) ORDER BY choice_order
  ) INTO v_choices
  FROM story_event_choices
  WHERE event_id = v_event.id;

  -- Record event trigger
  INSERT INTO user_story_events (user_id, event_id)
  VALUES (p_user_id, v_event.id);

  -- Return event details
  RETURN jsonb_build_object(
    'event_id', v_event.id,
    'title', v_event.title,
    'story_text', v_event.story_text,
    'rarity', v_event.rarity,
    'choices', v_choices
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to resolve story event choice
CREATE OR REPLACE FUNCTION resolve_story_event(p_user_id UUID, p_event_instance_id UUID, p_choice_id TEXT)
RETURNS JSONB AS $$
DECLARE
  v_choice RECORD;
  v_outcome JSONB;
BEGIN
  -- Get choice details
  SELECT * INTO v_choice FROM story_event_choices WHERE id = p_choice_id;

  -- Update event record
  UPDATE user_story_events
  SET choice_id = p_choice_id, resolved_at = NOW(), outcome_applied = TRUE
  WHERE id = p_event_instance_id AND user_id = p_user_id;

  -- Apply rewards/penalties
  UPDATE user_profiles
  SET
    gold = GREATEST(0, gold + v_choice.gold_change),
    experience_points = experience_points + v_choice.xp_change
  WHERE id = p_user_id;

  -- Build outcome response
  v_outcome := jsonb_build_object(
    'outcome_description', v_choice.outcome_description,
    'gold_change', v_choice.gold_change,
    'xp_change', v_choice.xp_change,
    'outcome_type', v_choice.outcome_type
  );

  RETURN v_outcome;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
ALTER TABLE story_event_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_event_choices ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_story_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Story event templates are public" ON story_event_templates FOR SELECT USING (true);
CREATE POLICY "Story event choices are public" ON story_event_choices FOR SELECT USING (true);
CREATE POLICY "Users can view their own story events" ON user_story_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create story events" ON user_story_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own story events" ON user_story_events FOR UPDATE USING (auth.uid() = user_id);
