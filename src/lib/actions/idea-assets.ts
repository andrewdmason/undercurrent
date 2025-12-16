"use server";

import { createClient } from "@/lib/supabase/server";
import { openai, DEFAULT_MODEL } from "@/lib/openai";
import { revalidatePath } from "next/cache";
import { readFile } from "fs/promises";
import path from "path";
import { IdeaAsset, GeneratedAsset, GeneratedAssetsResponse, AssetType, ProjectImage, IdeaAssetReferenceImage } from "@/lib/types";
import { findBestMatches, MATCH_THRESHOLD } from "@/lib/embeddings";
import { genai, IMAGE_MODEL, VIDEO_MODEL, getAspectRatioFromOrientation } from "@/lib/gemini";

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

// Get all assets for an idea
export async function getIdeaAssets(ideaId: string): Promise<{ data: IdeaAsset[] | null; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("idea_assets")
    .select("*")
    .eq("idea_id", ideaId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching idea assets:", error);
    return { data: null, error: error.message };
  }

  return { data: data as IdeaAsset[], error: null };
}

// Toggle asset completion
export async function toggleAssetComplete(
  assetId: string,
  isComplete: boolean
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: asset, error: fetchError } = await supabase
    .from("idea_assets")
    .select("idea_id")
    .eq("id", assetId)
    .single();

  if (fetchError || !asset) {
    return { success: false, error: "Asset not found" };
  }

  const { error } = await supabase
    .from("idea_assets")
    .update({
      is_complete: isComplete,
      updated_at: new Date().toISOString(),
    })
    .eq("id", assetId);

  if (error) {
    console.error("Error updating asset completion:", error);
    return { success: false, error: error.message };
  }

  await revalidateIdeaPaths(asset.idea_id);
  return { success: true };
}

// Update asset content (for text-based assets like script, talking points)
export async function updateAssetContent(
  assetId: string,
  contentText?: string | null,
  imageUrl?: string | null,
  videoUrl?: string | null
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: asset, error: fetchError } = await supabase
    .from("idea_assets")
    .select("idea_id")
    .eq("id", assetId)
    .single();

  if (fetchError || !asset) {
    return { success: false, error: "Asset not found" };
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  
  if (contentText !== undefined) {
    updateData.content_text = contentText;
  }
  if (imageUrl !== undefined) {
    updateData.image_url = imageUrl;
  }
  if (videoUrl !== undefined) {
    updateData.video_url = videoUrl;
  }

  const { error } = await supabase
    .from("idea_assets")
    .update(updateData)
    .eq("id", assetId);

  if (error) {
    console.error("Error updating asset content:", error);
    return { success: false, error: error.message };
  }

  await revalidateIdeaPaths(asset.idea_id);
  return { success: true };
}

