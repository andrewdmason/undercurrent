-- ============================================
-- BUSINESS_TEMPLATES TABLE
-- ============================================
-- Stores video style templates for idea generation
-- NOTE: This migration was extracted from 20241208000001_add_business_topics.sql
-- where it was incorrectly added. Using IF NOT EXISTS for idempotency.

create table if not exists public.business_templates (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  description text,
  source_video_url text,
  image_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Enable RLS (safe to run multiple times)
alter table public.business_templates enable row level security;

-- ============================================
-- RLS POLICIES FOR BUSINESS_TEMPLATES
-- ============================================
-- Users can only access templates for businesses they belong to
-- Drop and recreate policies for idempotency

drop policy if exists "Users can view templates for their businesses" on public.business_templates;
create policy "Users can view templates for their businesses"
  on public.business_templates for select
  using (public.is_member_of_business(business_id));

drop policy if exists "Users can create templates for their businesses" on public.business_templates;
create policy "Users can create templates for their businesses"
  on public.business_templates for insert
  with check (public.is_member_of_business(business_id));

drop policy if exists "Users can update templates for their businesses" on public.business_templates;
create policy "Users can update templates for their businesses"
  on public.business_templates for update
  using (public.is_member_of_business(business_id));

drop policy if exists "Users can delete templates for their businesses" on public.business_templates;
create policy "Users can delete templates for their businesses"
  on public.business_templates for delete
  using (public.is_member_of_business(business_id));

-- Index for business_templates
create index if not exists business_templates_business_id_idx on public.business_templates(business_id);

-- Trigger for updated_at (drop first for idempotency)
drop trigger if exists business_templates_updated_at on public.business_templates;
create trigger business_templates_updated_at
  before update on public.business_templates
  for each row execute function public.handle_updated_at();

-- ============================================
-- TEMPLATE_CHANNELS TABLE (Junction Table)
-- ============================================
-- Links templates to their appropriate distribution channels

create table if not exists public.template_channels (
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

drop policy if exists "Users can view template channels for their businesses" on public.template_channels;
create policy "Users can view template channels for their businesses"
  on public.template_channels for select
  using (
    exists (
      select 1 from public.business_templates t
      where t.id = template_id
      and public.is_member_of_business(t.business_id)
    )
  );

drop policy if exists "Users can create template channels for their businesses" on public.template_channels;
create policy "Users can create template channels for their businesses"
  on public.template_channels for insert
  with check (
    exists (
      select 1 from public.business_templates t
      where t.id = template_id
      and public.is_member_of_business(t.business_id)
    )
  );

drop policy if exists "Users can delete template channels for their businesses" on public.template_channels;
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
create index if not exists template_channels_template_id_idx on public.template_channels(template_id);
create index if not exists template_channels_channel_id_idx on public.template_channels(channel_id);

-- ============================================
-- ADD TEMPLATE_ID TO IDEAS TABLE
-- ============================================
-- Links ideas to their video style template

alter table public.ideas add column if not exists template_id uuid references public.business_templates(id) on delete set null;

-- Index for template lookups
create index if not exists ideas_template_id_idx on public.ideas(template_id);






