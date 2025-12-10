"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import {
  Project,
  ProjectCharacter,
  DistributionChannel,
  ProjectTopic,
  ProjectTemplateWithChannels,
} from "@/lib/types";

export type OnboardingStep =
  | "description"
  | "objectives"
  | "channels"
  | "topics"
  | "characters"
  | "templates"
  | "generating";

const STEP_ORDER: OnboardingStep[] = [
  "description",
  "objectives",
  "channels",
  "topics",
  "characters",
  "templates",
  "generating",
];

interface OnboardingContextValue {
  project: Project;
  characters: ProjectCharacter[];
  channels: DistributionChannel[];
  topics: ProjectTopic[];
  templates: ProjectTemplateWithChannels[];
  currentStep: OnboardingStep;
  stepIndex: number;
  totalSteps: number;
  goToStep: (step: OnboardingStep) => void;
  goNext: () => void;
  goBack: () => void;
  canGoBack: boolean;
  canSkip: boolean;
  isLastStep: boolean;
  updateProject: (data: Partial<Project>) => void;
  addTopic: (topic: ProjectTopic) => void;
  addChannel: (channel: DistributionChannel) => void;
  addCharacter: (character: ProjectCharacter) => void;
  addTemplate: (template: ProjectTemplateWithChannels) => void;
  setTopics: (topics: ProjectTopic[]) => void;
  setChannels: (channels: DistributionChannel[]) => void;
  setCharacters: (characters: ProjectCharacter[]) => void;
  setTemplates: (templates: ProjectTemplateWithChannels[]) => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

interface OnboardingProviderProps {
  children: ReactNode;
  project: Project;
  characters: ProjectCharacter[];
  channels: DistributionChannel[];
  topics: ProjectTopic[];
  templates: ProjectTemplateWithChannels[];
}

export function OnboardingProvider({
  children,
  project: initialProject,
  characters: initialCharacters,
  channels: initialChannels,
  topics: initialTopics,
  templates: initialTemplates,
}: OnboardingProviderProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("description");
  const [project, setProject] = useState<Project>(initialProject);
  const [characters, setCharacters] = useState<ProjectCharacter[]>(initialCharacters);
  const [channels, setChannels] = useState<DistributionChannel[]>(initialChannels);
  const [topics, setTopics] = useState<ProjectTopic[]>(initialTopics);
  const [templates, setTemplates] = useState<ProjectTemplateWithChannels[]>(initialTemplates);

  const stepIndex = STEP_ORDER.indexOf(currentStep);
  const totalSteps = STEP_ORDER.length;

  const goToStep = useCallback((step: OnboardingStep) => {
    setCurrentStep(step);
  }, []);

  const goNext = useCallback(() => {
    const nextIndex = stepIndex + 1;
    if (nextIndex < STEP_ORDER.length) {
      setCurrentStep(STEP_ORDER[nextIndex]);
    }
  }, [stepIndex]);

  const goBack = useCallback(() => {
    const prevIndex = stepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEP_ORDER[prevIndex]);
    }
  }, [stepIndex]);

  const updateProject = useCallback((data: Partial<Project>) => {
    setProject((prev) => ({ ...prev, ...data }));
  }, []);

  const addTopic = useCallback((topic: ProjectTopic) => {
    setTopics((prev) => [...prev, topic]);
  }, []);

  const addChannel = useCallback((channel: DistributionChannel) => {
    setChannels((prev) => [...prev, channel]);
  }, []);

  const addCharacter = useCallback((character: ProjectCharacter) => {
    setCharacters((prev) => [...prev, character]);
  }, []);

  const addTemplate = useCallback((template: ProjectTemplateWithChannels) => {
    setTemplates((prev) => [template, ...prev]);
  }, []);

  // Description and objectives are required, others can be skipped
  const canSkip = !["description", "objectives", "generating"].includes(currentStep);
  const canGoBack = stepIndex > 0 && currentStep !== "generating";
  const isLastStep = currentStep === "generating";

  return (
    <OnboardingContext.Provider
      value={{
        project,
        characters,
        channels,
        topics,
        templates,
        currentStep,
        stepIndex,
        totalSteps,
        goToStep,
        goNext,
        goBack,
        canGoBack,
        canSkip,
        isLastStep,
        updateProject,
        addTopic,
        addChannel,
        addCharacter,
        addTemplate,
        setTopics,
        setChannels,
        setCharacters,
        setTemplates,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return context;
}
