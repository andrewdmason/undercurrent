import { GoogleGenAI } from "@google/genai";

export const genai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Model for image generation (Nano Banana Pro Preview - Gemini 3 Pro Image)
export const IMAGE_MODEL = "gemini-3-pro-image-preview";

// Standard aspect ratio for all thumbnails (landscape)
export const THUMBNAIL_ASPECT_RATIO = "16:9";

