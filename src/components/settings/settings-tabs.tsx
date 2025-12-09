"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Business, BusinessCharacter, DistributionChannel, BusinessTopic, BusinessTemplateWithChannels } from "@/lib/types";
import { BusinessInfoForm } from "@/components/strategy/business-info-form";
import { CharactersSection } from "@/components/strategy/characters-section";
import { TopicsSection } from "@/components/strategy/topics-section";
import { DistributionChannelsSection } from "@/components/strategy/distribution-channels-section";
import { TemplatesSection } from "@/components/strategy/templates-section";

const VALID_TABS = ["general", "topics", "channels", "characters", "templates"] as const;
type TabValue = (typeof VALID_TABS)[number];

interface SettingsTabsProps {
  business: Business;
  characters: BusinessCharacter[];
  channels: DistributionChannel[];
  topics: BusinessTopic[];
  templates: BusinessTemplateWithChannels[];
}

export function SettingsTabs({
  business,
  characters,
  channels,
  topics,
  templates,
}: SettingsTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const tabParam = searchParams.get("tab");
  const currentTab: TabValue = VALID_TABS.includes(tabParam as TabValue) 
    ? (tabParam as TabValue) 
    : "general";

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "general") {
      params.delete("tab");
    } else {
      params.set("tab", value);
    }
    const queryString = params.toString();
    router.push(`${pathname}${queryString ? `?${queryString}` : ""}`, { scroll: false });
  };

  return (
    <Tabs value={currentTab} onValueChange={handleTabChange}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-2">
        <TabsList className="h-9 p-1 bg-[var(--grey-50)] rounded-lg">
          <TabsTrigger
            value="general"
            className="rounded-md px-3 text-sm font-medium text-[var(--grey-400)] data-[state=active]:bg-white data-[state=active]:text-[var(--grey-800)] data-[state=active]:shadow-sm"
          >
            General
          </TabsTrigger>
          <TabsTrigger
            value="topics"
            className="rounded-md px-3 text-sm font-medium text-[var(--grey-400)] data-[state=active]:bg-white data-[state=active]:text-[var(--grey-800)] data-[state=active]:shadow-sm"
          >
            Topics
          </TabsTrigger>
          <TabsTrigger
            value="channels"
            className="rounded-md px-3 text-sm font-medium text-[var(--grey-400)] data-[state=active]:bg-white data-[state=active]:text-[var(--grey-800)] data-[state=active]:shadow-sm"
          >
            Channels
          </TabsTrigger>
          <TabsTrigger
            value="characters"
            className="rounded-md px-3 text-sm font-medium text-[var(--grey-400)] data-[state=active]:bg-white data-[state=active]:text-[var(--grey-800)] data-[state=active]:shadow-sm"
          >
            Characters
          </TabsTrigger>
          <TabsTrigger
            value="templates"
            className="rounded-md px-3 text-sm font-medium text-[var(--grey-400)] data-[state=active]:bg-white data-[state=active]:text-[var(--grey-800)] data-[state=active]:shadow-sm"
          >
            Style Templates
          </TabsTrigger>
        </TabsList>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <TabsContent value="general" className="mt-0">
          <BusinessInfoForm business={business} />
        </TabsContent>

        <TabsContent value="topics" className="mt-0">
          <TopicsSection businessId={business.id} topics={topics} />
        </TabsContent>

        <TabsContent value="channels" className="mt-0">
          <DistributionChannelsSection businessId={business.id} channels={channels} />
        </TabsContent>

        <TabsContent value="characters" className="mt-0">
          <CharactersSection businessId={business.id} characters={characters} />
        </TabsContent>

        <TabsContent value="templates" className="mt-0">
          <TemplatesSection
            businessId={business.id}
            templates={templates}
            channels={channels}
          />
        </TabsContent>
      </div>
    </Tabs>
  );
}
