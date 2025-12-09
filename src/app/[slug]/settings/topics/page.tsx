"use client";

import { TopicsSection } from "@/components/strategy/topics-section";
import { useSettings } from "@/components/settings/settings-context";

export default function SettingsTopicsPage() {
  const { business, topics } = useSettings();

  return <TopicsSection businessId={business.id} topics={topics} />;
}
