// Database types

export interface Idea {
  id: string;
  business_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  prompt: string | null;
  rating: "up" | "down" | null;
  bookmarked: boolean;
  generation_batch_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Business {
  id: string;
  name: string;
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

