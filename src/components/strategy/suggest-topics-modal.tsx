"use client";

import { useState, useEffect, useCallback } from "react";
import { Sparkles, Plus, Ban, Loader2, RefreshCw, X, SkipForward } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { addTopic } from "@/lib/actions/project";
import { ProjectTopic } from "@/lib/types";

interface SuggestTopicsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onTopicAdded: (topic: ProjectTopic) => void;
}

interface SuggestedTopic {
  name: string;
  description: string;
}

export function SuggestTopicsModal({
  open,
  onOpenChange,
  projectId,
  onTopicAdded,
}: SuggestTopicsModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const [suggestedTopic, setSuggestedTopic] = useState<SuggestedTopic | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [isRefining, setIsRefining] = useState(false);

  const generateSuggestion = useCallback(async (refineData?: { currentTopic: SuggestedTopic; feedback: string }) => {
    setIsGenerating(true);
    setStreamedText("");
    setSuggestedTopic(null);
    setError(null);
    setFeedback("");
    setIsRefining(false);

    try {
      const response = await fetch(`/api/suggest-topic/${projectId}`, {
        method: "POST",
        headers: refineData ? { "Content-Type": "application/json" } : {},
        body: refineData ? JSON.stringify(refineData) : undefined,
      });

      if (!response.ok) {
        throw new Error("Failed to generate suggestion");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
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
                setStreamedText((prev) => prev + data.content);
              } else if (data.type === "complete") {
                setSuggestedTopic(data.topic);
              } else if (data.type === "error") {
                setError(data.error);
              }
            } catch {
              // Ignore JSON parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsGenerating(false);
    }
  }, [projectId]);

  // Generate suggestion when modal opens
  useEffect(() => {
    if (open) {
      generateSuggestion();
    } else {
      // Reset state when closing
      setStreamedText("");
      setSuggestedTopic(null);
      setError(null);
      setFeedback("");
      setIsRefining(false);
    }
  }, [open, generateSuggestion]);

  const handleAddTopic = async (isExcluded: boolean) => {
    if (!suggestedTopic) return;

    const result = await addTopic(projectId, {
      name: suggestedTopic.name,
      description: suggestedTopic.description,
      is_excluded: isExcluded,
    });

    if (result.error) {
      setError(`Failed to add topic: ${result.error}`);
      return;
    }

    if (result.success && result.topic) {
      onTopicAdded(result.topic);
    }

    // Generate another suggestion
    generateSuggestion();
  };

  const handleRefine = () => {
    if (!suggestedTopic || !feedback.trim()) return;
    generateSuggestion({
      currentTopic: suggestedTopic,
      feedback: feedback.trim(),
    });
  };

  const handleSkip = () => {
    generateSuggestion();
  };

  const handleCancelRefine = () => {
    setIsRefining(false);
    setFeedback("");
  };

  // Parse the streamed text to extract name and description for display
  const parseStreamedContent = () => {
    if (suggestedTopic) {
      return suggestedTopic;
    }

    // Try to parse partial JSON from streamed text
    try {
      // Look for name field
      const nameMatch = streamedText.match(/"name"\s*:\s*"([^"]*)"?/);
      const descMatch = streamedText.match(/"description"\s*:\s*"([^"]*)"?/);

      return {
        name: nameMatch ? nameMatch[1] : "",
        description: descMatch ? descMatch[1] : "",
      };
    } catch {
      return { name: "", description: "" };
    }
  };

  const displayContent = parseStreamedContent();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex items-center justify-center size-8 rounded-lg bg-violet-100">
              <Sparkles className="size-4 text-violet-600" />
            </div>
            Suggest Topics
          </DialogTitle>
          <DialogDescription className="text-left">
            AI-generated topic ideas based on your project profile.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Topic Name */}
              <div>
                <label className="text-xs font-medium text-[var(--grey-600)] mb-1.5 block">
                  Topic Name
                </label>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--grey-50)] p-3 min-h-[44px]">
                  {isGenerating && !displayContent.name ? (
                    <div className="flex items-center gap-2 text-[var(--grey-400)]">
                      <Loader2 className="size-4 animate-spin" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  ) : (
                    <span className="text-sm font-medium text-[var(--grey-800)]">
                      {displayContent.name}
                      {isGenerating && !suggestedTopic && (
                        <span className="inline-block w-1 h-4 ml-0.5 bg-violet-500 animate-pulse" />
                      )}
                    </span>
                  )}
                </div>
              </div>

              {/* Topic Description */}
              <div>
                <label className="text-xs font-medium text-[var(--grey-600)] mb-1.5 block">
                  Description
                </label>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--grey-50)] p-3 min-h-[80px]">
                  {isGenerating && !displayContent.description && displayContent.name ? (
                    <div className="flex items-center gap-2 text-[var(--grey-400)]">
                      <Loader2 className="size-4 animate-spin" />
                      <span className="text-sm">Writing description...</span>
                    </div>
                  ) : isGenerating && !displayContent.name ? (
                    <div className="h-full" />
                  ) : (
                    <span className="text-sm text-[var(--grey-600)]">
                      {displayContent.description}
                      {isGenerating && !suggestedTopic && displayContent.name && (
                        <span className="inline-block w-1 h-4 ml-0.5 bg-violet-500 animate-pulse" />
                      )}
                    </span>
                  )}
                </div>
              </div>

              {/* Refine Input - Only shown when in refine mode */}
              {isRefining && suggestedTopic && !isGenerating && (
                <div>
                  <label className="text-xs font-medium text-[var(--grey-600)] mb-1.5 block">
                    How would you like to change it?
                  </label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (feedback.trim()) handleRefine();
                      }
                    }}
                    placeholder="e.g., Make it more focused on beginners, or add a competitive angle..."
                    rows={2}
                    autoFocus
                    className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--grey-800)] placeholder:text-[var(--grey-400)] focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {isRefining ? (
          <div className="flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  onClick={handleCancelRefine}
                  className="flex-1"
                >
                  <X className="size-4" />
                  Cancel
                </Button>
              </TooltipTrigger>
              <TooltipContent>Go back without refining</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleRefine}
                  disabled={!feedback.trim()}
                  className="flex-1"
                >
                  <RefreshCw className="size-4" />
                  Refine
                </Button>
              </TooltipTrigger>
              <TooltipContent>Generate a new version based on your feedback</TooltipContent>
            </Tooltip>
          </div>
        ) : (
          <div className="flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => handleAddTopic(false)}
                  disabled={isGenerating || !suggestedTopic}
                  className="flex-1"
                >
                  <Plus className="size-4" />
                  Add
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add to your Topics to Cover list</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  onClick={() => handleAddTopic(true)}
                  disabled={isGenerating || !suggestedTopic}
                  className="flex-1"
                >
                  <Ban className="size-4" />
                  Avoid
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add to your Topics to Avoid list</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  onClick={() => setIsRefining(true)}
                  disabled={isGenerating || !suggestedTopic}
                  className="flex-1"
                >
                  <RefreshCw className="size-4" />
                  Refine
                </Button>
              </TooltipTrigger>
              <TooltipContent>Tweak this idea with your feedback</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  onClick={handleSkip}
                  disabled={isGenerating}
                  className="flex-1"
                >
                  <SkipForward className="size-4" />
                  Skip
                </Button>
              </TooltipTrigger>
              <TooltipContent>Generate a completely new suggestion</TooltipContent>
            </Tooltip>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
