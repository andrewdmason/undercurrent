"use server";

import { createClient } from "@/lib/supabase/server";
import { openai, DEFAULT_MODEL } from "@/lib/openai";
import { revalidatePath } from "next/cache";
import { readFile } from "fs/promises";
import path from "path";
import { IdeaAsset, AssetStatus, GeneratedAsset, AssetType } from "@/lib/types";

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

// Update asset status
export async function updateAssetStatus(
  assetId: string,
  status: AssetStatus
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
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", assetId);

  if (error) {
    console.error("Error updating asset status:", error);
    return { success: false, error: error.message };
  }

  await revalidateIdeaPaths(asset.idea_id);
  return { success: true };
}

// Update asset content (for text-based assets like script, talking points)
export async function updateAssetContent(
  assetId: string,
  contentText?: string | null,
  contentUrl?: string | null
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
  if (contentUrl !== undefined) {
    updateData.content_url = contentUrl;
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
        description
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

  const template = idea.project_templates as { name: string; description: string | null } | null;

  const charactersSection = characters.length > 0
    ? characters.map((c) => `- **${c.name}**: ${c.description || "No description"}`).join("\n")
    : "No specific characters assigned.";

  const topicsSection = topics.length > 0
    ? topics.map((t) => `- **${t.name}**: ${t.description || ""}`).join("\n")
    : "No specific topics.";

  const templateSection = template
    ? `**Template:** ${template.name}\n${template.description || ""}`
    : "No specific template assigned.";

  return {
    characters,
    topics,
    template,
    charactersSection,
    topicsSection,
    templateSection,
    ideaTitle: idea.title || "Untitled",
    ideaDescription: idea.description || "No description",
    projectName: project.name || "Unnamed Project",
    projectDescription: project.description || "No description provided.",
  };
}

// Generate talking points for an idea (first step in the workflow)
export async function generateTalkingPoints(
  ideaId: string
): Promise<{ success: boolean; asset?: IdeaAsset; needsInput?: boolean; questions?: string[]; error?: string }> {
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

  const prompt = promptTemplate
    .replace("{{ideaTitle}}", context.ideaTitle)
    .replace("{{ideaDescription}}", context.ideaDescription)
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

    // Check if AI needs more input from user
    if (parsed.needs_input && parsed.questions?.length > 0) {
      // Create a talking_points asset with pending status and store questions
      const { data: asset, error: insertError } = await supabase
        .from("idea_assets")
        .insert({
          idea_id: ideaId,
          type: "talking_points",
          status: "pending",
          title: "Talking Points",
          instructions: JSON.stringify(parsed.questions),
          is_ai_generatable: true,
          sort_order: 0,
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed to save asset: ${insertError.message}`);
      }

      await revalidateIdeaPaths(ideaId);
      return { 
        success: true, 
        asset: asset as IdeaAsset, 
        needsInput: true, 
        questions: parsed.questions 
      };
    }

    // AI generated the talking points directly
    const { data: asset, error: insertError } = await supabase
      .from("idea_assets")
      .insert({
        idea_id: ideaId,
        type: "talking_points",
        status: "ready",
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
  ideaId: string
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

  const prompt = promptTemplate
    .replace("{{ideaTitle}}", context.ideaTitle)
    .replace("{{ideaDescription}}", context.ideaDescription)
    .replace("{{talkingPoints}}", talkingPointsAsset.content_text)
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

    // Get max sort_order
    const { data: existingAssets } = await supabase
      .from("idea_assets")
      .select("sort_order")
      .eq("idea_id", ideaId);
    const maxSortOrder = Math.max(0, ...(existingAssets || []).map(a => a.sort_order));

    // Create the script asset
    const { data: asset, error: insertError } = await supabase
      .from("idea_assets")
      .insert({
        idea_id: ideaId,
        type: "script",
        status: "ready",
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

// Generate production assets (a_roll, b_roll, thumbnail) based on talking points/script
export async function generateProductionAssets(
  ideaId: string
): Promise<{ success: boolean; assets?: IdeaAsset[]; error?: string }> {
  const supabase = await createClient();

  // Get existing assets to use as context
  const { data: existingAssets } = await supabase
    .from("idea_assets")
    .select("*")
    .eq("idea_id", ideaId);

  const talkingPoints = existingAssets?.find(a => a.type === "talking_points");
  const script = existingAssets?.find(a => a.type === "script");

  // Need at least talking points to generate production assets
  if (!talkingPoints?.content_text) {
    return { success: false, error: "Talking points must be completed before generating production assets" };
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
    : `**Talking Points:**\n\n${talkingPoints.content_text}`;

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
    const parsed = JSON.parse(responseRaw);

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

    // Get max sort_order
    const maxSortOrder = Math.max(0, ...(existingAssets || []).map(a => a.sort_order));

    // Filter to only production asset types
    const productionTypes: AssetType[] = ["a_roll", "b_roll_footage", "b_roll_screen_recording", "thumbnail"];
    const validAssets = generatedAssets.filter(a => productionTypes.includes(a.type));

    const assetsToInsert = validAssets.map((asset, index) => ({
      idea_id: ideaId,
      type: asset.type,
      status: "pending" as AssetStatus,
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
