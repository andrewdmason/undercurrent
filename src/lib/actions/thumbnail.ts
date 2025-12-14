"use server";

import { createClient } from "@/lib/supabase/server";
import { genai, IMAGE_MODEL, THUMBNAIL_ASPECT_RATIO } from "@/lib/gemini";
import { revalidatePath } from "next/cache";

interface CharacterMatch {
  name: string;
  imageUrl: string;
}

/**
 * Detect characters mentioned in the idea's title and description
 * Returns characters with their image URLs
 */
async function detectCharactersInIdea(
  projectId: string,
  title: string,
  description: string | null
): Promise<CharacterMatch[]> {
  const supabase = await createClient();

  // Fetch all characters for this project
  const { data: characters } = await supabase
    .from("project_characters")
    .select("name, image_url")
    .eq("project_id", projectId);

  if (!characters || characters.length === 0) {
    return [];
  }

  const textToSearch = `${title} ${description || ""}`.toLowerCase();
  const matches: CharacterMatch[] = [];

  for (const person of characters) {
    if (!person.image_url) continue;

    // Check if any part of the name appears in the text
    // Match on first name or full name
    const nameParts = person.name.toLowerCase().split(" ");
    const firstName = nameParts[0];

    if (
      textToSearch.includes(person.name.toLowerCase()) ||
      textToSearch.includes(firstName)
    ) {
      matches.push({
        name: person.name,
        imageUrl: person.image_url,
      });
    }
  }

  return matches;
}

/**
 * Fetch image as base64 for Gemini multimodal input
 */
async function fetchImageAsBase64(
  imageUrl: string
): Promise<{ data: string; mimeType: string } | null> {
  try {
    // Handle local seed images (they start with /seed/)
    if (imageUrl.startsWith("/seed/")) {
      const fs = await import("fs/promises");
      const path = await import("path");
      const filePath = path.join(process.cwd(), "public", imageUrl);
      const buffer = await fs.readFile(filePath);
      const base64 = buffer.toString("base64");
      const ext = imageUrl.split(".").pop()?.toLowerCase();
      const mimeType = ext === "png" ? "image/png" : "image/jpeg";
      return { data: base64, mimeType };
    }

    // Handle remote URLs
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

/**
 * Generate a thumbnail for an idea using Gemini's image generation
 */
export async function generateThumbnail(ideaId: string, projectId: string) {
  const supabase = await createClient();

  // Fetch the idea
  const { data: idea, error: ideaError } = await supabase
    .from("ideas")
    .select("id, title, description")
    .eq("id", ideaId)
    .single();

  if (ideaError || !idea) {
    console.error("Error fetching idea:", ideaError);
    return { error: "Idea not found" };
  }

  // Detect characters mentioned in the idea
  const characterMatches = await detectCharactersInIdea(
    projectId,
    idea.title,
    idea.description
  );

  // Get project slug for revalidation
  const { data: project } = await supabase
    .from("projects")
    .select("slug")
    .eq("id", projectId)
    .single();

  // Build the generation prompt
  let promptText = `Create a compelling video thumbnail image. The aspect ratio should be ${THUMBNAIL_ASPECT_RATIO} (landscape).

Title: ${idea.title}
${idea.description ? `Description: ${idea.description}` : ""}

Style guidelines:
- Eye-catching and clickable
- Clear visual hierarchy
- Vibrant colors that pop
- Professional but approachable
- DO NOT include any text or titles in the image`;

  if (characterMatches.length > 0) {
    promptText += `\n\nThe following people should appear in the thumbnail: ${characterMatches.map((c) => c.name).join(", ")}. Use the provided reference photos to accurately depict them.`;
  }

  try {
    // Build the content parts for Gemini
    const contents: (string | { inlineData: { data: string; mimeType: string } })[] = [promptText];

    // Add character images if we have any
    for (const character of characterMatches) {
      const imageData = await fetchImageAsBase64(character.imageUrl);
      if (imageData) {
        contents.push({
          inlineData: {
            data: imageData.data,
            mimeType: imageData.mimeType,
          },
        });
      }
    }

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
      return { error: "No image was generated" };
    }

    // Convert base64 to buffer for upload
    const imageBuffer = Buffer.from(imageData, "base64");
    const fileExt = imageMimeType === "image/png" ? "png" : "jpg";
    const fileName = `${projectId}/${ideaId}-${Date.now()}.${fileExt}`;

    // Upload to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from("idea-images")
      .upload(fileName, imageBuffer, {
        contentType: imageMimeType,
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.error("Error uploading image:", uploadError);
      return { error: `Failed to upload image: ${uploadError.message}` };
    }

    // Get the public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("idea-images").getPublicUrl(fileName);

    // Update the idea with the new image URL
    const { error: updateError } = await supabase
      .from("ideas")
      .update({ image_url: publicUrl })
      .eq("id", ideaId);

    if (updateError) {
      console.error("Error updating idea:", updateError);
      return { error: `Failed to update idea: ${updateError.message}` };
    }

    // Revalidate paths
    if (project?.slug) {
      revalidatePath(`/${project.slug}`);
      revalidatePath(`/${project.slug}/saved`);
    }

    return { success: true, imageUrl: publicUrl };
  } catch (error) {
    console.error("Error generating thumbnail:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return { error: errorMessage };
  }
}
