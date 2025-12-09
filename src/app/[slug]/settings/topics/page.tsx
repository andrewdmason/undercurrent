"use client";

import { TopicsSection } from "@/components/strategy/topics-section";
import { useSettings } from "@/components/settings/settings-context";

export default function SettingsTopicsPage() {
  const { project, topics } = useSettings();

  return <TopicsSection projectId={project.id} topics={topics} />;
}
