-- ============================================
-- PRODUCTION PIPELINE STATUSES
-- ============================================
-- Explode 'accepted' into three production stages:
-- preproduction (Preparing Script)
-- production (Preparing Assets)
-- postproduction (Ready to Edit)

-- Add new enum values to idea_status
ALTER TYPE idea_status ADD VALUE IF NOT EXISTS 'preproduction';
ALTER TYPE idea_status ADD VALUE IF NOT EXISTS 'production';
ALTER TYPE idea_status ADD VALUE IF NOT EXISTS 'postproduction';

-- Note: PostgreSQL doesn't allow using newly-added enum values in the same transaction.
-- For existing production databases with 'accepted' ideas, run this manually AFTER deploying:
--   UPDATE ideas SET status = 'preproduction' WHERE status = 'accepted';
-- 
-- For fresh databases (like local dev), there's no data to migrate.
-- We keep 'accepted' in the enum for backwards compatibility (Postgres can't easily remove enum values).

-- ============================================
-- KANBAN SORT ORDER
-- ============================================
-- Add sort_order column to persist the order of ideas within each kanban column

ALTER TABLE ideas ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;


