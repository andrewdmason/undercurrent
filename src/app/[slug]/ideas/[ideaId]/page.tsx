import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { IdeaWithChannels } from "@/lib/types";
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
    .from("project_users")
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
          image_url
        )
      ),
      idea_topics (
        topic_id,
        project_topics (
          id,
          name
        )
      ),
      project_templates (
        id,
        name,
        description
      )
    `)
    .eq("id", ideaId)
    .eq("project_id", project.id)
    .single();

  if (!idea) {
    notFound();
  }

  // Only allow access to accepted ideas (create items)
  if (idea.status !== "accepted") {
    redirect(`/${slug}/create`);
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
      .map((ic: { project_characters: { id: string; name: string; image_url: string | null } | null }) => 
        ic.project_characters
      )
      .filter(Boolean) as Array<{ id: string; name: string; image_url: string | null }>,
    topics: (idea.idea_topics || [])
      .map((it: { project_topics: { id: string; name: string } | null }) => 
        it.project_topics
      )
      .filter(Boolean) as Array<{ id: string; name: string }>,
  };

  return (
    <IdeaDetailView 
      idea={typedIdea} 
      projectId={project.id}
      projectSlug={slug}
    />
  );
}