// Assign asset to a team member
export async function assignAsset(
  assetId: string,
  userId: string | null
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: asset, error: fetchError } = await supabase
    .from("idea_assets")
    .select("idea_id")
    .eq("id", assetId)
    .single();

  if (fetchError || !asset) {
    return { success: false, error: "Asset not found" };
  }

  const { error } = await supabase
    .from("idea_assets")
    .update({
      assigned_to: userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", assetId);

  if (error) {
    console.error("Error assigning asset:", error);
    return { success: false, error: error.message };
  }

  await revalidateIdeaPaths(asset.idea_id);
  return { success: true };
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
function formatIdeaContext(idea: {
  title: string | null;
  description: string | null;
  idea_characters: unknown;
  idea_topics: unknown;
  project_templates: unknown;
}, project: { name: string; description: string | null }) {
  const characters = (idea.idea_characters as Array<{
    project_characters: { name: string; description: string | null } | null;
  }> || [])
    .map(ic => ic.project_characters)
    .filter(Boolean) as Array<{ name: string; description: string | null }>;

  const topics = (idea.idea_topics as Array<{
    project_topics: { name: string; description: string | null } | null;
  }> || [])
    .map(it => it.project_topics)
    .filter(Boolean) as Array<{ name: string; description: string | null }>;

  const template = idea.project_templates as { 
    name: string; 
    description: string | null;
    target_duration_seconds: number | null;
  } | null;

  const charactersSection = characters.length > 0
    ? characters.map((c) => `- **${c.name}**: ${c.description || "No description"}`).join("\n")
    : "No specific characters assigned.";

  const topicsSection = topics.length > 0
    ? topics.map((t) => `- **${t.name}**: ${t.description || ""}`).join("\n")
    : "No specific topics.";

  const templateSection = template
    ? `**Template:** ${template.name}\n${template.description || ""}`
    : "No specific template assigned.";

  // Format target duration - this is critical for content length
  const targetDurationSeconds = template?.target_duration_seconds;
  const targetDurationSection = targetDurationSeconds
    ? `**Target Duration:** ${formatDuration(targetDurationSeconds)} (${targetDurationSeconds} seconds)\n\n⚠️ **CRITICAL**: The content MUST fit within this time limit. This is not a suggestion — the video cannot exceed ${formatDuration(targetDurationSeconds)}.`
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

// Create a placeholder talking points asset (without generating content)
// The actual content will be generated via the chat interface after gathering user input
export async function createTalkingPointsPlaceholder(
  ideaId: string
): Promise<{ success: boolean; asset?: IdeaAsset; error?: string }> {
  const supabase = await createClient();

  // Check if a talking_points asset already exists
  const { data: existingAsset } = await supabase
    .from("idea_assets")
    .select("*")
    .eq("idea_id", ideaId)
    .eq("type", "talking_points")
    .single();

  if (existingAsset) {
    return { success: true, asset: existingAsset as IdeaAsset };
  }

  // Create a placeholder asset (not complete, no content)
  const { data: asset, error: insertError } = await supabase
    .from("idea_assets")
    .insert({
      idea_id: ideaId,
      type: "talking_points",
      is_complete: false,
      title: "Talking Points",
      is_ai_generatable: true,
      sort_order: 0,
    })
    .select()
    .single();

  if (insertError) {
    console.error("Error creating talking points placeholder:", insertError);
    return { success: false, error: insertError.message };
  }

  await revalidateIdeaPaths(ideaId);
  return { success: true, asset: asset as IdeaAsset };
}

// Generate talking points for an idea using AI
// This is called from the chat interface after gathering user context, or from regenerate dialog
export async function generateTalkingPoints(
  ideaId: string,
  userContext?: string,
  regenerationNotes?: string
): Promise<{ success: boolean; asset?: IdeaAsset; error?: string }> {
  const supabase = await createClient();

  const { idea, project, error: fetchError } = await fetchIdeaWithContext(ideaId);
  if (fetchError || !idea || !project) {
    return { success: false, error: fetchError || "Failed to fetch idea" };
  }

  const context = formatIdeaContext(idea, project);

  // Build the prompt
  const promptTemplate = await readFile(
    path.join(process.cwd(), "prompts", "generate-talking-points.md"),
    "utf-8"
  );

  let prompt = promptTemplate
    .replace("{{ideaTitle}}", context.ideaTitle)
    .replace("{{ideaDescription}}", context.ideaDescription)
    .replace("{{template}}", context.templateSection)
    .replace("{{targetDuration}}", context.targetDurationSection)
    .replace("{{topics}}", context.topicsSection)
    .replace("{{characters}}", context.charactersSection)
    .replace("{{projectName}}", context.projectName)
    .replace("{{projectDescription}}", context.projectDescription);

  // If user context was provided from chat (initial generation), append it
  if (userContext) {
    prompt += `\n\n## User's Perspective and Context\n\nThe user has provided the following information about their unique perspective on this video:\n\n${userContext}\n\n**Important:** Use this context to make the talking points specific and personalized. Do NOT return needs_input: true — generate the talking points directly using the context above.`;
  }

  // If regeneration notes were provided (regeneration), append them
  if (regenerationNotes?.trim()) {
    prompt += `\n\n## Regeneration Notes\n\nThe user has requested specific changes or considerations for this regeneration:\n\n${regenerationNotes.trim()}`;
  }

  try {
    const completion = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const responseRaw = completion.choices[0]?.message?.content || "";
    const parsed = JSON.parse(responseRaw);

    // Log the generation
    await supabase.from("generation_logs").insert({
      project_id: idea.project_id,
      type: "talking_points_generation",
      prompt_sent: prompt,
      response_raw: responseRaw,
      model: DEFAULT_MODEL,
      idea_id: ideaId,
    });

    // Check if a talking_points asset already exists
    const { data: existingAsset } = await supabase
      .from("idea_assets")
      .select("*")
      .eq("idea_id", ideaId)
      .eq("type", "talking_points")
      .single();

    let asset;
    if (existingAsset) {
      // Update existing asset
      const { data: updatedAsset, error: updateError } = await supabase
        .from("idea_assets")
        .update({
          content_text: parsed.talking_points,
          instructions: parsed.instructions || null,
          time_estimate_minutes: parsed.time_estimate_minutes || 5,
          is_complete: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingAsset.id)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update asset: ${updateError.message}`);
      }
      asset = updatedAsset;
    } else {
      // Create new asset
      const { data: newAsset, error: insertError } = await supabase
        .from("idea_assets")
        .insert({
          idea_id: ideaId,
          type: "talking_points",
          is_complete: true,
          title: "Talking Points",
          instructions: parsed.instructions || null,
          content_text: parsed.talking_points,
          is_ai_generatable: true,
          time_estimate_minutes: parsed.time_estimate_minutes || 5,
          sort_order: 0,
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed to save asset: ${insertError.message}`);
      }
      asset = newAsset;
    }

    await revalidateIdeaPaths(ideaId);
    return { success: true, asset: asset as IdeaAsset };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error generating talking points:", error);

    await supabase.from("generation_logs").insert({
      project_id: idea.project_id,
      type: "talking_points_generation",
      prompt_sent: prompt,
      response_raw: null,
      model: DEFAULT_MODEL,
      error: errorMessage,
      idea_id: ideaId,
    });

    return { success: false, error: errorMessage };
  }
}

// Generate script from talking points
export async function generateScript(
  ideaId: string,
  userNotes?: string
): Promise<{ success: boolean; asset?: IdeaAsset; error?: string }> {
  const supabase = await createClient();

  // Get the talking points asset first
  const { data: talkingPointsAsset } = await supabase
    .from("idea_assets")
    .select("*")
    .eq("idea_id", ideaId)
    .eq("type", "talking_points")
    .single();

  if (!talkingPointsAsset?.content_text) {
    return { success: false, error: "Talking points must be completed before generating script" };
  }

  const { idea, project, error: fetchError } = await fetchIdeaWithContext(ideaId);
  if (fetchError || !idea || !project) {
    return { success: false, error: fetchError || "Failed to fetch idea" };
  }

  const context = formatIdeaContext(idea, project);

  // Build the prompt for script generation
  const promptTemplate = await readFile(
    path.join(process.cwd(), "prompts", "generate-script.md"),
    "utf-8"
  );

  let prompt = promptTemplate
    .replace("{{ideaTitle}}", context.ideaTitle)
    .replace("{{ideaDescription}}", context.ideaDescription)
    .replace("{{talkingPoints}}", talkingPointsAsset.content_text)
    .replace("{{template}}", context.templateSection)
    .replace("{{targetDuration}}", context.targetDurationSection)
    .replace("{{topics}}", context.topicsSection)
    .replace("{{characters}}", context.charactersSection)
    .replace("{{projectName}}", context.projectName)
    .replace("{{projectDescription}}", context.projectDescription);

  // Append user notes if provided
  if (userNotes?.trim()) {
    prompt += `\n\n## Regeneration Notes\n\nThe user has requested specific changes or considerations for this regeneration:\n\n${userNotes.trim()}`;
  }

  try {
    const completion = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const responseRaw = completion.choices[0]?.message?.content || "";
    const parsed = JSON.parse(responseRaw);

    // Log the generation
    await supabase.from("generation_logs").insert({
      project_id: idea.project_id,
      type: "script_generation",
      prompt_sent: prompt,
      response_raw: responseRaw,
      model: DEFAULT_MODEL,
      idea_id: ideaId,
    });

    // Check if a script asset already exists
    const { data: existingScript } = await supabase
      .from("idea_assets")
      .select("*")
      .eq("idea_id", ideaId)
      .eq("type", "script")
      .single();

    let asset;
    if (existingScript) {
      // Update existing script asset
      const { data: updatedAsset, error: updateError } = await supabase
        .from("idea_assets")
        .update({
          content_text: parsed.script,
          instructions: parsed.instructions || null,
          time_estimate_minutes: parsed.time_estimate_minutes || 10,
          is_complete: true,
        })
        .eq("id", existingScript.id)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update script: ${updateError.message}`);
      }
      asset = updatedAsset;
    } else {
      // Get max sort_order for new asset
      const { data: existingAssets } = await supabase
        .from("idea_assets")
        .select("sort_order")
        .eq("idea_id", ideaId);
      const maxSortOrder = Math.max(0, ...(existingAssets || []).map(a => a.sort_order));

      // Create the script asset
      const { data: newAsset, error: insertError } = await supabase
        .from("idea_assets")
        .insert({
          idea_id: ideaId,
          type: "script",
          is_complete: true,
          title: "Script",
          instructions: parsed.instructions || null,
          content_text: parsed.script,
          is_ai_generatable: true,
          time_estimate_minutes: parsed.time_estimate_minutes || 10,
          sort_order: maxSortOrder + 1,
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed to save script: ${insertError.message}`);
      }
      asset = newAsset;
    }

    await revalidateIdeaPaths(ideaId);
    return { success: true, asset: asset as IdeaAsset };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error generating script:", error);

    await supabase.from("generation_logs").insert({
      project_id: idea.project_id,
      type: "script_generation",
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
  generatedAssets: GeneratedAsset[],
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

// Generate production assets (a_roll, b_roll, thumbnail) based on talking points/script
export async function generateProductionAssets(
  ideaId: string
): Promise<{ success: boolean; assets?: IdeaAsset[]; error?: string }> {
  const supabase = await createClient();

  // Get existing assets to use as context
  const { data: existingAssets, error: fetchAssetsError } = await supabase
    .from("idea_assets")
    .select("*")
    .eq("idea_id", ideaId);

  if (fetchAssetsError) {
    console.error("Error fetching assets:", fetchAssetsError);
    return { success: false, error: "Failed to fetch existing assets" };
  }

  const talkingPoints = existingAssets?.find(a => a.type === "talking_points");
  const script = existingAssets?.find(a => a.type === "script");

  // Need at least talking points OR script to generate production assets
  const contentSource = script?.content_text || talkingPoints?.content_text;
  if (!contentSource) {
    return { success: false, error: "Talking points or script must have content before generating production assets" };
  }

  const { idea, project, error: fetchError } = await fetchIdeaWithContext(ideaId);
  if (fetchError || !idea || !project) {
    return { success: false, error: fetchError || "Failed to fetch idea" };
  }

  const context = formatIdeaContext(idea, project);

  // Build the prompt
  const promptTemplate = await readFile(
    path.join(process.cwd(), "prompts", "generate-production-assets.md"),
    "utf-8"
  );

  const contentSection = script?.content_text
    ? `**Script:**\n\n${script.content_text}`
    : `**Talking Points:**\n\n${talkingPoints?.content_text}`;

  const prompt = promptTemplate
    .replace("{{ideaTitle}}", context.ideaTitle)
    .replace("{{ideaDescription}}", context.ideaDescription)
    .replace("{{content}}", contentSection)
    .replace("{{template}}", context.templateSection)
    .replace("{{topics}}", context.topicsSection)
    .replace("{{characters}}", context.charactersSection)
    .replace("{{projectName}}", context.projectName)
    .replace("{{projectDescription}}", context.projectDescription);

  try {
    const completion = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const responseRaw = completion.choices[0]?.message?.content || "";
    const parsed: GeneratedAssetsResponse = JSON.parse(responseRaw);

    // Log the generation
    await supabase.from("generation_logs").insert({
      project_id: idea.project_id,
      type: "asset_generation",
      prompt_sent: prompt,
      response_raw: responseRaw,
      model: DEFAULT_MODEL,
      idea_id: ideaId,
    });

    const generatedAssets: GeneratedAsset[] = parsed.assets || [];

    if (generatedAssets.length === 0) {
      return { success: true, assets: [] };
    }

    // Filter to only production asset types
    const productionTypes: AssetType[] = ["a_roll", "b_roll_footage", "b_roll_image", "b_roll_screen_recording", "thumbnail"];
    const validAssets = generatedAssets.filter(a => productionTypes.includes(a.type));

    // Delete existing production assets (keep talking_points and script)
    const existingProductionAssetIds = (existingAssets || [])
      .filter(a => productionTypes.includes(a.type as AssetType))
      .map(a => a.id);
    
    if (existingProductionAssetIds.length > 0) {
      const { error: deleteError } = await supabase
        .from("idea_assets")
        .delete()
        .in("id", existingProductionAssetIds);
      
      if (deleteError) {
        console.error("Error deleting existing production assets:", deleteError);
        // Continue anyway - we'll still try to insert new assets
      }
    }

    // Get max sort_order from remaining assets (talking_points, script)
    const remainingAssets = (existingAssets || []).filter(a => !productionTypes.includes(a.type as AssetType));
    const maxSortOrder = Math.max(0, ...remainingAssets.map(a => a.sort_order));

    const assetsToInsert = validAssets.map((asset, index) => ({
      idea_id: ideaId,
      type: asset.type,
      is_complete: false,
      title: asset.title,
      instructions: asset.instructions || null,
      time_estimate_minutes: asset.time_estimate_minutes || null,
      is_ai_generatable: asset.is_ai_generatable ?? false,
      sort_order: maxSortOrder + 1 + index,
    }));

    const { data: insertedAssets, error: insertError } = await supabase
      .from("idea_assets")
      .insert(assetsToInsert)
      .select();

    if (insertError) {
      throw new Error(`Failed to save assets: ${insertError.message}`);
    }

    // Process reference images for each asset
    await processReferenceImages(
      supabase,
      validAssets,
      insertedAssets as IdeaAsset[],
      idea.project_id
    );

    await revalidateIdeaPaths(ideaId);
    return { success: true, assets: insertedAssets as IdeaAsset[] };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error generating production assets:", error);

    await supabase.from("generation_logs").insert({
      project_id: idea.project_id,
      type: "asset_generation",
      prompt_sent: prompt,
      response_raw: null,
      model: DEFAULT_MODEL,
      error: errorMessage,
      idea_id: ideaId,
    });

    return { success: false, error: errorMessage };
  }
}

// Delete a single asset
export async function deleteAsset(assetId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // First get the idea_id for revalidation
  const { data: asset, error: fetchError } = await supabase
    .from("idea_assets")
    .select("idea_id")
    .eq("id", assetId)
    .single();

  if (fetchError || !asset) {
    return { success: false, error: "Asset not found" };
  }

  const { error } = await supabase
    .from("idea_assets")
    .delete()
    .eq("id", assetId);

  if (error) {
    console.error("Error deleting asset:", error);
    return { success: false, error: error.message };
  }

  await revalidateIdeaPaths(asset.idea_id);
  return { success: true };
}

// Delete all assets for an idea (for regeneration)
export async function deleteIdeaAssets(ideaId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("idea_assets")
    .delete()
    .eq("idea_id", ideaId);

  if (error) {
    console.error("Error deleting assets:", error);
    return { success: false, error: error.message };
  }

  await revalidateIdeaPaths(ideaId);
  return { success: true };
}

// Helper to fetch image as base64 for Gemini multimodal input
async function fetchImageAsBase64(
  imageUrl: string
): Promise<{ data: string; mimeType: string } | null> {
  try {
    // Handle local seed images (they start with /seed/)
    if (imageUrl.startsWith("/seed/")) {
      const fs = await import("fs/promises");
      const pathModule = await import("path");
      const filePath = pathModule.join(process.cwd(), "public", imageUrl);
      const buffer = await fs.readFile(filePath);
      const base64 = buffer.toString("base64");
      const ext = imageUrl.split(".").pop()?.toLowerCase();
      const mimeType = ext === "png" ? "image/png" : "image/jpeg";
      return { data: base64, mimeType };
    }

    // Handle remote URLs
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.error(`Failed to fetch image: ${response.statusText}`);
      return null;
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    return { data: base64, mimeType: contentType };
  } catch (error) {
    console.error("Error fetching image:", error);
    return null;
  }
}

// Helper to extract a section from markdown-style instructions
function extractPromptSection(instructions: string | null, sectionName: string): string | null {
  if (!instructions) return null;
  
  const regex = new RegExp(`\\*\\*${sectionName}\\*\\*\\s*\\n([\\s\\S]*?)(?=\\n\\*\\*|$)`, "i");
  const match = instructions.match(regex);
  return match ? match[1].trim() : null;
}

// Generate an image for an asset using Nano Banana (Gemini 3 Pro Image Preview)
export async function generateAssetImage(
  assetId: string
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  const supabase = await createClient();

  // Fetch the asset with its idea and template orientation
  const { data: asset, error: fetchError } = await supabase
    .from("idea_assets")
    .select(`
      *,
      ideas!inner(
        id, 
        project_id, 
        projects(slug),
        project_templates(orientation)
      )
    `)
    .eq("id", assetId)
    .single();

  if (fetchError || !asset) {
    return { success: false, error: "Asset not found" };
  }

  // Only allow image generation for AI-generatable assets
  if (!asset.is_ai_generatable) {
    return { success: false, error: "This asset type does not support AI image generation" };
  }

  // Extract the Image Prompt from instructions
  const imagePrompt = extractPromptSection(asset.instructions, "Image Prompt");
  if (!imagePrompt) {
    return { success: false, error: "No Image Prompt found in asset instructions" };
  }

  // Get aspect ratio from template orientation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ideaData = asset.ideas as any;
  const orientation = ideaData?.project_templates?.orientation as "vertical" | "horizontal" | null;
  const aspectRatio = getAspectRatioFromOrientation(orientation);

  // Fetch reference images for this asset
  const { data: refImages } = await supabase
    .from("idea_asset_reference_images")
    .select(`
      *,
      project_images(*)
    `)
    .eq("idea_asset_id", assetId);

  const refImagesTyped = (refImages || []) as (IdeaAssetReferenceImage & { 
    project_images: ProjectImage | null 
  })[];

  // Build the prompt with context
  let promptText = `Generate an image based on this description:\n\n${imagePrompt}`;
  
  if (refImagesTyped.length > 0) {
    promptText += `\n\nI'm providing reference images to help guide the style and subject matter. Use these as visual reference for accuracy.`;
  }

  try {
    // Build the content parts for Gemini
    const contents: (string | { inlineData: { data: string; mimeType: string } })[] = [promptText];

    // Add reference images as multimodal input
    for (const refImg of refImagesTyped) {
      // Get the image URL (either from project_images or uploaded_url)
      const imgUrl = refImg.project_images?.image_url || refImg.uploaded_url;
      if (imgUrl) {
        const imageData = await fetchImageAsBase64(imgUrl);
        if (imageData) {
          contents.push({
            inlineData: {
              data: imageData.data,
              mimeType: imageData.mimeType,
            },
          });
        }
      }
    }

    // Call Gemini for image generation with aspect ratio from template
    const response = await genai.models.generateContent({
      model: IMAGE_MODEL,
      contents: contents,
      config: {
        responseModalities: ["image", "text"],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        imageConfig: { aspectRatio } as any,
      },
    });

    // Extract the generated image from the response
    let imageData: string | null = null;
    let imageMimeType: string = "image/png";

    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          imageData = part.inlineData.data || null;
          imageMimeType = part.inlineData.mimeType || "image/png";
          break;
        }
      }
    }

    if (!imageData) {
      console.error("No image generated in response:", response);
      return { success: false, error: "No image was generated" };
    }

    // Convert base64 to buffer for upload
    const imageBuffer = Buffer.from(imageData, "base64");
    const fileExt = imageMimeType === "image/png" ? "png" : "jpg";
    const idea = asset.ideas as { id: string; project_id: string; projects: { slug: string } | null };
    const fileName = `${idea.project_id}/${asset.idea_id}/${assetId}-${Date.now()}.${fileExt}`;

    // Upload to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from("asset-images")
      .upload(fileName, imageBuffer, {
        contentType: imageMimeType,
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.error("Error uploading image:", uploadError);
      return { success: false, error: `Failed to upload image: ${uploadError.message}` };
    }

    // Get the public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("asset-images").getPublicUrl(fileName);

    // Update the asset with the new image URL
    const { error: updateError } = await supabase
      .from("idea_assets")
      .update({ image_url: publicUrl, updated_at: new Date().toISOString() })
      .eq("id", assetId);

    if (updateError) {
      console.error("Error updating asset:", updateError);
      return { success: false, error: `Failed to update asset: ${updateError.message}` };
    }

    // Revalidate paths
    if (idea.projects?.slug) {
      revalidatePath(`/${idea.projects.slug}`);
      revalidatePath(`/${idea.projects.slug}/ideas/${asset.idea_id}`);
    }

    return { success: true, imageUrl: publicUrl };
  } catch (error) {
    console.error("Error generating asset image:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return { success: false, error: errorMessage };
  }
}

// Generate a video for an asset using Veo 3.1
// Note: Veo uses async operations with polling - this can take 1-3 minutes
export async function generateAssetVideo(
  assetId: string
): Promise<{ success: boolean; videoUrl?: string; error?: string }> {
  const supabase = await createClient();

  // Fetch the asset with template orientation
  const { data: asset, error: fetchError } = await supabase
    .from("idea_assets")
    .select(`
      *,
      ideas!inner(
        id, 
        project_id, 
        projects(slug),
        project_templates(orientation)
      )
    `)
    .eq("id", assetId)
    .single();

  if (fetchError || !asset) {
    return { success: false, error: "Asset not found" };
  }

  // Require an image to exist first (image-to-video workflow)
  if (!asset.image_url) {
    return { success: false, error: "Asset must have an image before generating video. Generate the image first." };
  }

  // Only allow for b_roll_footage type
  if (asset.type !== "b_roll_footage") {
    return { success: false, error: "Video generation is only supported for b_roll_footage assets" };
  }

  // Extract the Video Prompt from instructions
  const videoPrompt = extractPromptSection(asset.instructions, "Video Prompt");
  if (!videoPrompt) {
    return { success: false, error: "No Video Prompt found in asset instructions" };
  }

  // Get aspect ratio from template orientation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ideaData = asset.ideas as any;
  const orientation = ideaData?.project_templates?.orientation as "vertical" | "horizontal" | null;
  const aspectRatio = getAspectRatioFromOrientation(orientation);

  try {
    // Fetch the source image as base64
    const sourceImage = await fetchImageAsBase64(asset.image_url);
    if (!sourceImage) {
      return { success: false, error: "Failed to fetch source image for video generation" };
    }

    // Start the video generation operation using Veo 3.1
    // Veo uses an async operation model that requires polling
    let operation = await genai.models.generateVideos({
      model: VIDEO_MODEL,
      prompt: `Animate this image into a video. ${videoPrompt}`,
      image: {
        imageBytes: sourceImage.data,
        mimeType: sourceImage.mimeType,
      },
      config: {
        aspectRatio: aspectRatio as "16:9" | "9:16",
      },
    });

    // Poll the operation status until the video is ready
    // Veo typically takes 1-3 minutes to generate a video
    const maxAttempts = 30; // 5 minutes max (10 seconds * 30)
    let attempts = 0;

    while (!operation.done && attempts < maxAttempts) {
      console.log(`Video generation in progress... attempt ${attempts + 1}/${maxAttempts}`);
      await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10 seconds
      operation = await genai.operations.getVideosOperation({
        operation: operation,
      });
      attempts++;
    }

    if (!operation.done) {
      return { success: false, error: "Video generation timed out. Please try again." };
    }

    // Check if the operation was successful
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = operation as any;
    const videoUri = result.response?.generatedVideos?.[0]?.video?.uri;
    
    if (!videoUri) {
      console.error("No video URI in response:", operation);
      return { success: false, error: "No video was generated" };
    }

    // Download the video from the URI - requires API key for authentication
    const downloadUrl = new URL(videoUri);
    downloadUrl.searchParams.set('key', process.env.GEMINI_API_KEY || '');
    const videoResponse = await fetch(downloadUrl.toString());
    if (!videoResponse.ok) {
      return { success: false, error: `Failed to download video: ${videoResponse.statusText}` };
    }
    
    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
    
    const idea = asset.ideas as { id: string; project_id: string; projects: { slug: string } | null };
    const fileName = `${idea.project_id}/${asset.idea_id}/${assetId}-${Date.now()}.mp4`;

    // Upload to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from("asset-videos")
      .upload(fileName, videoBuffer, {
        contentType: "video/mp4",
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.error("Error uploading video:", uploadError);
      return { success: false, error: `Failed to upload video: ${uploadError.message}` };
    }

    // Get the public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("asset-videos").getPublicUrl(fileName);

    // Update the asset with the new video URL
    const { error: updateError } = await supabase
      .from("idea_assets")
      .update({ video_url: publicUrl, updated_at: new Date().toISOString() })
      .eq("id", assetId);

    if (updateError) {
      console.error("Error updating asset:", updateError);
      return { success: false, error: `Failed to update asset: ${updateError.message}` };
    }

    // Revalidate paths
    if (idea.projects?.slug) {
      revalidatePath(`/${idea.projects.slug}`);
      revalidatePath(`/${idea.projects.slug}/ideas/${asset.idea_id}`);
    }

    return { success: true, videoUrl: publicUrl };
  } catch (error) {
    console.error("Error generating asset video:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return { success: false, error: errorMessage };
  }
}

// ============================================
// Reference Image Management
// ============================================

// Link a reference image to a project image
export async function linkReferenceImage(
  referenceImageId: string,
  projectImageId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: refImage, error: fetchError } = await supabase
    .from("idea_asset_reference_images")
    .select("idea_asset_id, idea_assets(idea_id, ideas(project_id, projects(slug)))")
    .eq("id", referenceImageId)
    .single();

  if (fetchError || !refImage) {
    return { success: false, error: "Reference image not found" };
  }

  const { error } = await supabase
    .from("idea_asset_reference_images")
    .update({
      project_image_id: projectImageId,
      uploaded_url: null, // Clear any uploaded URL when linking to project image
      updated_at: new Date().toISOString(),
    })
    .eq("id", referenceImageId);

  if (error) {
    console.error("Error linking reference image:", error);
    return { success: false, error: error.message };
  }

  // Revalidate paths
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const asset = refImage.idea_assets as any;
  if (asset?.ideas?.projects?.slug) {
    revalidatePath(`/${asset.ideas.projects.slug}`);
    revalidatePath(`/${asset.ideas.projects.slug}/ideas/${asset.idea_id}`);
  }

  return { success: true };
}

// Unlink a reference image (clear both project_image_id and uploaded_url)
export async function unlinkReferenceImage(
  referenceImageId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: refImage, error: fetchError } = await supabase
    .from("idea_asset_reference_images")
    .select("idea_asset_id, idea_assets(idea_id, ideas(project_id, projects(slug)))")
    .eq("id", referenceImageId)
    .single();

  if (fetchError || !refImage) {
    return { success: false, error: "Reference image not found" };
  }

  const { error } = await supabase
    .from("idea_asset_reference_images")
    .update({
      project_image_id: null,
      uploaded_url: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", referenceImageId);

  if (error) {
    console.error("Error unlinking reference image:", error);
    return { success: false, error: error.message };
  }

  // Revalidate paths
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const asset = refImage.idea_assets as any;
  if (asset?.ideas?.projects?.slug) {
    revalidatePath(`/${asset.ideas.projects.slug}`);
    revalidatePath(`/${asset.ideas.projects.slug}/ideas/${asset.idea_id}`);
  }

  return { success: true };
}

// Delete a reference image entirely
export async function deleteReferenceImage(
  referenceImageId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: refImage, error: fetchError } = await supabase
    .from("idea_asset_reference_images")
    .select("idea_asset_id, idea_assets(idea_id, ideas(project_id, projects(slug)))")
    .eq("id", referenceImageId)
    .single();

  if (fetchError || !refImage) {
    return { success: false, error: "Reference image not found" };
  }

  const { error } = await supabase
    .from("idea_asset_reference_images")
    .delete()
    .eq("id", referenceImageId);

  if (error) {
    console.error("Error deleting reference image:", error);
    return { success: false, error: error.message };
  }

  // Revalidate paths
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const asset = refImage.idea_assets as any;
  if (asset?.ideas?.projects?.slug) {
    revalidatePath(`/${asset.ideas.projects.slug}`);
    revalidatePath(`/${asset.ideas.projects.slug}/ideas/${asset.idea_id}`);
  }

  return { success: true };
}

// Upload an image file for a reference image
export async function uploadReferenceImage(
  referenceImageId: string,
  formData: FormData
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  const supabase = await createClient();

  const file = formData.get("file") as File;
  if (!file) {
    return { success: false, error: "No file provided" };
  }

  const { data: refImage, error: fetchError } = await supabase
    .from("idea_asset_reference_images")
    .select("idea_asset_id, idea_assets(idea_id, ideas(project_id, projects(slug)))")
    .eq("id", referenceImageId)
    .single();

  if (fetchError || !refImage) {
    return { success: false, error: "Reference image not found" };
  }

  // Upload to storage
  const fileExt = file.name.split(".").pop();
  const fileName = `${referenceImageId}-${Date.now()}.${fileExt}`;
  const filePath = `reference-images/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("asset-images")
    .upload(filePath, file, { contentType: file.type });

  if (uploadError) {
    console.error("Error uploading reference image:", uploadError);
    return { success: false, error: uploadError.message };
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from("asset-images")
    .getPublicUrl(filePath);

  // Update reference image with uploaded URL
  const { error: updateError } = await supabase
    .from("idea_asset_reference_images")
    .update({
      uploaded_url: publicUrl,
      project_image_id: null, // Clear project image link when uploading
      updated_at: new Date().toISOString(),
    })
    .eq("id", referenceImageId);

  if (updateError) {
    console.error("Error updating reference image:", updateError);
    return { success: false, error: updateError.message };
  }

  // Revalidate paths
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const asset = refImage.idea_assets as any;
  if (asset?.ideas?.projects?.slug) {
    revalidatePath(`/${asset.ideas.projects.slug}`);
    revalidatePath(`/${asset.ideas.projects.slug}/ideas/${asset.idea_id}`);
  }

  return { success: true, imageUrl: publicUrl };
}

// Add a new reference image to an asset
export async function addReferenceImage(
  assetId: string,
  description: string,
  projectImageId?: string
): Promise<{ success: boolean; referenceImage?: IdeaAssetReferenceImage; error?: string }> {
  const supabase = await createClient();

  const { data: asset, error: fetchError } = await supabase
    .from("idea_assets")
    .select("idea_id, ideas(project_id, projects(slug))")
    .eq("id", assetId)
    .single();

  if (fetchError || !asset) {
    return { success: false, error: "Asset not found" };
  }

  const { data: refImage, error: insertError } = await supabase
    .from("idea_asset_reference_images")
    .insert({
      idea_asset_id: assetId,
      description,
      project_image_id: projectImageId || null,
      uploaded_url: null,
    })
    .select(`*, project_images(*)`)
    .single();

  if (insertError) {
    console.error("Error adding reference image:", insertError);
    return { success: false, error: insertError.message };
  }

  // Revalidate paths
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const idea = asset.ideas as any;
  if (idea?.projects?.slug) {
    revalidatePath(`/${idea.projects.slug}`);
    revalidatePath(`/${idea.projects.slug}/ideas/${asset.idea_id}`);
  }

  // Transform to match expected type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transformed: IdeaAssetReferenceImage = {
    ...(refImage as any),
    project_image: (refImage as any).project_images || undefined,
  };

  return { success: true, referenceImage: transformed };
}

