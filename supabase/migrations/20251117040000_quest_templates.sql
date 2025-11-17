-- Create quest templates table for pre-generated quests
CREATE TABLE IF NOT EXISTS quest_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  archetype TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  original_text TEXT NOT NULL,
  transformed_text TEXT NOT NULL,
  story_thread TEXT,
  narrative_impact TEXT,
  xp_value INTEGER NOT NULL,
  category TEXT, -- e.g., 'productivity', 'health', 'learning', 'social'
  used_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_quest_templates_archetype ON quest_templates(archetype);
CREATE INDEX IF NOT EXISTS idx_quest_templates_difficulty ON quest_templates(difficulty);
CREATE INDEX IF NOT EXISTS idx_quest_templates_category ON quest_templates(category);
CREATE INDEX IF NOT EXISTS idx_quest_templates_used ON quest_templates(used_count);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_quest_templates_lookup
ON quest_templates(archetype, difficulty, used_count);

-- Enable RLS
ALTER TABLE quest_templates ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read templates
CREATE POLICY "Anyone can read quest templates"
ON quest_templates FOR SELECT
USING (true);

-- Only service role can insert/update
CREATE POLICY "Only service role can modify quest templates"
ON quest_templates FOR ALL
USING (false);

COMMENT ON TABLE quest_templates IS 'Pre-generated quest templates for instant quest creation';
