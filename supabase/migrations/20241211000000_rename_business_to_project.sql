-- ============================================
-- RENAME "BUSINESS" TO "PROJECT" THROUGHOUT SCHEMA
-- ============================================
-- This migration renames all tables, columns, functions, indexes,
-- triggers, and RLS policies from "business" to "project".
-- Uses ALTER RENAME to preserve all existing data.
--
-- IMPORTANT: Order matters! We must:
-- 1. Drop RLS policies first (they depend on functions)
-- 2. Drop old functions (now safe)
-- 3. Rename tables/columns/indexes/triggers
-- 4. Create new functions
-- 5. Create new RLS policies

-- ============================================
-- STEP 1: DROP ALL OLD RLS POLICIES FIRST
-- ============================================
-- Must drop these BEFORE renaming tables and BEFORE dropping functions
-- because they depend on the old function names

-- businesses table
DROP POLICY IF EXISTS "Users can view businesses they belong to" ON public.businesses;
DROP POLICY IF EXISTS "Users can update businesses they belong to" ON public.businesses;
DROP POLICY IF EXISTS "Authenticated users can create businesses" ON public.businesses;
DROP POLICY IF EXISTS "Business creators can delete their businesses" ON public.businesses;

-- business_users table
DROP POLICY IF EXISTS "Users can view business memberships" ON public.business_users;
DROP POLICY IF EXISTS "Users can add members to businesses" ON public.business_users;
DROP POLICY IF EXISTS "Members can remove members from their businesses" ON public.business_users;

-- ideas table
DROP POLICY IF EXISTS "Users can view ideas for their businesses" ON public.ideas;
DROP POLICY IF EXISTS "Users can create ideas for their businesses" ON public.ideas;
DROP POLICY IF EXISTS "Users can update ideas for their businesses" ON public.ideas;
DROP POLICY IF EXISTS "Users can delete ideas for their businesses" ON public.ideas;

-- business_characters table
DROP POLICY IF EXISTS "Users can view characters for their businesses" ON public.business_characters;
DROP POLICY IF EXISTS "Users can create characters for their businesses" ON public.business_characters;
DROP POLICY IF EXISTS "Users can update characters for their businesses" ON public.business_characters;
DROP POLICY IF EXISTS "Users can delete characters for their businesses" ON public.business_characters;

-- business_distribution_channels table
DROP POLICY IF EXISTS "Users can view distribution channels for their businesses" ON public.business_distribution_channels;
DROP POLICY IF EXISTS "Users can create distribution channels for their businesses" ON public.business_distribution_channels;
DROP POLICY IF EXISTS "Users can update distribution channels for their businesses" ON public.business_distribution_channels;
DROP POLICY IF EXISTS "Users can delete distribution channels for their businesses" ON public.business_distribution_channels;

-- idea_channels table
DROP POLICY IF EXISTS "Users can view idea channels for their businesses" ON public.idea_channels;
DROP POLICY IF EXISTS "Users can create idea channels for their businesses" ON public.idea_channels;
DROP POLICY IF EXISTS "Users can delete idea channels for their businesses" ON public.idea_channels;

-- generation_logs table
DROP POLICY IF EXISTS "Users can view generation logs for their businesses" ON public.generation_logs;
DROP POLICY IF EXISTS "Users can create generation logs for their businesses" ON public.generation_logs;

-- business_topics table
DROP POLICY IF EXISTS "Users can view topics for their businesses" ON public.business_topics;
DROP POLICY IF EXISTS "Users can create topics for their businesses" ON public.business_topics;
DROP POLICY IF EXISTS "Users can update topics for their businesses" ON public.business_topics;
DROP POLICY IF EXISTS "Users can delete topics for their businesses" ON public.business_topics;

-- business_templates table
DROP POLICY IF EXISTS "Users can view templates for their businesses" ON public.business_templates;
DROP POLICY IF EXISTS "Users can create templates for their businesses" ON public.business_templates;
DROP POLICY IF EXISTS "Users can update templates for their businesses" ON public.business_templates;
DROP POLICY IF EXISTS "Users can delete templates for their businesses" ON public.business_templates;

-- template_channels table
DROP POLICY IF EXISTS "Users can view template channels for their businesses" ON public.template_channels;
DROP POLICY IF EXISTS "Users can create template channels for their businesses" ON public.template_channels;
DROP POLICY IF EXISTS "Users can delete template channels for their businesses" ON public.template_channels;

