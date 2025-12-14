-- ============================================
-- CALCULATED STATUS REFACTOR
-- ============================================
-- Replace manual status management with calculated status based on:
-- - Timestamps: accepted_at, published_at, canceled_at
-- - Asset completion states

-- ============================================
-- 1. Add timestamp columns
-- ============================================

ALTER TABLE ideas ADD COLUMN IF NOT EXISTS accepted_at timestamptz;
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS published_at timestamptz;
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS canceled_at timestamptz;

-- ============================================
-- 2. Migrate existing data from status to timestamps
-- ============================================

-- Set accepted_at for ideas that were in production pipeline
UPDATE ideas 
SET accepted_at = updated_at 
WHERE status IN ('preproduction', 'production', 'postproduction', 'published')
  AND accepted_at IS NULL;

-- Set published_at for published ideas
UPDATE ideas 
SET published_at = updated_at 
WHERE status = 'published'
  AND published_at IS NULL;

-- Set canceled_at for canceled ideas
UPDATE ideas 
SET canceled_at = updated_at 
WHERE status = 'canceled'
  AND canceled_at IS NULL;

-- ============================================
-- 3. Drop sort_order column (no longer needed without kanban drag-drop)
-- ============================================

ALTER TABLE ideas DROP COLUMN IF EXISTS sort_order;

-- ============================================
-- 4. Drop status column (status is now calculated in app layer)
-- ============================================

-- Drop the index first
DROP INDEX IF EXISTS ideas_status_idx;
DROP INDEX IF EXISTS ideas_business_status_idx;

-- Note: We need to recreate indexes for the new columns
CREATE INDEX IF NOT EXISTS ideas_accepted_at_idx ON ideas(accepted_at);
CREATE INDEX IF NOT EXISTS ideas_published_at_idx ON ideas(published_at);
CREATE INDEX IF NOT EXISTS ideas_canceled_at_idx ON ideas(canceled_at);

-- Drop the status column
ALTER TABLE ideas DROP COLUMN IF EXISTS status;

-- Note: The idea_status enum type will remain in the database but is no longer used.
-- PostgreSQL doesn't easily allow dropping enum types that may have been used.

