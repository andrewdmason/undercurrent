"use client";

import { DistributionChannelsSection } from "@/components/strategy/distribution-channels-section";
import { useBrief } from "@/components/brief/brief-context";

export default function BriefChannelsPage() {
  const { project, channels } = useBrief();

  return <DistributionChannelsSection projectId={project.id} channels={channels} />;
}

