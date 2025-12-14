import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { IdeaWithChannels, IdeaAsset, PRODUCTION_STATUSES } from "@/lib/types";
import { IdeaDetailView } from "@/components/ideas/idea-detail-view";

interface IdeaDetailPageProps {
  params: Promise<{
    slug: string;
    ideaId: string;
  }>;
}

export default async function IdeaDetailPage({ params }: IdeaDetailPageProps) {
  const { slug, ideaId } = await params;
  const supabase = await createClient();

  // Verify user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    notFound();
  }

  // Get project by slug
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, slug")
    .eq("slug", slug)
    .single();

  if (!project) {
    notFound();
  }

  // Verify user has access to this project
  const { data: membership } = await supabase
    .from("project_members")
    .select("id")
    .eq("project_id", project.id)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    notFound();
  }

  // Fetch the idea with all its related data
  const { data: idea } = await supabase
    .from("ideas")
    .select(`
      *,
      idea_channels (
        channel_id,
        video_url,
        project_channels (
          id,
          platform,
          custom_label
        )
      ),
      idea_characters (
        character_id,
        project_characters (
          id,
          name,
          description,
          image_url
        )
      ),
      idea_topics (
        topic_id,
        project_topics (
          id,
          name,
          description
        )
      ),
      project_templates (
        id,
        name,
        description,
        image_url,
        source_video_url
      )
    `)
    .eq("id", ideaId)
    .eq("project_id", project.id)
    .single();

  // Fetch all project channels for template editing
  const { data: projectChannels } = await supabase
    .from("project_channels")
    .select("*")
    .eq("project_id", project.id)
    .order("created_at");

  // Fetch all project characters for remix modal
  const { data: projectCharacters } = await supabase
    .from("project_characters")
    .select("id, name, image_url")
    .eq("project_id", project.id)
    .order("created_at");

  // Fetch all project templates for remix modal (with their channels)
  const { data: projectTemplatesRaw } = await supabase
    .from("project_templates")
    .select(`
      id, 
      name,
      template_channels (
        distribution_channels:channel_id (
          id,
          platform
        )
      )
    `)
    .eq("project_id", project.id)
    .order("created_at");
  
  // Transform templates to flatten the nested channels structure
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const projectTemplates = (projectTemplatesRaw || []).map((t: any) => ({
    id: t.id as string,
    name: t.name as string,
    channels: (t.template_channels || [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((tc: any) => tc.distribution_channels)
      .filter(Boolean) as Array<{ id: string; platform: string }>,
  }));

  // Fetch all project topics (included only) for remix modal
  const { data: projectTopics } = await supabase
    .from("project_topics")
    .select("id, name")
    .eq("project_id", project.id)
    .eq("is_excluded", false)
    .order("created_at");

  // Fetch template channels if idea has a template
  let templateChannels: string[] = [];
  if (idea?.template_id) {
    const { data: tc } = await supabase
      .from("template_channels")
      .select("channel_id")
      .eq("template_id", idea.template_id);
    templateChannels = tc?.map(t => t.channel_id) || [];
  }

  // Fetch idea assets
  const { data: ideaAssets } = await supabase
    .from("idea_assets")
    .select("*")
    .eq("idea_id", ideaId)
    .order("sort_order", { ascending: true });

  if (!idea) {
    notFound();
  }

  // Only allow access to ideas in production pipeline (preproduction, production, postproduction, published)
  if (!PRODUCTION_STATUSES.includes(idea.status as typeof PRODUCTION_STATUSES[number])) {
    redirect(`/${slug}`);
  }

  // Transform the data to flatten related info
  const typedIdea: IdeaWithChannels = {
    ...idea,
    channels: (idea.idea_channels || [])
      .map((ic: { video_url: string | null; project_channels: { id: string; platform: string; custom_label: string | null } | null }) => 
        ic.project_channels ? {
          ...ic.project_channels,
          video_url: ic.video_url,
        } : null
      )
      .filter(Boolean) as Array<{ id: string; platform: string; custom_label: string | null; video_url: string | null }>,
    template: idea.project_templates || null,
    characters: (idea.idea_characters || [])
      .map((ic: { project_characters: { id: string; name: string; description: string | null; image_url: string | null } | null }) => 
        ic.project_characters
      )
      .filter(Boolean) as Array<{ id: string; name: string; description?: string | null; image_url: string | null }>,
    topics: (idea.idea_topics || [])
      .map((it: { project_topics: { id: string; name: string; description: string | null } | null }) => 
        it.project_topics
      )
      .filter(Boolean) as Array<{ id: string; name: string; description?: string | null }>,
  };

  // Build full template with channels if available
  const fullTemplate = idea.project_templates ? {
    ...idea.project_templates,
    project_id: project.id,
    created_at: "",
    updated_at: "",
    channels: templateChannels.map(channelId => {
      const channel = projectChannels?.find(c => c.id === channelId);
      return channel ? { id: channel.id, platform: channel.platform, custom_label: channel.custom_label } : null;
    }).filter(Boolean) as Array<{ id: string; platform: string; custom_label: string | null }>,
  } : null;

  return (
    <IdeaDetailView 
      idea={typedIdea} 
      projectId={project.id}
      projectSlug={slug}
      projectChannels={projectChannels || []}
      projectCharacters={projectCharacters || []}
      projectTemplates={projectTemplates || []}
      projectTopics={projectTopics || []}
      fullTemplate={fullTemplate}
      initialAssets={(ideaAssets || []) as IdeaAsset[]}
    />
  );
}
