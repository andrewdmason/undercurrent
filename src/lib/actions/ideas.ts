"use server";

import { createClient } from "@/lib/supabase/server";
import { openai, DEFAULT_MODEL } from "@/lib/openai";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { generateThumbnail } from "./thumbnail";
import { generateTalkingPoints } from "./idea-assets";
import { RecordingStyle } from "@/lib/types";

interface GeneratedIdea {
  title: string;
  description: string;
  channels?: string[];
  templateId?: string;
  characterIds?: string[];
  topicIds?: string[];
}

// Helper to get project slug and revalidate paths
async function revalidateProjectPaths(projectId: string) {
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("slug")
    .eq("id", projectId)
    .single();

  if (project?.slug) {
    revalidatePath(`/${project.slug}`);
    revalidatePath(`/${project.slug}/create`);
    revalidatePath(`/${project.slug}/published`);
  }
  return project?.slug;
}

// Accept an idea - set accepted_at timestamp (enters production pipeline)
export async function acceptIdea(ideaId: string) {
  const supabase = await createClient();

  // Get idea to find project_id
  const { data: idea } = await supabase
    .from("ideas")
    .select("project_id")
    .eq("id", ideaId)
    .single();

  if (!idea) {
    return { error: "Idea not found" };
  }

  const { error } = await supabase
    .from("ideas")
    .update({ 
      accepted_at: new Date().toISOString(),
      reject_reason: null, // Clear any previous rejection
    })
    .eq("id", ideaId);

  if (error) {
    console.error("Error accepting idea:", error);
    return { error: error.message };
  }

  await revalidateProjectPaths(idea.project_id);
  return { success: true };
}

// Reject an idea with optional reason
export async function rejectIdea(ideaId: string, reason?: string) {
  const supabase = await createClient();

  // Get idea to find project_id
  const { data: idea } = await supabase
    .from("ideas")
    .select("project_id")
    .eq("id", ideaId)
    .single();

  if (!idea) {
    return { error: "Idea not found" };
  }

  // Set reject_reason - status is calculated from this
  const { error } = await supabase
    .from("ideas")
    .update({ 
      reject_reason: reason || "Rejected",
    })
    .eq("id", ideaId);

  if (error) {
    console.error("Error rejecting idea:", error);
    return { error: error.message };
  }

  await revalidateProjectPaths(idea.project_id);
  return { success: true };
}

// Undo reject - clear reject_reason to return idea to inbox
export async function undoRejectIdea(ideaId: string) {
  const supabase = await createClient();

  // Get idea to find project_id and check if rejected
  const { data: idea } = await supabase
    .from("ideas")
    .select("project_id, reject_reason, accepted_at")
    .eq("id", ideaId)
    .single();

  if (!idea) {
    return { error: "Idea not found" };
  }

  // Can only undo reject if not accepted (rejected = has reject_reason but no accepted_at)
  if (!idea.reject_reason || idea.accepted_at) {
    return { error: "Idea is not rejected" };
  }

  const { error } = await supabase
    .from("ideas")
    .update({ 
      reject_reason: null,
    })
    .eq("id", ideaId);

  if (error) {
    console.error("Error undoing reject:", error);
    return { error: error.message };
  }

  await revalidateProjectPaths(idea.project_id);
  return { success: true };
}

// Undo accept - clear accepted_at to return idea to inbox
export async function undoAcceptIdea(ideaId: string) {
  const supabase = await createClient();

  // Get idea to find project_id and check if accepted
  const { data: idea } = await supabase
    .from("ideas")
    .select("project_id, accepted_at, published_at")
    .eq("id", ideaId)
    .single();

  if (!idea) {
    return { error: "Idea not found" };
  }

  // Can only undo accept if accepted but not published
  if (!idea.accepted_at) {
    return { error: "Idea is not in a production stage" };
  }

  if (idea.published_at) {
    return { error: "Cannot undo accept for published ideas" };
  }

  const { error } = await supabase
    .from("ideas")
    .update({ accepted_at: null })
    .eq("id", ideaId);

  if (error) {
    console.error("Error undoing accept:", error);
    return { error: error.message };
  }

  await revalidateProjectPaths(idea.project_id);
  return { success: true };
}

// Cancel an idea from the production queue
export async function cancelIdea(ideaId: string) {
  const supabase = await createClient();

  // Get idea to find project_id
  const { data: idea } = await supabase
    .from("ideas")
    .select("project_id")
    .eq("id", ideaId)
    .single();

  if (!idea) {
    return { error: "Idea not found" };
  }

  const { error } = await supabase
    .from("ideas")
    .update({ canceled_at: new Date().toISOString() })
    .eq("id", ideaId);

  if (error) {
    console.error("Error canceling idea:", error);
    return { error: error.message };
  }

  await revalidateProjectPaths(idea.project_id);
  return { success: true };
}

