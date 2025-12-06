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

  // Fetch the idea with its channels
  const { data: idea } = await supabase
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
    .eq("id", ideaId)
    .eq("business_id", business.id)
    .single();

  if (!idea) {
    notFound();
  }

  // Only allow access to accepted ideas (queue items)
  if (idea.status !== "accepted") {
    redirect(`/${slug}/queue`);
  }

  // Transform the data to flatten channel info
  const typedIdea: IdeaWithChannels = {
    ...idea,
    channels: (idea.idea_channels || [])
      .map((ic: { video_url: string | null; business_distribution_channels: { id: string; platform: string; custom_label: string | null } | null }) => 
        ic.business_distribution_channels ? {
          ...ic.business_distribution_channels,
          video_url: ic.video_url,
        } : null
      )
      .filter(Boolean) as Array<{ id: string; platform: string; custom_label: string | null; video_url: string | null }>,
  };

  return (
    <IdeaDetailView 
      idea={typedIdea} 
      businessId={business.id}
      businessSlug={slug}
    />
  );
}

