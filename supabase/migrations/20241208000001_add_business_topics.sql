-- ============================================
-- ADD BUSINESS_OBJECTIVES COLUMN TO BUSINESSES
-- ============================================
-- Stores goals, success metrics, and target audience for video marketing

alter table public.businesses add column if not exists business_objectives text;

-- ============================================
-- BUSINESS_TOPICS TABLE
-- ============================================
-- Stores content topics for idea generation (replaces content_inspiration_sources)

create table public.business_topics (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  description text,
  is_excluded boolean default false not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Enable RLS
alter table public.business_topics enable row level security;

-- ============================================
-- RLS POLICIES FOR BUSINESS_TOPICS
-- ============================================
-- Users can only access topics for businesses they belong to

create policy "Users can view topics for their businesses"
  on public.business_topics for select
  using (public.is_member_of_business(business_id));

create policy "Users can create topics for their businesses"
  on public.business_topics for insert
  with check (public.is_member_of_business(business_id));

create policy "Users can update topics for their businesses"
  on public.business_topics for update
  using (public.is_member_of_business(business_id));

create policy "Users can delete topics for their businesses"
  on public.business_topics for delete
  using (public.is_member_of_business(business_id));

-- ============================================
-- INDEXES
-- ============================================

create index business_topics_business_id_idx on public.business_topics(business_id);

-- ============================================
-- TRIGGER: Auto-update updated_at timestamp
-- ============================================

create trigger business_topics_updated_at
  before update on public.business_topics
  for each row execute function public.handle_updated_at();

-- ============================================
-- BUSINESS_TEMPLATES TABLE
-- ============================================
-- Stores video style templates for idea generation

create table public.business_templates (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  description text,
  source_video_url text,
  image_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Enable RLS
alter table public.business_templates enable row level security;

-- ============================================
-- RLS POLICIES FOR BUSINESS_TEMPLATES
-- ============================================
-- Users can only access templates for businesses they belong to

create policy "Users can view templates for their businesses"
  on public.business_templates for select
  using (public.is_member_of_business(business_id));

create policy "Users can create templates for their businesses"
  on public.business_templates for insert
  with check (public.is_member_of_business(business_id));

create policy "Users can update templates for their businesses"
  on public.business_templates for update
  using (public.is_member_of_business(business_id));

create policy "Users can delete templates for their businesses"
  on public.business_templates for delete
  using (public.is_member_of_business(business_id));

-- Index for business_templates
create index business_templates_business_id_idx on public.business_templates(business_id);

-- Trigger for updated_at
create trigger business_templates_updated_at
  before update on public.business_templates
  for each row execute function public.handle_updated_at();

-- ============================================
-- TEMPLATE_CHANNELS TABLE (Junction Table)
-- ============================================
-- Links templates to their appropriate distribution channels

create table public.template_channels (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.business_templates(id) on delete cascade,
  channel_id uuid not null references public.business_distribution_channels(id) on delete cascade,
  created_at timestamptz default now() not null,
  unique(template_id, channel_id)
);

-- Enable RLS
alter table public.template_channels enable row level security;

-- ============================================
-- RLS POLICIES FOR TEMPLATE_CHANNELS
-- ============================================
-- Users can only access template channels for templates they have access to

create policy "Users can view template channels for their businesses"
  on public.template_channels for select
  using (
    exists (
      select 1 from public.business_templates t
      where t.id = template_id
      and public.is_member_of_business(t.business_id)
    )
  );

create policy "Users can create template channels for their businesses"
  on public.template_channels for insert
  with check (
    exists (
      select 1 from public.business_templates t
      where t.id = template_id
      and public.is_member_of_business(t.business_id)
    )
  );

create policy "Users can delete template channels for their businesses"
  on public.template_channels for delete
  using (
    exists (
      select 1 from public.business_templates t
      where t.id = template_id
      and public.is_member_of_business(t.business_id)
    )
  );

-- Indexes for template_channels
create index template_channels_template_id_idx on public.template_channels(template_id);
create index template_channels_channel_id_idx on public.template_channels(channel_id);

-- ============================================
-- ADD TEMPLATE_ID TO IDEAS TABLE
-- ============================================
-- Links ideas to their video style template

alter table public.ideas add column if not exists template_id uuid references public.business_templates(id) on delete set null;

-- Index for template lookups
create index ideas_template_id_idx on public.ideas(template_id);
