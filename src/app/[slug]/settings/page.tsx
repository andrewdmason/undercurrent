"use client";

import { ProjectSettingsForm } from "@/components/settings/project-settings-form";
import { DeleteProjectSection } from "@/components/settings/delete-project-section";
import { useSettings } from "@/components/settings/settings-context";

export default function SettingsPage() {
  const { project, userRole } = useSettings();
  const isAdmin = userRole === "admin";

  return (
    <div>
      <ProjectSettingsForm project={project} userRole={userRole} />
      {isAdmin && (
        <DeleteProjectSection projectId={project.id} projectName={project.name} />
      )}
    </div>
  );
}
