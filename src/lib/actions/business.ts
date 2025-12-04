"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateBusinessInfo(
  businessId: string,
  data: {
    name?: string;
    slug?: string;
    url?: string | null;
    description?: string | null;
  }
) {
  const supabase = await createClient();

  // Get the current business slug for revalidation
  const { data: business } = await supabase
    .from("businesses")
    .select("slug")
    .eq("id", businessId)
    .single();

  const oldSlug = business?.slug;

  // If slug is being changed, validate it's unique
  if (data.slug && data.slug !== oldSlug) {
    const { data: existingBusiness } = await supabase
      .from("businesses")
      .select("id")
      .eq("slug", data.slug)
      .single();

    if (existingBusiness) {
      return { error: "This permalink is already taken" };
    }
  }

  const { error } = await supabase
    .from("businesses")
    .update(data)
    .eq("id", businessId);

  if (error) {
    console.error("Error updating business info:", error);
    return { error: error.message };
  }

  // Revalidate both old and new slug paths if slug changed
  const newSlug = data.slug || oldSlug;
  if (oldSlug) {
    revalidatePath(`/${oldSlug}`);
    revalidatePath(`/${oldSlug}/strategy`);
  }
  if (newSlug && newSlug !== oldSlug) {
    revalidatePath(`/${newSlug}`);
    revalidatePath(`/${newSlug}/strategy`);
  }

  return { success: true, newSlug: data.slug };
}

export async function updateStrategyPrompt(
  businessId: string,
  strategyPrompt: string | null
) {
  const supabase = await createClient();

  // Get the business slug for revalidation
  const { data: business } = await supabase
    .from("businesses")
    .select("slug")
    .eq("id", businessId)
    .single();

  const { error } = await supabase
    .from("businesses")
    .update({ strategy_prompt: strategyPrompt })
    .eq("id", businessId);

  if (error) {
    console.error("Error updating strategy prompt:", error);
    return { error: error.message };
  }

  if (business?.slug) {
    revalidatePath(`/${business.slug}/strategy`);
  }
  return { success: true };
}

export async function updateContentSources(
  businessId: string,
  sources: string[]
) {
  const supabase = await createClient();

  // Get the business slug for revalidation
  const { data: business } = await supabase
    .from("businesses")
    .select("slug")
    .eq("id", businessId)
    .single();

  const { error } = await supabase
    .from("businesses")
    .update({ content_inspiration_sources: sources })
    .eq("id", businessId);

  if (error) {
    console.error("Error updating content sources:", error);
    return { error: error.message };
  }

  if (business?.slug) {
    revalidatePath(`/${business.slug}/strategy`);
  }
  return { success: true };
}

/**
 * Check if a slug is available (for client-side validation)
 */
export async function checkSlugAvailability(
  slug: string,
  excludeBusinessId?: string
): Promise<{ available: boolean }> {
  const supabase = await createClient();

  let query = supabase.from("businesses").select("id").eq("slug", slug);

  if (excludeBusinessId) {
    query = query.neq("id", excludeBusinessId);
  }

  const { data } = await query.single();

  return { available: !data };
}
