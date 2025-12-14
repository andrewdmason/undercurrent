import { createClient } from "@/lib/supabase/server";
import { openai, DEFAULT_MODEL } from "@/lib/openai";
import { readFile } from "fs/promises";
import path from "path";

// Extract text content from HTML, stripping tags and normalizing whitespace
function extractTextFromHtml(html: string): string {
  // Remove script and style tags with their content
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  text = text.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, "");
  
  // Remove all HTML tags
  text = text.replace(/<[^>]+>/g, " ");
  
  // Decode common HTML entities
  text = text.replace(/&nbsp;/g, " ");
  text = text.replace(/&amp;/g, "&");
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  
  // Normalize whitespace
  text = text.replace(/\s+/g, " ").trim();
  
  return text;
}

// Fetch website content with timeout
async function fetchWebsiteContent(url: string): Promise<string | null> {
  try {
    // Ensure URL has protocol
    let fullUrl = url;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      fullUrl = `https://${url}`;
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    const response = await fetch(fullUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Undercurrent/1.0; +https://undercurrent.app)",
      },
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.log(`Failed to fetch ${fullUrl}: ${response.status}`);
      return null;
    }
    
    const html = await response.text();
    const text = extractTextFromHtml(html);
    
    // Limit to ~4000 chars to avoid token overflow
    return text.slice(0, 4000);
  } catch (error) {
    console.log(`Error fetching website: ${error}`);
    return null;
  }
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
    .select("name, url")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    return new Response("Project not found", { status: 404 });
  }

  // Try to fetch website content if URL is provided
  let websiteContent: string | null = null;
  if (project.url) {
    websiteContent = await fetchWebsiteContent(project.url);
  }

  // Build the prompt from template
  const promptTemplate = await readFile(
    path.join(process.cwd(), "prompts", "draft-business-description.md"),
    "utf-8"
  );

  let prompt = promptTemplate
    .replace("{{projectName}}", project.name || "Unnamed Project")
    .replace("{{projectUrl}}", project.url || "No website provided");
  
  // Add website content if we got it
  if (websiteContent) {
    prompt = prompt.replace(
      "{{websiteContent}}",
      `\n\n## Website Content (scraped from ${project.url})\n\n${websiteContent}`
    );
  } else {
    prompt = prompt.replace("{{websiteContent}}", "");
  }

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
        console.error("Description draft error:", error);
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

