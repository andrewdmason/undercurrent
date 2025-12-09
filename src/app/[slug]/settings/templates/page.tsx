"use client";

import { TemplatesSection } from "@/components/strategy/templates-section";
import { useSettings } from "@/components/settings/settings-context";

export default function SettingsTemplatesPage() {
  const { business, templates, channels } = useSettings();

  return (
    <TemplatesSection
      businessId={business.id}
      templates={templates}
      channels={channels}
    />
  );
}
