"use client";

import { DistributionChannelsSection } from "@/components/strategy/distribution-channels-section";
import { useSettings } from "@/components/settings/settings-context";

export default function SettingsChannelsPage() {
  const { business, channels } = useSettings();

  return <DistributionChannelsSection businessId={business.id} channels={channels} />;
}
