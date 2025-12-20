"use server";

import { createClient } from "@/lib/supabase/server";
import {
  SampleVideo,
  ScoredSampleVideo,
  ProjectCharacter,
  DistributionChannel,
  ProjectTemplateWithChannels,
  TemplateOrientation,
} from "@/lib/types";
import {
  getScoredVideos,
  getTopVideosWithVariety,
  UserMatchingContext,
} from "@/lib/sample-video-matching";
import { revalidatePath } from "next/cache";

// Map platforms to their typical orientations
const PLATFORM_ORIENTATIONS: Record<string, TemplateOrientation> = {
  tiktok: "vertical",
  instagram_reels: "vertical",
  youtube_shorts: "vertical",
  snapchat_spotlight: "vertical",
  youtube: "horizontal",
  linkedin: "horizontal",
  facebook: "horizontal",
  x: "vertical",
};

/**
 * Fetch all sample videos from the database
 */
async function fetchAllSampleVideos(): Promise<SampleVideo[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sample_videos")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching sample videos:", error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    youtube_url: row.youtube_url,
    youtube_id: row.youtube_id,
    name: row.name,
    description: row.description,
    thumbnail_url: row.thumbnail_url,
    orientation: row.orientation as TemplateOrientation,
    presenter_type: row.presenter_type,
    requires_human: row.requires_human,
    camera_comfort: row.camera_comfort,
    script_styles: row.script_styles || [],
    locations: row.locations || [],
    equipment: row.equipment || [],
    movement: row.movement || [],
    suggested_platforms: row.suggested_platforms || [],
    created_at: row.created_at,
  }));
}

/**
 * Get scored sample videos for a project
 *
 * Fetches all sample videos, scores them based on the project's
 * characters and channels, and returns the top matches.
 */
export async function getScoredSampleVideos(
  projectId: string
): Promise<ScoredSampleVideo[]> {
  const supabase = await createClient();

  // Fetch project's characters and channels in parallel
  const [charactersResult, channelsResult, allVideos] = await Promise.all([
    supabase
      .from("project_characters")
      .select("*")
      .eq("project_id", projectId),
    supabase
      .from("project_channels")
      .select("*")
      .eq("project_id", projectId),
    fetchAllSampleVideos(),
  ]);

  if (charactersResult.error) {
    console.error("Error fetching characters:", charactersResult.error);
    return [];
  }

  if (channelsResult.error) {
    console.error("Error fetching channels:", channelsResult.error);
    return [];
  }

  const characters: ProjectCharacter[] = (charactersResult.data || []).map((c) => ({
    id: c.id,
    project_id: c.project_id,
    name: c.name,
    description: c.description,
    image_url: c.image_url,
    is_ai_generated: c.is_ai_generated,
    is_voiceover_only: c.is_voiceover_only || false,
    ai_style: c.ai_style,
    member_id: c.member_id,
    interview_data: c.interview_data,
    created_at: c.created_at,
    updated_at: c.updated_at,
  }));

  const channels: DistributionChannel[] = (channelsResult.data || []).map((c) => ({
    id: c.id,
    project_id: c.project_id,
    platform: c.platform,
    custom_label: c.custom_label,
    url: c.url,
    goal_count: c.goal_count,
    goal_cadence: c.goal_cadence,
    created_at: c.created_at,
    updated_at: c.updated_at,
  }));

  const context: UserMatchingContext = {
    characters,
    channels,
  };

  // Score and filter videos
  const scoredVideos = getScoredVideos(allVideos, context);

  // Get top 15 with variety
  return getTopVideosWithVariety(scoredVideos, 15);
}

/**
 * Create templates from selected sample videos
 *
 * For each selected sample video, creates a template and links it
 * to appropriate channels based on orientation matching.
 */
export async function createTemplatesFromSamples(
  projectId: string,
  sampleVideoIds: string[]
): Promise<{ success: true; templates: ProjectTemplateWithChannels[] } | { success: false; error: string }> {
  const supabase = await createClient();

  // Fetch the selected sample videos
  const { data: sampleVideos, error: fetchError } = await supabase
    .from("sample_videos")
    .select("*")
    .in("id", sampleVideoIds);

  if (fetchError || !sampleVideos) {
    console.error("Error fetching sample videos:", fetchError);
    return { success: false, error: "Failed to fetch sample videos" };
  }

  // Fetch project's channels
  const { data: projectChannels, error: channelsError } = await supabase
    .from("project_channels")
    .select("*")
    .eq("project_id", projectId);

  if (channelsError) {
    console.error("Error fetching project channels:", channelsError);
    return { success: false, error: "Failed to fetch project channels" };
  }

  // Get project slug for revalidation
  const { data: project } = await supabase
    .from("projects")
    .select("slug")
    .eq("id", projectId)
    .single();

  const createdTemplates: ProjectTemplateWithChannels[] = [];

  // Create a template for each selected sample video
  for (const video of sampleVideos) {
    // Insert the template
    const { data: template, error: templateError } = await supabase
      .from("project_templates")
      .insert({
        project_id: projectId,
        name: video.name,
        description: video.description,
        source_video_url: video.youtube_url,
        image_url: video.thumbnail_url,
        orientation: video.orientation,
        production_requirements: {
          presenterType: video.presenter_type,
          cameraComfort: video.camera_comfort,
          scriptStyles: video.script_styles || [],
          locations: video.locations || [],
          equipment: video.equipment || [],
          movement: video.movement || [],
        },
      })
      .select()
      .single();

    if (templateError || !template) {
      console.error("Error creating template:", templateError);
      continue; // Skip this one but continue with others
    }

    // Find channels that match the video's orientation
    const matchingChannels = (projectChannels || []).filter((channel) => {
      const channelOrientation = PLATFORM_ORIENTATIONS[channel.platform];
      return channelOrientation === video.orientation;
    });

    // Link template to matching channels
    if (matchingChannels.length > 0) {
      const channelLinks = matchingChannels.map((channel) => ({
        template_id: template.id,
        channel_id: channel.id,
      }));

      const { error: linkError } = await supabase
        .from("template_channels")
        .insert(channelLinks);

      if (linkError) {
        console.error("Error linking template to channels:", linkError);
      }
    }

    createdTemplates.push({
      ...template,
      channels: matchingChannels.map((c) => ({
        id: c.id,
        platform: c.platform,
        custom_label: c.custom_label,
      })),
    });
  }

  if (project?.slug) {
    revalidatePath(`/${project.slug}/settings`);
  }

  return {
    success: true,
    templates: createdTemplates,
  };
}

