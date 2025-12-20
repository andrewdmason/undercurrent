"use client";

import { useEffect, useCallback } from "react";
import { useOnboarding } from "./onboarding-context";
import { DescriptionStep } from "./description-step";
import { ObjectivesStep } from "./objectives-step";
import { TopicsStep } from "./topics-step";
import { ChannelsStep } from "./channels-step";
import { CharactersStep } from "./characters-step";
import { CharacterInterviewStep } from "./character-interview-step";
import { TemplatesStep } from "./templates-step";
import { GeneratingStep } from "./generating-step";
import { cn } from "@/lib/utils";

export function OnboardingWizard() {
  const { currentStep, stepIndex, totalSteps } = useOnboarding();

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Only handle Enter if not in a textarea or if shift is held
    if (e.key === "Enter" && !e.shiftKey) {
      const activeElement = document.activeElement;
      if (activeElement?.tagName === "TEXTAREA") {
        return; // Let textareas handle their own enter
      }
      // For other elements, we'll let the step components handle it
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const renderStep = () => {
    switch (currentStep) {
      case "description":
        return <DescriptionStep />;
      case "objectives":
        return <ObjectivesStep />;
      case "topics":
        return <TopicsStep />;
      case "channels":
        return <ChannelsStep />;
      case "characters":
        return <CharactersStep />;
      case "character-interview":
        return <CharacterInterviewStep />;
      case "templates":
        return <TemplatesStep />;
      case "generating":
        return <GeneratingStep />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex flex-col">
      {/* Progress bar */}
      {currentStep !== "generating" && (
        <div className="fixed top-0 left-0 right-0 z-50">
          <div className="h-1 bg-slate-100">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-violet-600 transition-all duration-500 ease-out"
              style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Step content */}
      <div className="flex-1 overflow-y-auto">
        <div className="min-h-full flex items-center justify-center px-4 py-12">
          <div
            className={cn(
              "w-full transition-all duration-500 ease-out",
              // Typeform-style max widths based on content type
              currentStep === "generating" ? "max-w-xl" : "max-w-2xl"
            )}
          >
            {renderStep()}
          </div>
        </div>
      </div>

      {/* Step indicator dots */}
      {currentStep !== "generating" && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2">
          {Array.from({ length: totalSteps - 1 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-300",
                i === stepIndex
                  ? "bg-violet-500 w-6"
                  : i < stepIndex
                  ? "bg-violet-300"
                  : "bg-slate-200"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}








