// Database types

export type IdeaStatus = "new" | "rejected" | "accepted" | "published" | "canceled";

export interface Idea {
  id: string;
  business_id: string;
  title: string;
  description: string | null;
  script: string | null;
  image_url: string | null;
  prompt: string | null;
  status: IdeaStatus;
  reject_reason: string | null;
  generation_batch_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Business {
  id: string;
  name: string;
  slug: string;
  url: string | null;
  description: string | null;
  strategy_prompt: string | null;
  content_inspiration_sources: string[] | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface BusinessTalent {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface GenerationLog {
  id: string;
  business_id: string;
  prompt_sent: string;
  response_raw: string | null;
  ideas_created: string[] | null;
  model: string;
  error: string | null;
  created_at: string;
}

export interface DistributionChannel {
  id: string;
  business_id: string;
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

// Extended Idea type with channel information for display
export interface IdeaWithChannels extends Idea {
  channels: Array<{
    id: string;
    platform: string;
    custom_label: string | null;
    video_url: string | null;
  }>;
}

// Platform options for distribution channels
export const DISTRIBUTION_PLATFORMS = [
  { value: "tiktok", label: "TikTok" },
  { value: "instagram_reels", label: "Instagram Reels" },
  { value: "youtube_shorts", label: "YouTube Shorts" },
  { value: "snapchat_spotlight", label: "Snapchat Spotlight" },
  { value: "youtube", label: "YouTube" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "facebook", label: "Facebook" },
  { value: "x", label: "X (Twitter)" },
  { value: "custom", label: "Custom" },
] as const;

export type DistributionPlatform = (typeof DISTRIBUTION_PLATFORMS)[number]["value"];

