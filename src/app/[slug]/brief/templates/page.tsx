"use client";

import { TemplatesSection } from "@/components/strategy/templates-section";
import { useBrief } from "@/components/brief/brief-context";

export default function BriefTemplatesPage() {
  const { project, templates, channels } = useBrief();

  return (
    <TemplatesSection
      projectId={project.id}
      templates={templates}
      channels={channels}
    />
  );
}


