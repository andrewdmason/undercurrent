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

  // Fetch the idea with all its related data
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
      ),
      idea_characters (
        character_id,
        business_characters (
          id,
          name,
          image_url
        )
      ),
      idea_topics (
        topic_id,
        business_topics (
          id,
          name
        )
      ),
      business_templates (
        id,
        name,
        description
      )
    `)
    .eq("id", ideaId)
    .eq("business_id", business.id)
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
      .map((ic: { video_url: string | null; business_distribution_channels: { id: string; platform: string; custom_label: string | null } | null }) => 
        ic.business_distribution_channels ? {
          ...ic.business_distribution_channels,
          video_url: ic.video_url,
        } : null
      )
      .filter(Boolean) as Array<{ id: string; platform: string; custom_label: string | null; video_url: string | null }>,
    template: idea.business_templates || null,
    characters: (idea.idea_characters || [])
      .map((ic: { business_characters: { id: string; name: string; image_url: string | null } | null }) => 
        ic.business_characters
      )
      .filter(Boolean) as Array<{ id: string; name: string; image_url: string | null }>,
    topics: (idea.idea_topics || [])
      .map((it: { business_topics: { id: string; name: string } | null }) => 
        it.business_topics
      )
      .filter(Boolean) as Array<{ id: string; name: string }>,
  };

  return (
    <IdeaDetailView 
      idea={typedIdea} 
      businessId={business.id}
      businessSlug={slug}
    />
  );
}

