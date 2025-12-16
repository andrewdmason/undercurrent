"use client";

import { createContext, useContext } from "react";
import { Project, ProjectCharacter, DistributionChannel, ProjectTopic, ProjectTemplateWithChannels, ProjectRole, ProjectImage } from "@/lib/types";

// Simplified rejected idea type for the brief context
export interface RejectedIdea {
  id: string;
  title: string;
  reject_reason: string;
  image_url: string | null;
  created_at: string;
}

interface BriefContextValue {
  project: Project;
  characters: ProjectCharacter[];
  channels: DistributionChannel[];
  topics: ProjectTopic[];
  templates: ProjectTemplateWithChannels[];
  images: ProjectImage[];
  rejectedIdeas: RejectedIdea[];
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
  images: ProjectImage[];
  rejectedIdeas: RejectedIdea[];
  userRole: ProjectRole;
}

export function BriefProvider({
  children,
  project,
  characters,
  channels,
  topics,
  templates,
  images,
  rejectedIdeas,
  userRole,
}: BriefProviderProps) {
  return (
    <BriefContext.Provider value={{ project, characters, channels, topics, templates, images, rejectedIdeas, userRole }}>
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


