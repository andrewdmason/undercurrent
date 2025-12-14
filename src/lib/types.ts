// Database types

export type IdeaStatus = "new" | "rejected" | "accepted" | "published" | "canceled";

export interface Idea {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  script: string | null;
  script_context: string | null;
  image_url: string | null;
  prompt: string | null;
  status: IdeaStatus;
  reject_reason: string | null;
  generation_batch_id: string | null;
  template_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  url: string | null;
  description: string | null;
  business_objectives: string | null;
  content_inspiration_sources: string[] | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface ProjectCharacter {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  is_ai_generated: boolean;
  ai_style: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export type ProjectRole = "admin" | "member";

export type GenerationLogType = "idea_generation" | "ai_character" | "thumbnail" | "script_generation" | "script_update" | "todo_generation" | "todo_refresh" | "other";

export interface GenerationLog {
  id: string;
  project_id: string;
  type: GenerationLogType;
  prompt_sent: string;
  response_raw: string | null;
  ideas_created: string[] | null;
  model: string;
  error: string | null;
  idea_id: string | null;
  created_at: string;
}

export interface DistributionChannel {
  id: string;
  project_id: string;
  platform: string;
  custom_label: string | null;
  goal_count: number | null;
  goal_cadence: "weekly" | "monthly" | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface IdeaChannel {
  id: string;
  idea_id: string;
  channel_id: string;
  video_url: string | null;
  created_at: string;
}

export interface IdeaCharacter {
  id: string;
  idea_id: string;
  character_id: string;
  created_at: string;
}

export interface IdeaTopic {
  id: string;
  idea_id: string;
  topic_id: string;
  created_at: string;
}

export interface ProjectTopic {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  is_excluded: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectTemplate {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  source_video_url: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface TemplateChannel {
  id: string;
  template_id: string;
  channel_id: string;
  created_at: string;
}

// Extended template type with channel information for display
export interface ProjectTemplateWithChannels extends ProjectTemplate {
  channels: Array<{
    id: string;
    platform: string;
    custom_label: string | null;
  }>;
}

// Extended Idea type with all related data for display
export interface IdeaWithChannels extends Idea {
  channels: Array<{
    id: string;
    platform: string;
    custom_label: string | null;
    video_url: string | null;
  }>;
  template?: {
    id: string;
    name: string;
    description: string | null;
    image_url?: string | null;
    source_video_url?: string | null;
  } | null;
  characters?: Array<{
    id: string;
    name: string;
    description?: string | null;
    image_url: string | null;
  }>;
  topics?: Array<{
    id: string;
    name: string;
    description?: string | null;
  }>;
  prepTimeMinutes?: number; // Total remaining prep time in minutes
}

// Platform options for distribution channels
export const DISTRIBUTION_PLATFORMS = [
  { value: "tiktok", label: "TikTok" },
  { value: "instagram_reels", label: "Instagram" },
  { value: "youtube_shorts", label: "Shorts" },
  { value: "snapchat_spotlight", label: "Snapchat Spotlight" },
  { value: "youtube", label: "YouTube" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "facebook", label: "Facebook" },
  { value: "x", label: "X (Twitter)" },
  { value: "custom", label: "Custom" },
] as const;

export type DistributionPlatform = (typeof DISTRIBUTION_PLATFORMS)[number]["value"];

// ============================================
// Idea Todo Types (Prep List)
// ============================================

export type IdeaTodoType = "script_finalization" | "asset" | "physical_prep";

export interface IdeaTodo {
  id: string;
  idea_id: string;
  type: IdeaTodoType;
  title: string;
  details: string | null;
  time_estimate_minutes: number | null;
  is_complete: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface GeneratedTodo {
  type: IdeaTodoType;
  title: string;
  questions?: string[]; // only for script_finalization
  details?: string; // markdown for asset/physical_prep
  time_estimate_minutes: number;
}

// ============================================
// Chat Types
// ============================================

export type ChatModel = "gpt-5.1" | "gemini-3-pro-preview";

export type ChatRole = "user" | "assistant" | "system" | "tool";

export interface IdeaChat {
  id: string;
  idea_id: string;
  name: string | null;
  model: ChatModel;
  created_at: string;
}

export interface IdeaChatMessage {
  id: string;
  chat_id: string;
  role: ChatRole;
  content: string;
  tool_calls: ToolCall[] | null;
  tool_call_id: string | null;
  token_count: number | null;
  created_at: string;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface ChatLog {
  id: string;
  chat_id: string;
  project_id: string;
  model: string;
  messages_sent: unknown;
  response_raw: string | null;
  tool_calls_made: ToolCall[] | null;
  generation_log_ids: Record<string, string> | null; // Maps tool_call_id -> generation_log_id
  input_tokens: number | null;
  output_tokens: number | null;
  error: string | null;
  created_at: string;
}

// Model options for the chat model picker
export const CHAT_MODELS = [
  { value: "gpt-5.1" as ChatModel, label: "ChatGPT 5.1", provider: "OpenAI" },
  { value: "gemini-3-pro-preview" as ChatModel, label: "Gemini 3", provider: "Google" },
] as const;

// Context window limits by model
export const MODEL_CONTEXT_LIMITS: Record<ChatModel, { max: number; warning: number }> = {
  "gpt-5.1": { max: 128_000, warning: 100_000 },
  "gemini-3-pro-preview": { max: 1_000_000, warning: 800_000 },
};
