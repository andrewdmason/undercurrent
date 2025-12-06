import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { IdeasFeed, IdeasEmptyState } from "@/components/ideas/ideas-feed";
import { IdeaWithChannels } from "@/lib/types";

interface QueuePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function QueuePage({ params }: QueuePageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  // Verify user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    notFound();
  }

  // Get business by slug
  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, slug")
    .eq("slug", slug)
    .single();

  if (!business) {
    notFound();
  }

  // Verify user has access to this business
  const { data: membership } = await supabase
    .from("business_users")
    .select("id")
    .eq("business_id", business.id)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    notFound();
  }

  // Fetch ACCEPTED ideas for this business (production queue), oldest first (FIFO)
  const { data: ideas } = await supabase
    .from("ideas")
    .select(`
      *,
      idea_channels (
        channel_id,
        video_url,
        business_distribution_channels (
          id,
          platform,
          custom_label
        )
      )
    `)
    .eq("business_id", business.id)
    .eq("status", "accepted")
    .order("created_at", { ascending: true });

  // Transform the data to flatten channel info
  const typedIdeas: IdeaWithChannels[] = (ideas || []).map((idea) => ({
    ...idea,
    channels: (idea.idea_channels || [])
      .map((ic: { video_url: string | null; business_distribution_channels: { id: string; platform: string; custom_label: string | null } | null }) => 
        ic.business_distribution_channels ? {
          ...ic.business_distribution_channels,
          video_url: ic.video_url,
        } : null
      )
      .filter(Boolean) as Array<{ id: string; platform: string; custom_label: string | null; video_url: string | null }>,
  }));

  return (
    <div className="flex-1 flex flex-col bg-[var(--grey-25)]">
      {/* Feed Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-[540px] mx-auto px-4 py-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-lg font-medium text-[var(--grey-800)] tracking-[-0.25px]">
              Production Queue
            </h1>
            <p className="text-sm text-[var(--grey-400)] mt-0.5">
              {typedIdeas.length} {typedIdeas.length === 1 ? "video" : "videos"} ready to produce
            </p>
          </div>

          {/* Feed */}
          {typedIdeas.length > 0 ? (
            <IdeasFeed ideas={typedIdeas} businessId={business.id} businessSlug={business.slug} viewType="queue" />
          ) : (
            <QueueEmptyState />
          )}
        </div>
      </div>
    </div>
  );
}

function QueueEmptyState() {
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
        Queue is empty
      </h3>
      <p className="text-sm text-[var(--grey-400)] text-center max-w-sm">
        Accept ideas from your inbox to add them to the production queue.
      </p>
    </div>
  );
}


