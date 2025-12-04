-- ============================================
-- Undercurrent Initial Schema
-- ============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- PROFILES TABLE
-- ============================================
-- Stores user profile data, linked to Supabase auth.users

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Profiles RLS policies
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ============================================
-- BUSINESSES TABLE
-- ============================================

create table public.businesses (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  url text,
  description text,
  strategy_prompt text,
  content_inspiration_sources jsonb,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  created_by uuid references public.profiles(id) on delete set null
);

-- Enable RLS
alter table public.businesses enable row level security;

-- ============================================
-- BUSINESS_USERS TABLE (Join Table)
-- ============================================

create table public.business_users (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now() not null,
  unique(business_id, user_id)
);

-- Enable RLS
alter table public.business_users enable row level security;

-- ============================================
-- IDEAS TABLE
-- ============================================

create table public.ideas (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  title text not null,
  description text,
  script text,
  image_url text,
  prompt text,
  rating text check (rating in ('up', 'down')),
  rating_reason text,
  bookmarked boolean default false not null,
  generation_batch_id uuid,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Enable RLS
alter table public.ideas enable row level security;

-- ============================================
-- BUSINESS_TALENT TABLE
-- ============================================
-- Stores on-screen talent for video content

create table public.business_talent (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  description text,
  image_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Enable RLS
alter table public.business_talent enable row level security;

-- ============================================
-- GENERATION_LOGS TABLE
-- ============================================
-- Stores AI generation requests and responses for auditing

create table public.generation_logs (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  prompt_sent text not null,
  response_raw text,
  ideas_created uuid[],
  model text not null,
  error text,
  created_at timestamptz default now() not null
);

-- Enable RLS
alter table public.generation_logs enable row level security;

-- ============================================
-- HELPER FUNCTION FOR RLS (avoids recursion)
-- ============================================

create or replace function public.is_member_of_business(business_uuid uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.business_users
    where business_id = business_uuid
    and user_id = auth.uid()
  );
end;
$$ language plpgsql security definer stable;

-- ============================================
-- RLS POLICIES FOR BUSINESSES
-- ============================================
-- Users can only access businesses they belong to

create policy "Users can view businesses they belong to"
  on public.businesses for select
  using (
    public.is_member_of_business(id)
    or created_by = auth.uid()  -- Creators can always view their business
  );

create policy "Users can update businesses they belong to"
  on public.businesses for update
  using (public.is_member_of_business(id));

create policy "Authenticated users can create businesses"
  on public.businesses for insert
  with check (auth.uid() is not null);

create policy "Business creators can delete their businesses"
  on public.businesses for delete
  using (created_by = auth.uid());

-- ============================================
-- RLS POLICIES FOR BUSINESS_USERS
-- ============================================

-- Users can view memberships for businesses they belong to
create policy "Users can view business memberships"
  on public.business_users for select
  using (
    user_id = auth.uid() 
    or public.is_member_of_business(business_id)
  );

-- Users can add themselves to a business (when creating) or add others if they're a member
create policy "Users can add members to businesses"
  on public.business_users for insert
  with check (
    user_id = auth.uid()  -- Users can add themselves
    or public.is_member_of_business(business_id)  -- Members can add others
  );

-- Users can remove themselves from businesses
create policy "Users can remove themselves from businesses"
  on public.business_users for delete
  using (user_id = auth.uid());

-- ============================================
-- RLS POLICIES FOR IDEAS
-- ============================================
-- Users can only access ideas for businesses they belong to

create policy "Users can view ideas for their businesses"
  on public.ideas for select
  using (public.is_member_of_business(business_id));

create policy "Users can create ideas for their businesses"
  on public.ideas for insert
  with check (public.is_member_of_business(business_id));

create policy "Users can update ideas for their businesses"
  on public.ideas for update
  using (public.is_member_of_business(business_id));

create policy "Users can delete ideas for their businesses"
  on public.ideas for delete
  using (public.is_member_of_business(business_id));

-- ============================================
-- RLS POLICIES FOR BUSINESS_TALENT
-- ============================================
-- Users can only access talent for businesses they belong to

create policy "Users can view talent for their businesses"
  on public.business_talent for select
  using (public.is_member_of_business(business_id));

create policy "Users can create talent for their businesses"
  on public.business_talent for insert
  with check (public.is_member_of_business(business_id));

create policy "Users can update talent for their businesses"
  on public.business_talent for update
  using (public.is_member_of_business(business_id));

create policy "Users can delete talent for their businesses"
  on public.business_talent for delete
  using (public.is_member_of_business(business_id));

-- ============================================
-- RLS POLICIES FOR GENERATION_LOGS
-- ============================================
-- Users can only access generation logs for businesses they belong to

create policy "Users can view generation logs for their businesses"
  on public.generation_logs for select
  using (public.is_member_of_business(business_id));

create policy "Users can create generation logs for their businesses"
  on public.generation_logs for insert
  with check (public.is_member_of_business(business_id));

-- ============================================
-- TRIGGER: Auto-create profile on signup
-- ============================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- TRIGGER: Auto-update updated_at timestamp
-- ============================================

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger businesses_updated_at
  before update on public.businesses
  for each row execute function public.handle_updated_at();

create trigger ideas_updated_at
  before update on public.ideas
  for each row execute function public.handle_updated_at();

create trigger business_talent_updated_at
  before update on public.business_talent
  for each row execute function public.handle_updated_at();

-- ============================================
-- INDEXES
-- ============================================

create index business_users_business_id_idx on public.business_users(business_id);
create index business_users_user_id_idx on public.business_users(user_id);
create index businesses_created_by_idx on public.businesses(created_by);
create index ideas_business_id_idx on public.ideas(business_id);
create index ideas_generation_batch_id_idx on public.ideas(generation_batch_id);
create index business_talent_business_id_idx on public.business_talent(business_id);
create index generation_logs_business_id_idx on public.generation_logs(business_id);
create index generation_logs_created_at_idx on public.generation_logs(created_at desc);

-- ============================================
-- STORAGE BUCKET FOR IDEA IMAGES
-- ============================================

insert into storage.buckets (id, name, public)
values ('idea-images', 'idea-images', true);

-- Storage policies for idea-images bucket
-- Allow authenticated users to upload images
create policy "Authenticated users can upload idea images"
  on storage.objects for insert
  with check (
    bucket_id = 'idea-images'
    and auth.uid() is not null
  );

-- Allow public read access to idea images
create policy "Anyone can view idea images"
  on storage.objects for select
  using (bucket_id = 'idea-images');

-- Allow users to update their uploaded images
create policy "Users can update idea images"
  on storage.objects for update
  using (
    bucket_id = 'idea-images'
    and auth.uid() is not null
  );

-- Allow users to delete idea images
create policy "Users can delete idea images"
  on storage.objects for delete
  using (
    bucket_id = 'idea-images'
    and auth.uid() is not null
  );

-- ============================================
-- STORAGE BUCKET FOR TALENT IMAGES
-- ============================================

insert into storage.buckets (id, name, public)
values ('talent-images', 'talent-images', true);

-- Storage policies for talent-images bucket
-- Allow authenticated users to upload images
create policy "Authenticated users can upload talent images"
  on storage.objects for insert
  with check (
    bucket_id = 'talent-images'
    and auth.uid() is not null
  );

-- Allow public read access to talent images
create policy "Anyone can view talent images"
  on storage.objects for select
  using (bucket_id = 'talent-images');

-- Allow users to update their uploaded talent images
create policy "Users can update talent images"
  on storage.objects for update
  using (
    bucket_id = 'talent-images'
    and auth.uid() is not null
  );

-- Allow users to delete talent images
create policy "Users can delete talent images"
  on storage.objects for delete
  using (
    bucket_id = 'talent-images'
    and auth.uid() is not null
  );

