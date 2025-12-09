"use client";

import { CharactersSection } from "@/components/strategy/characters-section";
import { useSettings } from "@/components/settings/settings-context";

export default function SettingsCharactersPage() {
  const { business, characters } = useSettings();

  return <CharactersSection businessId={business.id} characters={characters} />;
}
