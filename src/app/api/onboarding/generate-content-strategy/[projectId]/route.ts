import { createClient } from "@/lib/supabase/server";
import { openai, DEFAULT_MODEL } from "@/lib/openai";
import { readFile } from "fs/promises";
import path from "path";
import { DISTRIBUTION_PLATFORMS } from "@/lib/types";

interface TopicSuggestion {
  name: string;
  description: string;
}

interface ContentStrategyResponse {
  contentStrategy: string;
  topicsToInclude: TopicSuggestion[];
  topicsToAvoid: TopicSuggestion[];
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

  // Fetch project channels
  const { data: channels } = await supabase
    .from("project_channels")
    .select("platform")
    .eq("project_id", projectId);

  // Format channels as readable list
  const channelsList = channels?.length
    ? channels
        .map((c) => {
          const platform = DISTRIBUTION_PLATFORMS.find((p) => p.value === c.platform);
          return platform?.label || c.platform;
        })
        .join(", ")
    : "No channels selected yet";

  // Build the prompt from template
  const promptTemplate = await readFile(
    path.join(process.cwd(), "prompts", "generate-content-strategy.md"),
    "utf-8"
  );

  const prompt = promptTemplate
    .replace("{{projectName}}", project.name || "Unnamed Business")
    .replace("{{projectDescription}}", project.description || "No description provided.")
    .replace("{{projectObjectives}}", project.business_objectives || "No objectives provided.")
    .replace("{{channels}}", channelsList);

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

    console.log("AI response for content strategy:", content);

    // Parse the JSON response
    let result: ContentStrategyResponse;
    try {
      const parsed = JSON.parse(content);
      result = {
        contentStrategy: parsed.contentStrategy || "",
        topicsToInclude: Array.isArray(parsed.topicsToInclude) ? parsed.topicsToInclude : [],
        topicsToAvoid: Array.isArray(parsed.topicsToAvoid) ? parsed.topicsToAvoid : [],
      };
    } catch (e) {
      console.error("Failed to parse AI response:", content, e);
      throw new Error("Invalid JSON response from AI");
    }

    // Validate and clean up topics
    result.topicsToInclude = result.topicsToInclude
      .filter((t) => t.name && typeof t.name === "string")
      .map((t) => ({
        name: t.name.trim(),
        description: (t.description || "").trim(),
      }));

    result.topicsToAvoid = result.topicsToAvoid
      .filter((t) => t.name && typeof t.name === "string")
      .map((t) => ({
        name: t.name.trim(),
        description: (t.description || "").trim(),
      }));

    return Response.json(result);
  } catch (error) {
    console.error("Content strategy generation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}


