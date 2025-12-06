-- ============================================
-- Team Invites Schema (Link-based)
-- ============================================
-- Simple link-based invites: each business has one invite token
-- that can be shared with anyone to join the team.

-- ============================================
-- ADD INVITE_TOKEN TO BUSINESSES
-- ============================================

alter table public.businesses
  add column invite_token uuid default gen_random_uuid() not null unique;

-- Index for looking up businesses by invite token
create index businesses_invite_token_idx on public.businesses(invite_token);

-- ============================================
-- RPC FUNCTION FOR INVITE TOKEN LOOKUP
-- ============================================
-- Secure function to look up a business by invite token
-- Uses SECURITY DEFINER to bypass RLS, only returns minimal info

create or replace function public.get_business_by_invite_token(invite_token_param uuid)
returns table (
  id uuid,
  name text,
  slug text
) as $$
begin
  return query
  select b.id, b.name, b.slug
  from public.businesses b
  where b.invite_token = invite_token_param;
end;
$$ language plpgsql security definer stable;

-- ============================================
-- RPC FUNCTION FOR TEAM MEMBERS
-- ============================================
-- Secure function to get team members with their names
-- Uses SECURITY DEFINER to bypass profiles RLS

create or replace function public.get_team_members(business_id_param uuid)
returns table (
  id uuid,
  user_id uuid,
  full_name text,
  created_at timestamptz
) as $$
begin
  -- Only allow if the caller is a member of this business
  if not public.is_member_of_business(business_id_param) then
    raise exception 'Not authorized to view team members';
  end if;
  
  return query
  select bu.id, bu.user_id, p.full_name, bu.created_at
  from public.business_users bu
  left join public.profiles p on p.id = bu.user_id
  where bu.business_id = business_id_param
  order by bu.created_at;
end;
$$ language plpgsql security definer stable;

-- ============================================
-- UPDATE BUSINESS_USERS RLS
-- ============================================
-- Allow any member to remove other members (not just themselves)

drop policy if exists "Users can remove themselves from businesses" on public.business_users;

create policy "Members can remove members from their businesses"
  on public.business_users for delete
  using (
    user_id = auth.uid()  -- Can remove yourself
    or public.is_member_of_business(business_id)  -- Members can remove others
  );
