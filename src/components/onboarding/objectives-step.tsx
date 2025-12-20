"use client";

import { useState, useEffect, useRef } from "react";
import { useOnboarding } from "./onboarding-context";
import { updateProjectInfo } from "@/lib/actions/project";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, ArrowRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function ObjectivesStep() {
  const { project, updateProject, goNext, goBack } = useOnboarding();
  const [objectives, setObjectives] = useState(project.business_objectives || "");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasStartedGeneration = useRef(false);

  // Auto-generate objectives on mount if none exists
  useEffect(() => {
    if (!project.business_objectives && !hasStartedGeneration.current) {
      handleGenerateDraft();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-focus the textarea when not generating
  useEffect(() => {
    if (!isGenerating) {
      textareaRef.current?.focus();
    }
  }, [isGenerating]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.max(160, textarea.scrollHeight)}px`;
    }
  }, [objectives]);

  const handleGenerateDraft = async () => {
    setIsGenerating(true);
    hasStartedGeneration.current = true;

    try {
      const response = await fetch(`/api/onboarding/draft-objectives/${project.id}`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to generate objectives");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let fullText = "";
      let buffer = ""; // Buffer for incomplete lines across chunks

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Prepend any buffered incomplete line from previous chunk
        const chunk = buffer + decoder.decode(value);
        const lines = chunk.split("\n");
        
        // If chunk doesn't end with newline, last element is incomplete - save for next iteration
        if (!chunk.endsWith("\n")) {
          buffer = lines.pop() || "";
        } else {
          buffer = "";
        }

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "text") {
                fullText += data.content;
                setObjectives(fullText);
              }
            } catch {
              // Ignore JSON parse errors (incomplete JSON will be handled on next chunk)
            }
          }
        }
      }
    } catch (error) {
      console.error("Failed to generate objectives:", error);
    } finally {
      setIsGenerating(false);
      setHasGenerated(true);
    }
  };

  const handleContinue = async () => {
    if (!objectives.trim()) return;

    setIsSaving(true);
    await updateProjectInfo(project.id, { business_objectives: objectives.trim() });
    updateProject({ business_objectives: objectives.trim() });
    setIsSaving(false);
    goNext();
  };

  const canContinue = objectives.trim().length > 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="space-y-3">
        <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight">
          What are your video marketing goals?
        </h1>
        <p className="text-lg text-slate-500">
          Define what success looks like so the AI can suggest ideas that drive real results.
        </p>
      </div>

      {/* Loading state - shown while AI is generating before any text appears */}
      {isGenerating && !objectives && (
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
          <span>Creating a first draft for you...</span>
        </div>
      )}

      {/* Textarea */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={objectives}
          onChange={(e) => setObjectives(e.target.value)}
          placeholder="Examples:&#10;• Drive new customer sign-ups&#10;• Build community with existing customers&#10;• Help customers learn to use our product&#10;• Elevate the brand"
          className={cn(
            "w-full min-h-[160px] p-0 text-xl text-slate-800 placeholder:text-slate-300",
            "bg-transparent border-none outline-none resize-none",
            "focus:ring-0",
            isGenerating && "animate-pulse"
          )}
          disabled={isGenerating}
        />
        {isGenerating && objectives && (
          <span className="inline-block w-0.5 h-6 bg-violet-500 animate-pulse ml-0.5" />
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4">
        <Button
          variant="outline"
          onClick={goBack}
          className="h-11"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        {hasGenerated && !isGenerating && (
          <Button
            variant="outline"
            onClick={handleGenerateDraft}
            className="h-11"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Regenerate
          </Button>
        )}
        <Button
          onClick={handleContinue}
          disabled={!canContinue || isSaving}
          className="h-11 px-6"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

