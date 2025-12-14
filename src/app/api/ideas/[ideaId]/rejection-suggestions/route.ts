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

  // Parse request body
  const { rejectionReason } = (await request.json()) as {
    rejectionReason: string;
  };

  if (!rejectionReason) {
    return new Response("Missing rejection reason", { status: 400 });
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
    .from("project_members")
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

  // Fetch all project topics with IDs
  const { data: allTopics } = await supabase
    .from("project_topics")
    .select("id, name, description, is_excluded")
    .eq("project_id", idea.project_id);

  // Fetch all project characters with IDs
  const { data: allCharacters } = await supabase
    .from("project_characters")
    .select("id, name, description")
    .eq("project_id", idea.project_id);

  // Fetch all project templates with IDs
  const { data: allTemplates } = await supabase
    .from("project_templates")
    .select("id, name, description")
    .eq("project_id", idea.project_id);

  // Build the prompt
  const promptTemplate = await readFile(
    path.join(process.cwd(), "prompts", "suggest-project-edits.md"),
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

  // Format all topics with IDs
  const includedTopics = allTopics?.filter(t => !t.is_excluded) || [];
  const excludedTopics = allTopics?.filter(t => t.is_excluded) || [];

  const allTopicsSection = includedTopics.length > 0
    ? includedTopics.map(t => `- ${t.name} (id: "${t.id}")${t.description ? `: ${t.description}` : ""}`).join("\n")
    : "No topics configured.";

  const excludedTopicsSection = excludedTopics.length > 0
    ? excludedTopics.map(t => `- ${t.name} (id: "${t.id}")${t.description ? `: ${t.description}` : ""}`).join("\n")
    : "No excluded topics.";

  // Format all characters with IDs
  const allCharactersSection = allCharacters && allCharacters.length > 0
    ? allCharacters.map(c => `- ${c.name} (id: "${c.id}")${c.description ? `: ${c.description}` : ""}`).join("\n")
    : "No characters configured.";

  // Format all templates with IDs
  const allTemplatesSection = allTemplates && allTemplates.length > 0
    ? allTemplates.map(t => `- ${t.name} (id: "${t.id}")${t.description ? `: ${t.description}` : ""}`).join("\n")
    : "No templates configured.";

  // Build the final prompt
  let prompt = promptTemplate
    .replace("{{ideaTitle}}", idea.title || "Untitled")
    .replace("{{ideaDescription}}", idea.description || "No description")
    .replace("{{rejectionReason}}", rejectionReason)
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

        // Parse the full response and enrich with old values for diffs
        try {
          const parsed = JSON.parse(fullResponse);
          const edits = parsed.edits || [];
          
          // Enrich update operations with current (old) values for diff display
          const enrichedEdits = edits.map((edit: Record<string, unknown>) => {
            switch (edit.type) {
              case "update_topic": {
                const topic = allTopics?.find(t => t.id === edit.id);
                return { ...edit, oldDescription: topic?.description || "", name: topic?.name || "Unknown topic" };
              }
              case "update_template": {
                const tmpl = allTemplates?.find(t => t.id === edit.id);
                return { ...edit, oldDescription: tmpl?.description || "", name: tmpl?.name || "Unknown template" };
              }
              case "update_character": {
                const char = allCharacters?.find(c => c.id === edit.id);
                return { ...edit, oldDescription: char?.description || "", name: char?.name || "Unknown character" };
              }
              case "update_description": {
                return { ...edit, oldText: project.description || "" };
              }
              case "update_objectives": {
                return { ...edit, oldText: project.business_objectives || "" };
              }
              default:
                return edit;
            }
          });
          
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ 
              type: "complete", 
              summary: parsed.summary || "",
              edits: enrichedEdits 
            })}\n\n`)
          );
        } catch {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", message: "Failed to parse response" })}\n\n`)
          );
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (error) {
        console.error("Error generating rejection suggestions:", error);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "error", message: "Failed to generate suggestions" })}\n\n`)
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

