import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Business, BusinessTalent } from "@/lib/types";
import { BusinessInfoForm } from "@/components/strategy/business-info-form";
import { TalentSection } from "@/components/strategy/talent-section";
import { ContentSourcesSection } from "@/components/strategy/content-sources-section";
import { StrategyPromptSection } from "@/components/strategy/strategy-prompt-section";

interface StrategyPageProps {
  params: Promise<{
    businessId: string;
  }>;
}

export default async function StrategyPage({ params }: StrategyPageProps) {
  const { businessId } = await params;
  const supabase = await createClient();

  // Verify user has access to this business
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    notFound();
  }

  const { data: membership } = await supabase
    .from("business_users")
    .select("id")
    .eq("business_id", businessId)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    notFound();
  }

  // Get business details
  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", businessId)
    .single();

  if (!business) {
    notFound();
  }

  // Get talent for this business
  const { data: talent } = await supabase
    .from("business_talent")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: true });

  const typedBusiness = business as Business;
  const typedTalent = (talent || []) as BusinessTalent[];

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
          <TalentSection businessId={businessId} talent={typedTalent} />

          {/* Content Sources Section */}
          <ContentSourcesSection
            businessId={businessId}
            sources={typedBusiness.content_inspiration_sources || []}
          />

          {/* Strategy Prompt Section */}
          <StrategyPromptSection
            businessId={businessId}
            strategyPrompt={typedBusiness.strategy_prompt || ""}
          />
        </div>
      </div>
    </div>
  );
}

