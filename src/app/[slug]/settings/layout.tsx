import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Business, BusinessCharacter, DistributionChannel, BusinessTopic, BusinessTemplateWithChannels } from "@/lib/types";
import { SettingsNav } from "@/components/settings/settings-nav";
import { SettingsProvider } from "@/components/settings/settings-context";

interface SettingsLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    slug: string;
  }>;
}

export default async function SettingsLayout({ children, params }: SettingsLayoutProps) {
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

  // Get templates for this business with their channel associations
  const { data: templates } = await supabase
    .from("business_templates")
    .select(`
      *,
      template_channels (
        channel_id,
        business_distribution_channels (
          id,
          platform,
          custom_label
        )
      )
    `)
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  const typedBusiness = business as Business;
  const typedCharacters = (characters || []) as BusinessCharacter[];
  const typedChannels = (distributionChannels || []) as DistributionChannel[];
  const typedTopics = (topics || []) as BusinessTopic[];

  // Transform templates to flatten channel info
  const typedTemplates: BusinessTemplateWithChannels[] = (templates || []).map((template) => ({
    ...template,
    channels: (template.template_channels || [])
      .map((tc: { channel_id: string; business_distribution_channels: { id: string; platform: string; custom_label: string | null } | null }) => {
        const channel = tc.business_distribution_channels;
        return channel ? {
          id: channel.id,
          platform: channel.platform,
          custom_label: channel.custom_label,
        } : null;
      })
      .filter((c: unknown): c is { id: string; platform: string; custom_label: string | null } => c !== null),
    template_channels: undefined,
  }));

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

          {/* Nav */}
          <SettingsNav slug={slug} />

          {/* Content */}
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
            <SettingsProvider
              business={typedBusiness}
              characters={typedCharacters}
              channels={typedChannels}
              topics={typedTopics}
              templates={typedTemplates}
            >
              {children}
            </SettingsProvider>
          </div>
        </div>
      </div>
    </div>
  );
}