// Delete an idea permanently
export async function deleteIdea(ideaId: string) {
  const supabase = await createClient();

  // Get idea to find project_id
  const { data: idea } = await supabase
    .from("ideas")
    .select("project_id")
    .eq("id", ideaId)
    .single();

  if (!idea) {
    return { error: "Idea not found" };
  }

  // Delete related records first (cascade should handle this, but being explicit)
  await supabase.from("idea_channels").delete().eq("idea_id", ideaId);
  await supabase.from("idea_characters").delete().eq("idea_id", ideaId);
  await supabase.from("idea_topics").delete().eq("idea_id", ideaId);
  await supabase.from("idea_assets").delete().eq("idea_id", ideaId);

  // Delete the idea
  const { error } = await supabase
    .from("ideas")
    .delete()
    .eq("id", ideaId);

  if (error) {
    console.error("Error deleting idea:", error);
    return { error: error.message };
  }

  await revalidateProjectPaths(idea.project_id);
  return { success: true };
}

// Publish an idea with video URLs for each channel
export async function publishIdea(
  ideaId: string, 
  channelUrls: Array<{ channelId: string; videoUrl: string | null }>
) {
  const supabase = await createClient();

  // Get idea to find project_id
  const { data: idea } = await supabase
    .from("ideas")
    .select("project_id")
    .eq("id", ideaId)
    .single();

  if (!idea) {
    return { error: "Idea not found" };
  }

  // Set published_at timestamp
  const { error: statusError } = await supabase
    .from("ideas")
    .update({ published_at: new Date().toISOString() })
    .eq("id", ideaId);

  if (statusError) {
    console.error("Error publishing idea:", statusError);
    return { error: statusError.message };
  }

  // Update video URLs for each channel
  for (const { channelId, videoUrl } of channelUrls) {
    if (videoUrl) {
      const { error: urlError } = await supabase
        .from("idea_channels")
        .update({ video_url: videoUrl })
        .eq("idea_id", ideaId)
        .eq("channel_id", channelId);

      if (urlError) {
        console.error("Error updating channel URL:", urlError);
        // Continue with other channels even if one fails
      }
    }
  }

  await revalidateProjectPaths(idea.project_id);
  return { success: true };
}

// Options for filtering idea generation
export interface GenerateIdeasOptions {
  count?: number;           // default 5
  characterIds?: string[];  // filter to these, or undefined for all
  channelIds?: string[];    // filter to these, or undefined for all
  templateId?: string;      // filter to this, or undefined for all
  topicId?: string;         // filter to this, or undefined for all
  customInstructions?: string;
}

