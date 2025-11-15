-- Add Journal Entries System
-- Long-form journaling that feeds into AI story generation and provides reflection continuity

-- Create journal_entries table
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  entry_text TEXT NOT NULL CHECK (LENGTH(entry_text) >= 50 AND LENGTH(entry_text) <= 2000),
  transformed_narrative TEXT,
  mood INTEGER CHECK (mood >= 1 AND mood <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  media_urls TEXT[], -- for future: photos/voice notes
  story_chapter INTEGER, -- links to which weekly chapter this influenced
  is_private BOOLEAN DEFAULT true, -- user can toggle if they want to share
  transformation_failed BOOLEAN DEFAULT false, -- track if AI transformation failed
  retry_count INTEGER DEFAULT 0 -- track transformation retry attempts
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_journal_user_date ON journal_entries(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_journal_story_chapter ON journal_entries(story_chapter) WHERE story_chapter IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_journal_mood ON journal_entries(user_id, mood) WHERE mood IS NOT NULL;

-- Add Row Level Security (RLS)
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own journal entries
CREATE POLICY "Users can view own journal entries"
  ON journal_entries FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own journal entries
CREATE POLICY "Users can insert own journal entries"
  ON journal_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own journal entries
CREATE POLICY "Users can update own journal entries"
  ON journal_entries FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own journal entries
CREATE POLICY "Users can delete own journal entries"
  ON journal_entries FOR DELETE
  USING (auth.uid() = user_id);

-- Function to get recent journal entries for story generation
CREATE OR REPLACE FUNCTION get_recent_journal_entries(
  p_user_id UUID,
  days_back INTEGER DEFAULT 7
)
RETURNS TABLE (
  id UUID,
  entry_text TEXT,
  transformed_narrative TEXT,
  mood INTEGER,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    je.id,
    je.entry_text,
    je.transformed_narrative,
    je.mood,
    je.created_at
  FROM journal_entries je
  WHERE je.user_id = p_user_id
    AND je.created_at >= NOW() - (days_back || ' days')::INTERVAL
  ORDER BY je.created_at DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get "On This Day" journal entries from previous years
CREATE OR REPLACE FUNCTION get_on_this_day_entries(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  entry_text TEXT,
  transformed_narrative TEXT,
  mood INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  years_ago INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    je.id,
    je.entry_text,
    je.transformed_narrative,
    je.mood,
    je.created_at,
    EXTRACT(YEAR FROM NOW())::INTEGER - EXTRACT(YEAR FROM je.created_at)::INTEGER as years_ago
  FROM journal_entries je
  WHERE je.user_id = p_user_id
    AND EXTRACT(MONTH FROM je.created_at) = EXTRACT(MONTH FROM NOW())
    AND EXTRACT(DAY FROM je.created_at) = EXTRACT(DAY FROM NOW())
    AND EXTRACT(YEAR FROM je.created_at) < EXTRACT(YEAR FROM NOW())
  ORDER BY je.created_at DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate average mood over a period
CREATE OR REPLACE FUNCTION get_average_mood(
  p_user_id UUID,
  days_back INTEGER DEFAULT 7
)
RETURNS NUMERIC AS $$
DECLARE
  avg_mood NUMERIC;
BEGIN
  SELECT AVG(mood)::NUMERIC(3,2)
  INTO avg_mood
  FROM journal_entries
  WHERE user_id = p_user_id
    AND mood IS NOT NULL
    AND created_at >= NOW() - (days_back || ' days')::INTERVAL;

  RETURN COALESCE(avg_mood, 3.0); -- Default to neutral if no entries
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track daily journal entry count (for rate limiting)
CREATE OR REPLACE FUNCTION get_daily_journal_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  entry_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO entry_count
  FROM journal_entries
  WHERE user_id = p_user_id
    AND created_at >= CURRENT_DATE;

  RETURN entry_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_recent_journal_entries(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_on_this_day_entries(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_average_mood(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_journal_count(UUID) TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE journal_entries IS 'Long-form journal entries that feed into AI story generation and provide deep reflection';
COMMENT ON COLUMN journal_entries.entry_text IS 'User-written journal entry (50-2000 characters)';
COMMENT ON COLUMN journal_entries.transformed_narrative IS 'AI-generated epic narrative transformation of the journal entry';
COMMENT ON COLUMN journal_entries.mood IS 'Optional mood rating from 1 (terrible) to 5 (amazing)';
COMMENT ON COLUMN journal_entries.story_chapter IS 'Weekly chapter number this entry influenced';
COMMENT ON COLUMN journal_entries.is_private IS 'Privacy toggle - true means only user can see it';
COMMENT ON COLUMN journal_entries.media_urls IS 'Future feature: array of photo/voice note URLs';
