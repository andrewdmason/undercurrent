-- ============================================
-- ASSET MEDIA REFACTOR
-- ============================================
-- Replace content_url with image_url/video_url on idea_assets
-- Add idea_asset_reference_images table for reference image associations

-- ============================================
-- 1. MODIFY IDEA_ASSETS TABLE
-- ============================================

-- Drop the old content_url column and add new image_url/video_url columns
ALTER TABLE public.idea_assets DROP COLUMN IF EXISTS content_url;
ALTER TABLE public.idea_assets ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.idea_assets ADD COLUMN IF NOT EXISTS video_url text;

-- ============================================
-- 2. CREATE IDEA_ASSET_REFERENCE_IMAGES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.idea_asset_reference_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_asset_id uuid NOT NULL REFERENCES public.idea_assets(id) ON DELETE CASCADE,
  project_image_id uuid REFERENCES public.project_images(id) ON DELETE SET NULL,
  uploaded_url text,  -- for one-off uploads not in project_images
  description text NOT NULL,  -- AI-generated description of what image is needed
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Constraint: at most one of project_image_id or uploaded_url should be set
-- (both can be null for unfilled slots)
ALTER TABLE public.idea_asset_reference_images
  DROP CONSTRAINT IF EXISTS check_image_source;
ALTER TABLE public.idea_asset_reference_images
  ADD CONSTRAINT check_image_source
  CHECK (NOT (project_image_id IS NOT NULL AND uploaded_url IS NOT NULL));

-- ============================================
-- 3. INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idea_asset_reference_images_asset_id_idx 
  ON public.idea_asset_reference_images(idea_asset_id);
CREATE INDEX IF NOT EXISTS idea_asset_reference_images_project_image_id_idx 
  ON public.idea_asset_reference_images(project_image_id);

-- ============================================
-- 4. ENABLE RLS
-- ============================================

ALTER TABLE public.idea_asset_reference_images ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. RLS POLICIES
-- ============================================
-- Access through project membership via idea_assets -> ideas

DROP POLICY IF EXISTS "Users can view reference images for assets in their projects" ON public.idea_asset_reference_images;
CREATE POLICY "Users can view reference images for assets in their projects"
  ON public.idea_asset_reference_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.idea_assets ia
      JOIN public.ideas i ON i.id = ia.idea_id
      JOIN public.project_members pm ON pm.project_id = i.project_id
      WHERE ia.id = idea_asset_reference_images.idea_asset_id
      AND pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert reference images for assets in their projects" ON public.idea_asset_reference_images;
CREATE POLICY "Users can insert reference images for assets in their projects"
  ON public.idea_asset_reference_images FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.idea_assets ia
      JOIN public.ideas i ON i.id = ia.idea_id
      JOIN public.project_members pm ON pm.project_id = i.project_id
      WHERE ia.id = idea_asset_reference_images.idea_asset_id
      AND pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update reference images for assets in their projects" ON public.idea_asset_reference_images;
CREATE POLICY "Users can update reference images for assets in their projects"
  ON public.idea_asset_reference_images FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.idea_assets ia
      JOIN public.ideas i ON i.id = ia.idea_id
      JOIN public.project_members pm ON pm.project_id = i.project_id
      WHERE ia.id = idea_asset_reference_images.idea_asset_id
      AND pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete reference images for assets in their projects" ON public.idea_asset_reference_images;
CREATE POLICY "Users can delete reference images for assets in their projects"
  ON public.idea_asset_reference_images FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.idea_assets ia
      JOIN public.ideas i ON i.id = ia.idea_id
      JOIN public.project_members pm ON pm.project_id = i.project_id
      WHERE ia.id = idea_asset_reference_images.idea_asset_id
      AND pm.user_id = auth.uid()
    )
  );

-- ============================================
-- 6. TRIGGER: Auto-update updated_at timestamp
-- ============================================

DROP TRIGGER IF EXISTS idea_asset_reference_images_updated_at ON public.idea_asset_reference_images;
CREATE TRIGGER idea_asset_reference_images_updated_at
  BEFORE UPDATE ON public.idea_asset_reference_images
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- 7. STORAGE BUCKET FOR ASSET VIDEOS
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('asset-videos', 'asset-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for asset-videos bucket
DROP POLICY IF EXISTS "Authenticated users can upload asset videos" ON storage.objects;
CREATE POLICY "Authenticated users can upload asset videos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'asset-videos'
    AND auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "Anyone can view asset videos" ON storage.objects;
CREATE POLICY "Anyone can view asset videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'asset-videos');

DROP POLICY IF EXISTS "Users can update asset videos" ON storage.objects;
CREATE POLICY "Users can update asset videos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'asset-videos'
    AND auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "Users can delete asset videos" ON storage.objects;
CREATE POLICY "Users can delete asset videos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'asset-videos'
    AND auth.uid() IS NOT NULL
  );

-- ============================================
-- 8. STORAGE BUCKET FOR ASSET IMAGES
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('asset-images', 'asset-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for asset-images bucket
DROP POLICY IF EXISTS "Authenticated users can upload asset images" ON storage.objects;
CREATE POLICY "Authenticated users can upload asset images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'asset-images'
    AND auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "Anyone can view asset images" ON storage.objects;
CREATE POLICY "Anyone can view asset images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'asset-images');

DROP POLICY IF EXISTS "Users can update asset images" ON storage.objects;
CREATE POLICY "Users can update asset images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'asset-images'
    AND auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "Users can delete asset images" ON storage.objects;
CREATE POLICY "Users can delete asset images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'asset-images'
    AND auth.uid() IS NOT NULL
  );

