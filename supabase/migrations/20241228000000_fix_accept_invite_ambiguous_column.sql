-- ============================================
-- FIX: accept_project_invite ambiguous column
-- ============================================
-- The previous version referenced `project_id` unqualified inside the
-- EXISTS subquery, which collided with the same-named output column
-- from RETURNS TABLE and produced
--   "column reference 'project_id' is ambiguous"
-- when the function ran. Qualify with a table alias.

CREATE OR REPLACE FUNCTION public.accept_project_invite(invite_token_param uuid)
RETURNS TABLE (
  project_id uuid,
  project_slug text,
  already_member boolean
) AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_project_id uuid;
  v_project_slug text;
  v_already_member boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT p.id, p.slug INTO v_project_id, v_project_slug
  FROM public.projects p
  WHERE p.invite_token = invite_token_param;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite link' USING ERRCODE = 'P0002';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = v_project_id
      AND pm.user_id = v_user_id
  ) INTO v_already_member;

  IF NOT v_already_member THEN
    INSERT INTO public.project_members (project_id, user_id)
    VALUES (v_project_id, v_user_id);
  END IF;

  RETURN QUERY SELECT v_project_id, v_project_slug, v_already_member;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER VOLATILE;
