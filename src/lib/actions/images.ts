"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function createProjectImage(
  projectId: string,
  data: {
    image_url: string;
    title?: string | null;
    description?: string | null;
  }
) {
  const supabase = await createClient();

  // Get project slug for revalidation
  const { data: project } = await supabase
    .from("projects")
    .select("slug")
    .eq("id", projectId)
    .single();

  const { data: image, error } = await supabase
    .from("project_images")
    .insert({
      project_id: projectId,
      image_url: data.image_url,
      title: data.title || null,
      description: data.description || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating project image:", error);
    return { error: error.message };
  }

  if (project?.slug) {
    revalidatePath(`/${project.slug}/brief/images`);
  }
  return { success: true, image };
}

export async function updateProjectImage(
  imageId: string,
  projectId: string,
  data: {
    title?: string | null;
    description?: string | null;
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
    .from("project_images")
    .update(data)
    .eq("id", imageId);

  if (error) {
    console.error("Error updating project image:", error);
    return { error: error.message };
  }

  if (project?.slug) {
    revalidatePath(`/${project.slug}/brief/images`);
  }
  return { success: true };
}

export async function deleteProjectImage(imageId: string, projectId: string) {
  const supabase = await createClient();

  // Get project slug for revalidation
  const { data: project } = await supabase
    .from("projects")
    .select("slug")
    .eq("id", projectId)
    .single();

  // First get the image to check if there's a file to delete
  const { data: image } = await supabase
    .from("project_images")
    .select("image_url")
    .eq("id", imageId)
    .single();

  // Delete the image from Supabase storage if it exists in our bucket
  if (image?.image_url && image.image_url.includes("/project-images/")) {
    const imagePath = image.image_url.split("/project-images/")[1];
    if (imagePath) {
      await supabase.storage.from("project-images").remove([imagePath]);
    }
  }

  const { error } = await supabase
    .from("project_images")
    .delete()
    .eq("id", imageId);

  if (error) {
    console.error("Error deleting project image:", error);
    return { error: error.message };
  }

  if (project?.slug) {
    revalidatePath(`/${project.slug}/brief/images`);
  }
  return { success: true };
}

export async function uploadProjectImage(
  projectId: string,
  formData: FormData
) {
  const supabase = await createClient();

  // Get project slug for revalidation
  const { data: project } = await supabase
    .from("projects")
    .select("slug, description")
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
  const nameParts = file.name.split(".");
  let fileExt = nameParts.length > 1 ? nameParts.pop() : null;
  
  // If no extension from filename, derive from MIME type
  if (!fileExt) {
    const mimeToExt: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/gif": "gif",
      "image/webp": "webp",
    };
    fileExt = mimeToExt[file.type] || "jpg";
  }
  
  const fileName = `${projectId}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

  // Upload the file
  const { error: uploadError } = await supabase.storage
    .from("project-images")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    console.error("Error uploading project image:", uploadError);
    return { error: uploadError.message };
  }

  // Get the public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from("project-images").getPublicUrl(fileName);

  // Call the AI analysis endpoint to get title/description
  let title: string | null = null;
  let description: string | null = null;

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/analyze-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageUrl: publicUrl,
        projectDescription: project?.description || "",
      }),
    });

    if (response.ok) {
      const result = await response.json();
      title = result.title;
      description = result.description;
    }
  } catch (e) {
    console.error("Error analyzing image:", e);
    // Continue without AI-generated metadata
  }

  // Create the database record
  const { data: image, error: dbError } = await supabase
    .from("project_images")
    .insert({
      project_id: projectId,
      image_url: publicUrl,
      title,
      description,
    })
    .select()
    .single();

  if (dbError) {
    console.error("Error creating project image record:", dbError);
    // Try to clean up the uploaded file
    await supabase.storage.from("project-images").remove([fileName]);
    return { error: dbError.message };
  }

  if (project?.slug) {
    revalidatePath(`/${project.slug}/brief/images`);
  }
  return { success: true, image };
}