export async function generateIdeas(projectId: string, options: GenerateIdeasOptions = {}) {
  const supabase = await createClient();
  
  const {
    count = 5,
    characterIds,
    channelIds,
    templateId,
    topicId,
    customInstructions,
  } = options;

  // Fetch project profile
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    console.error("Error fetching project:", projectError);
    return { error: "Project not found" };
  }

  // Fetch project characters (with IDs for AI to reference)
  // If characterIds filter provided, only fetch those specific characters
  let charactersQuery = supabase
    .from("project_characters")
    .select("id, name, description")
    .eq("project_id", projectId);
  
  if (characterIds && characterIds.length > 0) {
    charactersQuery = charactersQuery.in("id", characterIds);
  }
  
  const { data: characters } = await charactersQuery;

  // Fetch distribution channels
  // If channelIds filter provided, only fetch those specific channels
  let channelsQuery = supabase
    .from("project_channels")
    .select("id, platform, custom_label, goal_count, goal_cadence, notes")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  
  if (channelIds && channelIds.length > 0) {
    channelsQuery = channelsQuery.in("id", channelIds);
  }
  
  const { data: channels } = await channelsQuery;

  // Fetch topics (both included and excluded, with IDs for AI to reference)
  // If topicId filter provided, only fetch that specific topic (for included)
  const { data: allTopics } = await supabase
    .from("project_topics")
    .select("id, name, description, is_excluded")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  let includedTopics = allTopics?.filter((t) => !t.is_excluded) || [];
  const excludedTopics = allTopics?.filter((t) => t.is_excluded) || [];
  
  // Filter to specific topic if provided
  if (topicId) {
    includedTopics = includedTopics.filter((t) => t.id === topicId);
  }

  // Fetch templates with their channel associations
  // If templateId filter provided, only fetch that specific template
  let templatesQuery = supabase
    .from("project_templates")
    .select(`
      id,
      name,
      description,
      template_channels (
        project_channels (
          platform,
          custom_label
        )
      )
    `)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  
  if (templateId) {
    templatesQuery = templatesQuery.eq("id", templateId);
  }
  
  const { data: templates } = await templatesQuery;

  // Fetch last 20 ideas for context (include rejected ones with reasons for learning)
  const { data: pastIdeas } = await supabase
    .from("ideas")
    .select("title, accepted_at, published_at, reject_reason")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(20);

  // Build the prompt from template
  const promptTemplate = await readFile(
    path.join(process.cwd(), "prompts", "generate-ideas.md"),
    "utf-8"
  );

  // Format characters section (with IDs for AI to reference)
  const charactersSection =
    characters && characters.length > 0
      ? characters
          .map((c) => `- **${c.name}** (id: "${c.id}"): ${c.description || "No description"}`)
          .join("\n")
      : "No character profiles configured.";

  // Format topics section (included topics, with IDs for AI to reference)
  const topicsSection =
    includedTopics.length > 0
      ? includedTopics
          .map((t) => {
            let line = `- **${t.name}** (id: "${t.id}")`;
            if (t.description) {
              line += `: ${t.description}`;
            }
            return line;
          })
          .join("\n")
      : "No topics configured.";

  // Format excluded topics section
  const excludedTopicsSection =
    excludedTopics.length > 0
      ? excludedTopics
          .map((t) => {
            let line = `- **${t.name}**`;
            if (t.description) {
              line += `: ${t.description}`;
            }
            return line;
          })
          .join("\n")
      : "No excluded topics.";

  // Format distribution channels section
  const channelsSection =
    channels && channels.length > 0
      ? channels
          .map((c) => {
            const name = c.platform === "custom" && c.custom_label 
              ? c.custom_label 
              : c.platform;
            let line = `- **${name}** (platform: "${c.platform}")`;
            if (c.goal_count && c.goal_cadence) {
              line += ` - Goal: ${c.goal_count}/${c.goal_cadence === "weekly" ? "week" : "month"}`;
            }
            if (c.notes) {
              line += `\n  Strategy: ${c.notes}`;
            }
            return line;
          })
          .join("\n")
      : "No distribution channels configured.";

  // Format past ideas section - using timestamps to determine status
  const pastIdeasSection =
    pastIdeas && pastIdeas.length > 0
      ? pastIdeas
          .map((idea) => {
            let line = `- "${idea.title}"`;
            // Check if accepted (in production pipeline or published)
            if (idea.accepted_at) {
              if (idea.published_at) {
                line += " [✓ published]";
              } else {
                line += " [✓ accepted]";
              }
            } else if (idea.reject_reason) {
              line += " [✗ rejected]";
              line += ` "${idea.reject_reason}"`;
            }
            return line;
          })
          .join("\n")
      : "No previous ideas generated yet.";

  // Format templates section
  const templatesSection =
    templates && templates.length > 0
      ? templates
          .map((t) => {
            // template_channels is an array of junction records, each with a nested channel object
            const templateChannels = (t.template_channels || [])
              .map((tc: unknown) => {
                const tcRecord = tc as { project_channels: { platform: string; custom_label: string | null } | null };
                const channel = tcRecord.project_channels;
                return channel ? (channel.custom_label || channel.platform) : null;
              })
              .filter(Boolean);
            
            let line = `- **${t.name}** (id: "${t.id}")`;
            if (t.description) {
              line += `\n  Style: ${t.description}`;
            }
            if (templateChannels.length > 0) {
              line += `\n  Best for: ${templateChannels.join(", ")}`;
            }
            return line;
          })
          .join("\n")
      : "No video templates configured.";

  // Build the final prompt
  let prompt = promptTemplate
    .replace(/\{\{ideaCount\}\}/g, count.toString())
    .replace("{{projectName}}", project.name || "Unnamed Project")
    .replace(
      "{{projectDescription}}",
      project.description || "No description provided."
    )
    .replace(
      "{{projectObjectives}}",
      project.business_objectives || "No business objectives defined yet."
    )
    .replace("{{topics}}", topicsSection)
    .replace("{{excludedTopics}}", excludedTopicsSection)
    .replace("{{characters}}", charactersSection)
    .replace("{{distributionChannels}}", channelsSection)
    .replace("{{templates}}", templatesSection)
    .replace("{{pastIdeas}}", pastIdeasSection);

  // Append filtering context - tell the AI whether to use ALL items or pick freely
  const filteringInstructions: string[] = [];
  
  if (characterIds && characterIds.length > 0) {
    filteringInstructions.push(`**Characters:** The user specifically selected ${characters?.length === 1 ? 'this character' : 'these characters'}. Every idea MUST feature ALL of them together.`);
  } else {
    filteringInstructions.push(`**Characters:** Pick freely from the available characters. Vary which characters appear across ideas for diversity.`);
  }
  
  if (channelIds && channelIds.length > 0) {
    filteringInstructions.push(`**Channels:** The user specifically selected ${channels?.length === 1 ? 'this channel' : 'these channels'}. Every idea MUST target ALL of them.`);
  } else {
    filteringInstructions.push(`**Channels:** Pick appropriate channels for each idea. Vary channel assignments across ideas.`);
  }
  
  if (templateId) {
    filteringInstructions.push(`**Template:** The user specifically selected this template. Every idea MUST use it.`);
  } else {
    filteringInstructions.push(`**Template:** Pick the best-fitting template for each idea. Vary templates across ideas for production diversity.`);
  }
  
  if (topicId) {
    filteringInstructions.push(`**Topic:** The user specifically selected this topic. Every idea MUST cover it.`);
  } else {
    filteringInstructions.push(`**Topics:** Pick relevant topics for each idea. An idea can cover multiple topics or none if it doesn't fit.`);
  }
  
  prompt += `\n\n## Selection Mode\n\n${filteringInstructions.join('\n\n')}`;

  // Append custom instructions if provided
  if (customInstructions) {
    prompt += `\n\n## Additional Instructions\n\n${customInstructions}`;
  }

  // Build a map of platform values to channel IDs for linking
  const channelIdMap = new Map<string, string>();
  if (channels) {
    for (const c of channels) {
      channelIdMap.set(c.platform, c.id);
    }
  }

  // Generate a batch ID for this generation
  const batchId = crypto.randomUUID();
  let responseRaw = "";
  let generatedIdeas: GeneratedIdea[] = [];
  let errorMessage: string | null = null;

  try {
    // Call ChatGPT 5.1
    const completion = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
    });

    responseRaw = completion.choices[0]?.message?.content || "";

    // Parse the response - handle various wrapper formats the AI might use
    const parsed = JSON.parse(responseRaw);
    
    // Check if the AI returned an error message (e.g., asking for clarification)
    if (parsed.error && typeof parsed.error === "string") {
      throw new Error(`AI needs clarification: ${parsed.error}`);
    }
    
    // Try to find the ideas array in various possible locations
    if (Array.isArray(parsed)) {
      generatedIdeas = parsed;
    } else if (Array.isArray(parsed.ideas)) {
      generatedIdeas = parsed.ideas;
    } else if (Array.isArray(parsed.video_ideas)) {
      generatedIdeas = parsed.video_ideas;
    } else if (Array.isArray(parsed.videoIdeas)) {
      generatedIdeas = parsed.videoIdeas;
    } else if (Array.isArray(parsed.videos)) {
      generatedIdeas = parsed.videos;
    } else if (parsed.title && parsed.description) {
      // Handle single idea object (e.g., when user asks for "just one idea")
      generatedIdeas = [parsed];
    } else {
      // Log what we actually got for debugging
      console.error("Unexpected response structure:", JSON.stringify(parsed, null, 2).slice(0, 500));
      throw new Error(`Invalid response format: got keys [${Object.keys(parsed).join(", ")}]`);
    }

    if (generatedIdeas.length === 0) {
      throw new Error("No ideas were generated");
    }

    // Insert the generated ideas (status defaults to 'new')
    // Note: script and prompt are generated separately on-demand
    // Build a set of valid template IDs for validation
    const validTemplateIds = new Set(templates?.map((t) => t.id) || []);
    
    const ideasToInsert = generatedIdeas.map((idea) => ({
      project_id: projectId,
      title: idea.title,
      description: idea.description,
      generation_batch_id: batchId,
      // Only set template_id if it's a valid template for this project
      template_id: idea.templateId && validTemplateIds.has(idea.templateId) ? idea.templateId : null,
    }));

    const { data: insertedIdeas, error: insertError } = await supabase
      .from("ideas")
      .insert(ideasToInsert)
      .select("id");

    if (insertError) {
      throw new Error(`Failed to save ideas: ${insertError.message}`);
    }

    // Insert idea-channel relationships
    const ideaChannelLinks: Array<{ idea_id: string; channel_id: string }> = [];
    if (insertedIdeas && channels && channels.length > 0) {
      insertedIdeas.forEach((insertedIdea, index) => {
        const generatedIdea = generatedIdeas[index];
        if (generatedIdea.channels && Array.isArray(generatedIdea.channels)) {
          for (const platformValue of generatedIdea.channels) {
            const channelId = channelIdMap.get(platformValue);
            if (channelId) {
              ideaChannelLinks.push({
                idea_id: insertedIdea.id,
                channel_id: channelId,
              });
            }
          }
        }
      });

      if (ideaChannelLinks.length > 0) {
        const { error: channelLinkError } = await supabase
          .from("idea_channels")
          .insert(ideaChannelLinks);

        if (channelLinkError) {
          console.error("Error linking ideas to channels:", channelLinkError);
          // Don't fail the whole operation, just log it
        }
      }
    }

    // Insert idea-character relationships
    const validCharacterIds = new Set(characters?.map((c) => c.id) || []);
    const ideaCharacterLinks: Array<{ idea_id: string; character_id: string }> = [];
    if (insertedIdeas && characters && characters.length > 0) {
      insertedIdeas.forEach((insertedIdea, index) => {
        const generatedIdea = generatedIdeas[index];
        if (generatedIdea.characterIds && Array.isArray(generatedIdea.characterIds)) {
          for (const characterId of generatedIdea.characterIds) {
            // Only link if it's a valid character for this project
            if (validCharacterIds.has(characterId)) {
              ideaCharacterLinks.push({
                idea_id: insertedIdea.id,
                character_id: characterId,
              });
            }
          }
        }
      });

      if (ideaCharacterLinks.length > 0) {
        const { error: characterLinkError } = await supabase
          .from("idea_characters")
          .insert(ideaCharacterLinks);

        if (characterLinkError) {
          console.error("Error linking ideas to characters:", characterLinkError);
          // Don't fail the whole operation, just log it
        }
      }
    }

    // Insert idea-topic relationships
    const validTopicIds = new Set(includedTopics?.map((t) => t.id) || []);
    const ideaTopicLinks: Array<{ idea_id: string; topic_id: string }> = [];
    if (insertedIdeas && includedTopics && includedTopics.length > 0) {
      insertedIdeas.forEach((insertedIdea, index) => {
        const generatedIdea = generatedIdeas[index];
        if (generatedIdea.topicIds && Array.isArray(generatedIdea.topicIds)) {
          for (const topicId of generatedIdea.topicIds) {
            // Only link if it's a valid included topic for this project
            if (validTopicIds.has(topicId)) {
              ideaTopicLinks.push({
                idea_id: insertedIdea.id,
                topic_id: topicId,
              });
            }
          }
        }
      });

      if (ideaTopicLinks.length > 0) {
        const { error: topicLinkError } = await supabase
          .from("idea_topics")
          .insert(ideaTopicLinks);

        if (topicLinkError) {
          console.error("Error linking ideas to topics:", topicLinkError);
          // Don't fail the whole operation, just log it
        }
      }
    }

    // Log the generation
    const ideaIds = insertedIdeas?.map((i) => i.id) || [];
    await supabase.from("generation_logs").insert({
      project_id: projectId,
      type: "idea_generation",
      prompt_sent: prompt,
      response_raw: responseRaw,
      ideas_created: ideaIds,
      model: DEFAULT_MODEL,
    });

    // Use after() to generate thumbnails and talking points in the background
    // This keeps the serverless function alive until background tasks complete
    after(async () => {
      await Promise.all(
        (insertedIdeas || []).map(async (insertedIdea) => {
          // Generate thumbnail and talking points in parallel for each idea
          await Promise.all([
            generateThumbnail(insertedIdea.id, projectId).catch(err => {
              console.error(`Failed to generate thumbnail for idea ${insertedIdea.id}:`, err);
            }),
            generateTalkingPoints(insertedIdea.id).catch(err => {
              console.error(`Failed to generate talking points for idea ${insertedIdea.id}:`, err);
            }),
          ]);
        })
      );
    });

    await revalidateProjectPaths(projectId);

    // Build ideas array with id and title for UI display
    const ideasWithTitles = insertedIdeas?.map((inserted, index) => ({
      id: inserted.id,
      title: generatedIdeas[index]?.title || "Untitled",
    })) || [];

    return { success: true, count: generatedIdeas.length, ideaIds, ideas: ideasWithTitles };
  } catch (error) {
    errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error generating ideas:", error);

    // Log the failed generation
    await supabase.from("generation_logs").insert({
      project_id: projectId,
      type: "idea_generation",
      prompt_sent: prompt,
      response_raw: responseRaw || null,
      ideas_created: null,
      model: DEFAULT_MODEL,
      error: errorMessage,
    });

    return { error: errorMessage };
  }
}

