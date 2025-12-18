import { createClient } from "@/lib/supabase/server";
import { readFile } from "fs/promises";
import path from "path";
import { CoachVoice } from "@/hooks/use-recording-coach-settings";

// OpenAI Realtime API model
const REALTIME_MODEL = "gpt-4o-realtime-preview-2024-12-17";

export async function POST(request: Request) {
  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Parse request body
  const { ideaId, voice } = (await request.json()) as {
    ideaId: string;
    voice?: CoachVoice;
  };

  if (!ideaId) {
    return new Response("Missing ideaId", { status: 400 });
  }

  // Fetch the idea with project context
  const { data: idea, error: ideaError } = await supabase
    .from("ideas")
    .select(`
      id,
      title,
      description,
      project_id
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

  // Fetch talking points asset
  const { data: talkingPointsAsset } = await supabase
    .from("idea_assets")
    .select("content_text")
    .eq("idea_id", ideaId)
    .eq("type", "talking_points")
    .single();

  const talkingPoints = talkingPointsAsset?.content_text || "No talking points generated yet.";

  // Build system prompt from template
  const promptTemplate = await readFile(
    path.join(process.cwd(), "prompts", "recording-coach.md"),
    "utf-8"
  );

  const systemPrompt = promptTemplate
    .replace("{{ideaTitle}}", idea.title || "Untitled")
    .replace("{{ideaDescription}}", idea.description || "No description")
    .replace("{{talkingPoints}}", talkingPoints);

  // Create ephemeral token from OpenAI Realtime API
  const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: REALTIME_MODEL,
      voice: voice || "alloy",
      instructions: systemPrompt,
      input_audio_transcription: {
        model: "whisper-1",
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenAI Realtime session creation failed:", errorText);
    return new Response(`Failed to create session: ${errorText}`, { status: 500 });
  }

  const sessionData = await response.json();

  // Return the session data (includes client_secret for WebRTC connection)
  return Response.json({
    clientSecret: sessionData.client_secret?.value,
    expiresAt: sessionData.client_secret?.expires_at,
    sessionId: sessionData.id,
  });
}