-- idea_chats table
DROP POLICY IF EXISTS "Users can view chats for their businesses" ON public.idea_chats;
DROP POLICY IF EXISTS "Users can create chats for their businesses" ON public.idea_chats;
DROP POLICY IF EXISTS "Users can update chats for their businesses" ON public.idea_chats;
DROP POLICY IF EXISTS "Users can delete chats for their businesses" ON public.idea_chats;

-- idea_chat_messages table
DROP POLICY IF EXISTS "Users can view chat messages for their businesses" ON public.idea_chat_messages;
DROP POLICY IF EXISTS "Users can create chat messages for their businesses" ON public.idea_chat_messages;
DROP POLICY IF EXISTS "Users can update chat messages for their businesses" ON public.idea_chat_messages;
DROP POLICY IF EXISTS "Users can delete chat messages for their businesses" ON public.idea_chat_messages;

-- chat_logs table
DROP POLICY IF EXISTS "Users can view chat logs for their businesses" ON public.chat_logs;
DROP POLICY IF EXISTS "Users can create chat logs for their businesses" ON public.chat_logs;

-- idea_characters table
DROP POLICY IF EXISTS "Users can view idea characters for their businesses" ON public.idea_characters;
DROP POLICY IF EXISTS "Users can create idea characters for their businesses" ON public.idea_characters;
DROP POLICY IF EXISTS "Users can delete idea characters for their businesses" ON public.idea_characters;

-- idea_topics table
DROP POLICY IF EXISTS "Users can view idea topics for their businesses" ON public.idea_topics;
DROP POLICY IF EXISTS "Users can create idea topics for their businesses" ON public.idea_topics;
DROP POLICY IF EXISTS "Users can delete idea topics for their businesses" ON public.idea_topics;

-- ============================================
-- STEP 2: DROP OLD FUNCTIONS
-- ============================================
-- Now safe to drop since RLS policies are gone

DROP FUNCTION IF EXISTS public.is_member_of_business(uuid);
DROP FUNCTION IF EXISTS public.get_business_by_invite_token(uuid);
DROP FUNCTION IF EXISTS public.get_business_id_from_idea(uuid);
DROP FUNCTION IF EXISTS public.get_business_id_from_chat(uuid);
-- Must drop get_team_members to change parameter name from business_id_param to project_id_param
DROP FUNCTION IF EXISTS public.get_team_members(uuid);

-- ============================================
-- STEP 3: RENAME TABLES
-- ============================================

ALTER TABLE public.businesses RENAME TO projects;
ALTER TABLE public.business_users RENAME TO project_users;
ALTER TABLE public.business_characters RENAME TO project_characters;
ALTER TABLE public.business_distribution_channels RENAME TO project_channels;
ALTER TABLE public.business_topics RENAME TO project_topics;
ALTER TABLE public.business_templates RENAME TO project_templates;

-- ============================================
-- STEP 4: RENAME COLUMNS (business_id → project_id)
-- ============================================

-- In renamed tables
ALTER TABLE public.project_users RENAME COLUMN business_id TO project_id;
ALTER TABLE public.project_characters RENAME COLUMN business_id TO project_id;
ALTER TABLE public.project_channels RENAME COLUMN business_id TO project_id;
ALTER TABLE public.project_topics RENAME COLUMN business_id TO project_id;
ALTER TABLE public.project_templates RENAME COLUMN business_id TO project_id;

-- In other tables
ALTER TABLE public.ideas RENAME COLUMN business_id TO project_id;
ALTER TABLE public.generation_logs RENAME COLUMN business_id TO project_id;
ALTER TABLE public.chat_logs RENAME COLUMN business_id TO project_id;

-- ============================================
-- STEP 5: RENAME INDEXES
-- ============================================

-- projects table indexes
ALTER INDEX businesses_created_by_idx RENAME TO projects_created_by_idx;
ALTER INDEX businesses_slug_idx RENAME TO projects_slug_idx;
ALTER INDEX businesses_invite_token_idx RENAME TO projects_invite_token_idx;

-- project_users table indexes
ALTER INDEX business_users_business_id_idx RENAME TO project_users_project_id_idx;
ALTER INDEX business_users_user_id_idx RENAME TO project_users_user_id_idx;

