"use client";

import { CharactersSection } from "@/components/strategy/characters-section";
import { useBrief } from "@/components/brief/brief-context";

export default function BriefCharactersPage() {
  const { project, characters } = useBrief();

  return <CharactersSection projectId={project.id} characters={characters} />;
}



