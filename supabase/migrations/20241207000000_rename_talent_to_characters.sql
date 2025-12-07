-- ============================================
-- Rename "talent" to "characters" across the schema
-- ============================================

-- ============================================
-- RENAME TABLE
-- ============================================

ALTER TABLE public.business_talent RENAME TO business_characters;

-- ============================================
-- RENAME INDEX
-- ============================================

ALTER INDEX business_talent_business_id_idx RENAME TO business_characters_business_id_idx;

-- ============================================
-- RENAME TRIGGER
-- ============================================

ALTER TRIGGER business_talent_updated_at ON public.business_characters RENAME TO business_characters_updated_at;

-- ============================================
-- DROP OLD RLS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view talent for their businesses" ON public.business_characters;
DROP POLICY IF EXISTS "Users can create talent for their businesses" ON public.business_characters;
DROP POLICY IF EXISTS "Users can update talent for their businesses" ON public.business_characters;
DROP POLICY IF EXISTS "Users can delete talent for their businesses" ON public.business_characters;

-- ============================================
-- CREATE NEW RLS POLICIES WITH UPDATED NAMES
-- ============================================

CREATE POLICY "Users can view characters for their businesses"
  ON public.business_characters FOR SELECT
  USING (public.is_member_of_business(business_id));

CREATE POLICY "Users can create characters for their businesses"
  ON public.business_characters FOR INSERT
  WITH CHECK (public.is_member_of_business(business_id));

CREATE POLICY "Users can update characters for their businesses"
  ON public.business_characters FOR UPDATE
  USING (public.is_member_of_business(business_id));

CREATE POLICY "Users can delete characters for their businesses"
  ON public.business_characters FOR DELETE
  USING (public.is_member_of_business(business_id));

-- ============================================
-- RENAME STORAGE BUCKET
-- ============================================

UPDATE storage.buckets SET id = 'character-images', name = 'character-images' WHERE id = 'talent-images';

-- ============================================
-- DROP OLD STORAGE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can upload talent images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view talent images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update talent images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete talent images" ON storage.objects;

-- ============================================
-- CREATE NEW STORAGE POLICIES WITH UPDATED NAMES
-- ============================================

CREATE POLICY "Authenticated users can upload character images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'character-images'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Anyone can view character images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'character-images');

CREATE POLICY "Users can update character images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'character-images'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can delete character images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'character-images'
    AND auth.uid() IS NOT NULL
  );
