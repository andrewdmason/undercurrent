"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X, Sparkles, Check, Loader2 } from "lucide-react";
import { diffWords } from "diff";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { rejectIdea } from "@/lib/actions/ideas";
import { applyRejectionEdits, ProjectEditSuggestion } from "@/lib/actions/project";
import { cn } from "@/lib/utils";

interface RejectIdeaModalProps {
  ideaId: string;
  ideaTitle: string;
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "reason" | "suggestions";

interface SuggestionResponse {
  summary: string;
  edits: ProjectEditSuggestion[];
}

export function RejectIdeaModal({
  ideaId,
  ideaTitle,
  projectId,
  open,
  onOpenChange,
}: RejectIdeaModalProps) {
  const router = useRouter();
  
  // Step state
  const [step, setStep] = useState<Step>("reason");
  
  // Step 1: Reason state
  const [aiGuesses, setAiGuesses] = useState<string[]>([]);
  const [selectedGuesses, setSelectedGuesses] = useState<string[]>([]);
  const [freeTextReason, setFreeTextReason] = useState("");
  const [isLoadingGuesses, setIsLoadingGuesses] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Step 2: Suggestions state
  const [suggestions, setSuggestions] = useState<SuggestionResponse | null>(null);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isApplyingEdits, setIsApplyingEdits] = useState(false);

