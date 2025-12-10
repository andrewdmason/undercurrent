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
    strategy_prompt?: string | null;
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

// ============================================
// REJECTION LEARNING - Apply AI-suggested edits
// ============================================

export type ProjectEditSuggestion =
  | { type: "add_excluded_topic"; name: string; description?: string }
  | { type: "add_topic"; name: string; description?: string }
  | { type: "update_topic"; id: string; name?: string; description: string; oldDescription?: string }
  | { type: "add_template"; name: string; description?: string }
  | { type: "update_template"; id: string; name?: string; description: string; oldDescription?: string }
  | { type: "update_character"; id: string; name?: string; description: string; oldDescription?: string }
  | { type: "update_description"; text: string; oldText?: string }
  | { type: "update_objectives"; text: string; oldText?: string }
  | { type: "update_ai_notes"; text: string; oldText?: string };

export async function applyRejectionEdits(
  projectId: string,
  edits: ProjectEditSuggestion[]
): Promise<{ success: boolean; error?: string; appliedCount?: number }> {
  const supabase = await createClient();

  // Get the project for revalidation and current values
  const { data: project } = await supabase
    .from("projects")
    .select("slug, strategy_prompt")
    .eq("id", projectId)
    .single();

  if (!project) {
    return { success: false, error: "Project not found" };
  }

  let appliedCount = 0;
  const errors: string[] = [];

  for (const edit of edits) {
    try {
      switch (edit.type) {
        case "add_excluded_topic": {
          const { error } = await supabase.from("project_topics").insert({
            project_id: projectId,
            name: edit.name,
            description: edit.description || null,
            is_excluded: true,
          });
          if (error) throw error;
          appliedCount++;
          break;
        }

        case "add_topic": {
          const { error } = await supabase.from("project_topics").insert({
            project_id: projectId,
            name: edit.name,
            description: edit.description || null,
            is_excluded: false,
          });
          if (error) throw error;
          appliedCount++;
          break;
        }

        case "update_topic": {
          const { error } = await supabase
            .from("project_topics")
            .update({ description: edit.description })
            .eq("id", edit.id)
            .eq("project_id", projectId); // Security: ensure topic belongs to this project
          if (error) throw error;
          appliedCount++;
          break;
        }

        case "add_template": {
          const { error } = await supabase.from("project_templates").insert({
            project_id: projectId,
            name: edit.name,
            description: edit.description || null,
          });
          if (error) throw error;
          appliedCount++;
          break;
        }

        case "update_template": {
          const { error } = await supabase
            .from("project_templates")
            .update({ description: edit.description })
            .eq("id", edit.id)
            .eq("project_id", projectId); // Security: ensure template belongs to this project
          if (error) throw error;
          appliedCount++;
          break;
        }

        case "update_character": {
          const { error } = await supabase
            .from("project_characters")
            .update({ description: edit.description })
            .eq("id", edit.id)
            .eq("project_id", projectId); // Security: ensure character belongs to this project
          if (error) throw error;
          appliedCount++;
          break;
        }

        case "update_description": {
          const { error } = await supabase
            .from("projects")
            .update({ description: edit.text })
            .eq("id", projectId);
          if (error) throw error;
          appliedCount++;
          break;
        }

        case "update_objectives": {
          const { error } = await supabase
            .from("projects")
            .update({ business_objectives: edit.text })
            .eq("id", projectId);
          if (error) throw error;
          appliedCount++;
          break;
        }

        case "update_ai_notes": {
          // Append to existing AI notes (strategy_prompt)
          const currentNotes = project.strategy_prompt || "";
          const newNotes = currentNotes
            ? `${currentNotes}\n\n${edit.text}`
            : edit.text;
          const { error } = await supabase
            .from("projects")
            .update({ strategy_prompt: newNotes })
            .eq("id", projectId);
          if (error) throw error;
          appliedCount++;
          break;
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`Error applying edit ${edit.type}:`, error);
      errors.push(`${edit.type}: ${message}`);
    }
  }

  // Revalidate paths
  if (project.slug) {
    revalidatePath(`/${project.slug}`);
    revalidatePath(`/${project.slug}/settings`);
    revalidatePath(`/${project.slug}/settings/topics`);
    revalidatePath(`/${project.slug}/settings/templates`);
    revalidatePath(`/${project.slug}/settings/characters`);
  }

  if (errors.length > 0) {
    return {
      success: false,
      error: `Some edits failed: ${errors.join("; ")}`,
      appliedCount,
    };
  }

  return { success: true, appliedCount };
}

// ============================================
// DELETE PROJECT
// ============================================

/**
 * Delete a project and all related data.
 * Only project admins can delete projects.
 * Cascading deletes in the database handle related records.
 */
export async function deleteProject(projectId: string): Promise<{
  success?: boolean;
  error?: string;
}> {
  const supabase = await createClient();

  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Check if user is a project admin
  const { data: membership } = await supabase
    .from("project_users")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .single();

  if (membership?.role !== "admin") {
    return { error: "Only project admins can delete projects" };
  }

  // Delete the project (cascading deletes handle related records)
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId);

  if (error) {
    console.error("Error deleting project:", error);
    return { error: error.message };
  }

  // Revalidate home page
  revalidatePath("/");
  return { success: true };
}
