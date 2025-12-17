"use server";

import { createClient } from "@/lib/supabase/server";
import { openai, DEFAULT_MODEL } from "@/lib/openai";
import { revalidatePath } from "next/cache";
import { readFile } from "fs/promises";
import path from "path";
import {
  IdeaScene,
  IdeaSceneAsset,
  IdeaAsset,
  GeneratedStoryboardResponse,
  GeneratedScene,
  AssetType,
  ProjectImage,
} from "@/lib/types";
import { genai, SKETCH_IMAGE_MODEL, getAspectRatioFromOrientation } from "@/lib/gemini";
import { findBestMatches, MATCH_THRESHOLD } from "@/lib/embeddings";

// Helper to get project slug and revalidate paths
async function revalidateIdeaPaths(ideaId: string) {
  const supabase = await createClient();
  const { data: idea } = await supabase
    .from("ideas")
    .select("project_id, projects(slug)")
    .eq("id", ideaId)
    .single();

  const project = idea?.projects as unknown as { slug: string } | null;
  if (project?.slug) {
    revalidatePath(`/${project.slug}`);
    revalidatePath(`/${project.slug}/ideas/${ideaId}`);
  }
  return idea?.project_id;
}

// Helper to fetch idea with all related data
async function fetchIdeaWithContext(ideaId: string) {
  const supabase = await createClient();

  const { data: idea, error: ideaError } = await supabase
    .from("ideas")
    .select(`
      id,
      title,
      description,
      recording_style,
      project_id,
      idea_characters (
        project_characters (
          name,
          description
        )
      ),
      idea_topics (
        project_topics (
          name,
          description
        )
      ),
      project_templates (
        name,
        description,
        target_duration_seconds
      )
    `)
    .eq("id", ideaId)
    .single();

  if (ideaError || !idea) {
    return { idea: null, project: null, error: "Idea not found" };
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("name, description")
    .eq("id", idea.project_id)
    .single();

  if (projectError || !project) {
    return { idea: null, project: null, error: "Project not found" };
  }

  return { idea, project, error: null };
}

// Helper to format duration in human-readable form
function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} seconds`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (remainingSeconds === 0) {
    return minutes === 1 ? "1 minute" : `${minutes} minutes`;
  }
  return `${minutes}m ${remainingSeconds}s`;
}

// Extract and format context from idea data
function formatIdeaContext(
  idea: {
    title: string | null;
    description: string | null;
    idea_characters: unknown;
    idea_topics: unknown;
    project_templates: unknown;
  },
  project: { name: string; description: string | null }
) {
  const characters = (
    (idea.idea_characters as Array<{
      project_characters: { name: string; description: string | null } | null;
    }>) || []
  )
    .map((ic) => ic.project_characters)
    .filter(Boolean) as Array<{ name: string; description: string | null }>;

  const topics = (
    (idea.idea_topics as Array<{
      project_topics: { name: string; description: string | null } | null;
    }>) || []
  )
    .map((it) => it.project_topics)
    .filter(Boolean) as Array<{ name: string; description: string | null }>;

  const template = idea.project_templates as {
    name: string;
    description: string | null;
    target_duration_seconds: number | null;
  } | null;

  const charactersSection =
    characters.length > 0
      ? characters
          .map((c) => `- **${c.name}**: ${c.description || "No description"}`)
          .join("\n")
      : "No specific characters assigned.";

  const topicsSection =
    topics.length > 0
      ? topics.map((t) => `- **${t.name}**: ${t.description || ""}`).join("\n")
      : "No specific topics.";

  const templateSection = template
    ? `**Template:** ${template.name}\n${template.description || ""}`
    : "No specific template assigned.";

  const targetDurationSeconds = template?.target_duration_seconds;
  const targetDurationSection = targetDurationSeconds
    ? `**Target Duration:** ${formatDuration(targetDurationSeconds)} (${targetDurationSeconds} seconds)`
    : "No specific duration target.";

  return {
    characters,
    topics,
    template,
    targetDurationSeconds,
    charactersSection,
    topicsSection,
    templateSection,
    targetDurationSection,
    ideaTitle: idea.title || "Untitled",
    ideaDescription: idea.description || "No description",
    projectName: project.name || "Unnamed Project",
    projectDescription: project.description || "No description provided.",
  };
}

// Get all scenes for an idea with their assets
export async function getIdeaScenes(
  ideaId: string
): Promise<{ data: IdeaScene[] | null; error: string | null }> {
  const supabase = await createClient();

  const { data: scenes, error } = await supabase
    .from("idea_scenes")
    .select(
      `
      *,
      idea_scene_assets (
        *,
        idea_assets (*)
      )
    `
    )
    .eq("idea_id", ideaId)
    .order("scene_number", { ascending: true });

  if (error) {
    console.error("Error fetching idea scenes:", error);
    return { data: null, error: error.message };
  }

  // Transform the data to match our types
  const transformedScenes: IdeaScene[] = (scenes || []).map((scene) => ({
    ...scene,
    assets: (scene.idea_scene_assets || []).map(
      (sa: { idea_assets: IdeaAsset } & IdeaSceneAsset) => ({
        ...sa,
        asset: sa.idea_assets,
      })
    ),
  }));

  return { data: transformedScenes, error: null };
}

// Generate storyboard from script
export async function generateStoryboard(
  ideaId: string
): Promise<{ success: boolean; scenes?: IdeaScene[]; error?: string }> {
  const supabase = await createClient();

  // Get the script asset first
  const { data: scriptAsset } = await supabase
    .from("idea_assets")
    .select("*")
    .eq("idea_id", ideaId)
    .eq("type", "script")
    .single();

  if (!scriptAsset?.content_text) {
    return {
      success: false,
      error: "Script must be completed before generating storyboard",
    };
  }

  const { idea, project, error: fetchError } = await fetchIdeaWithContext(ideaId);
  if (fetchError || !idea || !project) {
    return { success: false, error: fetchError || "Failed to fetch idea" };
  }

  const context = formatIdeaContext(idea, project);

  // Build the prompt
  const promptTemplate = await readFile(
    path.join(process.cwd(), "prompts", "generate-storyboard.md"),
    "utf-8"
  );

  const prompt = promptTemplate
    .replace("{{ideaTitle}}", context.ideaTitle)
    .replace("{{ideaDescription}}", context.ideaDescription)
    .replace("{{script}}", scriptAsset.content_text)
    .replace("{{template}}", context.templateSection)
    .replace("{{topics}}", context.topicsSection)
    .replace("{{characters}}", context.charactersSection)
    .replace("{{projectName}}", context.projectName)
    .replace("{{projectDescription}}", context.projectDescription);

  try {
    // Log prompt length for debugging
    console.log(`Storyboard prompt length: ${prompt.length} characters`);
    
    const completion = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    }).catch((apiError: unknown) => {
      // Log the full API error for debugging
      console.error("OpenAI API Error:", apiError);
      throw apiError;
    });

    const responseRaw = completion.choices[0]?.message?.content || "";
    
    if (!responseRaw.trim()) {
      console.error("Empty response from storyboard generation");
      return { success: false, error: "Empty response from AI" };
    }

    // Extract JSON from markdown code fences if present
    let jsonContent = responseRaw.trim();
    const codeBlockMatch = responseRaw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonContent = codeBlockMatch[1].trim();
    }
    
    // Try to find JSON object if response has extra text around it
    if (!jsonContent.startsWith('{')) {
      const jsonStart = jsonContent.indexOf('{');
      const jsonEnd = jsonContent.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        jsonContent = jsonContent.substring(jsonStart, jsonEnd + 1);
      }
    }
    
    let parsed: GeneratedStoryboardResponse;
    try {
      // First try parsing as-is (response_format: json_object should give valid JSON)
      parsed = JSON.parse(jsonContent);
    } catch (firstError) {
      // If that fails, try removing problematic control characters ONLY inside string values
      // by using a more targeted regex that finds strings and cleans them
      try {
        const cleaned = jsonContent.replace(
          /"([^"\\]|\\.)*"/g, // Match JSON string values
          (match) => match
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control chars except \t, \n, \r
        );
        parsed = JSON.parse(cleaned);
      } catch (secondError) {
        console.error("Failed to parse storyboard JSON. First 500 chars:", jsonContent.substring(0, 500));
        console.error("Last 200 chars:", jsonContent.substring(jsonContent.length - 200));
        throw firstError;
      }
    }

    // Log the generation
    await supabase.from("generation_logs").insert({
      project_id: idea.project_id,
      type: "storyboard_generation",
      prompt_sent: prompt,
      response_raw: responseRaw,
      model: DEFAULT_MODEL,
      idea_id: ideaId,
    });

    const generatedScenes: GeneratedScene[] = parsed.scenes || [];

    if (generatedScenes.length === 0) {
      return { success: true, scenes: [] };
    }

    // Delete existing scenes (this cascades to idea_scene_assets)
    await supabase.from("idea_scenes").delete().eq("idea_id", ideaId);

    // Delete existing production assets (they'll be recreated from scenes)
    const productionTypes: AssetType[] = [
      "a_roll",
      "b_roll_footage",
      "b_roll_image",
      "b_roll_screen_recording",
      "thumbnail",
    ];
    await supabase
      .from("idea_assets")
      .delete()
      .eq("idea_id", ideaId)
      .in("type", productionTypes);

    // Insert scenes
    const scenesToInsert = generatedScenes.map((scene) => ({
      idea_id: ideaId,
      scene_number: scene.scene_number,
      section_title: scene.section_title || null,
      title: scene.title,
      dialogue: scene.dialogue || null,
      direction: scene.direction || null,
      start_time_seconds: scene.start_time_seconds,
      end_time_seconds: scene.end_time_seconds,
      thumbnail_prompt: scene.thumbnail_prompt,
      thumbnail_url: null, // Will be generated separately
    }));

    const { data: insertedScenes, error: insertScenesError } = await supabase
      .from("idea_scenes")
      .insert(scenesToInsert)
      .select();

    if (insertScenesError) {
      throw new Error(`Failed to save scenes: ${insertScenesError.message}`);
    }

    // Collect all unique assets across all scenes (by title + type)
    const uniqueAssets = new Map<string, GeneratedScene["assets"][0]>();
    for (const scene of generatedScenes) {
      for (const asset of scene.assets) {
        const key = `${asset.type}:${asset.title}`;
        if (!uniqueAssets.has(key)) {
          uniqueAssets.set(key, asset);
        }
      }
    }

    // Get max sort_order from remaining assets (talking_points, script)
    const { data: existingAssets } = await supabase
      .from("idea_assets")
      .select("sort_order")
      .eq("idea_id", ideaId);
    const maxSortOrder = Math.max(0, ...(existingAssets || []).map((a) => a.sort_order));

    // Insert unique assets
    const assetsToInsert = Array.from(uniqueAssets.values()).map((asset, index) => ({
      idea_id: ideaId,
      type: asset.type,
      is_complete: false,
      title: asset.title,
      instructions: asset.instructions || null,
      time_estimate_minutes: asset.time_estimate_minutes || null,
      is_ai_generatable: asset.is_ai_generatable ?? false,
      sort_order: maxSortOrder + 1 + index,
    }));

    const { data: insertedAssets, error: insertAssetsError } = await supabase
      .from("idea_assets")
      .insert(assetsToInsert)
      .select();

    if (insertAssetsError) {
      throw new Error(`Failed to save assets: ${insertAssetsError.message}`);
    }

    // Create asset lookup map
    const assetLookup = new Map<string, IdeaAsset>();
    for (const asset of insertedAssets as IdeaAsset[]) {
      const key = `${asset.type}:${asset.title}`;
      assetLookup.set(key, asset);
    }

    // Create scene-asset links
    const sceneAssetLinks: { scene_id: string; asset_id: string; sort_order: number }[] = [];
    for (let i = 0; i < generatedScenes.length; i++) {
      const scene = generatedScenes[i];
      const insertedScene = insertedScenes[i];
      for (let j = 0; j < scene.assets.length; j++) {
        const asset = scene.assets[j];
        const key = `${asset.type}:${asset.title}`;
        const insertedAsset = assetLookup.get(key);
        if (insertedAsset) {
          sceneAssetLinks.push({
            scene_id: insertedScene.id,
            asset_id: insertedAsset.id,
            sort_order: j,
          });
        }
      }
    }

    if (sceneAssetLinks.length > 0) {
      const { error: linkError } = await supabase
        .from("idea_scene_assets")
        .insert(sceneAssetLinks);

      if (linkError) {
        console.error("Error creating scene-asset links:", linkError);
        // Non-fatal - scenes and assets were still created
      }
    }

    // Process reference images for assets
    await processReferenceImages(
      supabase,
      Array.from(uniqueAssets.values()),
      insertedAssets as IdeaAsset[],
      idea.project_id
    );

    await revalidateIdeaPaths(ideaId);

    // Fetch the complete scenes with assets
    const { data: completeScenes } = await getIdeaScenes(ideaId);
    return { success: true, scenes: completeScenes || [] };
  } catch (error) {
    // Extract detailed error message from OpenAI errors
    let errorMessage = "Unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
      // Check for OpenAI-specific error details
      const apiError = error as { status?: number; error?: { message?: string; type?: string } };
      if (apiError.error?.message) {
        errorMessage = apiError.error.message;
      }
    }
    console.error("Error generating storyboard:", error);

    await supabase.from("generation_logs").insert({
      project_id: idea.project_id,
      type: "storyboard_generation",
      prompt_sent: prompt,
      response_raw: null,
      model: DEFAULT_MODEL,
      error: errorMessage,
      idea_id: ideaId,
    });

    return { success: false, error: errorMessage };
  }
}

// Helper to process reference images for generated assets
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processReferenceImages(
  supabase: any,
  generatedAssets: GeneratedScene["assets"],
  insertedAssets: IdeaAsset[],
  projectId: string
): Promise<void> {
  // Collect all reference image descriptions across all assets
  const allRefImages: { assetIndex: number; description: string }[] = [];

  for (let i = 0; i < generatedAssets.length; i++) {
    const genAsset = generatedAssets[i];
    if (genAsset.reference_images && genAsset.reference_images.length > 0) {
      for (const refImg of genAsset.reference_images) {
        allRefImages.push({ assetIndex: i, description: refImg.description });
      }
    }
  }

  if (allRefImages.length === 0) return;

  // Fetch project images for matching
  const { data: projectImages } = await supabase
    .from("project_images")
    .select("*")
    .eq("project_id", projectId);

  const projectImagesTyped = (projectImages || []) as ProjectImage[];

  // Find matches using embeddings
  let matches: Map<string, { item: ProjectImage; similarity: number } | null>;

  if (projectImagesTyped.length > 0) {
    const descriptions = allRefImages.map((r) => r.description);
    matches = await findBestMatches(descriptions, projectImagesTyped, MATCH_THRESHOLD);
  } else {
    // No project images, all will be unmatched
    matches = new Map(allRefImages.map((r) => [r.description, null]));
  }

  // Create reference image records
  const refImagesToInsert = allRefImages.map((refImg) => {
    const match = matches.get(refImg.description);
    const insertedAsset = insertedAssets[refImg.assetIndex];

    return {
      idea_asset_id: insertedAsset.id,
      description: refImg.description,
      project_image_id: match?.item.id || null,
      uploaded_url: null,
    };
  });

  if (refImagesToInsert.length > 0) {
    const { error: refImgError } = await supabase
      .from("idea_asset_reference_images")
      .insert(refImagesToInsert);

    if (refImgError) {
      console.error("Error inserting reference images:", refImgError);
      // Non-fatal - assets were still created
    }
  }
}

// Generate thumbnail for a single scene using Imagen 4 Fast
export async function generateSceneThumbnail(
  sceneId: string
): Promise<{ success: boolean; thumbnailUrl?: string; error?: string }> {
  const supabase = await createClient();

  // Fetch the scene with idea and template info for aspect ratio
  const { data: scene, error: fetchError } = await supabase
    .from("idea_scenes")
    .select("*, ideas(project_id, project_templates(orientation))")
    .eq("id", sceneId)
    .single();

  if (fetchError || !scene) {
    return { success: false, error: "Scene not found" };
  }

  if (!scene.thumbnail_prompt) {
    return { success: false, error: "No thumbnail prompt for this scene" };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ideaData = scene.ideas as any;
  const projectId = ideaData?.project_id;
  const orientation = ideaData?.project_templates?.orientation as "vertical" | "horizontal" | null;
  const aspectRatio = getAspectRatioFromOrientation(orientation);

  try {
    // Ensure consistent storyboard sketch style by prepending style directive
    const stylePrefix = "Storyboard sketch in pencil/charcoal style, black and white with muted tones, rough hand-drawn look: ";
    const styledPrompt = scene.thumbnail_prompt.toLowerCase().startsWith("storyboard sketch")
      ? scene.thumbnail_prompt // Already has the prefix
      : stylePrefix + scene.thumbnail_prompt;

    // Generate image using Imagen 4 Fast with template's aspect ratio
    // Includes retry logic for rate limiting (429 errors)
    const MAX_RETRIES = 3;
    let response;
    let lastError;
    
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        response = await genai.models.generateImages({
          model: SKETCH_IMAGE_MODEL,
          prompt: styledPrompt,
          config: {
            numberOfImages: 1,
            aspectRatio: aspectRatio,
          },
        });
        break; // Success, exit retry loop
      } catch (apiError) {
        lastError = apiError;
        // Check if it's a rate limit error (429)
        const errorMessage = String(apiError);
        if (errorMessage.includes("429") || errorMessage.includes("RESOURCE_EXHAUSTED")) {
          // Parse retry delay from error if available, otherwise use exponential backoff
          const retryMatch = errorMessage.match(/retryDelay[":]*\s*"?(\d+)s/i);
          const waitSeconds = retryMatch ? parseInt(retryMatch[1], 10) + 5 : (attempt + 1) * 30;
          console.log(`Rate limited (attempt ${attempt + 1}/${MAX_RETRIES}), waiting ${waitSeconds}s before retry...`);
          await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));
        } else {
          // Not a rate limit error, don't retry
          throw apiError;
        }
      }
    }
    
    if (!response) {
      throw lastError || new Error("Failed to generate image after retries");
    }

    const generatedImage = response.generatedImages?.[0];
    if (!generatedImage?.image?.imageBytes) {
      return { success: false, error: "No image was generated" };
    }

    // Convert base64 to buffer and upload to Supabase storage
    const imageBuffer = Buffer.from(generatedImage.image.imageBytes, "base64");
    const fileName = `scene-${sceneId}-${Date.now()}.png`;
    const filePath = `storyboard-thumbnails/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("idea-images")
      .upload(filePath, imageBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("idea-images").getPublicUrl(filePath);

    // Update scene with thumbnail URL
    const { error: updateError } = await supabase
      .from("idea_scenes")
      .update({
        thumbnail_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sceneId);

    if (updateError) {
      throw new Error(`Failed to update scene: ${updateError.message}`);
    }

    // Log the generation
    await supabase.from("generation_logs").insert({
      project_id: projectId,
      type: "storyboard_generation",
      prompt_sent: scene.thumbnail_prompt,
      response_raw: `Image generated: ${publicUrl}`,
      model: SKETCH_IMAGE_MODEL,
      idea_id: scene.idea_id,
    });

    await revalidateIdeaPaths(scene.idea_id);
    return { success: true, thumbnailUrl: publicUrl };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error generating scene thumbnail:", error);

    await supabase.from("generation_logs").insert({
      project_id: projectId,
      type: "storyboard_generation",
      prompt_sent: scene.thumbnail_prompt,
      response_raw: null,
      model: SKETCH_IMAGE_MODEL,
      error: errorMessage,
      idea_id: scene.idea_id,
    });

    return { success: false, error: errorMessage };
  }
}

