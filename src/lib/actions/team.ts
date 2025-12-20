"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

import { ProjectRole } from "@/lib/types";

export interface TeamMember {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string;
  role: ProjectRole;
  created_at: string;
}

/**
 * Get all team members for a project
 * Uses RPC function to bypass profiles RLS
 */
export async function getTeamMembers(projectId: string): Promise<{
  members?: TeamMember[];
  error?: string;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .rpc("get_team_members", { project_id_param: projectId });

  if (error) {
    console.error("Error fetching team members:", error);
    return { error: error.message };
  }

  // Get current user's email (we can only see our own email)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const members: TeamMember[] = (data || []).map((pu: { id: string; user_id: string; full_name: string | null; role: ProjectRole; created_at: string }) => ({
    id: pu.id,
    user_id: pu.user_id,
    full_name: pu.full_name,
    email: pu.user_id === user?.id ? user?.email || "" : "",
    role: pu.role,
    created_at: pu.created_at,
  }));

  return { members };
}

/**
 * Get the invite link for a project
 */
export async function getInviteLink(projectId: string): Promise<{
  inviteUrl?: string;
  error?: string;
}> {
  const supabase = await createClient();

  const { data: project, error } = await supabase
    .from("projects")
    .select("invite_token")
    .eq("id", projectId)
    .single();

  if (error || !project) {
    console.error("Error fetching invite token:", error);
    return { error: error?.message || "Project not found" };
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
    (process.env.NODE_ENV === "production" ? "https://undercurrent-weld.vercel.app" : "http://localhost:3000");
  const inviteUrl = `${baseUrl}/invite/${project.invite_token}`;

  return { inviteUrl };
}

/**
 * Regenerate the invite link for a project (invalidates the old link)
 */
export async function regenerateInviteLink(projectId: string): Promise<{
  inviteUrl?: string;
  error?: string;
}> {
  const supabase = await createClient();

  // Get project slug for revalidation
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("slug")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    console.error("Error fetching project:", projectError);
    return { error: projectError?.message || "Project not found" };
  }

  // Generate new token using crypto.randomUUID()
  const { data: updated, error } = await supabase
    .from("projects")
    .update({ invite_token: crypto.randomUUID() })
    .eq("id", projectId)
    .select("invite_token")
    .single();

  if (error || !updated) {
    console.error("Error regenerating invite token:", error);
    return { error: error?.message || "Failed to regenerate link" };
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
    (process.env.NODE_ENV === "production" ? "https://undercurrent-weld.vercel.app" : "http://localhost:3000");
  const inviteUrl = `${baseUrl}/invite/${updated.invite_token}`;

  if (project?.slug) {
    revalidatePath(`/${project.slug}/team`);
  }

  return { inviteUrl };
}

/**
 * Get project info by invite token (for the invite landing page)
 * Uses RPC function to securely bypass RLS
 */
export async function getProjectByInviteToken(token: string): Promise<{
  project?: {
    id: string;
    name: string;
    slug: string;
  };
  error?: string;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .rpc("get_project_by_invite_token", { invite_token_param: token });

  if (error) {
    console.error("Error looking up invite token:", error);
    return { error: "Invalid invite link" };
  }

  const project = data?.[0];
  if (!project) {
    return { error: "Invalid invite link" };
  }

  return { project };
}

/**
 * Accept an invite (adds user to project)
 * Uses RPC function to bypass RLS since user isn't a member yet
 */
export async function acceptInvite(token: string): Promise<{
  success?: boolean;
  project_slug?: string;
  error?: string;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .rpc("accept_project_invite", { invite_token_param: token });

  if (error) {
    console.error("Error accepting invite:", error);
    return { error: "Failed to accept invite" };
  }

  const result = data?.[0];
  if (!result) {
    return { error: "Failed to accept invite" };
  }

  if (!result.success) {
    return { error: result.error_message || "Invalid invite link" };
  }

  return { success: true, project_slug: result.project_slug };
}

/**
 * Get the current user's role in a project
 */
export async function getCurrentUserRole(projectId: string): Promise<{
  role?: ProjectRole;
  error?: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .single();

  if (error) {
    console.error("Error fetching user role:", error);
    return { error: error.message };
  }

  return { role: data.role as ProjectRole };
}

/**
 * Update a team member's role in a project
 */
export async function updateTeamMemberRole(
  projectId: string,
  userId: string,
  newRole: ProjectRole
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();

  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Check if current user is an admin of this project
  const { data: currentMembership } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .single();

  if (currentMembership?.role !== "admin") {
    return { error: "Only admins can change member roles" };
  }

  // Don't allow admins to demote themselves (prevents orphaned projects)
  if (userId === user.id && newRole !== "admin") {
    return { error: "You cannot remove your own admin status" };
  }

  // Get project for revalidation
  const { data: project } = await supabase
    .from("projects")
    .select("slug")
    .eq("id", projectId)
    .single();

  // Update the role
  const { error } = await supabase
    .from("project_members")
    .update({ role: newRole })
    .eq("project_id", projectId)
    .eq("user_id", userId);

  if (error) {
    console.error("Error updating team member role:", error);
    return { error: error.message };
  }

  if (project?.slug) {
    revalidatePath(`/${project.slug}/team`);
  }
  return { success: true };
}

/**
 * Remove a team member from a project
 */
export async function removeTeamMember(
  projectId: string,
  userId: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();

  // Get project for revalidation
  const { data: project } = await supabase
    .from("projects")
    .select("slug")
    .eq("id", projectId)
    .single();

  const { error } = await supabase
    .from("project_members")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", userId);

  if (error) {
    console.error("Error removing team member:", error);
    return { error: error.message };
  }

  if (project?.slug) {
    revalidatePath(`/${project.slug}/team`);
  }
  return { success: true };
}
