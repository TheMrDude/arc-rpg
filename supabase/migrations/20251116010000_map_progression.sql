-- Map Progression System
-- Implements a Tolkien-style ancient map with fog-of-war reveal mechanics
-- The map reveals as users progress through their journey (quests, levels, days)

-- Add map progression columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS map_position_x INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS map_position_y INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS map_regions_revealed JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS map_progress_percentage INTEGER DEFAULT 0 CHECK (map_progress_percentage >= 0 AND map_progress_percentage <= 100),
ADD COLUMN IF NOT EXISTS current_map_region TEXT DEFAULT 'starting_village',
ADD COLUMN IF NOT EXISTS journey_milestones JSONB DEFAULT '[]'::jsonb;

-- Create indexes for map queries
CREATE INDEX IF NOT EXISTS idx_profiles_map_region ON profiles(current_map_region);
CREATE INDEX IF NOT EXISTS idx_profiles_map_progress ON profiles(map_progress_percentage);

-- Create map regions lookup table for metadata
CREATE TABLE IF NOT EXISTS map_regions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  required_level INTEGER DEFAULT 1,
  required_quests INTEGER DEFAULT 0,
  region_type TEXT DEFAULT 'exploration', -- exploration, milestone, boss_battle, sanctuary
  coordinates_x INTEGER NOT NULL,
  coordinates_y INTEGER NOT NULL,
  unlock_order INTEGER DEFAULT 0,
  lore_text TEXT,
  aesthetic_theme TEXT DEFAULT 'forest',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial map regions (Tolkien-inspired journey map)
INSERT INTO map_regions (id, name, description, required_level, required_quests, region_type, coordinates_x, coordinates_y, unlock_order, lore_text, aesthetic_theme) VALUES
  ('starting_village', 'The Shire of Beginnings', 'A peaceful hamlet where all journeys begin. The first steps of your quest start here.', 1, 0, 'sanctuary', 10, 10, 0, 'Every hero''s tale begins in humble surroundings. Your path awaits beyond the green hills.', 'village'),
  ('whispering_woods', 'The Whispering Woods', 'Ancient trees that have witnessed countless journeys. The forest speaks to those who listen.', 3, 5, 'exploration', 25, 15, 1, 'The old forest whispers secrets to travelers. Many have passed through, few have truly listened.', 'forest'),
  ('misty_mountains', 'The Misty Mountains', 'Treacherous peaks shrouded in eternal mist. Only the determined reach the summit.', 5, 10, 'milestone', 40, 25, 2, 'Heights that challenge both body and spirit. The mist conceals dangers, but also wonders.', 'mountain'),
  ('crystal_caverns', 'Crystal Caverns of Reflection', 'Underground chambers filled with glowing crystals. A place for deep introspection.', 7, 15, 'exploration', 45, 40, 3, 'Beneath the earth, crystals glow with inner light. Here, heroes face their truest selves.', 'cave'),
  ('ancient_library', 'The Ancient Library', 'Repository of wisdom from ages past. Knowledge awaits the curious.', 10, 20, 'sanctuary', 60, 35, 4, 'Countless scrolls and tomes hold the accumulated wisdom of generations. Learn, grow, evolve.', 'library'),
  ('dragon_peaks', 'Dragon Peaks', 'Where ancient dragons once nested. The greatest challenges lie here.', 12, 30, 'boss_battle', 75, 50, 5, 'Fire-scorched peaks where legends are forged. Face your dragons, literal and metaphorical.', 'volcanic'),
  ('serene_gardens', 'Gardens of Serenity', 'A place of peace and restoration. Heroes come here to heal and reflect.', 15, 40, 'sanctuary', 80, 30, 6, 'Amid chaos, there must be calm. These gardens offer respite for the weary traveler.', 'garden'),
  ('shadowlands', 'The Shadowlands', 'Where darkness dwells and fears take form. Confront what lies within.', 18, 50, 'boss_battle', 90, 60, 7, 'Not all battles are fought in light. The shadows reveal what we hide from ourselves.', 'shadow'),
  ('starlit_summit', 'Starlit Summit', 'The highest peak, closest to the heavens. Where enlightenment awaits.', 20, 75, 'milestone', 100, 80, 8, 'At the pinnacle of your journey, under infinite stars, you see clearly who you have become.', 'celestial'),
  ('eternal_horizon', 'The Eternal Horizon', 'Where the journey never truly ends. New adventures always await.', 25, 100, 'exploration', 120, 100, 9, 'The horizon stretches endlessly. For true heroes, the journey itself is the destination.', 'ethereal')
