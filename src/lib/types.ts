// Database types

// Idea status - calculated from timestamps and asset completion, not stored
export type IdeaStatus = "new" | "rejected" | "preproduction" | "production" | "postproduction" | "published" | "canceled";

// Production pipeline statuses (for filtering/display)
export const PRODUCTION_STATUSES = ["preproduction", "production", "postproduction"] as const;
export type ProductionStatus = (typeof PRODUCTION_STATUSES)[number];

// Human-readable labels for production statuses
export const PRODUCTION_STATUS_LABELS: Record<ProductionStatus, string> = {
  preproduction: "Pre-Production",
  production: "Production",
  postproduction: "Post-Production",
};

// Recording style - how the creator will record their content
export type RecordingStyle = "scripted" | "talking_points";

export interface Idea {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  prompt: string | null;
  reject_reason: string | null;
  generation_batch_id: string | null;
  template_id: string | null;
  recording_style: RecordingStyle | null;
  // Timestamp fields for calculated status
  accepted_at: string | null;
  published_at: string | null;
  canceled_at: string | null;
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
  content_preferences: string | null;
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
  member_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectImage {
  id: string;
  project_id: string;
  image_url: string;
  title: string | null;
  description: string | null;
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

export type GenerationLogType = "idea_generation" | "idea_remix" | "ai_character" | "thumbnail" | "talking_points_generation" | "script_generation" | "script_update" | "asset_generation" | "storyboard_generation" | "other";

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

// Template orientation - determines which channels can be associated
export type TemplateOrientation = "vertical" | "horizontal";

export interface ProjectTemplate {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  source_video_url: string | null;
  image_url: string | null;
  orientation: TemplateOrientation;
  target_duration_seconds: number | null;
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
  // Calculated status (derived from timestamps + assets)
  status: IdeaStatus;
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
    orientation?: TemplateOrientation;
    target_duration_seconds?: number | null;
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
  // Asset data for status calculation
  assets?: IdeaAsset[];
  prepTimeMinutes?: number; // Total remaining prep time in minutes
  sceneCount?: number; // Number of storyboard scenes
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
// Platform Orientation Configuration
// ============================================
// Maps each platform to which orientations it supports

export const PLATFORM_ORIENTATIONS: Record<DistributionPlatform, TemplateOrientation[]> = {
  tiktok: ["vertical"],
  instagram_reels: ["vertical"],
  youtube_shorts: ["vertical"],
  snapchat_spotlight: ["vertical"],
  youtube: ["horizontal"],
  linkedin: ["vertical", "horizontal"],
  facebook: ["vertical", "horizontal"],
  x: ["vertical", "horizontal"],
  custom: ["vertical", "horizontal"],
};

// Default target durations per platform (in seconds)
// Used to auto-suggest target duration when channels are selected
export const PLATFORM_TARGET_DURATIONS: Record<DistributionPlatform, number | null> = {
  snapchat_spotlight: 60,  // Hard platform limit
  instagram_reels: 90,     // Platform limit
  x: 140,                  // Platform limit for most accounts
  youtube_shorts: 180,     // 3 min limit (extended Oct 2024)
  tiktok: 180,             // 3 min sweet spot (allows up to 10 min)
  linkedin: 600,           // 10 min platform limit
  facebook: 600,           // Matching LinkedIn
  youtube: null,           // No default - user should specify
  custom: null,            // No constraint
};

// Helper to check if a platform supports a given orientation
export function platformSupportsOrientation(
  platform: DistributionPlatform,
  orientation: TemplateOrientation
): boolean {
  return PLATFORM_ORIENTATIONS[platform].includes(orientation);
}

// Helper to get the minimum target duration from a list of platforms
export function getMinTargetDuration(platforms: DistributionPlatform[]): number | null {
  const durations = platforms
    .map((p) => PLATFORM_TARGET_DURATIONS[p])
    .filter((d): d is number => d !== null);
  
  if (durations.length === 0) return null;
  return Math.min(...durations);
}

// ============================================
// Idea Asset Types (Video Production Assets)
// ============================================

export const ASSET_TYPES = [
  "talking_points",
  "script",
  "a_roll",
  "b_roll_footage",
  "b_roll_image",
  "b_roll_screen_recording",
  "thumbnail",
] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

// Map asset types to their production stage (derived, not stored)
export const ASSET_STAGE_MAP: Record<AssetType, "preproduction" | "production" | "postproduction"> = {
  talking_points: "preproduction",
  script: "preproduction",
  a_roll: "production",
  b_roll_footage: "production",
  b_roll_image: "production",
  b_roll_screen_recording: "production",
  thumbnail: "postproduction",
};

// Human-readable labels for asset types
export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  talking_points: "Talking Points",
  script: "Script",
  a_roll: "A-Roll Recording",
  b_roll_footage: "B-Roll Footage",
  b_roll_image: "B-Roll Image",
  b_roll_screen_recording: "Screen Recording",
  thumbnail: "Thumbnail",
};

export interface IdeaAsset {
  id: string;
  idea_id: string;
  type: AssetType;
  is_complete: boolean;
  title: string;
  instructions: string | null;
  time_estimate_minutes: number | null;
  is_ai_generatable: boolean;
  assigned_to: string | null;
  content_text: string | null;
  image_url: string | null;
  video_url: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // Joined data
  reference_images?: IdeaAssetReferenceImage[];
}

export interface IdeaAssetReferenceImage {
  id: string;
  idea_asset_id: string;
  project_image_id: string | null;
  uploaded_url: string | null;
  description: string;
  created_at: string;
  updated_at: string;
  // Joined data
  project_image?: ProjectImage;
}

// For AI-generated assets (from generate-production-assets.md prompt)
export interface GeneratedAsset {
  type: AssetType;
  title: string;
  instructions?: string;
  time_estimate_minutes?: number;
  is_ai_generatable?: boolean;
  questions?: string[]; // for talking_points that need user input
  reference_images?: GeneratedReferenceImage[]; // for b_roll_footage and b_roll_image assets
}

// Reference image requirement from AI
export interface GeneratedReferenceImage {
  description: string;
}

// AI response wrapper for asset generation
export interface GeneratedAssetsResponse {
  assets: GeneratedAsset[];
}

// ============================================
// Storyboard Scene Types
// ============================================

export interface IdeaScene {
  id: string;
  idea_id: string;
  scene_number: number;
  title: string;
  script_excerpt: string;
  start_time_seconds: number;
  end_time_seconds: number;
  thumbnail_url: string | null;
  thumbnail_prompt: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  assets?: IdeaSceneAsset[];
}

export interface IdeaSceneAsset {
  id: string;
  scene_id: string;
  asset_id: string;
  sort_order: number;
  created_at: string;
  // Joined data
  asset?: IdeaAsset;
}

// For AI-generated storyboard (from generate-storyboard.md prompt)
export interface GeneratedScene {
  scene_number: number;
  title: string;
  script_excerpt: string;
  start_time_seconds: number;
  end_time_seconds: number;
  thumbnail_prompt: string;
  assets: GeneratedSceneAsset[];
}

export interface GeneratedSceneAsset {
  type: AssetType;
  title: string;
  instructions?: string;
  time_estimate_minutes?: number;
  is_ai_generatable?: boolean;
  reference_images?: GeneratedReferenceImage[];
}

// AI response wrapper for storyboard generation
export interface GeneratedStoryboardResponse {
  scenes: GeneratedScene[];
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
