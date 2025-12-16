-- ============================================
-- ADD PROJECT IMAGES TABLE
-- ============================================
-- Stores reference images (locations, set pieces, objects) for b-roll generation

-- ============================================
-- PROJECT_IMAGES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.project_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  title text,
  description text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.project_images ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES FOR PROJECT_IMAGES
-- ============================================

DROP POLICY IF EXISTS "Users can view images for their projects" ON public.project_images;
CREATE POLICY "Users can view images for their projects"
  ON public.project_images FOR SELECT
  USING (public.is_member_of_project(project_id));

DROP POLICY IF EXISTS "Users can create images for their projects" ON public.project_images;
CREATE POLICY "Users can create images for their projects"
  ON public.project_images FOR INSERT
  WITH CHECK (public.is_member_of_project(project_id));

DROP POLICY IF EXISTS "Users can update images for their projects" ON public.project_images;
CREATE POLICY "Users can update images for their projects"
  ON public.project_images FOR UPDATE
  USING (public.is_member_of_project(project_id));

DROP POLICY IF EXISTS "Users can delete images for their projects" ON public.project_images;
CREATE POLICY "Users can delete images for their projects"
  ON public.project_images FOR DELETE
  USING (public.is_member_of_project(project_id));

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS project_images_project_id_idx ON public.project_images(project_id);
CREATE INDEX IF NOT EXISTS project_images_created_at_idx ON public.project_images(created_at DESC);

-- ============================================
-- TRIGGER: Auto-update updated_at timestamp
-- ============================================

CREATE TRIGGER project_images_updated_at
  BEFORE UPDATE ON public.project_images
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- STORAGE BUCKET FOR PROJECT IMAGES
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('project-images', 'project-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for project-images bucket
DROP POLICY IF EXISTS "Authenticated users can upload project images" ON storage.objects;
CREATE POLICY "Authenticated users can upload project images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'project-images'
    AND auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "Anyone can view project images" ON storage.objects;
CREATE POLICY "Anyone can view project images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'project-images');

DROP POLICY IF EXISTS "Users can update project images" ON storage.objects;
CREATE POLICY "Users can update project images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'project-images'
    AND auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "Users can delete project images" ON storage.objects;
CREATE POLICY "Users can delete project images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'project-images'
    AND auth.uid() IS NOT NULL
  );

