"use client";

import { useState, useEffect, useCallback } from "react";

export type CoachVoice = "alloy" | "echo" | "shimmer" | "ash" | "coral" | "sage" | "verse";

export interface RecordingCoachSettings {
  audioEnabled: boolean;
  subtitlesEnabled: boolean;
  selectedVoice: CoachVoice;
}

const STORAGE_KEY = "undercurrent-recording-coach-settings";

const DEFAULT_SETTINGS: RecordingCoachSettings = {
  audioEnabled: true,
  subtitlesEnabled: true,
  selectedVoice: "alloy",
};

export const VOICE_OPTIONS: { value: CoachVoice; label: string; description: string }[] = [
  { value: "alloy", label: "Alloy", description: "Neutral and balanced" },
  { value: "ash", label: "Ash", description: "Soft and thoughtful" },
  { value: "coral", label: "Coral", description: "Clear and direct" },
  { value: "echo", label: "Echo", description: "Warm and engaging" },
  { value: "sage", label: "Sage", description: "Wise and calm" },
  { value: "shimmer", label: "Shimmer", description: "Energetic and expressive" },
  { value: "verse", label: "Verse", description: "Versatile and dynamic" },
];

/**
 * Hook to manage recording coach settings with localStorage persistence.
 * Returns current settings and functions to update them.
 */
export function useRecordingCoachSettings() {
  const [settings, setSettings] = useState<RecordingCoachSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<RecordingCoachSettings>;
        setSettings({
          ...DEFAULT_SETTINGS,
          ...parsed,
        });
      }
    } catch (error) {
      console.error("Failed to load recording coach settings:", error);
    }
    setIsLoaded(true);
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      } catch (error) {
        console.error("Failed to save recording coach settings:", error);
      }
    }
  }, [settings, isLoaded]);

  const setAudioEnabled = useCallback((enabled: boolean) => {
    setSettings((prev) => ({ ...prev, audioEnabled: enabled }));
  }, []);

  const setSubtitlesEnabled = useCallback((enabled: boolean) => {
    setSettings((prev) => ({ ...prev, subtitlesEnabled: enabled }));
  }, []);

  const setSelectedVoice = useCallback((voice: CoachVoice) => {
    setSettings((prev) => ({ ...prev, selectedVoice: voice }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return {
    settings,
    isLoaded,
    setAudioEnabled,
    setSubtitlesEnabled,
    setSelectedVoice,
    resetSettings,
  };
}


