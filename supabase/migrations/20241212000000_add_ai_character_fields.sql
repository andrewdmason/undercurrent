-- Add AI character tracking fields to project_characters table
-- is_ai_generated: boolean flag to identify AI-generated characters
-- ai_style: the visual style used to generate the character image

ALTER TABLE project_characters
ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ai_style TEXT;

-- Add comment for documentation
COMMENT ON COLUMN project_characters.is_ai_generated IS 'Whether this character was created using the AI character generation flow';
COMMENT ON COLUMN project_characters.ai_style IS 'The visual style slug used when generating the AI character image';

-- Add type field to generation_logs for filtering different generation actions
-- Types: idea_generation, ai_character, thumbnail, other
ALTER TABLE generation_logs
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'other';

COMMENT ON COLUMN generation_logs.type IS 'Type of generation: idea_generation, ai_character, thumbnail, other';

