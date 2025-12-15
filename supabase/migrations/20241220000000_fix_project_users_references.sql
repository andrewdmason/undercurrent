-- ============================================
-- FIX: Update functions that still reference project_users
-- ============================================
-- The rename migration (20241216) updated is_member_of_project() and get_team_members()
-- but missed updating is_project_admin() and get_user_project_role()
-- This caused "relation project_users does not exist" errors

-- Update is_project_admin to use project_members
CREATE OR REPLACE FUNCTION public.is_project_admin(project_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = project_uuid
    AND user_id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Update get_user_project_role to use project_members
CREATE OR REPLACE FUNCTION public.get_user_project_role(project_uuid uuid)
RETURNS text AS $$
BEGIN
  RETURN (
    SELECT role FROM public.project_members
    WHERE project_id = project_uuid
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Fix the index that was created on the old table name
DROP INDEX IF EXISTS project_users_role_idx;
CREATE INDEX IF NOT EXISTS project_members_role_idx ON public.project_members(role);

