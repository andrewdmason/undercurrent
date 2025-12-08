-- ============================================
-- Chat Tables for Script Refinement Agent
-- ============================================

-- ============================================
-- IDEA_CHATS TABLE
-- ============================================
-- Chat sessions per idea (allows multiple chats)

create table public.idea_chats (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references public.ideas(id) on delete cascade,
  name text, -- optional user-provided name, or auto "Chat 1", "Chat 2"
  model text not null default 'gpt-5.1', -- 'gpt-5.1' or 'gemini-3-pro-preview'
  created_at timestamptz default now() not null
);

-- Enable RLS
alter table public.idea_chats enable row level security;

-- ============================================
-- IDEA_CHAT_MESSAGES TABLE
-- ============================================
-- Individual messages within a chat

create table public.idea_chat_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.idea_chats(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system', 'tool')),
  content text not null,
  tool_calls jsonb, -- for assistant tool calls
  tool_call_id text, -- for tool responses
  token_count integer, -- for context window tracking
  created_at timestamptz default now() not null
);

-- Enable RLS
alter table public.idea_chat_messages enable row level security;

-- ============================================
-- CHAT_LOGS TABLE
-- ============================================
-- Stores AI chat requests and responses for auditing

create table public.chat_logs (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.idea_chats(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  model text not null,
  messages_sent jsonb not null, -- full message array sent to API
  response_raw text,
  tool_calls_made jsonb, -- what tools were invoked
  input_tokens integer,
  output_tokens integer,
  error text,
  created_at timestamptz default now() not null
);

-- Enable RLS
alter table public.chat_logs enable row level security;

-- ============================================
-- HELPER FUNCTION: Check if user has access to chat via idea
-- ============================================

create or replace function public.get_business_id_from_idea(idea_uuid uuid)
returns uuid as $$
  select business_id from public.ideas where id = idea_uuid;
$$ language sql security definer stable;

create or replace function public.get_business_id_from_chat(chat_uuid uuid)
returns uuid as $$
  select i.business_id 
  from public.idea_chats c
  join public.ideas i on i.id = c.idea_id
  where c.id = chat_uuid;
$$ language sql security definer stable;

-- ============================================
-- RLS POLICIES FOR IDEA_CHATS
-- ============================================

create policy "Users can view chats for their businesses"
  on public.idea_chats for select
  using (
    public.is_member_of_business(
      public.get_business_id_from_idea(idea_id)
    )
  );

create policy "Users can create chats for their businesses"
  on public.idea_chats for insert
  with check (
    public.is_member_of_business(
      public.get_business_id_from_idea(idea_id)
    )
  );

create policy "Users can update chats for their businesses"
  on public.idea_chats for update
  using (
    public.is_member_of_business(
      public.get_business_id_from_idea(idea_id)
    )
  );

create policy "Users can delete chats for their businesses"
  on public.idea_chats for delete
  using (
    public.is_member_of_business(
      public.get_business_id_from_idea(idea_id)
    )
  );

-- ============================================
-- RLS POLICIES FOR IDEA_CHAT_MESSAGES
-- ============================================

create policy "Users can view chat messages for their businesses"
  on public.idea_chat_messages for select
  using (
    public.is_member_of_business(
      public.get_business_id_from_chat(chat_id)
    )
  );

create policy "Users can create chat messages for their businesses"
  on public.idea_chat_messages for insert
  with check (
    public.is_member_of_business(
      public.get_business_id_from_chat(chat_id)
    )
  );

create policy "Users can update chat messages for their businesses"
  on public.idea_chat_messages for update
  using (
    public.is_member_of_business(
      public.get_business_id_from_chat(chat_id)
    )
  );

create policy "Users can delete chat messages for their businesses"
  on public.idea_chat_messages for delete
  using (
    public.is_member_of_business(
      public.get_business_id_from_chat(chat_id)
    )
  );

-- ============================================
-- RLS POLICIES FOR CHAT_LOGS
-- ============================================

create policy "Users can view chat logs for their businesses"
  on public.chat_logs for select
  using (public.is_member_of_business(business_id));

create policy "Users can create chat logs for their businesses"
  on public.chat_logs for insert
  with check (public.is_member_of_business(business_id));

-- ============================================
-- INDEXES
-- ============================================

create index idea_chats_idea_id_idx on public.idea_chats(idea_id);
create index idea_chats_created_at_idx on public.idea_chats(created_at desc);
create index idea_chat_messages_chat_id_idx on public.idea_chat_messages(chat_id);
create index idea_chat_messages_created_at_idx on public.idea_chat_messages(created_at);
create index chat_logs_chat_id_idx on public.chat_logs(chat_id);
create index chat_logs_business_id_idx on public.chat_logs(business_id);
create index chat_logs_created_at_idx on public.chat_logs(created_at desc);

