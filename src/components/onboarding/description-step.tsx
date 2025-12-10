"use client";

import { useState, useEffect, useRef } from "react";
import { useOnboarding } from "./onboarding-context";
import { updateProjectInfo } from "@/lib/actions/project";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function DescriptionStep() {
  const { project, updateProject, goNext } = useOnboarding();
  const [description, setDescription] = useState(project.description || "");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasGenerated = useRef(false);

  // Auto-focus the textarea
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.max(120, textarea.scrollHeight)}px`;
    }
  }, [description]);

  const handleGenerateDraft = async () => {
    setIsGenerating(true);
    hasGenerated.current = true;

    try {
      const response = await fetch(`/api/onboarding/draft-description/${project.id}`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to generate description");
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
                setDescription(fullText);
              }
            } catch {
              // Ignore JSON parse errors (incomplete JSON will be handled on next chunk)
            }
          }
        }
      }
    } catch (error) {
      console.error("Failed to generate description:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleContinue = async () => {
    if (!description.trim()) return;

    setIsSaving(true);
    await updateProjectInfo(project.id, { description: description.trim() });
    updateProject({ description: description.trim() });
    setIsSaving(false);
    goNext();
  };

  const canContinue = description.trim().length > 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="space-y-3">
        <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight">
          Describe your business
        </h1>
        <p className="text-lg text-slate-500">
          Help the AI understand what {project.name} does so it can generate relevant video ideas.
        </p>
      </div>

      {/* AI Draft Button */}
      {!description && !isGenerating && (
        <Button
          onClick={handleGenerateDraft}
          className="bg-violet-600 hover:bg-violet-700 text-white h-11 px-5"
        >
          <Sparkles className="mr-2 h-4 w-4" />
          Draft with AI
        </Button>
      )}

      {/* Loading state */}
      {isGenerating && !description && (
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
          <span>Analyzing your business...</span>
        </div>
      )}

      {/* Textarea */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What does your business do? Who are your customers? What makes you unique?"
          className={cn(
            "w-full min-h-[120px] p-0 text-xl text-slate-800 placeholder:text-slate-300",
            "bg-transparent border-none outline-none resize-none",
            "focus:ring-0",
            isGenerating && "animate-pulse"
          )}
          disabled={isGenerating}
        />
        {isGenerating && description && (
          <span className="inline-block w-0.5 h-6 bg-violet-500 animate-pulse ml-0.5" />
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4">
        {description && !isGenerating && (
          <Button
            variant="outline"
            onClick={handleGenerateDraft}
            className="h-11"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {hasGenerated.current ? "Regenerate" : "Draft with AI"}
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

      {/* Helper text */}
      <p className="text-sm text-slate-400">
        Press <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-500 font-mono text-xs">Enter</kbd> to continue
      </p>
    </div>
  );
}

