"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createTalent(
  businessId: string,
  data: {
    name: string;
    description?: string | null;
    image_url?: string | null;
  }
) {
  const supabase = await createClient();

  const { data: talent, error } = await supabase
    .from("business_talent")
    .insert({
      business_id: businessId,
      name: data.name,
      description: data.description || null,
      image_url: data.image_url || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating talent:", error);
    return { error: error.message };
  }

  revalidatePath(`/${businessId}/strategy`);
  return { success: true, talent };
}

export async function updateTalent(
  talentId: string,
  businessId: string,
  data: {
    name?: string;
    description?: string | null;
    image_url?: string | null;
  }
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("business_talent")
    .update(data)
    .eq("id", talentId);

  if (error) {
    console.error("Error updating talent:", error);
    return { error: error.message };
  }

  revalidatePath(`/${businessId}/strategy`);
  return { success: true };
}

export async function deleteTalent(talentId: string, businessId: string) {
  const supabase = await createClient();

  // First get the talent to check if there's an image to delete
  const { data: talent } = await supabase
    .from("business_talent")
    .select("image_url")
    .eq("id", talentId)
    .single();

  // Delete the image from storage if it exists
  if (talent?.image_url) {
    const imagePath = talent.image_url.split("/talent-images/")[1];
    if (imagePath) {
      await supabase.storage.from("talent-images").remove([imagePath]);
    }
  }

  const { error } = await supabase
    .from("business_talent")
    .delete()
    .eq("id", talentId);

  if (error) {
    console.error("Error deleting talent:", error);
    return { error: error.message };
  }

  revalidatePath(`/${businessId}/strategy`);
  return { success: true };
}

export async function uploadTalentImage(
  businessId: string,
  talentId: string,
  formData: FormData
) {
  const supabase = await createClient();

  const file = formData.get("file") as File;
  if (!file) {
    return { error: "No file provided" };
  }

  // Generate a unique filename
  const fileExt = file.name.split(".").pop();
  const fileName = `${businessId}/${talentId}-${Date.now()}.${fileExt}`;

  // Upload the file
  const { error: uploadError } = await supabase.storage
    .from("talent-images")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) {
    console.error("Error uploading talent image:", uploadError);
    return { error: uploadError.message };
  }

  // Get the public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from("talent-images").getPublicUrl(fileName);

  // Update the talent record with the image URL
  const { error: updateError } = await supabase
    .from("business_talent")
    .update({ image_url: publicUrl })
    .eq("id", talentId);

  if (updateError) {
    console.error("Error updating talent image URL:", updateError);
    return { error: updateError.message };
  }

  revalidatePath(`/${businessId}/strategy`);
  return { success: true, imageUrl: publicUrl };
}


