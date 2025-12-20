-- Fix invite acceptance: Create RPC function to accept invites securely
-- This bypasses RLS so users can accept invites for projects they're not yet members of

CREATE OR REPLACE FUNCTION public.accept_project_invite(invite_token_param uuid)
RETURNS TABLE (
  success boolean,
  project_slug text,
  error_message text
) AS $$
DECLARE
  v_project_id uuid;
  v_project_slug text;
  v_user_id uuid;
  v_existing_member_id uuid;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::text, 'You must be logged in to accept an invite'::text;
    RETURN;
  END IF;
  
  -- Look up project by invite token
  SELECT p.id, p.slug INTO v_project_id, v_project_slug
  FROM public.projects p
  WHERE p.invite_token = invite_token_param;
  
  IF v_project_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::text, 'Invalid invite link'::text;
    RETURN;
  END IF;
  
  -- Check if already a member
  SELECT pm.id INTO v_existing_member_id
  FROM public.project_members pm
  WHERE pm.project_id = v_project_id
    AND pm.user_id = v_user_id;
  
  IF v_existing_member_id IS NOT NULL THEN
    -- Already a member, just return success
    RETURN QUERY SELECT true, v_project_slug, NULL::text;
    RETURN;
  END IF;
  
  -- Add user to project as member (default role)
  INSERT INTO public.project_members (project_id, user_id, role)
  VALUES (v_project_id, v_user_id, 'member');
  
  RETURN QUERY SELECT true, v_project_slug, NULL::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.accept_project_invite(uuid) TO authenticated;

