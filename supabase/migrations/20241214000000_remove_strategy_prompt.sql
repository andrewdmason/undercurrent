-- Remove strategy_prompt (AI Notes) column from projects
-- This feature is not currently needed

alter table public.projects drop column if exists strategy_prompt;

-- Add script_context column to ideas for storing context from chat Q&A
alter table public.ideas add column if not exists script_context text;

-- Create idea_todos table for prep list items
create table if not exists public.idea_todos (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references public.ideas(id) on delete cascade,
  type text not null, -- 'script_finalization' | 'asset' | 'physical_prep'
  title text not null,
  details text, -- markdown content; for script_finalization: JSON questions + outcome
  time_estimate_minutes integer,
  is_complete boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create index for faster lookups by idea
create index if not exists idea_todos_idea_id_idx on public.idea_todos(idea_id);

-- Enable RLS
alter table public.idea_todos enable row level security;

-- RLS policies for idea_todos (access through project membership via ideas)
drop policy if exists "Users can view todos for ideas in their projects" on public.idea_todos;
create policy "Users can view todos for ideas in their projects"
  on public.idea_todos for select
  using (
    exists (
      select 1 from public.ideas i
      join public.project_users pu on pu.project_id = i.project_id
      where i.id = idea_todos.idea_id
      and pu.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert todos for ideas in their projects" on public.idea_todos;
create policy "Users can insert todos for ideas in their projects"
  on public.idea_todos for insert
  with check (
    exists (
      select 1 from public.ideas i
      join public.project_users pu on pu.project_id = i.project_id
      where i.id = idea_todos.idea_id
      and pu.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update todos for ideas in their projects" on public.idea_todos;
create policy "Users can update todos for ideas in their projects"
  on public.idea_todos for update
  using (
    exists (
      select 1 from public.ideas i
      join public.project_users pu on pu.project_id = i.project_id
      where i.id = idea_todos.idea_id
      and pu.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete todos for ideas in their projects" on public.idea_todos;
create policy "Users can delete todos for ideas in their projects"
  on public.idea_todos for delete
  using (
    exists (
      select 1 from public.ideas i
      join public.project_users pu on pu.project_id = i.project_id
      where i.id = idea_todos.idea_id
      and pu.user_id = auth.uid()
    )
  );

