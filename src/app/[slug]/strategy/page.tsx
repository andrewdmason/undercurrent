import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Business, BusinessTalent, DistributionChannel } from "@/lib/types";
import { BusinessInfoForm } from "@/components/strategy/business-info-form";
import { TalentSection } from "@/components/strategy/talent-section";
import { ContentSourcesSection } from "@/components/strategy/content-sources-section";
import { DistributionChannelsSection } from "@/components/strategy/distribution-channels-section";
import { StrategyPromptSection } from "@/components/strategy/strategy-prompt-section";

interface StrategyPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function StrategyPage({ params }: StrategyPageProps) {
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

  // Get talent for this business
  const { data: talent } = await supabase
    .from("business_talent")
    .select("*")
    .eq("business_id", business.id)
    .order("created_at", { ascending: true });

  // Get distribution channels for this business
  const { data: distributionChannels } = await supabase
    .from("business_distribution_channels")
    .select("*")
    .eq("business_id", business.id)
    .order("created_at", { ascending: true });

  const typedBusiness = business as Business;
  const typedTalent = (talent || []) as BusinessTalent[];
  const typedChannels = (distributionChannels || []) as DistributionChannel[];

  return (
    <div className="pb-12">
      {/* Header */}
      <div className="border-b border-[var(--border)] bg-[var(--grey-0)]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <h1 className="text-xl font-medium text-[var(--grey-800)] tracking-[-0.25px]">
            Strategy Settings
          </h1>
          <p className="text-sm text-[var(--grey-400)] mt-0.5">
            Configure your business details and video marketing strategy
          </p>
        </div>
      </div>

      {/* Content */}
      <div>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          {/* Business Info Section */}
          <BusinessInfoForm business={typedBusiness} />

          {/* Talent Section */}
          <TalentSection businessId={business.id} talent={typedTalent} />

          {/* Content Sources Section */}
          <ContentSourcesSection
            businessId={business.id}
            sources={typedBusiness.content_inspiration_sources || []}
          />

          {/* Distribution Channels Section */}
          <DistributionChannelsSection
            businessId={business.id}
            channels={typedChannels}
          />

          {/* Strategy Prompt Section */}
          <StrategyPromptSection
            businessId={business.id}
            strategyPrompt={typedBusiness.strategy_prompt || ""}
          />
        </div>
      </div>
    </div>
  );
}
