"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
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
  | "character-interview"
  | "templates"
  | "generating";

const STEP_ORDER: OnboardingStep[] = [
  "description",
  "objectives",
  "channels",
  "topics",
  "characters",
  "character-interview",
  "templates",
  "generating",
];

function isValidStep(step: string | null): step is OnboardingStep {
  return step !== null && STEP_ORDER.includes(step as OnboardingStep);
}

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
  updateCharacter: (characterId: string, data: Partial<ProjectCharacter>) => void;
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get initial step from URL or default to "description"
  const stepFromUrl = searchParams.get("step");
  const initialStep = isValidStep(stepFromUrl) ? stepFromUrl : "description";

  const [currentStep, setCurrentStep] = useState<OnboardingStep>(initialStep);
  const [project, setProject] = useState<Project>(initialProject);
  const [characters, setCharacters] = useState<ProjectCharacter[]>(initialCharacters);
  const [channels, setChannels] = useState<DistributionChannel[]>(initialChannels);
  const [topics, setTopics] = useState<ProjectTopic[]>(initialTopics);
  const [templates, setTemplates] = useState<ProjectTemplateWithChannels[]>(initialTemplates);

  // Sync step changes to URL
  useEffect(() => {
    const currentUrlStep = searchParams.get("step");
    if (currentUrlStep !== currentStep) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("step", currentStep);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [currentStep, pathname, router, searchParams]);

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

  const updateCharacter = useCallback((characterId: string, data: Partial<ProjectCharacter>) => {
    setCharacters((prev) =>
      prev.map((c) => (c.id === characterId ? { ...c, ...data } : c))
    );
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
        updateCharacter,
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
