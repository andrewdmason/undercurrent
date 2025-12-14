-- ============================================
-- RENAME project_users TO project_members
-- AND ADD member_id TO project_characters
-- ============================================

-- ============================================
-- STEP 1: DROP OLD RLS POLICIES ON project_users
-- ============================================

DROP POLICY IF EXISTS "Users can view project memberships" ON public.project_users;
DROP POLICY IF EXISTS "Users can add members to projects" ON public.project_users;
DROP POLICY IF EXISTS "Members can remove members from their projects" ON public.project_users;

-- ============================================
-- STEP 2: RENAME TABLE
-- ============================================

ALTER TABLE public.project_users RENAME TO project_members;

-- ============================================
-- STEP 3: RENAME INDEXES
-- ============================================

ALTER INDEX project_users_project_id_idx RENAME TO project_members_project_id_idx;
ALTER INDEX project_users_user_id_idx RENAME TO project_members_user_id_idx;

-- ============================================
-- STEP 4: UPDATE FUNCTIONS WITH NEW TABLE NAME
-- (Use CREATE OR REPLACE to update in place - don't drop because policies depend on them)
-- ============================================

-- Helper function for RLS
CREATE OR REPLACE FUNCTION public.is_member_of_project(project_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = project_uuid
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get team members
CREATE OR REPLACE FUNCTION public.get_team_members(project_id_param uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  full_name text,
  role text,
  created_at timestamptz
) AS $$
BEGIN
  -- Only allow if the caller is a member of this project
  IF NOT public.is_member_of_project(project_id_param) THEN
    RAISE EXCEPTION 'Not authorized to view team members';
  END IF;
  
  RETURN QUERY
  SELECT pm.id, pm.user_id, p.full_name, pm.role, pm.created_at
  FROM public.project_members pm
  LEFT JOIN public.profiles p ON p.id = pm.user_id
  WHERE pm.project_id = project_id_param
  ORDER BY pm.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- STEP 5: RECREATE RLS POLICIES WITH NEW TABLE NAME
-- ============================================

CREATE POLICY "Users can view project memberships"
  ON public.project_members FOR SELECT
  USING (
    user_id = auth.uid() 
    OR public.is_member_of_project(project_id)
  );

CREATE POLICY "Users can add members to projects"
  ON public.project_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_member_of_project(project_id)
  );

CREATE POLICY "Members can remove members from their projects"
  ON public.project_members FOR DELETE
  USING (
    user_id = auth.uid()
    OR public.is_member_of_project(project_id)
  );

-- Also need UPDATE policy for role changes
DROP POLICY IF EXISTS "Members can update members in their projects" ON public.project_members;
CREATE POLICY "Members can update members in their projects"
  ON public.project_members FOR UPDATE
  USING (public.is_member_of_project(project_id));

-- ============================================
-- STEP 6: ADD member_id TO project_characters
-- ============================================

ALTER TABLE public.project_characters
ADD COLUMN IF NOT EXISTS member_id uuid REFERENCES public.project_members(id) ON DELETE SET NULL;

-- Create index for lookups
CREATE INDEX IF NOT EXISTS project_characters_member_id_idx ON public.project_characters(member_id);

