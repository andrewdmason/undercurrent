import { createClient } from "@/lib/supabase/server";
import { openai, DEFAULT_MODEL } from "@/lib/openai";
import { readFile } from "fs/promises";
import path from "path";
import { VISUAL_STYLES } from "@/lib/visual-styles";

export async function POST(request: Request) {
  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Get project ID from request body
  const { projectId } = await request.json();
  if (!projectId) {
    return new Response("Project ID required", { status: 400 });
  }

  // Verify user has access to this project
  const { data: membership } = await supabase
    .from("project_users")
    .select("id")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return new Response("Access denied", { status: 403 });
  }

  // Fetch project context
  const { data: project } = await supabase
    .from("projects")
    .select("name, description, business_objectives, strategy_prompt")
    .eq("id", projectId)
    .single();

  if (!project) {
    return new Response("Project not found", { status: 404 });
  }

  // Fetch project topics
  const { data: topics } = await supabase
    .from("project_topics")
    .select("name, description, is_excluded")
    .eq("project_id", projectId)
    .eq("is_excluded", false);

  // Fetch project templates
  const { data: templates } = await supabase
    .from("project_templates")
    .select("name, description")
    .eq("project_id", projectId);

  // Fetch existing characters
  const { data: characters } = await supabase
    .from("project_characters")
    .select("name, description")
    .eq("project_id", projectId);

  // Load the prompt template
  const promptTemplate = await readFile(
    path.join(process.cwd(), "prompts", "suggest-ai-avatar-concepts.md"),
    "utf-8"
  );

  // Build the prompt with context
  let prompt = promptTemplate;

  // Replace project info
  prompt = prompt.replace("{{#project}}", "");
  prompt = prompt.replace("{{/project}}", "");
  prompt = prompt.replace("{{name}}", project.name || "Unnamed Project");

  if (project.description) {
    prompt = prompt.replace("{{#description}}", "");
    prompt = prompt.replace("{{/description}}", "");
    prompt = prompt.replace("{{description}}", project.description);
  } else {
    prompt = prompt.replace(/\{\{#description\}\}[\s\S]*?\{\{\/description\}\}/g, "");
  }

  if (project.business_objectives) {
    prompt = prompt.replace("{{#business_objectives}}", "");
    prompt = prompt.replace("{{/business_objectives}}", "");
    prompt = prompt.replace("{{business_objectives}}", project.business_objectives);
  } else {
    prompt = prompt.replace(/\{\{#business_objectives\}\}[\s\S]*?\{\{\/business_objectives\}\}/g, "");
  }

  // Replace topics
  if (topics && topics.length > 0) {
    prompt = prompt.replace("{{#topics}}", "");
    prompt = prompt.replace("{{/topics}}", "");
    const topicsList = topics
      .map((t) => `- ${t.name}${t.description ? `: ${t.description}` : ""}`)
      .join("\n");
    prompt = prompt.replace(/\{\{#each topics\}\}[\s\S]*?\{\{\/each\}\}/g, topicsList);
  } else {
    prompt = prompt.replace(/\{\{#topics\}\}[\s\S]*?\{\{\/topics\}\}/g, "");
  }

  // Replace templates
  if (templates && templates.length > 0) {
    prompt = prompt.replace("{{#templates}}", "");
    prompt = prompt.replace("{{/templates}}", "");
    const templatesList = templates
      .map((t) => `- ${t.name}${t.description ? `: ${t.description}` : ""}`)
      .join("\n");
    prompt = prompt.replace(/\{\{#each templates\}\}[\s\S]*?\{\{\/each\}\}/g, templatesList);
  } else {
    prompt = prompt.replace(/\{\{#templates\}\}[\s\S]*?\{\{\/templates\}\}/g, "");
  }

  // Replace characters
  if (characters && characters.length > 0) {
    prompt = prompt.replace("{{#characters}}", "");
    prompt = prompt.replace("{{/characters}}", "");
    const charactersList = characters
      .map((c) => `- ${c.name}${c.description ? `: ${c.description}` : ""}`)
      .join("\n");
    prompt = prompt.replace(/\{\{#each characters\}\}[\s\S]*?\{\{\/each\}\}/g, charactersList);
  } else {
    prompt = prompt.replace(/\{\{#characters\}\}[\s\S]*?\{\{\/characters\}\}/g, "");
  }

  // Add available styles info to help the AI pick
  const stylesList = VISUAL_STYLES.map((s) => s.slug).join(", ");
  prompt = prompt.replace(
    /from: [a-z0-9-]+, [a-z0-9-]+,[\s\S]*?watercolor"/,
    `from: ${stylesList}"`
  );

  // Create streaming response
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const completion = await openai.chat.completions.create({
          model: DEFAULT_MODEL,
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          stream: true,
        });

        let fullResponse = "";

        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            fullResponse += content;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "chunk", content })}\n\n`)
            );
          }
        }

        // Parse the full response and send as final message
        try {
          const parsed = JSON.parse(fullResponse);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "complete", concepts: parsed })}\n\n`
            )
          );
        } catch {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", message: "Failed to parse response" })}\n\n`
            )
          );
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (error) {
        console.error("Error generating AI character concepts:", error);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", message: "Failed to generate concepts" })}\n\n`
          )
        );
        controller.close();
      }
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



