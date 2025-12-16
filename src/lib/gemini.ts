import { GoogleGenAI } from "@google/genai";

export const genai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Model for text generation (Gemini 3)
export const TEXT_MODEL = "gemini-3-pro-preview";

// Model for image generation (Nano Banana Pro Preview - Gemini 3 Pro Image)
export const IMAGE_MODEL = "gemini-3-pro-image-preview";

// Model for video generation (Veo 3.1)
export const VIDEO_MODEL = "veo-3.1-generate-preview";

// Standard aspect ratio for all thumbnails (landscape)
export const THUMBNAIL_ASPECT_RATIO = "16:9";

// Map template orientation to aspect ratio
export function getAspectRatioFromOrientation(orientation: "vertical" | "horizontal" | null | undefined): string {
  return orientation === "vertical" ? "9:16" : "16:9";
}

// Context window limits
export const GEMINI_CONTEXT_WINDOW = 1_000_000; // 1M tokens
export const GEMINI_WARNING_THRESHOLD = 800_000; // 80% of context window

