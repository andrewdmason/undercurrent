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

  // Fetch NEW ideas for this business, newest first
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
    .eq("status", "new")
    .order("created_at", { ascending: false });

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
            <GenerateIdeasButton businessId={business.id} />
          </div>

          {/* Feed */}
          {typedIdeas.length > 0 ? (
            <IdeasFeed ideas={typedIdeas} businessId={business.id} viewType="inbox" />
          ) : (
            <IdeasEmptyState />
          )}
        </div>
      </div>
    </div>
  );
}