// Options for remixing an idea
export interface RemixIdeaOptions {
  characterIds?: string[];  // new characters, or undefined to keep original
  channelIds?: string[];    // new channels, or undefined to keep original
  templateId?: string | null;      // new template, or undefined to keep original
  topicId?: string | null;         // new topic, or undefined to keep original
  customInstructions?: string;
  saveAsCopy?: boolean;     // if true, create new idea; if false, update in place
}

// Remix an existing idea with new parameters
export async function remixIdea(ideaId: string, options: RemixIdeaOptions = {}) {
  const supabase = await createClient();

  const {
    characterIds,
    channelIds,
    templateId,
    topicId,
    customInstructions,
    saveAsCopy = false,
  } = options;

  // Fetch the original idea with all its relationships
  const { data: originalIdea, error: ideaError } = await supabase
    .from("ideas")
    .select(`
      id,
      title,
      description,
      accepted_at,
      project_id,
      template_id,
      idea_channels (
        channel_id,
        project_channels (
          id,
          platform,
          custom_label
        )
      ),
      idea_characters (
        character_id,
        project_characters (
          id,
          name,
          description
        )
      ),
      idea_topics (
        topic_id,
        project_topics (
          id,
          name,
          description
        )
      ),
      project_templates (
        id,
        name,
        description
      )
    `)
    .eq("id", ideaId)
    .single();

  if (ideaError || !originalIdea) {
    console.error("Error fetching idea:", ideaError);
    return { error: "Idea not found" };
  }

  const projectId = originalIdea.project_id;

  // Fetch project profile
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("name, description")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    console.error("Error fetching project:", projectError);
    return { error: "Project not found" };
  }

  // Determine which characters to use (user selection or original)
  const originalCharacterIds = (originalIdea.idea_characters as unknown as Array<{
    character_id: string;
    project_characters: { id: string; name: string; description: string | null } | null;
  }> || [])
    .map(ic => ic.character_id)
    .filter(Boolean);
  
  const targetCharacterIds = characterIds !== undefined ? characterIds : originalCharacterIds;

  // Fetch characters (either selected ones or all for context)
  let charactersQuery = supabase
    .from("project_characters")
    .select("id, name, description")
    .eq("project_id", projectId);
  
  if (targetCharacterIds.length > 0) {
    charactersQuery = charactersQuery.in("id", targetCharacterIds);
  }
  
  const { data: characters } = await charactersQuery;

  // Determine which channels to use (user selection or original)
  const originalChannelIds = (originalIdea.idea_channels as unknown as Array<{
    channel_id: string;
    project_channels: { id: string; platform: string; custom_label: string | null } | null;
  }> || [])
    .map(ic => ic.channel_id)
    .filter(Boolean);
  
  const targetChannelIds = channelIds !== undefined ? channelIds : originalChannelIds;

  // Fetch channels
  let channelsQuery = supabase
    .from("project_channels")
    .select("id, platform, custom_label")
    .eq("project_id", projectId);
  
  if (targetChannelIds.length > 0) {
    channelsQuery = channelsQuery.in("id", targetChannelIds);
  }
  
  const { data: channels } = await channelsQuery;

  // Determine template (user selection or original)
  const originalTemplateId = originalIdea.template_id;
  const targetTemplateId = templateId !== undefined ? templateId : originalTemplateId;

  // Fetch templates
  let templatesQuery = supabase
    .from("project_templates")
    .select("id, name, description")
    .eq("project_id", projectId);
  
  if (targetTemplateId) {
    templatesQuery = templatesQuery.eq("id", targetTemplateId);
  }
  
  const { data: templates } = await templatesQuery;

  // Determine topic (user selection or original)
  const originalTopicIds = (originalIdea.idea_topics as unknown as Array<{
    topic_id: string;
    project_topics: { id: string; name: string; description: string | null } | null;
  }> || [])
    .map(it => it.topic_id)
    .filter(Boolean);
  
  const targetTopicId = topicId !== undefined ? topicId : (originalTopicIds[0] || null);

  // Fetch topics
  let topicsQuery = supabase
    .from("project_topics")
    .select("id, name, description")
    .eq("project_id", projectId)
    .eq("is_excluded", false);
  
  if (targetTopicId) {
    topicsQuery = topicsQuery.eq("id", targetTopicId);
  }
  
  const { data: topics } = await topicsQuery;

  // Build the prompt from template
  const promptTemplate = await readFile(
    path.join(process.cwd(), "prompts", "remix-idea.md"),
    "utf-8"
  );

  // Format characters section
  const charactersSection =
    characters && characters.length > 0
      ? characters
          .map((c) => `- **${c.name}** (id: "${c.id}"): ${c.description || "No description"}`)
          .join("\n")
      : "No character profiles configured.";

  // Format channels section
  const channelsSection =
    channels && channels.length > 0
      ? channels
          .map((c) => {
            const name = c.platform === "custom" && c.custom_label 
              ? c.custom_label 
              : c.platform;
            return `- **${name}** (platform: "${c.platform}")`;
          })
          .join("\n")
      : "No distribution channels configured.";

  // Format templates section
  const templatesSection =
    templates && templates.length > 0
      ? templates
          .map((t) => `- **${t.name}** (id: "${t.id}")${t.description ? `: ${t.description}` : ""}`)
          .join("\n")
      : "No video templates configured.";

  // Format topics section
  const topicsSection =
    topics && topics.length > 0
      ? topics
          .map((t) => `- **${t.name}** (id: "${t.id}")${t.description ? `: ${t.description}` : ""}`)
          .join("\n")
      : "No topics configured.";

  // Build the final prompt
  let prompt = promptTemplate
    .replace("{{originalTitle}}", originalIdea.title || "Untitled")
    .replace("{{originalDescription}}", originalIdea.description || "No description")
    .replace("{{projectName}}", project.name || "Unnamed Project")
    .replace("{{projectDescription}}", project.description || "No description provided.")
    .replace("{{characters}}", charactersSection)
    .replace("{{distributionChannels}}", channelsSection)
    .replace("{{templates}}", templatesSection)
    .replace("{{topics}}", topicsSection);

  // Add selection mode instructions
  const filteringInstructions: string[] = [];
  
  if (targetCharacterIds.length > 0) {
    filteringInstructions.push(`**Characters:** The remixed idea MUST feature the character(s) listed above.`);
  } else {
    filteringInstructions.push(`**Characters:** No specific character required. Use an empty array for characterIds.`);
  }
  
  if (targetChannelIds.length > 0) {
    filteringInstructions.push(`**Channels:** The remixed idea MUST target the channel(s) listed above.`);
  } else {
    filteringInstructions.push(`**Channels:** No specific channel required. Use an empty array for channels.`);
  }
  
  if (targetTemplateId) {
    filteringInstructions.push(`**Template:** The remixed idea MUST use the template listed above.`);
  } else {
    filteringInstructions.push(`**Template:** No specific template required. Set templateId to null.`);
  }
  
  if (targetTopicId) {
    filteringInstructions.push(`**Topic:** The remixed idea MUST cover the topic listed above.`);
  } else {
    filteringInstructions.push(`**Topics:** No specific topic required. Use an empty array for topicIds.`);
  }
  
  prompt += `\n\n## Selection Mode\n\n${filteringInstructions.join('\n\n')}`;

  // Add custom instructions if provided
  if (customInstructions) {
    prompt += `\n\n## Remix Instructions\n\n${customInstructions}`;
  }

  // Build channel platform to ID map
  const channelIdMap = new Map<string, string>();
  if (channels) {
    for (const c of channels) {
      channelIdMap.set(c.platform, c.id);
    }
  }

  let responseRaw = "";
  let errorMessage: string | null = null;

  try {
    // Call ChatGPT
    const completion = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
    });

    responseRaw = completion.choices[0]?.message?.content || "";
    const parsed = JSON.parse(responseRaw) as GeneratedIdea;

    if (!parsed.title || !parsed.description) {
      throw new Error("Invalid response: missing title or description");
    }

    // Validate template ID
    const validTemplateIds = new Set(templates?.map((t) => t.id) || []);
    const validTemplateId = parsed.templateId && validTemplateIds.has(parsed.templateId) 
      ? parsed.templateId 
      : null;

    let resultIdeaId: string;

    if (saveAsCopy) {
      // Create a new idea with the same accepted state as the original
      const { data: newIdea, error: insertError } = await supabase
        .from("ideas")
        .insert({
          project_id: projectId,
          title: parsed.title,
          description: parsed.description,
          accepted_at: originalIdea.accepted_at, // Preserve accepted state
          template_id: validTemplateId,
        })
        .select("id")
        .single();

      if (insertError || !newIdea) {
        throw new Error(`Failed to create idea copy: ${insertError?.message}`);
      }

      resultIdeaId = newIdea.id;
    } else {
      // Update existing idea in place, clear image and related data
      const { error: updateError } = await supabase
        .from("ideas")
        .update({
          title: parsed.title,
          description: parsed.description,
          template_id: validTemplateId,
          prompt: null,
          image_url: null, // Clear image so new thumbnail will be generated
          recording_style: null, // Reset recording style for re-inference
        })
        .eq("id", ideaId);

      if (updateError) {
        throw new Error(`Failed to update idea: ${updateError.message}`);
      }

      // Delete existing relationships for in-place update
      await supabase.from("idea_channels").delete().eq("idea_id", ideaId);
      await supabase.from("idea_characters").delete().eq("idea_id", ideaId);
      await supabase.from("idea_topics").delete().eq("idea_id", ideaId);
      await supabase.from("idea_assets").delete().eq("idea_id", ideaId);

      resultIdeaId = ideaId;
    }

    // Insert new channel relationships
    if (parsed.channels && Array.isArray(parsed.channels)) {
      const channelLinks = parsed.channels
        .map((platform) => {
          const channelId = channelIdMap.get(platform);
          return channelId ? { idea_id: resultIdeaId, channel_id: channelId } : null;
        })
        .filter(Boolean) as Array<{ idea_id: string; channel_id: string }>;

      if (channelLinks.length > 0) {
        await supabase.from("idea_channels").insert(channelLinks);
      }
    }

    // Insert new character relationships
    const validCharacterIds = new Set(characters?.map((c) => c.id) || []);
    if (parsed.characterIds && Array.isArray(parsed.characterIds)) {
      const characterLinks = parsed.characterIds
        .filter((id) => validCharacterIds.has(id))
        .map((id) => ({ idea_id: resultIdeaId, character_id: id }));

      if (characterLinks.length > 0) {
        await supabase.from("idea_characters").insert(characterLinks);
      }
    }

    // Insert new topic relationships
    const validTopicIds = new Set(topics?.map((t) => t.id) || []);
    if (parsed.topicIds && Array.isArray(parsed.topicIds)) {
      const topicLinks = parsed.topicIds
        .filter((id) => validTopicIds.has(id))
        .map((id) => ({ idea_id: resultIdeaId, topic_id: id }));

      if (topicLinks.length > 0) {
        await supabase.from("idea_topics").insert(topicLinks);
      }
    }

    // Log the successful remix
    await supabase.from("generation_logs").insert({
      project_id: projectId,
      type: "idea_remix",
      prompt_sent: prompt,
      response_raw: responseRaw,
      model: DEFAULT_MODEL,
      idea_id: resultIdeaId,
    });

    // Generate thumbnail and talking points in background
    after(async () => {
      await Promise.all([
        generateThumbnail(resultIdeaId, projectId).catch(err => {
          console.error(`Failed to generate thumbnail for remixed idea ${resultIdeaId}:`, err);
        }),
        generateTalkingPoints(resultIdeaId).catch(err => {
          console.error(`Failed to generate talking points for remixed idea ${resultIdeaId}:`, err);
        }),
      ]);
    });

    await revalidateProjectPaths(projectId);

    return { 
      success: true, 
      ideaId: resultIdeaId, 
      title: parsed.title,
      isCopy: saveAsCopy,
    };
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error remixing idea:", error);

    // Log the failed remix
    await supabase.from("generation_logs").insert({
      project_id: projectId,
      type: "idea_remix",
      prompt_sent: prompt,
      response_raw: responseRaw || null,
      model: DEFAULT_MODEL,
      error: errorMessage,
      idea_id: ideaId,
    });

    return { error: errorMessage };
  }
}

