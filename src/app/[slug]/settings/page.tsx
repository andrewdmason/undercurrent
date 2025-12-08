import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Business, BusinessCharacter, DistributionChannel, BusinessTopic } from "@/lib/types";
import { SettingsTabs } from "@/components/settings/settings-tabs";

interface SettingsPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function SettingsPage({ params }: SettingsPageProps) {
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
    .select("*")
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

  // Get characters for this business
  const { data: characters } = await supabase
    .from("business_characters")
    .select("*")
    .eq("business_id", business.id)
    .order("created_at", { ascending: true });

  // Get distribution channels for this business
  const { data: distributionChannels } = await supabase
    .from("business_distribution_channels")
    .select("*")
    .eq("business_id", business.id)
    .order("created_at", { ascending: true });

  // Get topics for this business
  const { data: topics } = await supabase
    .from("business_topics")
    .select("*")
    .eq("business_id", business.id)
    .order("created_at", { ascending: true });

  const typedBusiness = business as Business;
  const typedCharacters = (characters || []) as BusinessCharacter[];
  const typedChannels = (distributionChannels || []) as DistributionChannel[];
  const typedTopics = (topics || []) as BusinessTopic[];

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[var(--grey-25)]">
      <div className="flex-1 overflow-y-auto">
        <div className="pb-12">
          {/* Header */}
          <div>
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
              <h1 className="text-xl font-medium text-[var(--grey-800)] tracking-[-0.25px]">
                Project Settings
              </h1>
              <p className="text-sm text-[var(--grey-400)] mt-0.5">
                Configure your project details and video marketing strategy
              </p>
            </div>
          </div>

          {/* Tabs */}
          <SettingsTabs
            business={typedBusiness}
            characters={typedCharacters}
            channels={typedChannels}
            topics={typedTopics}
          />
        </div>
      </div>
    </div>
  );
}
