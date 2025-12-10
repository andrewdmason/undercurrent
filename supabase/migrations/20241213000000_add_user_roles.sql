-- ============================================
-- User Roles: App-level admin + Project-level roles
-- ============================================
-- Two levels of roles:
-- 1. App-level: is_admin on profiles (access to /admin, /logs, view all projects)
-- 2. Project-level: role column on project_users ('admin' or 'member')

-- ============================================
-- STEP 1: ADD APP-LEVEL ADMIN FLAG TO PROFILES
-- ============================================

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false NOT NULL;

-- ============================================
-- STEP 2: ADD PROJECT ROLE TO PROJECT_USERS
-- ============================================

ALTER TABLE public.project_users 
  ADD COLUMN IF NOT EXISTS role text DEFAULT 'member' NOT NULL;

ALTER TABLE public.project_users 
  ADD CONSTRAINT project_users_role_check 
  CHECK (role IN ('admin', 'member'));

-- ============================================
-- STEP 3: SET PROJECT CREATORS AS ADMINS
-- ============================================
-- Existing project creators should be admins of their projects

UPDATE public.project_users pu
SET role = 'admin'
FROM public.projects p
WHERE pu.project_id = p.id 
  AND pu.user_id = p.created_by;

-- ============================================
-- STEP 4: ADD HELPER FUNCTIONS
-- ============================================

-- Check if user is an admin of a specific project
CREATE OR REPLACE FUNCTION public.is_project_admin(project_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.project_users
    WHERE project_id = project_uuid
    AND user_id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if current user is an app-level admin
CREATE OR REPLACE FUNCTION public.is_app_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get current user's role in a project (returns null if not a member)
CREATE OR REPLACE FUNCTION public.get_user_project_role(project_uuid uuid)
RETURNS text AS $$
BEGIN
  RETURN (
    SELECT role FROM public.project_users
    WHERE project_id = project_uuid
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- STEP 5: UPDATE GET_TEAM_MEMBERS TO INCLUDE ROLE
-- ============================================

DROP FUNCTION IF EXISTS public.get_team_members(uuid);

CREATE OR REPLACE FUNCTION public.get_team_members(project_id_param uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  full_name text,
  role text,
  created_at timestamptz
) AS $$
BEGIN
  -- Only allow if the caller is a member of this project or an app admin
  IF NOT public.is_member_of_project(project_id_param) AND NOT public.is_app_admin() THEN
    RAISE EXCEPTION 'Not authorized to view team members';
  END IF;
  
  RETURN QUERY
  SELECT pu.id, pu.user_id, p.full_name, pu.role, pu.created_at
  FROM public.project_users pu
  LEFT JOIN public.profiles p ON p.id = pu.user_id
  WHERE pu.project_id = project_id_param
  ORDER BY pu.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- STEP 6: UPDATE RLS POLICIES FOR PROJECT_USERS
-- ============================================
-- Only project admins (or app admins) can remove other members
-- Users can always remove themselves

DROP POLICY IF EXISTS "Members can remove members from their projects" ON public.project_users;

CREATE POLICY "Members can remove members from their projects"
  ON public.project_users FOR DELETE
  USING (
    user_id = auth.uid()  -- Can always remove yourself
    OR public.is_project_admin(project_id)  -- Project admins can remove others
    OR public.is_app_admin()  -- App admins can remove anyone
  );

-- Project admins can update roles of other members
CREATE POLICY "Project admins can update member roles"
  ON public.project_users FOR UPDATE
  USING (
    public.is_project_admin(project_id)  -- Project admins can update
    OR public.is_app_admin()  -- App admins can update anyone
  )
  WITH CHECK (
    public.is_project_admin(project_id)
    OR public.is_app_admin()
  );

-- ============================================
-- STEP 7: UPDATE RLS FOR APP ADMIN ACCESS
-- ============================================
-- App admins can view all projects

DROP POLICY IF EXISTS "Users can view projects they belong to" ON public.projects;

CREATE POLICY "Users can view projects they belong to"
  ON public.projects FOR SELECT
  USING (
    public.is_member_of_project(id)
    OR created_by = auth.uid()
    OR public.is_app_admin()  -- App admins can view all
  );

-- App admins can view all generation logs
DROP POLICY IF EXISTS "Users can view generation logs for their projects" ON public.generation_logs;

CREATE POLICY "Users can view generation logs for their projects"
  ON public.generation_logs FOR SELECT
  USING (
    public.is_member_of_project(project_id)
    OR public.is_app_admin()
  );

-- App admins can view all chat logs
DROP POLICY IF EXISTS "Users can view chat logs for their projects" ON public.chat_logs;

CREATE POLICY "Users can view chat logs for their projects"
  ON public.chat_logs FOR SELECT
  USING (
    public.is_member_of_project(project_id)
    OR public.is_app_admin()
  );

-- ============================================
-- STEP 8: PROJECT UPDATE POLICY FOR ADMINS
-- ============================================
-- Only project admins (not all members) can update project settings

DROP POLICY IF EXISTS "Users can update projects they belong to" ON public.projects;

CREATE POLICY "Project admins can update their projects"
  ON public.projects FOR UPDATE
  USING (
    public.is_project_admin(id)
    OR public.is_app_admin()
  );

-- ============================================
-- STEP 9: PROJECT DELETE POLICY FOR ADMINS
-- ============================================
-- Any project admin (not just creator) can delete the project

DROP POLICY IF EXISTS "Project creators can delete their projects" ON public.projects;

CREATE POLICY "Project admins can delete their projects"
  ON public.projects FOR DELETE
  USING (
    public.is_project_admin(id)
    OR public.is_app_admin()
  );

-- ============================================
-- STEP 10: INDEX FOR ROLE QUERIES
-- ============================================

CREATE INDEX IF NOT EXISTS project_users_role_idx ON public.project_users(role);
CREATE INDEX IF NOT EXISTS profiles_is_admin_idx ON public.profiles(is_admin) WHERE is_admin = true;