-- project_characters table indexes
ALTER INDEX business_characters_business_id_idx RENAME TO project_characters_project_id_idx;

-- project_channels table indexes
ALTER INDEX business_distribution_channels_business_id_idx RENAME TO project_channels_project_id_idx;

-- project_topics table indexes
ALTER INDEX business_topics_business_id_idx RENAME TO project_topics_project_id_idx;

-- project_templates table indexes
ALTER INDEX business_templates_business_id_idx RENAME TO project_templates_project_id_idx;

-- ideas table indexes
ALTER INDEX ideas_business_id_idx RENAME TO ideas_project_id_idx;
ALTER INDEX ideas_business_status_idx RENAME TO ideas_project_status_idx;

-- generation_logs table indexes
ALTER INDEX generation_logs_business_id_idx RENAME TO generation_logs_project_id_idx;

-- chat_logs table indexes
ALTER INDEX chat_logs_business_id_idx RENAME TO chat_logs_project_id_idx;

-- ============================================
-- STEP 6: RENAME TRIGGERS
-- ============================================

ALTER TRIGGER businesses_updated_at ON public.projects RENAME TO projects_updated_at;
ALTER TRIGGER business_characters_updated_at ON public.project_characters RENAME TO project_characters_updated_at;
ALTER TRIGGER business_distribution_channels_updated_at ON public.project_channels RENAME TO project_channels_updated_at;
ALTER TRIGGER business_topics_updated_at ON public.project_topics RENAME TO project_topics_updated_at;
ALTER TRIGGER business_templates_updated_at ON public.project_templates RENAME TO project_templates_updated_at;

-- ============================================
-- STEP 7: CREATE NEW FUNCTIONS
-- ============================================

-- Helper function for RLS (replaces is_member_of_business)
CREATE OR REPLACE FUNCTION public.is_member_of_project(project_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.project_users
    WHERE project_id = project_uuid
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to look up project by invite token
CREATE OR REPLACE FUNCTION public.get_project_by_invite_token(invite_token_param uuid)
RETURNS TABLE (
  id uuid,
  name text,
  slug text
) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.name, p.slug
  FROM public.projects p
  WHERE p.invite_token = invite_token_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get team members (updated parameter name)
CREATE OR REPLACE FUNCTION public.get_team_members(project_id_param uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  full_name text,
  created_at timestamptz
) AS $$
BEGIN
  -- Only allow if the caller is a member of this project
  IF NOT public.is_member_of_project(project_id_param) THEN
    RAISE EXCEPTION 'Not authorized to view team members';
  END IF;
  
  RETURN QUERY
  SELECT pu.id, pu.user_id, p.full_name, pu.created_at
  FROM public.project_users pu
  LEFT JOIN public.profiles p ON p.id = pu.user_id
  WHERE pu.project_id = project_id_param
  ORDER BY pu.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper to get project_id from idea
CREATE OR REPLACE FUNCTION public.get_project_id_from_idea(idea_uuid uuid)
RETURNS uuid AS $$
  SELECT project_id FROM public.ideas WHERE id = idea_uuid;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper to get project_id from chat
CREATE OR REPLACE FUNCTION public.get_project_id_from_chat(chat_uuid uuid)
RETURNS uuid AS $$
  SELECT i.project_id 
  FROM public.idea_chats c
  JOIN public.ideas i ON i.id = c.idea_id
  WHERE c.id = chat_uuid;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- STEP 8: CREATE NEW RLS POLICIES
-- ============================================

-- PROJECTS TABLE
CREATE POLICY "Users can view projects they belong to"
  ON public.projects FOR SELECT
  USING (
    public.is_member_of_project(id)
    OR created_by = auth.uid()
  );

CREATE POLICY "Users can update projects they belong to"
  ON public.projects FOR UPDATE
  USING (public.is_member_of_project(id));

CREATE POLICY "Authenticated users can create projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Project creators can delete their projects"
  ON public.projects FOR DELETE
  USING (created_by = auth.uid());

-- PROJECT_USERS TABLE
CREATE POLICY "Users can view project memberships"
  ON public.project_users FOR SELECT
  USING (
    user_id = auth.uid() 
    OR public.is_member_of_project(project_id)
  );

CREATE POLICY "Users can add members to projects"
  ON public.project_users FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_member_of_project(project_id)
  );

