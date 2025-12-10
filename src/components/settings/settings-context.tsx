"use client";

import { createContext, useContext } from "react";
import { Project, ProjectCharacter, DistributionChannel, ProjectTopic, ProjectTemplateWithChannels, ProjectRole } from "@/lib/types";

interface SettingsContextValue {
  project: Project;
  characters: ProjectCharacter[];
  channels: DistributionChannel[];
  topics: ProjectTopic[];
  templates: ProjectTemplateWithChannels[];
  userRole: ProjectRole;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

interface SettingsProviderProps {
  children: React.ReactNode;
  project: Project;
  characters: ProjectCharacter[];
  channels: DistributionChannel[];
  topics: ProjectTopic[];
  templates: ProjectTemplateWithChannels[];
  userRole: ProjectRole;
}

export function SettingsProvider({
  children,
  project,
  characters,
  channels,
  topics,
  templates,
  userRole,
}: SettingsProviderProps) {
  return (
    <SettingsContext.Provider value={{ project, characters, channels, topics, templates, userRole }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
