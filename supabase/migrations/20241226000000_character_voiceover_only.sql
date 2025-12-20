-- Add voiceover-only flag to characters
-- This distinguishes characters who appear on camera vs those who only provide voiceover

ALTER TABLE project_characters
ADD COLUMN IF NOT EXISTS is_voiceover_only BOOLEAN NOT NULL DEFAULT FALSE;

-- Add comment for clarity
COMMENT ON COLUMN project_characters.is_voiceover_only IS 'True if this character only provides voiceover and does not appear on camera';

-- Add interview data column for storing character capability answers
ALTER TABLE project_characters
ADD COLUMN IF NOT EXISTS interview_data JSONB;

COMMENT ON COLUMN project_characters.interview_data IS 'Stores interview answers about character production capabilities (camera comfort, script style, locations, equipment, movement)';

-- Add production requirements column to templates for character-template matching
ALTER TABLE project_templates
ADD COLUMN IF NOT EXISTS production_requirements JSONB;

COMMENT ON COLUMN project_templates.production_requirements IS 'Structured requirements for producing this template style (presenter type, camera comfort, script styles, locations, equipment, movement)';

