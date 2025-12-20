import { createClient } from "@/lib/supabase/server";
import { openai, DEFAULT_MODEL } from "@/lib/openai";
import { readFile } from "fs/promises";
import path from "path";

interface ChannelRanking {
  platform: string;
  priority: "high" | "medium" | "low";
  reason: string;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Verify user has access to this project
  const { data: membership } = await supabase
    .from("project_members")
    .select("id")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return new Response("Access denied", { status: 403 });
  }

  // Fetch project context
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("name, description, business_objectives")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    return new Response("Project not found", { status: 404 });
  }

  // Build the prompt from template
  const promptTemplate = await readFile(
    path.join(process.cwd(), "prompts", "rank-distribution-channels.md"),
    "utf-8"
  );

  const prompt = promptTemplate
    .replace("{{projectName}}", project.name || "Unnamed Business")
    .replace("{{projectDescription}}", project.description || "No description provided.")
    .replace("{{projectObjectives}}", project.business_objectives || "No objectives provided.");

  try {
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

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    console.log("AI response for channel ranking:", content);

    // Parse the JSON response
    let rankings: ChannelRanking[];
    try {
      const parsed = JSON.parse(content);
      // Handle various response formats:
      // - Direct array: [...]
      // - Object with rankings: { rankings: [...] }
      // - Object with channels: { channels: [...] }
      // - Object with platforms: { platforms: [...] }
      if (Array.isArray(parsed)) {
        rankings = parsed;
      } else if (parsed.rankings && Array.isArray(parsed.rankings)) {
        rankings = parsed.rankings;
      } else if (parsed.channels && Array.isArray(parsed.channels)) {
        rankings = parsed.channels;
      } else if (parsed.platforms && Array.isArray(parsed.platforms)) {
        rankings = parsed.platforms;
      } else {
        // Try to find any array property
        const arrayProp = Object.values(parsed).find(Array.isArray);
        rankings = (arrayProp as ChannelRanking[]) || [];
      }
    } catch (e) {
      console.error("Failed to parse AI response:", content, e);
      throw new Error("Invalid JSON response from AI");
    }

    console.log("Parsed rankings:", rankings);

    // Validate we got all 8 platforms
    const validPlatforms = [
      "tiktok",
      "instagram_reels",
      "youtube_shorts",
      "snapchat_spotlight",
      "youtube",
      "linkedin",
      "facebook",
      "x",
    ];
    const validPriorities = ["high", "medium", "low"];

    // Filter to only valid platforms and normalize priority
    rankings = rankings
      .filter((r) => validPlatforms.includes(r.platform) && typeof r.reason === "string")
      .map((r) => ({
        ...r,
        priority: validPriorities.includes(r.priority) ? r.priority : "medium",
      })) as ChannelRanking[];

    // If we're missing platforms, add them with a generic reason
    const existingPlatforms = new Set(rankings.map((r) => r.platform));
    for (const platform of validPlatforms) {
      if (!existingPlatforms.has(platform)) {
        rankings.push({
          platform,
          priority: "low",
          reason: "Consider for broader reach.",
        });
      }
    }

    return Response.json({ rankings });
  } catch (error) {
    console.error("Channel ranking error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}


