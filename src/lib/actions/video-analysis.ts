"use server";

import { genai, TEXT_MODEL } from "@/lib/gemini";
import { TemplateProductionRequirements } from "@/lib/types";
import fs from "fs";
import path from "path";

// Load the prompt template
const promptPath = path.join(process.cwd(), "prompts", "analyze-video-style.md");
const promptTemplate = fs.readFileSync(promptPath, "utf-8");

export interface VideoStyleAnalysis {
  name: string;
  description: string;
  suggestedPlatforms: string[];
  productionRequirements: TemplateProductionRequirements | null;
  thumbnailUrl: string | null;
}

/**
 * Extract YouTube video ID from various URL formats
 */
function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Get YouTube video thumbnail URL using oEmbed API
 */
async function getYouTubeThumbnail(videoUrl: string): Promise<string | null> {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`;
    const response = await fetch(oembedUrl);
    
    if (!response.ok) {
      console.error("Failed to fetch YouTube oEmbed data:", response.status);
      return null;
    }
    
    const data = await response.json();
    return data.thumbnail_url || null;
  } catch (error) {
    console.error("Error fetching YouTube thumbnail:", error);
    return null;
  }
}

/**
 * Quick validation and thumbnail fetch - call this first to show immediate feedback
 */
export async function getVideoPreview(
  videoUrl: string
): Promise<{ success: true; thumbnailUrl: string | null; normalizedUrl: string } | { success: false; error: string }> {
  const videoId = extractYouTubeVideoId(videoUrl);
  if (!videoId) {
    return { success: false, error: "Invalid YouTube URL. Please provide a valid YouTube video link." };
  }

  const normalizedUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const thumbnailUrl = await getYouTubeThumbnail(normalizedUrl);

  return { success: true, thumbnailUrl, normalizedUrl };
}

/**
 * Analyze a YouTube video using Gemini to extract its style
 * @param videoUrl - The YouTube video URL to analyze
 * @param analyzeFullVideo - If true, analyze the entire video. If false (default), only analyze the first 60 seconds.
 */
export async function analyzeVideoStyle(
  videoUrl: string,
  analyzeFullVideo: boolean = false
): Promise<{ success: true; analysis: VideoStyleAnalysis } | { success: false; error: string }> {
  // Validate YouTube URL
  const videoId = extractYouTubeVideoId(videoUrl);
  if (!videoId) {
    return { success: false, error: "Invalid YouTube URL. Please provide a valid YouTube video link." };
  }

  // Normalize the URL
  const normalizedUrl = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    // Fetch thumbnail in parallel with Gemini analysis
    const thumbnailPromise = getYouTubeThumbnail(normalizedUrl);

    // Build the prompt
    const prompt = promptTemplate.replace("{{videoUrl}}", normalizedUrl);

    // Build video part with optional time limit
    // By default, only analyze the first 60 seconds for faster results
    const videoPart: { fileData: { fileUri: string }; videoMetadata?: { endOffset: string } } = {
      fileData: { fileUri: normalizedUrl },
    };
    
    if (!analyzeFullVideo) {
      videoPart.videoMetadata = { endOffset: "60s" };
    }

    // Call Gemini with the YouTube URL
    const response = await genai.models.generateContent({
      model: TEXT_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            videoPart,
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    const responseText = response.text;
    if (!responseText) {
      return { success: false, error: "No response from AI model" };
    }

    // Parse the JSON response
    let parsed: {
      name: string;
      description: string;
      suggestedPlatforms: string[];
      productionRequirements?: TemplateProductionRequirements;
    };
    try {
      parsed = JSON.parse(responseText);
    } catch {
      console.error("Failed to parse Gemini response:", responseText);
      return { success: false, error: "Failed to parse AI response" };
    }

    // Validate required fields
    if (!parsed.name || !parsed.description || !Array.isArray(parsed.suggestedPlatforms)) {
      return { success: false, error: "Invalid AI response format" };
    }

    // Validate and normalize production requirements if present
    let productionRequirements: TemplateProductionRequirements | null = null;
    if (parsed.productionRequirements) {
      const req = parsed.productionRequirements;
      // Ensure all required fields are present with valid values
      if (req.presenterType && ["on_camera", "voiceover_only", "none"].includes(req.presenterType)) {
        productionRequirements = {
          presenterType: req.presenterType,
          cameraComfort: req.cameraComfort || null,
          scriptStyles: Array.isArray(req.scriptStyles) ? req.scriptStyles : [],
          locations: Array.isArray(req.locations) ? req.locations : [],
          equipment: Array.isArray(req.equipment) ? req.equipment : [],
          movement: Array.isArray(req.movement) ? req.movement : [],
        };
      }
    }

    // Get the thumbnail
    const thumbnailUrl = await thumbnailPromise;

    return {
      success: true,
      analysis: {
        name: parsed.name,
        description: parsed.description,
        suggestedPlatforms: parsed.suggestedPlatforms,
        productionRequirements,
        thumbnailUrl,
      },
    };
  } catch (error) {
    console.error("Error analyzing video:", error);
    
    // Handle specific Gemini errors
    if (error instanceof Error) {
      if (error.message.includes("Video unavailable") || error.message.includes("private")) {
        return { success: false, error: "This video is private or unavailable. Please use a public YouTube video." };
      }
      if (error.message.includes("quota") || error.message.includes("rate")) {
        return { success: false, error: "AI service is temporarily busy. Please try again in a moment." };
      }
    }
    
    return { success: false, error: "Failed to analyze video. Please try again." };
  }
}

