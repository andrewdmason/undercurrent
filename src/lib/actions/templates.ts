"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { BusinessTemplateWithChannels } from "@/lib/types";

export async function addTemplate(
  businessId: string,
  data: {
    name: string;
    description?: string | null;
    source_video_url?: string | null;
    image_url?: string | null;
    channelIds?: string[];
  }
): Promise<{ success: true; template: BusinessTemplateWithChannels } | { success: false; error: string }> {
  const supabase = await createClient();

  // Get the business slug for revalidation
  const { data: business } = await supabase
    .from("businesses")
    .select("slug")
    .eq("id", businessId)
    .single();

  // Insert the template
  const { data: template, error } = await supabase
    .from("business_templates")
    .insert({
      business_id: businessId,
      name: data.name,
      description: data.description || null,
      source_video_url: data.source_video_url || null,
      image_url: data.image_url || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding template:", error);
    return { success: false, error: error.message };
  }

  // Insert channel links if provided
  if (data.channelIds && data.channelIds.length > 0) {
    const channelLinks = data.channelIds.map((channelId) => ({
      template_id: template.id,
      channel_id: channelId,
    }));

    const { error: channelError } = await supabase
      .from("template_channels")
      .insert(channelLinks);

    if (channelError) {
      console.error("Error linking template to channels:", channelError);
      // Don't fail the whole operation, just log it
    }
  }

  // Fetch the channels for the response
  const { data: templateChannels } = await supabase
    .from("template_channels")
    .select(`
      channel_id,
      business_distribution_channels (
        id,
        platform,
        custom_label
      )
    `)
    .eq("template_id", template.id);

  const channels = (templateChannels || [])
    .map((tc) => {
      const channel = tc.business_distribution_channels as unknown as {
        id: string;
        platform: string;
        custom_label: string | null;
      } | null;
      return channel ? {
        id: channel.id,
        platform: channel.platform,
        custom_label: channel.custom_label,
      } : null;
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  if (business?.slug) {
    revalidatePath(`/${business.slug}/settings`);
  }

  return {
    success: true,
    template: {
      ...template,
      channels,
    },
  };
}

export async function updateTemplate(
  templateId: string,
  data: {
    name?: string;
    description?: string | null;
    source_video_url?: string | null;
    image_url?: string | null;
    channelIds?: string[];
  }
): Promise<{ success: true; template: BusinessTemplateWithChannels } | { success: false; error: string }> {
  const supabase = await createClient();

  // Get the template with business slug for revalidation
  const { data: existingTemplate } = await supabase
    .from("business_templates")
    .select("business_id, businesses(slug)")
    .eq("id", templateId)
    .single();

  // Update the template fields (excluding channelIds)
  const { channelIds, ...templateData } = data;
  
  if (Object.keys(templateData).length > 0) {
    const { error } = await supabase
      .from("business_templates")
      .update(templateData)
      .eq("id", templateId);

    if (error) {
      console.error("Error updating template:", error);
      return { success: false, error: error.message };
    }
  }

  // Update channel links if provided
  if (channelIds !== undefined) {
    // Delete existing links
    await supabase
      .from("template_channels")
      .delete()
      .eq("template_id", templateId);

    // Insert new links
    if (channelIds.length > 0) {
      const channelLinks = channelIds.map((channelId) => ({
        template_id: templateId,
        channel_id: channelId,
      }));

      const { error: channelError } = await supabase
        .from("template_channels")
        .insert(channelLinks);

      if (channelError) {
        console.error("Error updating template channels:", channelError);
      }
    }
  }

  // Fetch the updated template
  const { data: updatedTemplate, error: fetchError } = await supabase
    .from("business_templates")
    .select("*")
    .eq("id", templateId)
    .single();

  if (fetchError || !updatedTemplate) {
    return { success: false, error: "Failed to fetch updated template" };
  }

  // Fetch the channels for the response
  const { data: templateChannels } = await supabase
    .from("template_channels")
    .select(`
      channel_id,
      business_distribution_channels (
        id,
        platform,
        custom_label
      )
    `)
    .eq("template_id", templateId);

  const channels = (templateChannels || [])
    .map((tc) => {
      const channel = tc.business_distribution_channels as unknown as {
        id: string;
        platform: string;
        custom_label: string | null;
      } | null;
      return channel ? {
        id: channel.id,
        platform: channel.platform,
        custom_label: channel.custom_label,
      } : null;
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  const businesses = existingTemplate?.businesses as unknown as { slug: string } | null;
  if (businesses?.slug) {
    revalidatePath(`/${businesses.slug}/settings`);
  }

  return {
    success: true,
    template: {
      ...updatedTemplate,
      channels,
    },
  };
}

export async function deleteTemplate(templateId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get the template with business slug for revalidation
  const { data: template } = await supabase
    .from("business_templates")
    .select("business_id, businesses(slug)")
    .eq("id", templateId)
    .single();

  // Delete the template (cascade will handle template_channels)
  const { error } = await supabase
    .from("business_templates")
    .delete()
    .eq("id", templateId);

  if (error) {
    console.error("Error deleting template:", error);
    return { success: false, error: error.message };
  }

  const businesses = template?.businesses as unknown as { slug: string } | null;
  if (businesses?.slug) {
    revalidatePath(`/${businesses.slug}/settings`);
  }

  return { success: true };
}

/**
 * Fetch all templates for a business with their channel associations
 */
export async function getTemplatesWithChannels(
  businessId: string
): Promise<BusinessTemplateWithChannels[]> {
  const supabase = await createClient();

  const { data: templates, error } = await supabase
    .from("business_templates")
    .select(`
      *,
      template_channels (
        channel_id,
        business_distribution_channels (
          id,
          platform,
          custom_label
        )
      )
    `)
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching templates:", error);
    return [];
  }

  // Transform the data to flatten channel info
  return (templates || []).map((template) => ({
    ...template,
    channels: (template.template_channels || [])
      .map((tc: { channel_id: string; business_distribution_channels: { id: string; platform: string; custom_label: string | null } | null }) => {
        const channel = tc.business_distribution_channels;
        return channel ? {
          id: channel.id,
          platform: channel.platform,
          custom_label: channel.custom_label,
        } : null;
      })
      .filter((c: unknown): c is { id: string; platform: string; custom_label: string | null } => c !== null),
    template_channels: undefined, // Remove the raw junction data
  }));
}

