"use server";

import { createClient } from "@/lib/supabase/server";
import { openai, DEFAULT_MODEL } from "@/lib/openai";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { generateThumbnail } from "./thumbnail";
import { IdeaStatus } from "@/lib/types";

interface GeneratedIdea {
  title: string;
  description: string;
  channels?: string[];
}

// Helper to get business slug and revalidate paths
async function revalidateBusinessPaths(businessId: string) {
  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("slug")
    .eq("id", businessId)
    .single();

  if (business?.slug) {
    revalidatePath(`/${business.slug}`);
    revalidatePath(`/${business.slug}/queue`);
    revalidatePath(`/${business.slug}/published`);
  }
  return business?.slug;
}

// Accept an idea - move it to the production queue
export async function acceptIdea(ideaId: string) {
  const supabase = await createClient();

  // Get idea to find business_id
  const { data: idea } = await supabase
    .from("ideas")
    .select("business_id")
    .eq("id", ideaId)
    .single();

  if (!idea) {
    return { error: "Idea not found" };
  }

  const { error } = await supabase
    .from("ideas")
    .update({ status: "accepted" as IdeaStatus })
    .eq("id", ideaId);

  if (error) {
    console.error("Error accepting idea:", error);
    return { error: error.message };
  }

  await revalidateBusinessPaths(idea.business_id);
  return { success: true };
}

// Reject an idea with optional reason
export async function rejectIdea(ideaId: string, reason?: string) {
  const supabase = await createClient();

  // Get idea to find business_id
  const { data: idea } = await supabase
    .from("ideas")
    .select("business_id")
    .eq("id", ideaId)
    .single();

  if (!idea) {
    return { error: "Idea not found" };
  }

  const { error } = await supabase
    .from("ideas")
    .update({ 
      status: "rejected" as IdeaStatus,
      reject_reason: reason || null,
    })
    .eq("id", ideaId);

  if (error) {
    console.error("Error rejecting idea:", error);
    return { error: error.message };
  }

  await revalidateBusinessPaths(idea.business_id);
  return { success: true };
}

// Cancel an idea from the production queue
export async function cancelIdea(ideaId: string) {
  const supabase = await createClient();

  // Get idea to find business_id
  const { data: idea } = await supabase
    .from("ideas")
    .select("business_id")
    .eq("id", ideaId)
    .single();

  if (!idea) {
    return { error: "Idea not found" };
  }

  const { error } = await supabase
    .from("ideas")
    .update({ status: "canceled" as IdeaStatus })
    .eq("id", ideaId);

  if (error) {
    console.error("Error canceling idea:", error);
    return { error: error.message };
  }

  await revalidateBusinessPaths(idea.business_id);
  return { success: true };
}

// Publish an idea with video URLs for each channel
export async function publishIdea(
  ideaId: string, 
  channelUrls: Array<{ channelId: string; videoUrl: string | null }>
) {
  const supabase = await createClient();

  // Get idea to find business_id
  const { data: idea } = await supabase
    .from("ideas")
    .select("business_id")
    .eq("id", ideaId)
    .single();

  if (!idea) {
    return { error: "Idea not found" };
  }

  // Update idea status to published
  const { error: statusError } = await supabase
    .from("ideas")
    .update({ status: "published" as IdeaStatus })
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

  await revalidateBusinessPaths(idea.business_id);
  return { success: true };
}