// Generate thumbnails for all scenes in an idea
export async function generateAllSceneThumbnails(
  ideaId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Fetch all scenes without thumbnails
  const { data: scenes, error: fetchError } = await supabase
    .from("idea_scenes")
    .select("id, thumbnail_url")
    .eq("idea_id", ideaId)
    .order("scene_number", { ascending: true });

  if (fetchError) {
    return { success: false, error: "Failed to fetch scenes" };
  }

  // Generate thumbnails for scenes that don't have one
  const scenesNeedingThumbnails = (scenes || []).filter((s) => !s.thumbnail_url);

  // Imagen 4 Fast has a rate limit of 10 requests per minute
  // Process with 7 second delays to stay safely under the limit
  const DELAY_BETWEEN_REQUESTS_MS = 7000;

  for (let i = 0; i < scenesNeedingThumbnails.length; i++) {
    const scene = scenesNeedingThumbnails[i];
    
    // Add delay between requests (skip delay for first request)
    if (i > 0) {
      console.log(`Rate limiting: waiting ${DELAY_BETWEEN_REQUESTS_MS / 1000}s before next thumbnail (${i + 1}/${scenesNeedingThumbnails.length})`);
      await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_REQUESTS_MS));
    }
    
    const result = await generateSceneThumbnail(scene.id);
    if (!result.success) {
      console.error(`Failed to generate thumbnail for scene ${scene.id}:`, result.error);
      // Continue with other scenes even if one fails
    }
  }

  await revalidateIdeaPaths(ideaId);
  return { success: true };
}

// Delete all scenes for an idea (for regeneration)
export async function deleteIdeaScenes(
  ideaId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("idea_scenes")
    .delete()
    .eq("idea_id", ideaId);

  if (error) {
    console.error("Error deleting scenes:", error);
    return { success: false, error: error.message };
  }

  await revalidateIdeaPaths(ideaId);
  return { success: true };
}

