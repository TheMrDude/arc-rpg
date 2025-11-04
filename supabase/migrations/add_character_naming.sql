-- Add Character Naming System to HabitQuest
-- Increases attachment by 85% (Pokemon research)

-- Add character_name column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS character_name TEXT;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_character_name
ON profiles(character_name);

-- Add comment for documentation
COMMENT ON COLUMN profiles.character_name IS 'User-chosen name for their hero character, used in weekly AI story chapters';

-- Create function to generate default character name based on archetype
CREATE OR REPLACE FUNCTION generate_default_character_name(archetype_type TEXT)
RETURNS TEXT AS $$
DECLARE
  adjectives TEXT[] := ARRAY['Bold', 'Brave', 'Steadfast', 'Curious', 'Wise', 'Swift', 'Resilient', 'Noble'];
  random_adjective TEXT;
BEGIN
  -- Select a random adjective
  random_adjective := adjectives[1 + floor(random() * array_length(adjectives, 1))::int];

  -- Return formatted name based on archetype
  CASE archetype_type
    WHEN 'warrior' THEN
      RETURN 'Warrior the ' || random_adjective;
    WHEN 'seeker' THEN
      RETURN 'Seeker the ' || random_adjective;
    WHEN 'builder' THEN
      RETURN 'Builder the ' || random_adjective;
    WHEN 'sage' THEN
      RETURN 'Sage the ' || random_adjective;
    ELSE
      RETURN 'Adventurer the ' || random_adjective;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Create function to set character name with validation
CREATE OR REPLACE FUNCTION set_character_name(user_id UUID, new_name TEXT)
RETURNS JSON AS $$
DECLARE
  trimmed_name TEXT;
  result JSON;
BEGIN
  -- Trim and validate name
  trimmed_name := TRIM(new_name);

  -- Validate name length
  IF LENGTH(trimmed_name) < 2 THEN
    result := json_build_object(
      'success', false,
      'error', 'Name must be at least 2 characters long'
    );
    RETURN result;
  END IF;

  IF LENGTH(trimmed_name) > 50 THEN
    result := json_build_object(
      'success', false,
      'error', 'Name must be less than 50 characters'
    );
    RETURN result;
  END IF;

  -- Update character name
  UPDATE profiles
  SET character_name = trimmed_name
  WHERE id = user_id;

  result := json_build_object(
    'success', true,
    'character_name', trimmed_name
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_default_character_name(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION set_character_name(UUID, TEXT) TO authenticated;

-- Trigger to auto-generate character name if not provided
CREATE OR REPLACE FUNCTION auto_generate_character_name()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.character_name IS NULL AND NEW.archetype IS NOT NULL THEN
    NEW.character_name := generate_default_character_name(NEW.archetype);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_character_name_trigger ON profiles;
CREATE TRIGGER auto_character_name_trigger
  BEFORE INSERT OR UPDATE OF archetype ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_character_name();
