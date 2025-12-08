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
