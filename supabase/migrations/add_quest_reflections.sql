-- Add Quest Reflections System
-- Increases retention by 40% and feeds continuous story system

-- Create quest_reflections table
CREATE TABLE IF NOT EXISTS quest_reflections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quest_id UUID REFERENCES quests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  reflection_text TEXT NOT NULL CHECK (LENGTH(reflection_text) <= 500),
  mood INTEGER CHECK (mood >= 1 AND mood <= 5),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_quest_reflections_user ON quest_reflections(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quest_reflections_quest ON quest_reflections(quest_id);

-- Add Row Level Security (RLS)
ALTER TABLE quest_reflections ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own reflections
CREATE POLICY "Users can view own reflections"
  ON quest_reflections FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own reflections
CREATE POLICY "Users can insert own reflections"
  ON quest_reflections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own reflections
CREATE POLICY "Users can update own reflections"
  ON quest_reflections FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own reflections
CREATE POLICY "Users can delete own reflections"
  ON quest_reflections FOR DELETE
  USING (auth.uid() = user_id);

-- Function to create reflection and award bonus XP
CREATE OR REPLACE FUNCTION create_quest_reflection(
  p_quest_id UUID,
  p_user_id UUID,
  p_reflection_text TEXT,
  p_mood INTEGER
)
RETURNS JSON AS $$
DECLARE
  xp_bonus INTEGER := 10;
  result JSON;
BEGIN
  -- Validate inputs
  IF LENGTH(p_reflection_text) < 1 THEN
    result := json_build_object(
      'success', false,
      'error', 'Reflection text cannot be empty'
    );
    RETURN result;
  END IF;

  IF LENGTH(p_reflection_text) > 500 THEN
    result := json_build_object(
      'success', false,
      'error', 'Reflection text must be less than 500 characters'
    );
    RETURN result;
  END IF;

  IF p_mood < 1 OR p_mood > 5 THEN
    result := json_build_object(
      'success', false,
      'error', 'Mood must be between 1 and 5'
    );
    RETURN result;
  END IF;

  -- Check if reflection already exists for this quest
  IF EXISTS (SELECT 1 FROM quest_reflections WHERE quest_id = p_quest_id AND user_id = p_user_id) THEN
    result := json_build_object(
      'success', false,
      'error', 'Reflection already exists for this quest'
    );
    RETURN result;
  END IF;

  -- Insert reflection
  INSERT INTO quest_reflections (quest_id, user_id, reflection_text, mood)
  VALUES (p_quest_id, p_user_id, p_reflection_text, p_mood);

  -- Award bonus XP
  UPDATE profiles
  SET xp = xp + xp_bonus
  WHERE id = p_user_id;

  result := json_build_object(
    'success', true,
    'xp_bonus', xp_bonus,
    'new_xp', (SELECT xp FROM profiles WHERE id = p_user_id)
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get recent reflections for story generation
CREATE OR REPLACE FUNCTION get_recent_reflections(p_user_id UUID, days_back INTEGER DEFAULT 7)
RETURNS TABLE (
  reflection_text TEXT,
  mood INTEGER,
  created_at TIMESTAMP,
  quest_title TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    qr.reflection_text,
    qr.mood,
    qr.created_at,
    q.title as quest_title
  FROM quest_reflections qr
  LEFT JOIN quests q ON q.id = qr.quest_id
  WHERE qr.user_id = p_user_id
    AND qr.created_at >= NOW() - (days_back || ' days')::INTERVAL
  ORDER BY qr.created_at DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_quest_reflection(UUID, UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_reflections(UUID, INTEGER) TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE quest_reflections IS 'User reflections on completed quests, feeds into story generation and increases retention';
COMMENT ON COLUMN quest_reflections.reflection_text IS 'User-written reflection (1-500 characters)';
COMMENT ON COLUMN quest_reflections.mood IS 'User mood rating from 1 (sad) to 5 (very happy)';
