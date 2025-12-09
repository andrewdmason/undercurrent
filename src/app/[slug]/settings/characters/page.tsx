"use client";

import { CharactersSection } from "@/components/strategy/characters-section";
import { useSettings } from "@/components/settings/settings-context";

export default function SettingsCharactersPage() {
  const { project, characters } = useSettings();

  return <CharactersSection projectId={project.id} characters={characters} />;
}
