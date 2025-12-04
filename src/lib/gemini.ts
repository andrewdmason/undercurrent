import { GoogleGenAI } from "@google/genai";

export const genai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Model for image generation (Nano Banana Pro Preview - Gemini 3 Pro Image)
export const IMAGE_MODEL = "gemini-3-pro-image-preview";

// Aspect ratios for different platforms
export const ASPECT_RATIOS = {
  portrait: "9:16", // TikTok, Instagram Reels, YouTube Shorts, Snapchat
  landscape: "16:9", // YouTube, LinkedIn, Facebook, X
} as const;

// Platforms that use portrait aspect ratio
export const PORTRAIT_PLATFORMS = [
  "tiktok",
  "instagram_reels",
  "youtube_shorts",
  "snapchat_spotlight",
] as const;

// Get aspect ratio based on platform
export function getAspectRatioForPlatform(
  platform: string
): (typeof ASPECT_RATIOS)[keyof typeof ASPECT_RATIOS] {
  if (PORTRAIT_PLATFORMS.includes(platform as (typeof PORTRAIT_PLATFORMS)[number])) {
    return ASPECT_RATIOS.portrait;
  }
  return ASPECT_RATIOS.landscape;
}

