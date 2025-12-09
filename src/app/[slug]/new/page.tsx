import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { IdeasFeed, IdeasEmptyState } from "@/components/ideas/ideas-feed";
import { GenerateIdeasButton } from "@/components/ideas/generate-ideas-button";
import { IdeaWithChannels } from "@/lib/types";

interface NewIdeasPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function NewIdeasPage({ params }: NewIdeasPageProps) {
  const { slug } = await params;
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

  // Fetch NEW ideas for this project, newest first
  const { data: ideas } = await supabase
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
    .eq("project_id", project.id)
    .eq("status", "new")
    .order("created_at", { ascending: false });

  // Transform the data to flatten related info
  const typedIdeas: IdeaWithChannels[] = (ideas || []).map((idea) => ({
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
  }));

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[var(--grey-25)]">
      {/* Feed Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[540px] mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-lg font-medium text-[var(--grey-800)] tracking-[-0.25px]">
                New Ideas
              </h1>
              <p className="text-sm text-[var(--grey-400)] mt-0.5">
                Review and accept ideas to start creating
              </p>
            </div>
            <GenerateIdeasButton projectId={project.id} />
          </div>

          {/* Feed */}
          {typedIdeas.length > 0 ? (
            <IdeasFeed ideas={typedIdeas} projectId={project.id} projectSlug={project.slug} viewType="inbox" />
          ) : (
            <IdeasEmptyState />
          )}
        </div>
      </div>
    </div>
  );
}
