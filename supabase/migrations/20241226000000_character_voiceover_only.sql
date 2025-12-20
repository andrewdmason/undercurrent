-- Add voiceover-only flag to characters
-- This distinguishes characters who appear on camera vs those who only provide voiceover

ALTER TABLE project_characters
ADD COLUMN IF NOT EXISTS is_voiceover_only BOOLEAN NOT NULL DEFAULT FALSE;

-- Add comment for clarity
COMMENT ON COLUMN project_characters.is_voiceover_only IS 'True if this character only provides voiceover and does not appear on camera';
