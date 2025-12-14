import { createClient } from "@/lib/supabase/server";
import { openai, DEFAULT_MODEL } from "@/lib/openai";
import { readFile } from "fs/promises";
import path from "path";

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

  // Fetch project context - including description since it should be filled by now
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("name, url, description")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    return new Response("Project not found", { status: 404 });
  }

  // Build the prompt from template
  const promptTemplate = await readFile(
    path.join(process.cwd(), "prompts", "draft-business-objectives.md"),
    "utf-8"
  );

  const prompt = promptTemplate
    .replace("{{projectName}}", project.name || "Unnamed Project")
    .replace("{{projectUrl}}", project.url || "No website provided")
    .replace("{{projectDescription}}", project.description || "No description provided yet.");

  // Create streaming response
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const completion = await openai.chat.completions.create({
          model: DEFAULT_MODEL,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          stream: true,
        });

        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "text", content })}\n\n`
              )
            );
          }
        }

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error("Objectives draft error:", error);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", error: errorMessage })}\n\n`
          )
        );
      }

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






