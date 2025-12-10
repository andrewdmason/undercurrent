import { createClient } from "@/lib/supabase/server";
import { genai, IMAGE_MODEL } from "@/lib/gemini";
import { getStyleBySlug } from "@/lib/visual-styles";

/**
 * Fetch an image URL and convert to base64 for Gemini input
 */
async function fetchImageAsBase64(
  imageUrl: string
): Promise<{ data: string; mimeType: string } | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.error(`Failed to fetch image: ${response.statusText}`);
      return null;
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    return { data: base64, mimeType: contentType };
  } catch (error) {
    console.error("Error fetching image:", error);
    return null;
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Get request body
  const { projectId, characterDescription, styleSlug, additionalNotes, previousImageUrl } =
    await request.json();

  if (!projectId || !characterDescription || !styleSlug) {
    return new Response(
      JSON.stringify({ error: "Missing required fields" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Verify user has access to this project
  const { data: membership } = await supabase
    .from("project_users")
    .select("id")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return new Response(JSON.stringify({ error: "Access denied" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Get the visual style
  const style = getStyleBySlug(styleSlug);
  if (!style) {
    return new Response(JSON.stringify({ error: "Invalid style" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Build the image generation prompt - adjust based on photo vs illustration style
  const isPhotoStyle = style.type === "photo";

  const promptParts = [
    isPhotoStyle
      ? "Generate a PHOTOREALISTIC medium close-up portrait of a real human person, styled like a YouTuber talking directly to camera."
      : "Generate an ILLUSTRATED medium close-up portrait of a character, styled like a YouTuber talking directly to camera.",
    "",
    "## CRITICAL Composition Requirements",
    "",
    "This MUST look like a frame from a YouTube video where someone is talking to their audience:",
    "",
    "- Framing: Medium close-up shot - head and upper chest/shoulders visible, cropped at roughly mid-chest level",
    "- Pose: Character facing the camera DIRECTLY, looking straight at the viewer. Simple, neutral pose with hands down and out of frame. NOT holding anything. NOT doing any action. NOT gesturing.",
    "- Expression: Friendly, approachable, mid-sentence expression—like they're explaining something to the viewer",
    "- Body position: Shoulders square to camera or turned very slightly. Arms relaxed at sides (out of frame)",
    "- Background: Simple, slightly blurred background suggesting a home office, studio, or casual indoor setting. Nothing distracting.",
    "- Aspect Ratio: Square (1:1) for avatar use",
    "",
    "## What NOT to include",
    "",
    "- NO hands visible in the frame",
    "- NO props or objects being held",
    "- NO action poses or dynamic gestures",
    "- NO full body shots",
    "- NO side profiles - must be facing camera",
    "- NO busy or distracting backgrounds",
  ];

  // For photo styles, add extra emphasis on photorealism
  if (isPhotoStyle) {
    promptParts.push(
      "",
      "## IMPORTANT: Photorealistic Style",
      "",
      "This MUST be a photorealistic image of a REAL HUMAN PERSON - NOT a cartoon, NOT an illustration, NOT stylized.",
      "Even if the character concept sounds fantastical, interpret it as a real person who embodies that concept.",
      "Think: professional photography, real skin texture, real lighting, real human features."
    );
  }

  promptParts.push(
    "",
    "## Character Concept",
    characterDescription,
    "",
    "## Visual Style",
    style.prompt
  );

  // If we have a previous image, add refinement instructions
  if (previousImageUrl && additionalNotes) {
    promptParts.push(
      "",
      "## Refinement Request",
      "",
      "I'm providing a reference image of this character that was previously generated. Please create a new version that keeps the same character appearance, pose, and framing, but applies this change:",
      additionalNotes,
      "",
      "Maintain consistency with the reference image while making the requested adjustments."
    );
  } else if (additionalNotes) {
    promptParts.push("", "## Additional Direction", additionalNotes);
  }

  promptParts.push(
    "",
    "Generate an image that looks like a still frame from a YouTube video where this character is talking directly to their audience. Think of the classic 'YouTuber in their room talking to camera' framing - simple, direct, engaging."
  );

  const fullPrompt = promptParts.join("\n");

  try {
    // Build content parts - include previous image if provided for refinement
    const contents: (string | { inlineData: { data: string; mimeType: string } })[] = [fullPrompt];

    if (previousImageUrl) {
      const imageData = await fetchImageAsBase64(previousImageUrl);
      if (imageData) {
        contents.push({
          inlineData: {
            data: imageData.data,
            mimeType: imageData.mimeType,
          },
        });
      }
    }

    // Log the prompt being sent
    const logEntry = {
      project_id: projectId,
      type: "ai_character" as const,
      prompt_sent: fullPrompt + (previousImageUrl ? "\n\n[Previous image attached for reference]" : ""),
      model: IMAGE_MODEL,
      response_raw: null as string | null,
      error: null as string | null,
    };

    // Call Gemini for image generation
    const response = await genai.models.generateContent({
      model: IMAGE_MODEL,
      contents: contents,
    });

    // Extract the generated image from the response
    let imageData: string | null = null;
    let imageMimeType: string = "image/png";

    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          imageData = part.inlineData.data || null;
          imageMimeType = part.inlineData.mimeType || "image/png";
          break;
        }
      }
    }

    if (!imageData) {
      console.error("No image generated in response:", response);
      // Log the failed attempt
      logEntry.error = "No image was generated";
      logEntry.response_raw = JSON.stringify(response);
      await supabase.from("generation_logs").insert(logEntry);
      
      return new Response(
        JSON.stringify({ error: "No image was generated" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Convert base64 to buffer for upload
    const imageBuffer = Buffer.from(imageData, "base64");
    const fileExt = imageMimeType === "image/png" ? "png" : "jpg";
    const fileName = `${projectId}/ai-character-${Date.now()}.${fileExt}`;

    // Upload to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from("character-images")
      .upload(fileName, imageBuffer, {
        contentType: imageMimeType,
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.error("Error uploading image:", uploadError);
      return new Response(
        JSON.stringify({ error: `Failed to upload image: ${uploadError.message}` }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get the public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("character-images").getPublicUrl(fileName);

    // Log the successful generation
    logEntry.response_raw = `Image generated successfully: ${publicUrl}`;
    await supabase.from("generation_logs").insert(logEntry);

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: publicUrl,
        styleSlug: styleSlug,
        styleName: style.name,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating AI character image:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    
    // Log the error
    await supabase.from("generation_logs").insert({
      project_id: projectId,
      type: "ai_character",
      prompt_sent: fullPrompt,
      model: IMAGE_MODEL,
      response_raw: null,
      error: errorMessage,
    });
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

