"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface TeamMember {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string;
  created_at: string;
}

/**
 * Get all team members for a business
 * Uses RPC function to bypass profiles RLS
 */
export async function getTeamMembers(businessId: string): Promise<{
  members?: TeamMember[];
  error?: string;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .rpc("get_team_members", { business_id_param: businessId });

  if (error) {
    console.error("Error fetching team members:", error);
    return { error: error.message };
  }

  // Get current user's email (we can only see our own email)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const members: TeamMember[] = (data || []).map((bu: { id: string; user_id: string; full_name: string | null; created_at: string }) => ({
    id: bu.id,
    user_id: bu.user_id,
    full_name: bu.full_name,
    email: bu.user_id === user?.id ? user?.email || "" : "",
    created_at: bu.created_at,
  }));

  return { members };
}

/**
 * Get the invite link for a business
 */
export async function getInviteLink(businessId: string): Promise<{
  inviteUrl?: string;
  error?: string;
}> {
  const supabase = await createClient();

  const { data: business, error } = await supabase
    .from("businesses")
    .select("invite_token")
    .eq("id", businessId)
    .single();

  if (error || !business) {
    console.error("Error fetching invite token:", error);
    return { error: error?.message || "Business not found" };
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const inviteUrl = `${baseUrl}/invite/${business.invite_token}`;

  return { inviteUrl };
}

/**
 * Regenerate the invite link for a business (invalidates the old link)
 */
export async function regenerateInviteLink(businessId: string): Promise<{
  inviteUrl?: string;
  error?: string;
}> {
  const supabase = await createClient();

  // Get business slug for revalidation
  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("slug")
    .eq("id", businessId)
    .single();

  if (businessError || !business) {
    console.error("Error fetching business:", businessError);
    return { error: businessError?.message || "Business not found" };
  }

  // Generate new token using crypto.randomUUID()
  const { data: updated, error } = await supabase
    .from("businesses")
    .update({ invite_token: crypto.randomUUID() })
    .eq("id", businessId)
    .select("invite_token")
    .single();

  if (error || !updated) {
    console.error("Error regenerating invite token:", error);
    return { error: error?.message || "Failed to regenerate link" };
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const inviteUrl = `${baseUrl}/invite/${updated.invite_token}`;

  if (business?.slug) {
    revalidatePath(`/${business.slug}/team`);
  }

  return { inviteUrl };
}

/**
 * Get business info by invite token (for the invite landing page)
 * Uses RPC function to securely bypass RLS
 */
export async function getBusinessByInviteToken(token: string): Promise<{
  business?: {
    id: string;
    name: string;
    slug: string;
  };
  error?: string;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .rpc("get_business_by_invite_token", { invite_token_param: token });

  if (error) {
    console.error("Error looking up invite token:", error);
    return { error: "Invalid invite link" };
  }

  const business = data?.[0];
  if (!business) {
    return { error: "Invalid invite link" };
  }

  return { business };
}

/**
 * Accept an invite (adds user to business)
 */
export async function acceptInvite(token: string): Promise<{
  success?: boolean;
  business_slug?: string;
  error?: string;
}> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in to accept an invite" };
  }

  // Get business by invite token
  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("id, slug")
    .eq("invite_token", token)
    .single();

  if (businessError || !business) {
    return { error: "Invalid invite link" };
  }

  // Check if already a member
  const { data: existingMember } = await supabase
    .from("business_users")
    .select("id")
    .eq("business_id", business.id)
    .eq("user_id", user.id)
    .single();

  if (existingMember) {
    // Already a member, just redirect
    return { success: true, business_slug: business.slug };
  }

  // Add user to business
  const { error: addError } = await supabase.from("business_users").insert({
    business_id: business.id,
    user_id: user.id,
  });

  if (addError) {
    console.error("Error adding user to business:", addError);
    return { error: addError.message };
  }

  return { success: true, business_slug: business.slug };
}

/**
 * Remove a team member from a business
 */
export async function removeTeamMember(
  businessId: string,
  userId: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();

  // Get business for revalidation
  const { data: business } = await supabase
    .from("businesses")
    .select("slug")
    .eq("id", businessId)
    .single();

  const { error } = await supabase
    .from("business_users")
    .delete()
    .eq("business_id", businessId)
    .eq("user_id", userId);

  if (error) {
    console.error("Error removing team member:", error);
    return { error: error.message };
  }

  if (business?.slug) {
    revalidatePath(`/${business.slug}/team`);
  }
  return { success: true };
}
