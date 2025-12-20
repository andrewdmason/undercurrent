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

-- Sample video library for template discovery during onboarding
CREATE TABLE IF NOT EXISTS sample_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_url TEXT NOT NULL,
  youtube_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  thumbnail_url TEXT,
  orientation TEXT NOT NULL CHECK (orientation IN ('vertical', 'horizontal')),
  -- Production requirements (mirrors template structure)
  presenter_type TEXT NOT NULL CHECK (presenter_type IN ('on_camera', 'voiceover_only', 'none')),
  requires_human BOOLEAN NOT NULL DEFAULT false,
  camera_comfort TEXT CHECK (camera_comfort IN ('new', 'comfortable', 'natural')),
  script_styles TEXT[] DEFAULT '{}',
  locations TEXT[] DEFAULT '{}',
  equipment TEXT[] DEFAULT '{}',
  movement TEXT[] DEFAULT '{}',
  -- Suggested platforms
  suggested_platforms TEXT[] DEFAULT '{}',
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE sample_videos IS 'Curated library of example videos shown during onboarding to help users discover template styles';


