"use client";

import { ProjectInfoForm } from "@/components/strategy/project-info-form";
import { useSettings } from "@/components/settings/settings-context";

export default function SettingsGeneralPage() {
  const { project } = useSettings();

  return <ProjectInfoForm project={project} />;
}