  // Stream AI guesses when modal opens
  const fetchGuesses = useCallback(async () => {
    if (!open || aiGuesses.length > 0) return;
    
    setIsLoadingGuesses(true);
    try {
      const response = await fetch(`/api/ideas/${ideaId}/rejection-guesses`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch guesses");
      }

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === "complete" && parsed.reasons) {
                setAiGuesses(parsed.reasons);
              }
            } catch {
              // Ignore parse errors for partial chunks
            }
          }
        }
      }
    } catch (error) {
      console.error("Error fetching guesses:", error);
      // Silently fail - guesses are optional
    } finally {
      setIsLoadingGuesses(false);
    }
  }, [ideaId, open, aiGuesses.length]);

  useEffect(() => {
    if (open) {
      fetchGuesses();
    }
  }, [open, fetchGuesses]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      // Delay reset to allow close animation
      const timer = setTimeout(() => {
        setStep("reason");
        setAiGuesses([]);
        setSelectedGuesses([]);
        setFreeTextReason("");
        setSuggestions(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Toggle a guess selection
  const toggleGuess = (guess: string) => {
    setSelectedGuesses(prev => 
      prev.includes(guess) 
        ? prev.filter(g => g !== guess)
        : [...prev, guess]
    );
  };

  // Build the full rejection reason from selections
  const getFullReason = () => {
    const parts: string[] = [...selectedGuesses];
    if (freeTextReason.trim()) parts.push(freeTextReason.trim());
    return parts.join(". ");
  };

  const hasAnyReason = selectedGuesses.length > 0 || freeTextReason.trim();

  // Fetch suggestions based on rejection reason
  const fetchSuggestions = async (reason: string) => {
    setIsLoadingSuggestions(true);
    try {
      const response = await fetch(`/api/ideas/${ideaId}/rejection-suggestions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejectionReason: reason }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch suggestions");
      }

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === "complete") {
                setSuggestions({
                  summary: parsed.summary || "",
                  edits: parsed.edits || [],
                });
              }
            } catch {
              // Ignore parse errors for partial chunks
            }
          }
        }
      }
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      // If suggestions fail, just close the modal
      toast.success("Idea rejected");
      onOpenChange(false);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Handle rejection - either skip to close or proceed to suggestions
  const handleReject = async (skipReason: boolean = false) => {
    setIsSubmitting(true);
    try {
      const reason = skipReason ? undefined : getFullReason() || undefined;
      const result = await rejectIdea(ideaId, reason);
      
      if (result.error) {
        toast.error(result.error);
        setIsSubmitting(false);
        return;
      }

      // If we have a reason, proceed to suggestions
      if (reason && !skipReason) {
        setStep("suggestions");
        await fetchSuggestions(reason);
      } else {
        // No reason - just close
        toast.success("Idea rejected");
        onOpenChange(false);
        router.refresh();
      }
    } catch (error) {
      toast.error("Failed to reject idea");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Apply the suggested edits
  const handleApplyEdits = async () => {
    if (!suggestions?.edits.length) return;
    
    setIsApplyingEdits(true);
    try {
      const result = await applyRejectionEdits(projectId, suggestions.edits);
      
      if (result.success) {
        toast.success(`Applied ${result.appliedCount} change${result.appliedCount === 1 ? "" : "s"} to your project`);
      } else {
        toast.error(result.error || "Failed to apply some changes");
      }
      
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      toast.error("Failed to apply changes");
      console.error(error);
    } finally {
      setIsApplyingEdits(false);
    }
  };

  // Skip suggestions and just close
  const handleSkipSuggestions = () => {
    toast.success("Idea rejected");
    onOpenChange(false);
    router.refresh();
  };

  // Format edit type for display
  const formatEditType = (edit: ProjectEditSuggestion): string => {
    switch (edit.type) {
      case "add_excluded_topic":
        return `Add excluded topic: "${edit.name}"`;
      case "add_topic":
        return `Add topic: "${edit.name}"`;
      case "update_topic":
        return `Update "${edit.name}" topic`;
      case "add_template":
        return `Add template: "${edit.name}"`;
      case "update_template":
        return `Update "${edit.name}" template`;
      case "update_character":
        return `Update "${edit.name}" character`;
      case "update_description":
        return "Update project description";
      case "update_objectives":
        return "Update business objectives";
      case "update_ai_notes":
        return "Add to AI notes";
      default:
        return "Unknown edit";
    }
  };

  // Render word-level diff for text changes
  const renderWordDiff = (oldText: string, newText: string) => {
    const changes = diffWords(oldText, newText);
    
    return (
      <div className="mt-2 text-sm px-2 py-2 rounded bg-[var(--grey-50)] border border-[var(--grey-100)] whitespace-pre-wrap">
        {changes.map((part, index) => {
          if (part.added) {
            return (
              <span
                key={index}
                className="bg-[#dcfce7] text-[#166534] rounded px-0.5"
              >
                {part.value}
              </span>
            );
          }
          if (part.removed) {
            return (
              <span
                key={index}
                className="bg-[#fee2e2] text-[#991b1b] line-through rounded px-0.5"
              >
                {part.value}
              </span>
            );
          }
          return <span key={index}>{part.value}</span>;
        })}
      </div>
    );
  };

  // Render diff for text changes
  const renderDiff = (edit: ProjectEditSuggestion) => {
    // For add operations, just show new content in green
    if (edit.type === "add_excluded_topic" || edit.type === "add_topic" || edit.type === "add_template") {
      const content = edit.description || edit.name;
      return (
        <div className="mt-2 text-sm">
          <span className="bg-[#dcfce7] text-[#166534] px-2 py-1 rounded inline-block">
            {content}
          </span>
        </div>
      );
    }

    // For update_ai_notes, show what's being appended
    if (edit.type === "update_ai_notes") {
      return (
        <div className="mt-2 text-sm space-y-1">
          {edit.oldText && (
            <div className="text-[var(--grey-400)] text-xs mb-2">
              Current notes will be preserved, adding:
            </div>
          )}
          <div className="bg-[#dcfce7] text-[#166534] px-2 py-1 rounded whitespace-pre-wrap">
            {edit.text}
          </div>
        </div>
      );
    }

    // For update operations with oldDescription/oldText, show word-level diff
    if (edit.type === "update_topic" || edit.type === "update_template" || edit.type === "update_character") {
      const oldValue = edit.oldDescription || "";
      const newValue = edit.description;
      
      if (!oldValue) {
        // No old value, just show new as addition
        return (
          <div className="mt-2 text-sm">
            <span className="bg-[#dcfce7] text-[#166534] px-2 py-1 rounded inline-block whitespace-pre-wrap">
              {newValue}
            </span>
          </div>
        );
      }
      
      return renderWordDiff(oldValue, newValue);
    }

    if (edit.type === "update_description" || edit.type === "update_objectives") {
      const oldValue = edit.oldText || "";
      const newValue = edit.text;
      
      if (!oldValue) {
        // No old value, just show new as addition
        return (
          <div className="mt-2 text-sm">
            <span className="bg-[#dcfce7] text-[#166534] px-2 py-1 rounded inline-block whitespace-pre-wrap">
              {newValue}
            </span>
          </div>
        );
      }
      
      return renderWordDiff(oldValue, newValue);
    }

    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {step === "reason" ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-destructive/10">
                  <X className="h-4 w-4 text-destructive" />
                </div>
                Reject Idea
              </DialogTitle>
              <DialogDescription className="text-left">
                You&apos;re rejecting &ldquo;{ideaTitle}&rdquo;. Tell us why and we&apos;ll suggest improvements to your project settings.
              </DialogDescription>
            </DialogHeader>

            <div className="py-2 space-y-4">
              {/* AI Guesses */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-[var(--grey-400)]">
                  <Sparkles className="h-3 w-3" />
                  <span>Quick reasons</span>
                </div>
                
                {isLoadingGuesses ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="h-5 w-3/4 rounded bg-[var(--grey-50)] animate-pulse"
                      />
                    ))}
                  </div>
                ) : aiGuesses.length > 0 ? (
                  <div className="space-y-1">
                    {aiGuesses.map((guess, index) => (
                      <label
                        key={index}
                        className={cn(
                          "flex items-start gap-3 cursor-pointer rounded-lg px-2 py-1.5 -mx-2 transition-colors",
                          "hover:bg-[var(--grey-50)]",
                          selectedGuesses.includes(guess) && "bg-[var(--grey-50)]",
                          isSubmitting && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={selectedGuesses.includes(guess)}
                          onChange={() => toggleGuess(guess)}
                          disabled={isSubmitting}
                          className="mt-0.5 h-4 w-4 rounded border-[var(--grey-300)] text-[var(--grey-800)] focus:ring-[#007bc2] focus:ring-offset-0"
                        />
                        <span className="text-sm text-[var(--grey-800)]">
                          {guess}
                        </span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--grey-400)]">
                    No suggestions available
                  </p>
                )}
              </div>

              {/* Free text */}
              <div className="space-y-2">
                <label className="text-xs text-[var(--grey-400)]">
                  Or describe in your own words
                </label>
                <Textarea
                  placeholder="What didn't work about this idea?"
                  value={freeTextReason}
                  onChange={(e) => setFreeTextReason(e.target.value)}
                  className="min-h-[80px] resize-none border-[var(--grey-300)]"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <DialogFooter className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => handleReject(true)}
                disabled={isSubmitting}
              >
                Skip
              </Button>
              <Button
                onClick={() => handleReject(false)}
                disabled={isSubmitting || !hasAnyReason}
                variant="destructive"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  "Reject & Get Suggestions"
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#007bc2]/10">
                  <Sparkles className="h-4 w-4 text-[#007bc2]" />
                </div>
                Improve Your Settings
              </DialogTitle>
              <DialogDescription className="text-left">
                Based on your feedback, here&apos;s how we can improve future suggestions.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 max-h-[60vh] overflow-y-auto">
              {isLoadingSuggestions ? (
                <div className="space-y-3">
                  <div className="h-4 w-3/4 rounded bg-[var(--grey-50)] animate-pulse" />
                  <div className="space-y-2">
                    {[1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-12 rounded-lg bg-[var(--grey-50)] animate-pulse"
                      />
                    ))}
                  </div>
                </div>
              ) : suggestions ? (
                <div className="space-y-4">
                  {/* Summary */}
                  {suggestions.summary && (
                    <p className="text-sm text-[var(--grey-600)]">
                      {suggestions.summary}
                    </p>
                  )}

                  {/* Edit list */}
                  {suggestions.edits.length > 0 ? (
                    <div className="space-y-3">
                      {suggestions.edits.map((edit, index) => (
                        <div
                          key={index}
                          className="p-3 rounded-lg bg-[var(--grey-50)] border border-[var(--grey-100)]"
                        >
                          <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-[#00975a] flex-shrink-0" />
                            <p className="text-sm font-medium text-[var(--grey-800)]">
                              {formatEditType(edit)}
                            </p>
                          </div>
                          {renderDiff(edit)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--grey-400)]">
                      No changes suggested. Your settings look good!
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-[var(--grey-400)]">
                  Unable to generate suggestions.
                </p>
              )}
            </div>

            <DialogFooter className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={handleSkipSuggestions}
                disabled={isApplyingEdits}
              >
                No Thanks
              </Button>
              {suggestions?.edits && suggestions.edits.length > 0 && (
                <Button
                  onClick={handleApplyEdits}
                  disabled={isApplyingEdits || isLoadingSuggestions}
                >
                  {isApplyingEdits ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    "Apply Changes"
                  )}
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
