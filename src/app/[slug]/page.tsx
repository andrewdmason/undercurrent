import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { IdeasFeed } from "@/components/ideas/ideas-feed";
import { KanbanBoard } from "@/components/ideas/kanban-board";
import { ViewToggle, ViewMode } from "@/components/ideas/view-toggle";
import { IdeaWithChannels, KANBAN_STATUSES } from "@/lib/types";
import { ChannelFilter } from "@/components/ideas/channel-filter";
import { GenerateIdeasButton } from "@/components/ideas/generate-ideas-button";
import { NewIdeasSection } from "@/components/ideas/new-ideas-section";
import { getChannelSlug } from "@/lib/utils";

interface IdeasPageProps {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    channels?: string;
    view?: string;
  }>;
}

export default async function IdeasPage({ params, searchParams }: IdeasPageProps) {
  const { slug } = await params;
  const { channels: channelFilter, view: viewParam } = await searchParams;
  const selectedSlugs = channelFilter ? channelFilter.split(",") : [];
  const currentView: ViewMode = viewParam === "grid" ? "grid" : "kanban";
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

  // Fetch all data in parallel
  const [
    distributionChannelsResult,
    acceptedIdeasResult,
    newIdeasResult,
    charactersResult,
    templatesResult,
    topicsResult,
  ] = await Promise.all([
    // Distribution channels for the filter
    supabase
      .from("project_channels")
      .select("id, platform, custom_label")
      .eq("project_id", project.id)
      .order("created_at", { ascending: true }),

    // Production pipeline ideas (preproduction, production, postproduction) - published has its own tab
    supabase
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
        ),
        idea_todos (
          id,
          is_complete,
          time_estimate_minutes
        )
      `)
      .eq("project_id", project.id)
      .in("status", KANBAN_STATUSES as unknown as string[])
      .order("sort_order", { ascending: true }),

    // NEW ideas for the review modal
    supabase
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
      .order("created_at", { ascending: false }),

    // Characters for generate modal and review modal
    supabase
      .from("project_characters")
      .select("id, name, image_url")
      .eq("project_id", project.id)
      .order("created_at", { ascending: true }),

    // Templates for generate modal and review modal
    supabase
      .from("project_templates")
      .select("id, name")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false }),

    // Topics for generate modal
    supabase
      .from("project_topics")
      .select("id, name")
      .eq("project_id", project.id)
      .eq("is_excluded", false)
      .order("created_at", { ascending: true }),
  ]);

  const distributionChannels = distributionChannelsResult.data;
  const ideas = acceptedIdeasResult.data;
  const newIdeasRaw = newIdeasResult.data;
  const characters = charactersResult.data || [];
  const templates = templatesResult.data || [];
  const topics = topicsResult.data || [];

  // Helper to transform idea data
  const transformIdea = (idea: typeof ideas extends (infer T)[] | null ? T : never): IdeaWithChannels => {
    // Calculate remaining prep time from todos
    const prepTimeMinutes = (idea.idea_todos || [])
      .filter((todo: { is_complete: boolean }) => !todo.is_complete)
      .reduce((sum: number, todo: { time_estimate_minutes: number | null }) => 
        sum + (todo.time_estimate_minutes || 0), 0);

    return {
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
      prepTimeMinutes,
    };
  };

  // Transform accepted ideas
  const allIdeas: IdeaWithChannels[] = (ideas || []).map(transformIdea);

  // Transform new ideas for review modal
  const newIdeas: IdeaWithChannels[] = (newIdeasRaw || []).map(transformIdea);

  // Filter ideas by selected channel slugs (if any)
  const typedIdeas = selectedSlugs.length > 0
    ? allIdeas.filter((idea) =>
        idea.channels.some((ch) => selectedSlugs.includes(getChannelSlug(ch)))
      )
    : allIdeas;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[var(--grey-25)]">
      {/* Feed Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-lg font-medium text-[var(--grey-800)] tracking-[-0.25px]">
                Ideas
              </h1>
              <p className="text-sm text-[var(--grey-400)] mt-0.5">
                {typedIdeas.length} {typedIdeas.length === 1 ? "idea" : "ideas"} ready to create
                {selectedSlugs.length > 0 && ` (filtered)`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <ViewToggle currentView={currentView} />
              {(distributionChannels?.length ?? 0) > 0 && (
                <ChannelFilter
                  channels={distributionChannels || []}
                  selectedSlugs={selectedSlugs}
                />
              )}
              <GenerateIdeasButton
                projectId={project.id}
                characters={characters}
                channels={distributionChannels || []}
                templates={templates}
                topics={topics}
              />
            </div>
          </div>

          {/* New Ideas Alert Bar */}
          <NewIdeasSection
            ideas={newIdeas}
            projectId={project.id}
            projectSlug={project.slug}
            characters={characters}
            channels={distributionChannels || []}
            templates={templates}
          />

          {/* Feed */}
          {typedIdeas.length > 0 ? (
            currentView === "kanban" ? (
              <KanbanBoard ideas={typedIdeas} projectSlug={project.slug} />
            ) : (
              <IdeasFeed ideas={typedIdeas} projectId={project.id} projectSlug={project.slug} viewType="queue" />
            )
          ) : (
            <IdeasEmptyState />
          )}
        </div>
      </div>
    </div>
  );
}

function IdeasEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--grey-50)] mb-6">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-[var(--grey-400)]"
        >
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
          <path d="M9 14l2 2 4-4" />
        </svg>
      </div>
      <h3 className="text-lg font-normal text-[var(--grey-800)] mb-2">
        No ideas yet
      </h3>
      <p className="text-sm text-[var(--grey-400)] text-center max-w-sm">
        Generate and review ideas to get started.
      </p>
    </div>
  );
}
