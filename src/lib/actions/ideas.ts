"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateIdeaRating(
  ideaId: string,
  rating: "up" | "down" | null,
  businessId: string
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("ideas")
    .update({ rating })
    .eq("id", ideaId);

  if (error) {
    console.error("Error updating idea rating:", error);
    return { error: error.message };
  }

  revalidatePath(`/${businessId}`);
  revalidatePath(`/${businessId}/saved`);
  return { success: true };
}

export async function updateIdeaBookmark(
  ideaId: string,
  bookmarked: boolean,
  businessId: string
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("ideas")
    .update({ bookmarked })
    .eq("id", ideaId);

  if (error) {
    console.error("Error updating idea bookmark:", error);
    return { error: error.message };
  }

  revalidatePath(`/${businessId}`);
  revalidatePath(`/${businessId}/saved`);
  return { success: true };
}