// Update recording style for an idea
export async function updateRecordingStyle(ideaId: string, recordingStyle: RecordingStyle) {
  const supabase = await createClient();

  // Get idea to find project_id
  const { data: idea } = await supabase
    .from("ideas")
    .select("project_id")
    .eq("id", ideaId)
    .single();

  if (!idea) {
    return { error: "Idea not found" };
  }

  const { error } = await supabase
    .from("ideas")
    .update({ recording_style: recordingStyle })
    .eq("id", ideaId);

  if (error) {
    console.error("Error updating recording style:", error);
    return { error: error.message };
  }

  await revalidateProjectPaths(idea.project_id);
  return { success: true };
}

// Generate an Underlord prompt for an existing idea (requires script or talking points asset)
export async function generateUnderlordPrompt(ideaId: string) {
  const supabase = await createClient();

  // Fetch the idea with its channels
  const { data: idea, error: ideaError } = await supabase
    .from("ideas")
    .select(`
      id,
      title,
      description,
      project_id,
      idea_channels (
        channel_id,
        project_channels (
          platform,
          custom_label
        )
      )
    `)
    .eq("id", ideaId)
    .single();

  if (ideaError || !idea) {
    console.error("Error fetching idea:", ideaError);
    return { error: "Idea not found" };
  }

  // Fetch script or talking points from assets
  const { data: assets } = await supabase
    .from("idea_assets")
    .select("*")
    .eq("idea_id", ideaId)
    .in("type", ["script", "talking_points"]);

  const scriptAsset = assets?.find(a => a.type === "script");
  const talkingPointsAsset = assets?.find(a => a.type === "talking_points");

  // Prefer script, fall back to talking points
  const contentAsset = scriptAsset || talkingPointsAsset;

  if (!contentAsset?.content_text) {
    return { error: "Script or talking points must be ready before creating Underlord prompt" };
  }

  // Fetch project context
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("name")
    .eq("id", idea.project_id)
    .single();

  if (projectError || !project) {
    console.error("Error fetching project:", projectError);
    return { error: "Project not found" };
  }

  // Build the prompt from template
  const promptTemplate = await readFile(
    path.join(process.cwd(), "prompts", "generate-underlord-prompt.md"),
    "utf-8"
  );

  // Format channels section
  const channelsSection =
    idea.idea_channels && idea.idea_channels.length > 0
      ? (idea.idea_channels as unknown as Array<{
          channel_id: string;
          project_channels: {
            platform: string;
            custom_label: string | null;
          } | null;
        }>)
          .map((ic) => {
            const channel = ic.project_channels;
            if (!channel) return null;
            return channel.custom_label || channel.platform;
          })
          .filter(Boolean)
          .join(", ")
      : "No specific channels";

  // Build the final prompt
  const prompt = promptTemplate
    .replace("{{ideaTitle}}", idea.title || "Untitled")
    .replace("{{ideaDescription}}", idea.description || "No description")
    .replace("{{channels}}", channelsSection)
    .replace("{{script}}", contentAsset.content_text)
    .replace("{{projectName}}", project.name || "Unnamed Project")
    ;

  let responseRaw = "";

  try {
    // Call ChatGPT
    const completion = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
    });

    responseRaw = completion.choices[0]?.message?.content || "";
    const parsed = JSON.parse(responseRaw);

    const underlordPrompt = parsed.underlordPrompt;
    if (!underlordPrompt) {
      throw new Error("No underlordPrompt in response");
    }

    // Update the idea with the generated Underlord prompt
    const { error: updateError } = await supabase
      .from("ideas")
      .update({ prompt: underlordPrompt })
      .eq("id", ideaId);

    if (updateError) {
      throw new Error(`Failed to save Underlord prompt: ${updateError.message}`);
    }

    await revalidateProjectPaths(idea.project_id);

    return { success: true, underlordPrompt };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error generating Underlord prompt:", error);
    return { error: errorMessage };
  }
}