export async function generateIdeas(businessId: string, customInstructions?: string) {
  const supabase = await createClient();

  // Fetch business profile
  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", businessId)
    .single();

  if (businessError || !business) {
    console.error("Error fetching business:", businessError);
    return { error: "Business not found" };
  }

  // Fetch business talent
  const { data: talent } = await supabase
    .from("business_talent")
    .select("name, description")
    .eq("business_id", businessId);

  // Fetch distribution channels
  const { data: channels } = await supabase
    .from("business_distribution_channels")
    .select("id, platform, custom_label, goal_count, goal_cadence, notes")
    .eq("business_id", businessId)
    .order("created_at", { ascending: true });

  // Fetch last 20 ideas for context (include rejected ones with reasons for learning)
  const { data: pastIdeas } = await supabase
    .from("ideas")
    .select("title, status, reject_reason")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(20);

  // Build the prompt from template
  const promptTemplate = await readFile(
    path.join(process.cwd(), "prompts", "generate-ideas.md"),
    "utf-8"
  );

  // Format talent section
  const talentSection =
    talent && talent.length > 0
      ? talent
          .map((t) => `- **${t.name}**: ${t.description || "No description"}`)
          .join("\n")
      : "No talent profiles configured.";

  // Format content sources section
  const contentSources = business.content_inspiration_sources;
  const sourcesSection =
    contentSources && Array.isArray(contentSources) && contentSources.length > 0
      ? contentSources.map((s: string) => `- ${s}`).join("\n")
      : "No content sources configured.";

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

  // Format past ideas section - now using status instead of rating
  const pastIdeasSection =
    pastIdeas && pastIdeas.length > 0
      ? pastIdeas
          .map((idea) => {
            let line = `- "${idea.title}"`;
            if (idea.status === "accepted" || idea.status === "published") {
              line += " [✓ accepted]";
            } else if (idea.status === "rejected") {
              line += " [✗ rejected]";
              if (idea.reject_reason) line += ` "${idea.reject_reason}"`;
            }
            return line;
          })
          .join("\n")
      : "No previous ideas generated yet.";

  // Build the final prompt
  let prompt = promptTemplate
    .replace("{{businessName}}", business.name || "Unnamed Business")
    .replace(
      "{{businessDescription}}",
      business.description || "No description provided."
    )
    .replace(
      "{{strategyPrompt}}",
      business.strategy_prompt || "No video marketing strategy defined yet."
    )
    .replace("{{contentSources}}", sourcesSection)
    .replace("{{talent}}", talentSection)
    .replace("{{distributionChannels}}", channelsSection)
    .replace("{{pastIdeas}}", pastIdeasSection);

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
    const ideasToInsert = generatedIdeas.map((idea) => ({
      business_id: businessId,
      title: idea.title,
      description: idea.description,
      generation_batch_id: batchId,
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

    // Log the generation
    const ideaIds = insertedIdeas?.map((i) => i.id) || [];
    await supabase.from("generation_logs").insert({
      business_id: businessId,
      prompt_sent: prompt,
      response_raw: responseRaw,
      ideas_created: ideaIds,
      model: DEFAULT_MODEL,
    });

    // Use after() to generate thumbnails in the background
    // This keeps the serverless function alive until thumbnails complete
    after(async () => {
      for (const insertedIdea of insertedIdeas || []) {
        try {
          await generateThumbnail(insertedIdea.id, businessId);
        } catch (err) {
          console.error(`Failed to generate thumbnail for idea ${insertedIdea.id}:`, err);
        }
      }
    });

    await revalidateBusinessPaths(businessId);

    return { success: true, count: generatedIdeas.length, ideaIds };
  } catch (error) {
    errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error generating ideas:", error);

    // Log the failed generation
    await supabase.from("generation_logs").insert({
      business_id: businessId,
      prompt_sent: prompt,
      response_raw: responseRaw || null,
      ideas_created: null,
      model: DEFAULT_MODEL,
      error: errorMessage,
    });

    return { error: errorMessage };
  }
}

// Generate a script for an existing idea
export async function generateScript(ideaId: string) {
  const supabase = await createClient();

  // Fetch the idea with its channels
  const { data: idea, error: ideaError } = await supabase
    .from("ideas")
    .select(`
      id,
      title,
      description,
      business_id,
      idea_channels (
        channel_id,
        business_distribution_channels (
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

  // Fetch business context
  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("name, description, strategy_prompt")
    .eq("id", idea.business_id)
    .single();

  if (businessError || !business) {
    console.error("Error fetching business:", businessError);
    return { error: "Business not found" };
  }

  // Fetch talent
  const { data: talent } = await supabase
    .from("business_talent")
    .select("name, description")
    .eq("business_id", idea.business_id);

  // Build the prompt from template
  const promptTemplate = await readFile(
    path.join(process.cwd(), "prompts", "generate-script.md"),
    "utf-8"
  );

  // Format talent section
  const talentSection =
    talent && talent.length > 0
      ? talent
          .map((t) => `- **${t.name}**: ${t.description || "No description"}`)
          .join("\n")
      : "No talent profiles configured.";

  // Format channels section  
  const channelsSection =
    idea.idea_channels && idea.idea_channels.length > 0
      ? (idea.idea_channels as unknown as Array<{
          channel_id: string;
          business_distribution_channels: {
            platform: string;
            custom_label: string | null;
          } | null;
        }>)
          .map((ic) => {
            const channel = ic.business_distribution_channels;
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
    .replace("{{businessName}}", business.name || "Unnamed Business")
    .replace("{{businessDescription}}", business.description || "No description provided.")
    .replace("{{strategyPrompt}}", business.strategy_prompt || "No video marketing strategy defined yet.")
    .replace("{{talent}}", talentSection);

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

    const script = parsed.script;
    if (!script) {
      throw new Error("No script in response");
    }

    // Update the idea with the generated script
    const { error: updateError } = await supabase
      .from("ideas")
      .update({ script })
      .eq("id", ideaId);

    if (updateError) {
      throw new Error(`Failed to save script: ${updateError.message}`);
    }

    await revalidateBusinessPaths(idea.business_id);

    return { success: true, script };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error generating script:", error);
    return { error: errorMessage };
  }
}

// Generate an Underlord prompt for an existing idea (requires script to exist)
export async function generateUnderlordPrompt(ideaId: string) {
  const supabase = await createClient();

  // Fetch the idea with its script and channels
  const { data: idea, error: ideaError } = await supabase
    .from("ideas")
    .select(`
      id,
      title,
      description,
      script,
      business_id,
      idea_channels (
        channel_id,
        business_distribution_channels (
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

  // Require script to exist before generating Underlord prompt
  if (!idea.script) {
    return { error: "Script must be generated before creating Underlord prompt" };
  }

  // Fetch business context
  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("name, strategy_prompt")
    .eq("id", idea.business_id)
    .single();

  if (businessError || !business) {
    console.error("Error fetching business:", businessError);
    return { error: "Business not found" };
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
          business_distribution_channels: {
            platform: string;
            custom_label: string | null;
          } | null;
        }>)
          .map((ic) => {
            const channel = ic.business_distribution_channels;
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
    .replace("{{script}}", idea.script)
    .replace("{{businessName}}", business.name || "Unnamed Business")
    .replace("{{strategyPrompt}}", business.strategy_prompt || "No video marketing strategy defined yet.");

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

    await revalidateBusinessPaths(idea.business_id);

    return { success: true, underlordPrompt };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error generating Underlord prompt:", error);
    return { error: errorMessage };
  }
}
