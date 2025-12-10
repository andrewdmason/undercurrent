"use client";

import { ProjectInfoForm } from "@/components/strategy/project-info-form";
import { DeleteProjectSection } from "@/components/settings/delete-project-section";
import { useSettings } from "@/components/settings/settings-context";

export default function SettingsGeneralPage() {
  const { project, userRole } = useSettings();
  const isAdmin = userRole === "admin";

  return (
    <div>
      <ProjectInfoForm project={project} />
      {isAdmin && (
        <DeleteProjectSection projectId={project.id} projectName={project.name} />
      )}
    </div>
  );
}
