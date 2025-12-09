"use client";

import { DistributionChannelsSection } from "@/components/strategy/distribution-channels-section";
import { useSettings } from "@/components/settings/settings-context";

export default function SettingsChannelsPage() {
  const { project, channels } = useSettings();

  return <DistributionChannelsSection projectId={project.id} channels={channels} />;
}
