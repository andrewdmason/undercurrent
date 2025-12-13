import { createClient } from "@/lib/supabase/server";
import { openai, DEFAULT_MODEL } from "@/lib/openai";
import { readFile } from "fs/promises";
import path from "path";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ ideaId: string }> }
) {
  const { ideaId } = await params;
  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Fetch the idea with all related data
  const { data: idea, error: ideaError } = await supabase
    .from("ideas")
    .select(`
      id,
      title,
      description,
      project_id,
      template_id,
      project_templates (
        name,
        description
      ),
      idea_channels (
        project_channels (
          platform,
          custom_label
        )
      ),
      idea_characters (
        project_characters (
          name
        )
      ),
      idea_topics (
        project_topics (
          name
        )
      )
    `)
    .eq("id", ideaId)
    .single();

  if (ideaError || !idea) {
    return new Response("Idea not found", { status: 404 });
  }

  // Verify user has access to this project
  const { data: membership } = await supabase
    .from("project_users")
    .select("id")
    .eq("project_id", idea.project_id)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return new Response("Access denied", { status: 403 });
  }

  // Fetch project context
  const { data: project } = await supabase
    .from("projects")
    .select("name, description, business_objectives")
    .eq("id", idea.project_id)
    .single();

  if (!project) {
    return new Response("Project not found", { status: 404 });
  }

  // Fetch all project topics
  const { data: allTopics } = await supabase
    .from("project_topics")
    .select("name, description, is_excluded")
    .eq("project_id", idea.project_id);

  // Fetch all project characters
  const { data: allCharacters } = await supabase
    .from("project_characters")
    .select("name, description")
    .eq("project_id", idea.project_id);

  // Fetch all project templates
  const { data: allTemplates } = await supabase
    .from("project_templates")
    .select("name, description")
    .eq("project_id", idea.project_id);

  // Build the prompt
  const promptTemplate = await readFile(
    path.join(process.cwd(), "prompts", "guess-rejection-reasons.md"),
    "utf-8"
  );

  // Format template info
  const template = idea.project_templates as unknown as { name: string; description: string | null } | null;
  const templateSection = template 
    ? `${template.name}${template.description ? ` - ${template.description}` : ""}`
    : "";

  // Format characters for this idea
  const ideaCharacters = (idea.idea_characters as unknown as Array<{
    project_characters: { name: string } | null;
  }> || [])
    .map(ic => ic.project_characters?.name)
    .filter(Boolean)
    .join(", ");

  // Format topics for this idea
  const ideaTopics = (idea.idea_topics as unknown as Array<{
    project_topics: { name: string } | null;
  }> || [])
    .map(it => it.project_topics?.name)
    .filter(Boolean)
    .join(", ");

  // Format channels for this idea
  const ideaChannels = (idea.idea_channels as unknown as Array<{
    project_channels: { platform: string; custom_label: string | null } | null;
  }> || [])
    .map(ic => ic.project_channels?.custom_label || ic.project_channels?.platform)
    .filter(Boolean)
    .join(", ");

  // Format all topics
  const includedTopics = allTopics?.filter(t => !t.is_excluded) || [];
  const excludedTopics = allTopics?.filter(t => t.is_excluded) || [];

  const allTopicsSection = includedTopics.length > 0
    ? includedTopics.map(t => `- ${t.name}${t.description ? `: ${t.description}` : ""}`).join("\n")
    : "No topics configured.";

  const excludedTopicsSection = excludedTopics.length > 0
    ? excludedTopics.map(t => `- ${t.name}${t.description ? `: ${t.description}` : ""}`).join("\n")
    : "No excluded topics.";

  // Format all characters
  const allCharactersSection = allCharacters && allCharacters.length > 0
    ? allCharacters.map(c => `- ${c.name}${c.description ? `: ${c.description}` : ""}`).join("\n")
    : "No characters configured.";

  // Format all templates
  const allTemplatesSection = allTemplates && allTemplates.length > 0
    ? allTemplates.map(t => `- ${t.name}${t.description ? `: ${t.description}` : ""}`).join("\n")
    : "No templates configured.";

  // Build the final prompt
  let prompt = promptTemplate
    .replace("{{ideaTitle}}", idea.title || "Untitled")
    .replace("{{ideaDescription}}", idea.description || "No description")
    .replace("{{projectName}}", project.name || "Unnamed Project")
    .replace("{{projectDescription}}", project.description || "No description provided.")
    .replace("{{projectObjectives}}", project.business_objectives || "No objectives defined.")
    .replace("{{allTopics}}", allTopicsSection)
    .replace("{{excludedTopics}}", excludedTopicsSection)
    .replace("{{allCharacters}}", allCharactersSection)
    .replace("{{allTemplates}}", allTemplatesSection);

  // Handle conditional template section
  if (template) {
    prompt = prompt
      .replace("{{#if template}}", "")
      .replace("{{/if}}", "")
      .replace("{{templateName}}", template.name)
      .replace("{{templateDescription}}", template.description || "No description");
  } else {
    prompt = prompt.replace(/\{\{#if template\}\}[\s\S]*?\{\{\/if\}\}/g, "");
  }

  // Handle conditional characters section
  if (ideaCharacters) {
    prompt = prompt
      .replace("{{#if characters}}", "")
      .replace("{{/if}}", "")
      .replace("{{characters}}", ideaCharacters);
  } else {
    prompt = prompt.replace(/\{\{#if characters\}\}[\s\S]*?\{\{\/if\}\}/g, "");
  }

  // Handle conditional topics section
  if (ideaTopics) {
    prompt = prompt
      .replace("{{#if topics}}", "")
      .replace("{{/if}}", "")
      .replace("{{topics}}", ideaTopics);
  } else {
    prompt = prompt.replace(/\{\{#if topics\}\}[\s\S]*?\{\{\/if\}\}/g, "");
  }

  // Handle conditional channels section
  if (ideaChannels) {
    prompt = prompt
      .replace("{{#if channels}}", "")
      .replace("{{/if}}", "")
      .replace("{{channels}}", ideaChannels);
  } else {
    prompt = prompt.replace(/\{\{#if channels\}\}[\s\S]*?\{\{\/if\}\}/g, "");
  }

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
            encoder.encode(`data: ${JSON.stringify({ type: "complete", reasons: parsed.reasons || [] })}\n\n`)
          );
        } catch {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", message: "Failed to parse response" })}\n\n`)
          );
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (error) {
        console.error("Error generating rejection guesses:", error);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "error", message: "Failed to generate guesses" })}\n\n`)
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






