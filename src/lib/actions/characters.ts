"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createCharacter(
  projectId: string,
  data: {
    name: string;
    description?: string | null;
    image_url?: string | null;
    is_ai_generated?: boolean;
    is_voiceover_only?: boolean;
    ai_style?: string | null;
    member_id?: string | null;
  }
) {
  const supabase = await createClient();

  // Get project slug for revalidation
  const { data: project } = await supabase
    .from("projects")
    .select("slug")
    .eq("id", projectId)
    .single();

  const { data: character, error } = await supabase
    .from("project_characters")
    .insert({
      project_id: projectId,
      name: data.name,
      description: data.description || null,
      image_url: data.image_url || null,
      is_ai_generated: data.is_ai_generated || false,
      is_voiceover_only: data.is_voiceover_only || false,
      ai_style: data.ai_style || null,
      member_id: data.member_id || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating character:", error);
    return { error: error.message };
  }

  if (project?.slug) {
    revalidatePath(`/${project.slug}/settings`);
  }
  return { success: true, character };
}

export async function updateCharacter(
  characterId: string,
  projectId: string,
  data: {
    name?: string;
    description?: string | null;
    image_url?: string | null;
    is_ai_generated?: boolean;
    is_voiceover_only?: boolean;
    ai_style?: string | null;
    member_id?: string | null;
  }
) {
  const supabase = await createClient();

  // Get project slug for revalidation
  const { data: project } = await supabase
    .from("projects")
    .select("slug")
    .eq("id", projectId)
    .single();

  const { error } = await supabase
    .from("project_characters")
    .update(data)
    .eq("id", characterId);

  if (error) {
    console.error("Error updating character:", error);
    return { error: error.message };
  }

  if (project?.slug) {
    revalidatePath(`/${project.slug}/settings`);
  }
  return { success: true };
}

export async function deleteCharacter(characterId: string, projectId: string) {
  const supabase = await createClient();

  // Get project slug for revalidation
  const { data: project } = await supabase
    .from("projects")
    .select("slug")
    .eq("id", projectId)
    .single();

  // First get the character to check if there's an image to delete
  const { data: character } = await supabase
    .from("project_characters")
    .select("image_url")
    .eq("id", characterId)
    .single();

  // Delete the image from Supabase storage if it exists
  // Only delete if it's a Supabase storage URL (contains /character-images/)
  // Skip seed data URLs (like /seed/characters/) which are static public files
  if (character?.image_url && character.image_url.includes("/character-images/")) {
    const imagePath = character.image_url.split("/character-images/")[1];
    if (imagePath) {
      await supabase.storage.from("character-images").remove([imagePath]);
    }
  }

  const { error } = await supabase
    .from("project_characters")
    .delete()
    .eq("id", characterId);

  if (error) {
    console.error("Error deleting character:", error);
    return { error: error.message };
  }

  if (project?.slug) {
    revalidatePath(`/${project.slug}/settings`);
  }
  return { success: true };
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function uploadCharacterImage(
  projectId: string,
  characterId: string,
  formData: FormData
) {
  const supabase = await createClient();

  // Get project slug for revalidation
  const { data: project } = await supabase
    .from("projects")
    .select("slug")
    .eq("id", projectId)
    .single();

  const file = formData.get("file") as File;
  if (!file) {
    return { error: "No file provided" };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return { error: `Image must be less than 5MB. Your file is ${(file.size / (1024 * 1024)).toFixed(1)}MB.` };
  }

  // Generate a unique filename
  // Extract extension from filename, or fallback to MIME type
  const nameParts = file.name.split(".");
  let fileExt = nameParts.length > 1 ? nameParts.pop() : null;
  
  // If no extension from filename, derive from MIME type
  if (!fileExt) {
    const mimeToExt: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/gif": "gif",
      "image/webp": "webp",
      "image/svg+xml": "svg",
    };
    fileExt = mimeToExt[file.type] || "jpg"; // Default to jpg if unknown
  }
  
  const fileName = `${projectId}/${characterId}-${Date.now()}.${fileExt}`;

  // Upload the file
  const { error: uploadError } = await supabase.storage
    .from("character-images")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) {
    console.error("Error uploading character image:", uploadError);
    return { error: uploadError.message };
  }

  // Get the public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from("character-images").getPublicUrl(fileName);

  // Update the character record with the image URL
  const { error: updateError } = await supabase
    .from("project_characters")
    .update({ image_url: publicUrl })
    .eq("id", characterId);

  if (updateError) {
    console.error("Error updating character image URL:", updateError);
    return { error: updateError.message };
  }

  if (project?.slug) {
    revalidatePath(`/${project.slug}/settings`);
  }
  return { success: true, imageUrl: publicUrl };
}
