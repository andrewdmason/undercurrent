-- ============================================
-- IDEA_CHARACTERS TABLE (Junction Table)
-- ============================================
-- Links ideas to characters referenced in the idea

create table public.idea_characters (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references public.ideas(id) on delete cascade,
  character_id uuid not null references public.business_characters(id) on delete cascade,
  created_at timestamptz default now() not null,
  unique(idea_id, character_id)
);

-- Enable RLS
alter table public.idea_characters enable row level security;

-- ============================================
-- RLS POLICIES FOR IDEA_CHARACTERS
-- ============================================
-- Users can only access idea characters for ideas they have access to

create policy "Users can view idea characters for their businesses"
  on public.idea_characters for select
  using (
    exists (
      select 1 from public.ideas i
      where i.id = idea_id
      and public.is_member_of_business(i.business_id)
    )
  );

create policy "Users can create idea characters for their businesses"
  on public.idea_characters for insert
  with check (
    exists (
      select 1 from public.ideas i
      where i.id = idea_id
      and public.is_member_of_business(i.business_id)
    )
  );

create policy "Users can delete idea characters for their businesses"
  on public.idea_characters for delete
  using (
    exists (
      select 1 from public.ideas i
      where i.id = idea_id
      and public.is_member_of_business(i.business_id)
    )
  );

-- Indexes for idea_characters
create index idea_characters_idea_id_idx on public.idea_characters(idea_id);
create index idea_characters_character_id_idx on public.idea_characters(character_id);

-- ============================================
-- IDEA_TOPICS TABLE (Junction Table)
-- ============================================
-- Links ideas to topics they cover

create table public.idea_topics (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references public.ideas(id) on delete cascade,
  topic_id uuid not null references public.business_topics(id) on delete cascade,
  created_at timestamptz default now() not null,
  unique(idea_id, topic_id)
);

-- Enable RLS
alter table public.idea_topics enable row level security;

-- ============================================
-- RLS POLICIES FOR IDEA_TOPICS
-- ============================================
-- Users can only access idea topics for ideas they have access to

create policy "Users can view idea topics for their businesses"
  on public.idea_topics for select
  using (
    exists (
      select 1 from public.ideas i
      where i.id = idea_id
      and public.is_member_of_business(i.business_id)
    )
  );

create policy "Users can create idea topics for their businesses"
  on public.idea_topics for insert
  with check (
    exists (
      select 1 from public.ideas i
      where i.id = idea_id
      and public.is_member_of_business(i.business_id)
    )
  );

create policy "Users can delete idea topics for their businesses"
  on public.idea_topics for delete
  using (
    exists (
      select 1 from public.ideas i
      where i.id = idea_id
      and public.is_member_of_business(i.business_id)
    )
  );

-- Indexes for idea_topics
create index idea_topics_idea_id_idx on public.idea_topics(idea_id);
create index idea_topics_topic_id_idx on public.idea_topics(topic_id);
