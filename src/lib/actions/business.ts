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

// ============================================
// DISTRIBUTION CHANNELS
// ============================================

export async function addDistributionChannel(
  businessId: string,
  data: {
    platform: string;
    custom_label?: string | null;
    goal_count?: number | null;
    goal_cadence?: "weekly" | "monthly" | null;
    notes?: string | null;
  }
) {
  const supabase = await createClient();

  // Get the business slug for revalidation
  const { data: business } = await supabase
    .from("businesses")
    .select("slug")
    .eq("id", businessId)
    .single();

  const { data: channel, error } = await supabase
    .from("business_distribution_channels")
    .insert({
      business_id: businessId,
      platform: data.platform,
      custom_label: data.custom_label || null,
      goal_count: data.goal_count || null,
      goal_cadence: data.goal_cadence || null,
      notes: data.notes || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding distribution channel:", error);
    return { error: error.message };
  }

  if (business?.slug) {
    revalidatePath(`/${business.slug}/strategy`);
  }
  return { success: true, channel };
}

export async function updateDistributionChannel(
  channelId: string,
  data: {
    custom_label?: string | null;
    goal_count?: number | null;
    goal_cadence?: "weekly" | "monthly" | null;
    notes?: string | null;
  }
) {
  const supabase = await createClient();

  // Get the channel with business slug for revalidation
  const { data: channel } = await supabase
    .from("business_distribution_channels")
    .select("business_id, businesses(slug)")
    .eq("id", channelId)
    .single();

  const { error } = await supabase
    .from("business_distribution_channels")
    .update(data)
    .eq("id", channelId);

  if (error) {
    console.error("Error updating distribution channel:", error);
    return { error: error.message };
  }

  const businesses = channel?.businesses as unknown as { slug: string } | null;
  if (businesses?.slug) {
    revalidatePath(`/${businesses.slug}/strategy`);
  }
  return { success: true };
}

export async function deleteDistributionChannel(channelId: string) {
  const supabase = await createClient();

  // Get the channel with business slug for revalidation
  const { data: channel } = await supabase
    .from("business_distribution_channels")
    .select("business_id, businesses(slug)")
    .eq("id", channelId)
    .single();

  const { error } = await supabase
    .from("business_distribution_channels")
    .delete()
    .eq("id", channelId);

  if (error) {
    console.error("Error deleting distribution channel:", error);
    return { error: error.message };
  }

  const businesses = channel?.businesses as unknown as { slug: string } | null;
  if (businesses?.slug) {
    revalidatePath(`/${businesses.slug}/strategy`);
  }
  return { success: true };
}