ON CONFLICT (id) DO NOTHING;

-- Function to calculate map progression based on user activity
CREATE OR REPLACE FUNCTION update_map_progression(p_user_id UUID)
RETURNS TABLE(
  new_region TEXT,
  regions_revealed JSONB,
  progress_percentage INTEGER,
  milestone_unlocked BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_level INTEGER;
  v_total_quests INTEGER;
  v_current_region TEXT;
  v_revealed_regions JSONB;
  v_new_regions JSONB := '[]'::jsonb;
  v_region RECORD;
  v_progress INTEGER;
  v_milestone_unlocked BOOLEAN := false;
BEGIN
  -- Get current user stats
  SELECT level, current_map_region, map_regions_revealed
  INTO v_level, v_current_region, v_revealed_regions
  FROM profiles
  WHERE id = p_user_id;

  -- Count total completed quests
  SELECT COUNT(*) INTO v_total_quests
  FROM quests
  WHERE user_id = p_user_id AND completed = true;

  -- Initialize revealed regions if null
  IF v_revealed_regions IS NULL THEN
    v_revealed_regions := '[]'::jsonb;
  END IF;

  -- Check each region to see if it should be unlocked
  FOR v_region IN
    SELECT * FROM map_regions
    WHERE required_level <= v_level
    AND required_quests <= v_total_quests
    ORDER BY unlock_order ASC
  LOOP
    -- Check if region is not already revealed
    IF NOT v_revealed_regions @> to_jsonb(ARRAY[v_region.id]) THEN
      -- Add to revealed regions
      v_revealed_regions := v_revealed_regions || to_jsonb(ARRAY[v_region.id]);
      v_new_regions := v_new_regions || to_jsonb(ARRAY[v_region.id]);

      -- Check if this is a milestone region
      IF v_region.region_type IN ('milestone', 'boss_battle') THEN
        v_milestone_unlocked := true;
      END IF;

      -- Update current region to the latest unlocked
      v_current_region := v_region.id;
    END IF;
  END LOOP;

  -- Calculate progress percentage (based on regions unlocked / total regions)
  SELECT
    LEAST(100, ROUND((jsonb_array_length(v_revealed_regions)::NUMERIC / COUNT(*)::NUMERIC) * 100))
  INTO v_progress
  FROM map_regions;

  -- Update the profile
  UPDATE profiles
  SET
    map_regions_revealed = v_revealed_regions,
    current_map_region = v_current_region,
    map_progress_percentage = v_progress,
    -- Calculate position based on current region
    map_position_x = COALESCE((SELECT coordinates_x FROM map_regions WHERE id = v_current_region), map_position_x),
    map_position_y = COALESCE((SELECT coordinates_y FROM map_regions WHERE id = v_current_region), map_position_y)
  WHERE id = p_user_id;

  -- Return results
  RETURN QUERY SELECT v_current_region, v_revealed_regions, v_progress, v_milestone_unlocked;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_map_progression TO authenticated;

-- Add RLS for map_regions (public read)
ALTER TABLE map_regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view map regions"
  ON map_regions FOR SELECT
  USING (true);

-- Comments
COMMENT ON TABLE map_regions IS 'Defines all map regions in the journey with their unlock requirements and metadata';
COMMENT ON FUNCTION update_map_progression IS 'Calculates and updates user map progression based on level and quest completion';
COMMENT ON COLUMN profiles.map_position_x IS 'Character X position on the journey map';
COMMENT ON COLUMN profiles.map_position_y IS 'Character Y position on the journey map';
COMMENT ON COLUMN profiles.map_regions_revealed IS 'Array of region IDs that have been revealed to the user';
COMMENT ON COLUMN profiles.map_progress_percentage IS 'Overall journey completion percentage (0-100)';
COMMENT ON COLUMN profiles.current_map_region IS 'The current/latest region the character has reached';
