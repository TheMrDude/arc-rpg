-- Map Progression System
-- Gradual map unlock based on quest completion

CREATE TABLE IF NOT EXISTS map_locations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  unlock_condition TEXT, -- quest_id or level requirement
  unlock_type TEXT CHECK (unlock_type IN ('quest', 'level', 'achievement')),
  required_value TEXT, -- quest_id, level number, or achievement_id
  coordinates JSONB, -- {x: number, y: number}
  image_url TEXT,
  lore TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_map_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id TEXT REFERENCES map_locations(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  visited_count INTEGER DEFAULT 0,
  last_visited_at TIMESTAMPTZ,
  UNIQUE(user_id, location_id)
);

-- Seed initial map locations
INSERT INTO map_locations (id, name, description, unlock_condition, unlock_type, required_value, coordinates, lore) VALUES
  ('starting_village', 'Starting Village', 'Your journey begins here', NULL, NULL, NULL, '{"x": 0, "y": 0}', 'A humble village where all heroes begin their quest.'),
  ('mystic_forest', 'Mystic Forest', 'An enchanted forest filled with ancient magic', 'level', 'level', '5', '{"x": 100, "y": 50}', 'The trees whisper secrets to those who listen.'),
  ('mountain_peak', 'Mountain Peak', 'The highest point in the realm', 'level', 'level', '10', '{"x": 150, "y": -50}', 'Only the strongest climbers reach this summit.'),
  ('crystal_caves', 'Crystal Caves', 'Glowing crystals illuminate the darkness', 'level', 'level', '15', '{"x": -100, "y": 75}', 'The crystals hold memories of ancient civilizations.'),
  ('dragons_lair', 'Dragon''s Lair', 'Home of the legendary dragon', 'level', 'level', '20', '{"x": 200, "y": 0}', 'Few dare to enter, fewer still return.');

-- Function to unlock location
CREATE OR REPLACE FUNCTION unlock_map_location(p_user_id UUID, p_location_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_unlock_type TEXT;
  v_required_value TEXT;
  v_user_level INTEGER;
  v_can_unlock BOOLEAN := FALSE;
BEGIN
  -- Get location unlock requirements
  SELECT unlock_type, required_value INTO v_unlock_type, v_required_value
  FROM map_locations WHERE id = p_location_id;

  -- If no requirements, auto-unlock
  IF v_unlock_type IS NULL THEN
    v_can_unlock := TRUE;
  END IF;

  -- Check level requirement
  IF v_unlock_type = 'level' THEN
    SELECT level INTO v_user_level FROM user_profiles WHERE id = p_user_id;
    IF v_user_level >= v_required_value::INTEGER THEN
      v_can_unlock := TRUE;
    END IF;
  END IF;

  -- Check quest completion
  IF v_unlock_type = 'quest' THEN
    IF EXISTS (
      SELECT 1 FROM user_quests
      WHERE user_id = p_user_id
      AND quest_id = v_required_value
      AND status = 'completed'
    ) THEN
      v_can_unlock := TRUE;
    END IF;
  END IF;

  -- Unlock if conditions met
  IF v_can_unlock THEN
    INSERT INTO user_map_progress (user_id, location_id)
    VALUES (p_user_id, p_location_id)
    ON CONFLICT (user_id, location_id) DO NOTHING;
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
ALTER TABLE map_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_map_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Map locations are public" ON map_locations FOR SELECT USING (true);
CREATE POLICY "Users can view their own map progress" ON user_map_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own map progress" ON user_map_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own map progress" ON user_map_progress FOR UPDATE USING (auth.uid() = user_id);
