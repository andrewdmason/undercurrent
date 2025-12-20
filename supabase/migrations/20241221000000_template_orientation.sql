-- ============================================
-- ADD ORIENTATION AND TARGET DURATION TO TEMPLATES
-- ============================================
-- Templates now have an orientation (vertical/horizontal) which determines
-- which channels can be associated with them. Target duration is stored
-- for passing to AI generation prompts.

-- Add orientation column (text, not null, default 'vertical')
ALTER TABLE public.project_templates 
ADD COLUMN IF NOT EXISTS orientation text NOT NULL DEFAULT 'vertical';

-- Add target_duration_seconds column (nullable integer)
ALTER TABLE public.project_templates 
ADD COLUMN IF NOT EXISTS target_duration_seconds integer;

-- Add check constraint for valid orientation values
ALTER TABLE public.project_templates 
DROP CONSTRAINT IF EXISTS project_templates_orientation_check;

ALTER TABLE public.project_templates 
ADD CONSTRAINT project_templates_orientation_check 
CHECK (orientation IN ('vertical', 'horizontal'));

-- ============================================
-- BACKFILL ORIENTATION FROM EXISTING CHANNELS
-- ============================================
-- Logic:
-- - Vertical-only platforms: tiktok, instagram_reels, youtube_shorts, snapchat_spotlight
-- - Horizontal-only platform: youtube
-- - Both orientations: linkedin, facebook, x, custom
--
-- If template has only horizontal-only channels → horizontal
-- Otherwise → vertical (default)

UPDATE public.project_templates t
SET orientation = 'horizontal'
WHERE EXISTS (
  -- Template has at least one channel
  SELECT 1 FROM public.template_channels tc
  JOIN public.project_channels pc ON pc.id = tc.channel_id
  WHERE tc.template_id = t.id
)
AND NOT EXISTS (
  -- Template has NO vertical-only or both-orientation channels
  SELECT 1 FROM public.template_channels tc
  JOIN public.project_channels pc ON pc.id = tc.channel_id
  WHERE tc.template_id = t.id
  AND pc.platform IN ('tiktok', 'instagram_reels', 'youtube_shorts', 'snapchat_spotlight', 'linkedin', 'facebook', 'x', 'custom')
)
AND EXISTS (
  -- Template HAS horizontal-only channels (youtube)
  SELECT 1 FROM public.template_channels tc
  JOIN public.project_channels pc ON pc.id = tc.channel_id
  WHERE tc.template_id = t.id
  AND pc.platform = 'youtube'
);

-- Index for filtering templates by orientation
CREATE INDEX IF NOT EXISTS project_templates_orientation_idx ON public.project_templates(orientation);



