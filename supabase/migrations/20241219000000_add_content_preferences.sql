-- Add content_preferences field to projects table
-- Stores general notes about content style, tone, and preferences for idea generation

ALTER TABLE projects ADD COLUMN IF NOT EXISTS content_preferences TEXT;