CREATE POLICY "Members can remove members from their projects"
  ON public.project_users FOR DELETE
  USING (
    user_id = auth.uid()
    OR public.is_member_of_project(project_id)
  );

-- IDEAS TABLE
CREATE POLICY "Users can view ideas for their projects"
  ON public.ideas FOR SELECT
  USING (public.is_member_of_project(project_id));

CREATE POLICY "Users can create ideas for their projects"
  ON public.ideas FOR INSERT
  WITH CHECK (public.is_member_of_project(project_id));

CREATE POLICY "Users can update ideas for their projects"
  ON public.ideas FOR UPDATE
  USING (public.is_member_of_project(project_id));

CREATE POLICY "Users can delete ideas for their projects"
  ON public.ideas FOR DELETE
  USING (public.is_member_of_project(project_id));

-- PROJECT_CHARACTERS TABLE
CREATE POLICY "Users can view characters for their projects"
  ON public.project_characters FOR SELECT
  USING (public.is_member_of_project(project_id));

CREATE POLICY "Users can create characters for their projects"
  ON public.project_characters FOR INSERT
  WITH CHECK (public.is_member_of_project(project_id));

CREATE POLICY "Users can update characters for their projects"
  ON public.project_characters FOR UPDATE
  USING (public.is_member_of_project(project_id));

CREATE POLICY "Users can delete characters for their projects"
  ON public.project_characters FOR DELETE
  USING (public.is_member_of_project(project_id));

-- PROJECT_CHANNELS TABLE
CREATE POLICY "Users can view channels for their projects"
  ON public.project_channels FOR SELECT
  USING (public.is_member_of_project(project_id));

CREATE POLICY "Users can create channels for their projects"
  ON public.project_channels FOR INSERT
  WITH CHECK (public.is_member_of_project(project_id));

CREATE POLICY "Users can update channels for their projects"
  ON public.project_channels FOR UPDATE
  USING (public.is_member_of_project(project_id));

CREATE POLICY "Users can delete channels for their projects"
  ON public.project_channels FOR DELETE
  USING (public.is_member_of_project(project_id));

-- IDEA_CHANNELS TABLE
CREATE POLICY "Users can view idea channels for their projects"
  ON public.idea_channels FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ideas i
      WHERE i.id = idea_id
      AND public.is_member_of_project(i.project_id)
    )
  );

CREATE POLICY "Users can create idea channels for their projects"
  ON public.idea_channels FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ideas i
      WHERE i.id = idea_id
      AND public.is_member_of_project(i.project_id)
    )
  );

CREATE POLICY "Users can delete idea channels for their projects"
  ON public.idea_channels FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.ideas i
      WHERE i.id = idea_id
      AND public.is_member_of_project(i.project_id)
    )
  );

-- GENERATION_LOGS TABLE
CREATE POLICY "Users can view generation logs for their projects"
  ON public.generation_logs FOR SELECT
  USING (public.is_member_of_project(project_id));

CREATE POLICY "Users can create generation logs for their projects"
  ON public.generation_logs FOR INSERT
  WITH CHECK (public.is_member_of_project(project_id));

-- PROJECT_TOPICS TABLE
CREATE POLICY "Users can view topics for their projects"
  ON public.project_topics FOR SELECT
  USING (public.is_member_of_project(project_id));

CREATE POLICY "Users can create topics for their projects"
  ON public.project_topics FOR INSERT
  WITH CHECK (public.is_member_of_project(project_id));

CREATE POLICY "Users can update topics for their projects"
  ON public.project_topics FOR UPDATE
  USING (public.is_member_of_project(project_id));

CREATE POLICY "Users can delete topics for their projects"
  ON public.project_topics FOR DELETE
  USING (public.is_member_of_project(project_id));

-- PROJECT_TEMPLATES TABLE
CREATE POLICY "Users can view templates for their projects"
  ON public.project_templates FOR SELECT
  USING (public.is_member_of_project(project_id));

CREATE POLICY "Users can create templates for their projects"
  ON public.project_templates FOR INSERT
  WITH CHECK (public.is_member_of_project(project_id));

CREATE POLICY "Users can update templates for their projects"
  ON public.project_templates FOR UPDATE
  USING (public.is_member_of_project(project_id));

