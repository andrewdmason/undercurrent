"use server";

import { createClient } from "@/lib/supabase/server";
import { openai, DEFAULT_MODEL } from "@/lib/openai";
import { revalidatePath } from "next/cache";
import { readFile } from "fs/promises";
import path from "path";

interface GeneratedIdea {
  title: string;
  description: string;
  underlordPrompt: string;
  script: string;
  channels?: string[];
}

export async function updateIdeaRating(
  ideaId: string,
  rating: "up" | "down" | null,
  businessId: string
) {
  const supabase = await createClient();

  // Get business slug for revalidation
  const { data: business } = await supabase
    .from("businesses")
    .select("slug")
    .eq("id", businessId)
    .single();

  const { error } = await supabase
    .from("ideas")
    .update({ rating })
    .eq("id", ideaId);

  if (error) {
    console.error("Error updating idea rating:", error);
    return { error: error.message };
  }

  if (business?.slug) {
    revalidatePath(`/${business.slug}`);
    revalidatePath(`/${business.slug}/saved`);
  }
  return { success: true };
}

export async function updateIdeaBookmark(
  ideaId: string,
  bookmarked: boolean,
  businessId: string
) {
  const supabase = await createClient();

  // Get business slug for revalidation
  const { data: business } = await supabase
    .from("businesses")
    .select("slug")
    .eq("id", businessId)
    .single();

  const { error } = await supabase
    .from("ideas")
    .update({ bookmarked })
    .eq("id", ideaId);

  if (error) {
    console.error("Error updating idea bookmark:", error);
    return { error: error.message };
  }

  if (business?.slug) {
    revalidatePath(`/${business.slug}`);
    revalidatePath(`/${business.slug}/saved`);
  }
  return { success: true };
}

export async function generateIdeas(businessId: string) {
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

  // Fetch last 20 ideas for context
  const { data: pastIdeas } = await supabase
    .from("ideas")
    .select("title, rating, rating_reason")
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

  // Format past ideas section
  const pastIdeasSection =
    pastIdeas && pastIdeas.length > 0
      ? pastIdeas
          .map((idea) => {
            let line = `- "${idea.title}"`;
            if (idea.rating === "up") {
              line += " [👍 liked]";
              if (idea.rating_reason) line += ` "${idea.rating_reason}"`;
            } else if (idea.rating === "down") {
              line += " [👎 disliked]";
              if (idea.rating_reason) line += ` "${idea.rating_reason}"`;
            }
            return line;
          })
          .join("\n")
      : "No previous ideas generated yet.";

  // Build the final prompt
  const prompt = promptTemplate
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
    
    // Try to find the ideas array in various possible locations
    if (Array.isArray(parsed)) {
      generatedIdeas = parsed;
    } else if (Array.isArray(parsed.ideas)) {
      generatedIdeas = parsed.ideas;
    } else if (Array.isArray(parsed.video_ideas)) {
      generatedIdeas = parsed.video_ideas;
    } else if (Array.isArray(parsed.videoIdeas)) {
      generatedIdeas = parsed.videoIdeas;
    } else {
      // Log what we actually got for debugging
      console.error("Unexpected response structure:", JSON.stringify(parsed, null, 2).slice(0, 500));
      throw new Error(`Invalid response format: got keys [${Object.keys(parsed).join(", ")}]`);
    }

    if (generatedIdeas.length === 0) {
      throw new Error("No ideas were generated");
    }

    // Insert the generated ideas
    const ideasToInsert = generatedIdeas.map((idea) => ({
      business_id: businessId,
      title: idea.title,
      description: idea.description,
      script: idea.script,
      prompt: idea.underlordPrompt,
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

    if (business.slug) {
      revalidatePath(`/${business.slug}`);
      revalidatePath(`/${business.slug}/saved`);
    }

    return { success: true, count: generatedIdeas.length };
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
