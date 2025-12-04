import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { IdeasFeed, IdeasEmptyState } from "@/components/ideas/ideas-feed";
import { GenerateIdeasButton } from "@/components/ideas/generate-ideas-button";
import { Idea } from "@/lib/types";

interface FeedPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function FeedPage({ params }: FeedPageProps) {
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

  // Fetch ideas for this business, newest first
  const { data: ideas } = await supabase
    .from("ideas")
    .select("*")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  const typedIdeas = (ideas || []) as Idea[];

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="border-b border-[var(--border)] bg-[var(--grey-0)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-medium text-[var(--grey-800)] tracking-[-0.25px]">
                {business.name}
              </h1>
              <p className="text-sm text-[var(--grey-400)] mt-0.5">
                {typedIdeas.length} {typedIdeas.length === 1 ? "idea" : "ideas"}
              </p>
            </div>
            <GenerateIdeasButton businessId={business.id} />
          </div>
        </div>
      </div>

      {/* Feed Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          {typedIdeas.length > 0 ? (
            <IdeasFeed ideas={typedIdeas} businessId={business.id} />
          ) : (
            <IdeasEmptyState />
          )}
        </div>
      </div>
    </div>
  );
}
