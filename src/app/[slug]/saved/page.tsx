import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { IdeasFeed } from "@/components/ideas/ideas-feed";
import { IdeaWithChannels } from "@/lib/types";

interface SavedPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function SavedPage({ params }: SavedPageProps) {
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
    .select("id, slug")
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

  // Fetch bookmarked ideas for this business with their channels, newest first
  const { data: ideas } = await supabase
    .from("ideas")
    .select(`
      *,
      idea_channels (
        channel_id,
        business_distribution_channels (
          id,
          platform,
          custom_label
        )
      )
    `)
    .eq("business_id", business.id)
    .eq("bookmarked", true)
    .order("created_at", { ascending: false });

  // Transform the data to flatten channel info
  const typedIdeas: IdeaWithChannels[] = (ideas || []).map((idea) => ({
    ...idea,
    channels: (idea.idea_channels || [])
      .map((ic: { business_distribution_channels: { id: string; platform: string; custom_label: string | null } | null }) => 
        ic.business_distribution_channels
      )
      .filter(Boolean) as Array<{ id: string; platform: string; custom_label: string | null }>,
  }));

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="border-b border-[var(--border)] bg-[var(--grey-0)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              href={`/${business.slug}`}
              className="inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-[var(--grey-50-a)] transition-colors"
              aria-label="Back to feed"
            >
              <ArrowLeft size={20} className="text-[var(--grey-600)]" />
            </Link>
            <div>
              <h1 className="text-xl font-medium text-[var(--grey-800)] tracking-[-0.25px]">
                Saved Ideas
              </h1>
              <p className="text-sm text-[var(--grey-400)] mt-0.5">
                {typedIdeas.length} {typedIdeas.length === 1 ? "idea" : "ideas"} saved
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Feed Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          {typedIdeas.length > 0 ? (
            <IdeasFeed ideas={typedIdeas} businessId={business.id} />
          ) : (
            <SavedEmptyState slug={business.slug} />
          )}
        </div>
      </div>
    </div>
  );
}

function SavedEmptyState({ slug }: { slug: string }) {
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
          <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
        </svg>
      </div>
      <h3 className="text-lg font-normal text-[var(--grey-800)] mb-2">
        No saved ideas yet
      </h3>
      <p className="text-sm text-[var(--grey-400)] text-center max-w-sm mb-4">
        Bookmark ideas you want to come back to later.
      </p>
      <Link
        href={`/${slug}`}
        className="text-sm text-[#1a5eff] hover:underline"
      >
        Browse all ideas
      </Link>
    </div>
  );
}
