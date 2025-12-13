-- Remove strategy_prompt (AI Notes) column from projects
-- This feature is not currently needed

alter table public.projects drop column if exists strategy_prompt;
