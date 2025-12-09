"use client";

import { createContext, useContext } from "react";
import { Business, BusinessCharacter, DistributionChannel, BusinessTopic, BusinessTemplateWithChannels } from "@/lib/types";

interface SettingsContextValue {
  business: Business;
  characters: BusinessCharacter[];
  channels: DistributionChannel[];
  topics: BusinessTopic[];
  templates: BusinessTemplateWithChannels[];
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

interface SettingsProviderProps {
  children: React.ReactNode;
  business: Business;
  characters: BusinessCharacter[];
  channels: DistributionChannel[];
  topics: BusinessTopic[];
  templates: BusinessTemplateWithChannels[];
}

export function SettingsProvider({
  children,
  business,
  characters,
  channels,
  topics,
  templates,
}: SettingsProviderProps) {
  return (
    <SettingsContext.Provider value={{ business, characters, channels, topics, templates }}>
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
