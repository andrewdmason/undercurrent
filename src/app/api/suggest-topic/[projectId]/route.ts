import { createClient } from "@/lib/supabase/server";
import { openai, DEFAULT_MODEL } from "@/lib/openai";
import { readFile } from "fs/promises";
import path from "path";

interface RefineRequest {
  currentTopic?: {
    name: string;
    description: string;
  };
  feedback?: string;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const supabase = await createClient();

  // Parse optional refinement request
  let refineData: RefineRequest = {};
  try {
    const body = await request.json();
    refineData = body || {};
  } catch {
    // No body or invalid JSON - that's fine for new suggestions
  }

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
    .select("name, description, business_objectives, content_preferences")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    return new Response("Project not found", { status: 404 });
  }

  // Fetch existing topics
  const { data: allTopics } = await supabase
    .from("project_topics")
    .select("name, description, is_excluded")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  const includedTopics = allTopics?.filter((t) => !t.is_excluded) || [];
  const excludedTopics = allTopics?.filter((t) => t.is_excluded) || [];

  // Fetch distribution channels
  const { data: channels } = await supabase
    .from("project_channels")
    .select("platform, custom_label")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  // Build the prompt from template
  const promptTemplate = await readFile(
    path.join(process.cwd(), "prompts", "suggest-topic.md"),
    "utf-8"
  );

  // Format existing topics section
  const existingTopicsSection =
    includedTopics.length > 0
      ? includedTopics
          .map((t) => {
            let line = `- **${t.name}**`;
            if (t.description) {
              line += `: ${t.description}`;
            }
            return line;
          })
          .join("\n")
      : "No topics configured yet.";

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
          .map((c) => `- ${c.custom_label || c.platform}`)
          .join("\n")
      : "No distribution channels configured yet.";

  // Build refinement section if provided
  let refinementSection = "";
  if (refineData.currentTopic && refineData.feedback) {
    refinementSection = `
## Current Topic Being Refined

The user is iterating on an existing suggestion. Here's the current topic:

**Name:** ${refineData.currentTopic.name}
**Description:** ${refineData.currentTopic.description}

**User's Feedback:** ${refineData.feedback}

Please refine the topic based on this feedback. You may adjust the name, description, or both to address the user's input while maintaining the topic's core value.
`;
  }

  // Build the final prompt - remove the template conditional block and insert actual content
  const prompt = promptTemplate
    .replace("{{projectName}}", project.name || "Unnamed Project")
    .replace(
      "{{projectDescription}}",
      project.description || "No description provided."
    )
    .replace(
      "{{projectObjectives}}",
      project.business_objectives || "No business objectives defined yet."
    )
    .replace(
      "{{contentPreferences}}",
      project.content_preferences || "No specific content preferences."
    )
    .replace("{{distributionChannels}}", channelsSection)
    .replace("{{existingTopics}}", existingTopicsSection)
    .replace("{{excludedTopics}}", excludedTopicsSection)
    .replace(/\{\{#if currentTopic\}\}[\s\S]*?\{\{\/if\}\}/g, refinementSection);

  // Create streaming response
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let fullResponse = "";
      let errorMessage: string | null = null;

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
          stream: true,
        });

        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            fullResponse += content;
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "text", content })}\n\n`
              )
            );
          }
        }

        // Parse the final JSON to validate it
        try {
          const parsed = JSON.parse(fullResponse);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "complete", topic: parsed })}\n\n`
            )
          );
        } catch {
          errorMessage = "Failed to parse topic suggestion";
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", error: errorMessage })}\n\n`
            )
          );
        }

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
        );
      } catch (error) {
        errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error("Topic suggestion error:", error);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", error: errorMessage })}\n\n`
          )
        );
      }

      // Log the generation attempt
      await supabase.from("generation_logs").insert({
        project_id: projectId,
        type: "topic_suggestion",
        prompt_sent: prompt,
        response_raw: fullResponse || null,
        model: DEFAULT_MODEL,
        error: errorMessage,
      });

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
