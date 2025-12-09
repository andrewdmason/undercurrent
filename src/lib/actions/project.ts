"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateProjectInfo(
  projectId: string,
  data: {
    name?: string;
    slug?: string;
    url?: string | null;
    description?: string | null;
    business_objectives?: string | null;
  }
) {
  const supabase = await createClient();

  // Get the current project slug for revalidation
  const { data: project } = await supabase
    .from("projects")
    .select("slug")
    .eq("id", projectId)
    .single();

  const oldSlug = project?.slug;

  // If slug is being changed, validate it's unique
  if (data.slug && data.slug !== oldSlug) {
    const { data: existingProject } = await supabase
      .from("projects")
      .select("id")
      .eq("slug", data.slug)
      .single();

    if (existingProject) {
      return { error: "This permalink is already taken" };
    }
  }

  const { error } = await supabase
    .from("projects")
    .update(data)
    .eq("id", projectId);

  if (error) {
    console.error("Error updating project info:", error);
    return { error: error.message };
  }

  // Revalidate both old and new slug paths if slug changed
  const newSlug = data.slug || oldSlug;
  if (oldSlug) {
    revalidatePath(`/${oldSlug}`);
    revalidatePath(`/${oldSlug}/settings`);
  }
  if (newSlug && newSlug !== oldSlug) {
    revalidatePath(`/${newSlug}`);
    revalidatePath(`/${newSlug}/settings`);
  }

  return { success: true, newSlug: data.slug };
}

export async function updateStrategyPrompt(
  projectId: string,
  strategyPrompt: string | null
) {
  const supabase = await createClient();

  // Get the project slug for revalidation
  const { data: project } = await supabase
    .from("projects")
    .select("slug")
    .eq("id", projectId)
    .single();

  const { error } = await supabase
    .from("projects")
    .update({ strategy_prompt: strategyPrompt })
    .eq("id", projectId);

  if (error) {
    console.error("Error updating strategy prompt:", error);
    return { error: error.message };
  }

  if (project?.slug) {
    revalidatePath(`/${project.slug}/settings`);
  }
  return { success: true };
}

/**
 * Check if a slug is available (for client-side validation)
 */
export async function checkSlugAvailability(
  slug: string,
  excludeProjectId?: string
): Promise<{ available: boolean }> {
  const supabase = await createClient();

  let query = supabase.from("projects").select("id").eq("slug", slug);

  if (excludeProjectId) {
    query = query.neq("id", excludeProjectId);
  }

  const { data } = await query.single();

  return { available: !data };
}

// ============================================
// DISTRIBUTION CHANNELS
// ============================================

export async function addDistributionChannel(
  projectId: string,
  data: {
    platform: string;
    custom_label?: string | null;
    goal_count?: number | null;
    goal_cadence?: "weekly" | "monthly" | null;
    notes?: string | null;
  }
) {
  const supabase = await createClient();

  // Get the project slug for revalidation
  const { data: project } = await supabase
    .from("projects")
    .select("slug")
    .eq("id", projectId)
    .single();

  const { data: channel, error } = await supabase
    .from("project_channels")
    .insert({
      project_id: projectId,
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

  if (project?.slug) {
    revalidatePath(`/${project.slug}/settings`);
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

  // Get the channel with project slug for revalidation
  const { data: channel } = await supabase
    .from("project_channels")
    .select("project_id, projects(slug)")
    .eq("id", channelId)
    .single();

  const { error } = await supabase
    .from("project_channels")
    .update(data)
    .eq("id", channelId);

  if (error) {
    console.error("Error updating distribution channel:", error);
    return { error: error.message };
  }

  const projects = channel?.projects as unknown as { slug: string } | null;
  if (projects?.slug) {
    revalidatePath(`/${projects.slug}/settings`);
  }
  return { success: true };
}

export async function deleteDistributionChannel(channelId: string) {
  const supabase = await createClient();

  // Get the channel with project slug for revalidation
  const { data: channel } = await supabase
    .from("project_channels")
    .select("project_id, projects(slug)")
    .eq("id", channelId)
    .single();

  const { error } = await supabase
    .from("project_channels")
    .delete()
    .eq("id", channelId);

  if (error) {
    console.error("Error deleting distribution channel:", error);
    return { error: error.message };
  }

  const projects = channel?.projects as unknown as { slug: string } | null;
  if (projects?.slug) {
    revalidatePath(`/${projects.slug}/settings`);
  }
  return { success: true };
}

// ============================================
// TOPICS
// ============================================

export async function addTopic(
  projectId: string,
  data: {
    name: string;
    description?: string | null;
    is_excluded?: boolean;
  }
) {
  const supabase = await createClient();

  // Get the project slug for revalidation
  const { data: project } = await supabase
    .from("projects")
    .select("slug")
    .eq("id", projectId)
    .single();

  const { data: topic, error } = await supabase
    .from("project_topics")
    .insert({
      project_id: projectId,
      name: data.name,
      description: data.description || null,
      is_excluded: data.is_excluded ?? false,
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding topic:", error);
    return { error: error.message };
  }

  if (project?.slug) {
    revalidatePath(`/${project.slug}/settings`);
  }
  return { success: true, topic };
}

export async function updateTopic(
  topicId: string,
  data: {
    name?: string;
    description?: string | null;
    is_excluded?: boolean;
  }
) {
  const supabase = await createClient();

  // Get the topic with project slug for revalidation
  const { data: topic } = await supabase
    .from("project_topics")
    .select("project_id, projects(slug)")
    .eq("id", topicId)
    .single();

  const { error } = await supabase
    .from("project_topics")
    .update(data)
    .eq("id", topicId);

  if (error) {
    console.error("Error updating topic:", error);
    return { error: error.message };
  }

  const projects = topic?.projects as unknown as { slug: string } | null;
  if (projects?.slug) {
    revalidatePath(`/${projects.slug}/settings`);
  }
  return { success: true };
}

export async function deleteTopic(topicId: string) {
  const supabase = await createClient();

  // Get the topic with project slug for revalidation
  const { data: topic } = await supabase
    .from("project_topics")
    .select("project_id, projects(slug)")
    .eq("id", topicId)
    .single();

  const { error } = await supabase
    .from("project_topics")
    .delete()
    .eq("id", topicId);

  if (error) {
    console.error("Error deleting topic:", error);
    return { error: error.message };
  }

  const projects = topic?.projects as unknown as { slug: string } | null;
  if (projects?.slug) {
    revalidatePath(`/${projects.slug}/settings`);
  }
  return { success: true };
}
