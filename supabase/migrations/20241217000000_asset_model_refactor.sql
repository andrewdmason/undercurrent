-- Asset Model Refactor
-- Replace idea_todos with idea_assets for structured video production workflow

-- ============================================
-- 1. Create idea_assets table
-- ============================================

create table if not exists public.idea_assets (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references public.ideas(id) on delete cascade,
  type text not null, -- 'talking_points' | 'script' | 'a_roll' | 'b_roll_footage' | 'b_roll_screen_recording' | 'thumbnail'
  is_complete boolean not null default false,
  title text not null,
  instructions text, -- markdown instructions for preparing the asset
  time_estimate_minutes integer,
  is_ai_generatable boolean not null default false,
  assigned_to uuid references auth.users(id) on delete set null,
  content_text text, -- for scripts, talking points (stored directly)
  content_url text, -- for media assets (URL to Supabase Storage)
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create index for faster lookups by idea
create index if not exists idea_assets_idea_id_idx on public.idea_assets(idea_id);

-- Enable RLS
alter table public.idea_assets enable row level security;

-- RLS policies for idea_assets (access through project membership via ideas)
drop policy if exists "Users can view assets for ideas in their projects" on public.idea_assets;
create policy "Users can view assets for ideas in their projects"
  on public.idea_assets for select
  using (
    exists (
      select 1 from public.ideas i
      join public.project_members pm on pm.project_id = i.project_id
      where i.id = idea_assets.idea_id
      and pm.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert assets for ideas in their projects" on public.idea_assets;
create policy "Users can insert assets for ideas in their projects"
  on public.idea_assets for insert
  with check (
    exists (
      select 1 from public.ideas i
      join public.project_members pm on pm.project_id = i.project_id
      where i.id = idea_assets.idea_id
      and pm.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update assets for ideas in their projects" on public.idea_assets;
create policy "Users can update assets for ideas in their projects"
  on public.idea_assets for update
  using (
    exists (
      select 1 from public.ideas i
      join public.project_members pm on pm.project_id = i.project_id
      where i.id = idea_assets.idea_id
      and pm.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete assets for ideas in their projects" on public.idea_assets;
create policy "Users can delete assets for ideas in their projects"
  on public.idea_assets for delete
  using (
    exists (
      select 1 from public.ideas i
      join public.project_members pm on pm.project_id = i.project_id
      where i.id = idea_assets.idea_id
      and pm.user_id = auth.uid()
    )
  );

-- ============================================
-- 2. Modify ideas table
-- ============================================

-- Add recording_style column
alter table public.ideas add column if not exists recording_style text;
-- Values: 'scripted' | 'talking_points' | null (not yet determined)

-- Drop old script-related columns
alter table public.ideas drop column if exists script;
alter table public.ideas drop column if exists script_context;

-- ============================================
-- 3. Drop old idea_todos table
-- ============================================

drop table if exists public.idea_todos;




