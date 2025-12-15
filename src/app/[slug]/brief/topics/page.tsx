"use client";

import { TopicsSection } from "@/components/strategy/topics-section";
import { useBrief } from "@/components/brief/brief-context";

export default function BriefTopicsPage() {
  const { project, topics, rejectedIdeas } = useBrief();

  return <TopicsSection projectId={project.id} topics={topics} rejectedIdeas={rejectedIdeas} />;
}


