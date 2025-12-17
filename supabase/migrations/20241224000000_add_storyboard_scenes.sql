-- Add Storyboard Scenes
-- Visual storyboard feature that breaks scripts into scenes with AI-generated thumbnails

-- ============================================
-- 1. Create idea_scenes table
-- ============================================

create table if not exists public.idea_scenes (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references public.ideas(id) on delete cascade,
  scene_number integer not null,
  section_title text, -- Groups shots under chapter headers (e.g., "Hook", "Problem", "Solution")
  scene_type text not null default 'a_roll', -- Type of shot: a_roll, title, graphic, b_roll_footage, b_roll_image, screen_recording
  title text not null,
  dialogue text, -- Spoken words for this scene (null for b-roll only scenes)
  direction text, -- Visual direction, action descriptions, b-roll notes
  start_time_seconds integer not null default 0,
  end_time_seconds integer not null default 0,
  thumbnail_url text,
  thumbnail_prompt text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create indexes
create index if not exists idea_scenes_idea_id_idx on public.idea_scenes(idea_id);
create index if not exists idea_scenes_scene_number_idx on public.idea_scenes(idea_id, scene_number);

-- Enable RLS
alter table public.idea_scenes enable row level security;

-- RLS policies for idea_scenes (access through project membership via ideas)
drop policy if exists "Users can view scenes for ideas in their projects" on public.idea_scenes;
create policy "Users can view scenes for ideas in their projects"
  on public.idea_scenes for select
  using (
    exists (
      select 1 from public.ideas i
      join public.project_members pm on pm.project_id = i.project_id
      where i.id = idea_scenes.idea_id
      and pm.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert scenes for ideas in their projects" on public.idea_scenes;
create policy "Users can insert scenes for ideas in their projects"
  on public.idea_scenes for insert
  with check (
    exists (
      select 1 from public.ideas i
      join public.project_members pm on pm.project_id = i.project_id
      where i.id = idea_scenes.idea_id
      and pm.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update scenes for ideas in their projects" on public.idea_scenes;
create policy "Users can update scenes for ideas in their projects"
  on public.idea_scenes for update
  using (
    exists (
      select 1 from public.ideas i
      join public.project_members pm on pm.project_id = i.project_id
      where i.id = idea_scenes.idea_id
      and pm.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete scenes for ideas in their projects" on public.idea_scenes;
create policy "Users can delete scenes for ideas in their projects"
  on public.idea_scenes for delete
  using (
    exists (
      select 1 from public.ideas i
      join public.project_members pm on pm.project_id = i.project_id
      where i.id = idea_scenes.idea_id
      and pm.user_id = auth.uid()
    )
  );

-- ============================================
-- 2. Create idea_scene_assets join table
-- ============================================

create table if not exists public.idea_scene_assets (
  id uuid primary key default gen_random_uuid(),
  scene_id uuid not null references public.idea_scenes(id) on delete cascade,
  asset_id uuid not null references public.idea_assets(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  -- Ensure an asset can only be linked once per scene
  unique(scene_id, asset_id)
);

-- Create indexes
create index if not exists idea_scene_assets_scene_id_idx on public.idea_scene_assets(scene_id);
create index if not exists idea_scene_assets_asset_id_idx on public.idea_scene_assets(asset_id);

-- Enable RLS
alter table public.idea_scene_assets enable row level security;

-- RLS policies for idea_scene_assets (access through scene -> idea -> project membership)
drop policy if exists "Users can view scene assets for ideas in their projects" on public.idea_scene_assets;
create policy "Users can view scene assets for ideas in their projects"
  on public.idea_scene_assets for select
  using (
    exists (
      select 1 from public.idea_scenes s
      join public.ideas i on i.id = s.idea_id
      join public.project_members pm on pm.project_id = i.project_id
      where s.id = idea_scene_assets.scene_id
      and pm.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert scene assets for ideas in their projects" on public.idea_scene_assets;
create policy "Users can insert scene assets for ideas in their projects"
  on public.idea_scene_assets for insert
  with check (
    exists (
      select 1 from public.idea_scenes s
      join public.ideas i on i.id = s.idea_id
      join public.project_members pm on pm.project_id = i.project_id
      where s.id = idea_scene_assets.scene_id
      and pm.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update scene assets for ideas in their projects" on public.idea_scene_assets;
create policy "Users can update scene assets for ideas in their projects"
  on public.idea_scene_assets for update
  using (
    exists (
      select 1 from public.idea_scenes s
      join public.ideas i on i.id = s.idea_id
      join public.project_members pm on pm.project_id = i.project_id
      where s.id = idea_scene_assets.scene_id
      and pm.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete scene assets for ideas in their projects" on public.idea_scene_assets;
create policy "Users can delete scene assets for ideas in their projects"
  on public.idea_scene_assets for delete
  using (
    exists (
      select 1 from public.idea_scenes s
      join public.ideas i on i.id = s.idea_id
      join public.project_members pm on pm.project_id = i.project_id
      where s.id = idea_scene_assets.scene_id
      and pm.user_id = auth.uid()
    )
  );
