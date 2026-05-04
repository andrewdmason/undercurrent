-- ============================================
-- ACCEPT PROJECT INVITE RPC
-- ============================================
-- The accept-invite path used a direct select on public.projects keyed
-- by invite_token. RLS on projects only exposes rows to existing members,
-- so the lookup returned zero rows for the invitee (who is not yet a
-- member) and the action surfaced a misleading "Invalid invite link"
-- error. This RPC bypasses RLS via SECURITY DEFINER and performs the
-- lookup + membership insert atomically.

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
    SELECT 1 FROM public.project_members
    WHERE project_id = v_project_id
      AND user_id = v_user_id
  ) INTO v_already_member;

  IF NOT v_already_member THEN
    INSERT INTO public.project_members (project_id, user_id)
    VALUES (v_project_id, v_user_id);
  END IF;

  RETURN QUERY SELECT v_project_id, v_project_slug, v_already_member;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER VOLATILE;

GRANT EXECUTE ON FUNCTION public.accept_project_invite(uuid) TO authenticated;
