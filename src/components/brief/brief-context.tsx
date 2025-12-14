"use client";

import { createContext, useContext } from "react";
import { Project, ProjectCharacter, DistributionChannel, ProjectTopic, ProjectTemplateWithChannels, ProjectRole } from "@/lib/types";

interface BriefContextValue {
  project: Project;
  characters: ProjectCharacter[];
  channels: DistributionChannel[];
  topics: ProjectTopic[];
  templates: ProjectTemplateWithChannels[];
  userRole: ProjectRole;
}

const BriefContext = createContext<BriefContextValue | null>(null);

interface BriefProviderProps {
  children: React.ReactNode;
  project: Project;
  characters: ProjectCharacter[];
  channels: DistributionChannel[];
  topics: ProjectTopic[];
  templates: ProjectTemplateWithChannels[];
  userRole: ProjectRole;
}

export function BriefProvider({
  children,
  project,
  characters,
  channels,
  topics,
  templates,
  userRole,
}: BriefProviderProps) {
  return (
    <BriefContext.Provider value={{ project, characters, channels, topics, templates, userRole }}>
      {children}
    </BriefContext.Provider>
  );
}

export function useBrief() {
  const context = useContext(BriefContext);
  if (!context) {
    throw new Error("useBrief must be used within a BriefProvider");
  }
  return context;
}
