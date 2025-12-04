"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateBusinessInfo(
  businessId: string,
  data: {
    name?: string;
    url?: string | null;
    description?: string | null;
  }
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("businesses")
    .update(data)
    .eq("id", businessId);

  if (error) {
    console.error("Error updating business info:", error);
    return { error: error.message };
  }

  revalidatePath(`/${businessId}`);
  revalidatePath(`/${businessId}/strategy`);
  return { success: true };
}

export async function updateStrategyPrompt(
  businessId: string,
  strategyPrompt: string | null
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("businesses")
    .update({ strategy_prompt: strategyPrompt })
    .eq("id", businessId);

  if (error) {
    console.error("Error updating strategy prompt:", error);
    return { error: error.message };
  }

  revalidatePath(`/${businessId}/strategy`);
  return { success: true };
}

export async function updateContentSources(
  businessId: string,
  sources: string[]
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("businesses")
    .update({ content_inspiration_sources: sources })
    .eq("id", businessId);

  if (error) {
    console.error("Error updating content sources:", error);
    return { error: error.message };
  }

  revalidatePath(`/${businessId}/strategy`);
  return { success: true };
}