CREATE POLICY "Users can delete templates for their projects"
  ON public.project_templates FOR DELETE
  USING (public.is_member_of_project(project_id));

-- TEMPLATE_CHANNELS TABLE
CREATE POLICY "Users can view template channels for their projects"
  ON public.template_channels FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_templates t
      WHERE t.id = template_id
      AND public.is_member_of_project(t.project_id)
    )
  );

CREATE POLICY "Users can create template channels for their projects"
  ON public.template_channels FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_templates t
      WHERE t.id = template_id
      AND public.is_member_of_project(t.project_id)
    )
  );

CREATE POLICY "Users can delete template channels for their projects"
  ON public.template_channels FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_templates t
      WHERE t.id = template_id
      AND public.is_member_of_project(t.project_id)
    )
  );

-- IDEA_CHATS TABLE
CREATE POLICY "Users can view chats for their projects"
  ON public.idea_chats FOR SELECT
  USING (
    public.is_member_of_project(
      public.get_project_id_from_idea(idea_id)
    )
  );

CREATE POLICY "Users can create chats for their projects"
  ON public.idea_chats FOR INSERT
  WITH CHECK (
    public.is_member_of_project(
      public.get_project_id_from_idea(idea_id)
    )
  );

CREATE POLICY "Users can update chats for their projects"
  ON public.idea_chats FOR UPDATE
  USING (
    public.is_member_of_project(
      public.get_project_id_from_idea(idea_id)
    )
  );

CREATE POLICY "Users can delete chats for their projects"
  ON public.idea_chats FOR DELETE
  USING (
    public.is_member_of_project(
      public.get_project_id_from_idea(idea_id)
    )
  );

-- IDEA_CHAT_MESSAGES TABLE
CREATE POLICY "Users can view chat messages for their projects"
  ON public.idea_chat_messages FOR SELECT
  USING (
    public.is_member_of_project(
      public.get_project_id_from_chat(chat_id)
    )
  );

CREATE POLICY "Users can create chat messages for their projects"
  ON public.idea_chat_messages FOR INSERT
  WITH CHECK (
    public.is_member_of_project(
      public.get_project_id_from_chat(chat_id)
    )
  );

CREATE POLICY "Users can update chat messages for their projects"
  ON public.idea_chat_messages FOR UPDATE
  USING (
    public.is_member_of_project(
      public.get_project_id_from_chat(chat_id)
    )
  );

CREATE POLICY "Users can delete chat messages for their projects"
  ON public.idea_chat_messages FOR DELETE
  USING (
    public.is_member_of_project(
      public.get_project_id_from_chat(chat_id)
    )
  );

-- CHAT_LOGS TABLE
CREATE POLICY "Users can view chat logs for their projects"
  ON public.chat_logs FOR SELECT
  USING (public.is_member_of_project(project_id));

CREATE POLICY "Users can create chat logs for their projects"
  ON public.chat_logs FOR INSERT
  WITH CHECK (public.is_member_of_project(project_id));

-- IDEA_CHARACTERS TABLE
CREATE POLICY "Users can view idea characters for their projects"
  ON public.idea_characters FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ideas i
      WHERE i.id = idea_id
      AND public.is_member_of_project(i.project_id)
    )
  );

CREATE POLICY "Users can create idea characters for their projects"
  ON public.idea_characters FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ideas i
      WHERE i.id = idea_id
      AND public.is_member_of_project(i.project_id)
    )
  );

CREATE POLICY "Users can delete idea characters for their projects"
  ON public.idea_characters FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.ideas i
      WHERE i.id = idea_id
      AND public.is_member_of_project(i.project_id)
    )
  );

-- IDEA_TOPICS TABLE
CREATE POLICY "Users can view idea topics for their projects"
  ON public.idea_topics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ideas i
      WHERE i.id = idea_id
      AND public.is_member_of_project(i.project_id)
    )
  );

CREATE POLICY "Users can create idea topics for their projects"
  ON public.idea_topics FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ideas i
      WHERE i.id = idea_id
      AND public.is_member_of_project(i.project_id)
    )
  );

CREATE POLICY "Users can delete idea topics for their projects"
  ON public.idea_topics FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.ideas i
      WHERE i.id = idea_id
      AND public.is_member_of_project(i.project_id)
    )
  );
