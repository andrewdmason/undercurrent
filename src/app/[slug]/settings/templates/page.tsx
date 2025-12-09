"use client";

import { TemplatesSection } from "@/components/strategy/templates-section";
import { useSettings } from "@/components/settings/settings-context";

export default function SettingsTemplatesPage() {
  const { project, templates, channels } = useSettings();

  return (
    <TemplatesSection
      projectId={project.id}
      templates={templates}
      channels={channels}
    />
  );
}
