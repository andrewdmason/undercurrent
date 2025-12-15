"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const POLL_INTERVAL = 2000; // 2 seconds
const GENERATION_TIMEOUT = 10 * 60 * 1000; // 10 minutes - expire stale generation state

interface NewIdeasAlertBarProps {
  /** Project ID to filter ideas by */
  projectId: string;
  /** Total number of new ideas */
  totalNewIdeas: number;
  /** Number of ideas with thumbnails ready */
  readyCount: number;
  /** Called when user clicks Review Now */
  onReviewClick: () => void;
}

// Storage key for persisting generation state across remounts
const GENERATION_STATE_KEY = "undercurrent-generating-ideas";

function getStoredGenerationState(): { isPending: boolean; count: number; baselineCount: number; startedAt: number } {
  if (typeof window === "undefined") return { isPending: false, count: 0, baselineCount: 0, startedAt: 0 };
  try {
    const stored = sessionStorage.getItem(GENERATION_STATE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const startedAt = parsed.startedAt || 0;
      
      // Check if the generation state has expired (stale from a previous session)
      if (startedAt && Date.now() - startedAt > GENERATION_TIMEOUT) {
        sessionStorage.removeItem(GENERATION_STATE_KEY);
        return { isPending: false, count: 0, baselineCount: 0, startedAt: 0 };
      }
      
      return { 
        isPending: parsed.isPending || false, 
        count: parsed.count || 0, 
        baselineCount: parsed.baselineCount || 0,
        startedAt 
      };
    }
  } catch {}
  return { isPending: false, count: 0, baselineCount: 0, startedAt: 0 };
}

function setStoredGenerationState(isPending: boolean, count: number, baselineCount?: number) {
  if (typeof window === "undefined") return;
  try {
    if (isPending) {
      sessionStorage.setItem(GENERATION_STATE_KEY, JSON.stringify({ 
        isPending, 
        count, 
        baselineCount: baselineCount ?? 0,
        startedAt: Date.now() 
      }));
    } else {
      sessionStorage.removeItem(GENERATION_STATE_KEY);
    }
  } catch {}
}

export function NewIdeasAlertBar({
  projectId,
  totalNewIdeas: initialTotal,
  readyCount: initialReady,
  onReviewClick,
}: NewIdeasAlertBarProps) {
  const router = useRouter();
  const [totalNewIdeas, setTotalNewIdeas] = useState(initialTotal);
  const [readyCount, setReadyCount] = useState(initialReady);
  // Track if we're waiting for generation to start (before ideas exist in DB)
  const [isPendingGeneration, setIsPendingGeneration] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Restore pending state from sessionStorage on mount (survives hydration)
  useEffect(() => {
    const stored = getStoredGenerationState();
    if (stored.isPending) {
      setIsPendingGeneration(true);
      setPendingCount(stored.count);
    }
  }, []);

  // Only show "generating" if there's an explicit pending generation (user clicked Generate)
  // Don't fallback to checking incomplete thumbnails - that catches old ideas with failed thumbnails
  const isGenerating = isPendingGeneration;
  const isReadyForReview = !isPendingGeneration && totalNewIdeas > 0;

  // Listen for generation start event from GenerateIdeasButton
  useEffect(() => {
    const handleGenerationStart = (e: CustomEvent<{ count: number }>) => {
      // Save baseline count so we know when NEW ideas appear (vs existing ones)
      setStoredGenerationState(true, e.detail.count, totalNewIdeas);
      setIsPendingGeneration(true);
      setPendingCount(e.detail.count);
      setReadyCount(0);
    };

    const handleGenerationError = () => {
      setStoredGenerationState(false, 0);
      setIsPendingGeneration(false);
      setPendingCount(0);
    };

    window.addEventListener("ideas-generation-start", handleGenerationStart as EventListener);
    window.addEventListener("ideas-generation-error", handleGenerationError as EventListener);

    return () => {
      window.removeEventListener("ideas-generation-start", handleGenerationStart as EventListener);
      window.removeEventListener("ideas-generation-error", handleGenerationError as EventListener);
    };
  }, [totalNewIdeas]);

  // Poll for updates while generating
  const checkForUpdates = useCallback(async () => {
    const supabase = createClient();
    
    // Get count of new ideas and how many have thumbnails (not accepted, not rejected)
    const { data: newIdeas } = await supabase
      .from("ideas")
      .select("id, image_url")
      .eq("project_id", projectId)
      .is("accepted_at", null)
      .is("reject_reason", null);

    if (newIdeas) {
      const total = newIdeas.length;
      const ready = newIdeas.filter((idea) => idea.image_url !== null).length;
      
      // Don't clear pending state here - let the server props update handle it
      // The pending state will be cleared when server sends us updated props with the new ideas
      
      setTotalNewIdeas(total);
      setReadyCount(ready);

      // If all thumbnails are now ready, trigger a refresh to get full data
      if (total > 0 && ready >= total && !isPendingGeneration) {
        router.refresh();
      }
    }
  }, [projectId, isPendingGeneration, router]);

  useEffect(() => {
    const stored = getStoredGenerationState();
    
    // Clear pending state if:
    // 1. Server provides MORE ideas than baseline (our generated ideas appeared), OR
    // 2. All thumbnails are ready (generation is complete regardless of count)
    const shouldClearPending = stored.isPending && (
      initialTotal > stored.baselineCount ||
      (initialTotal > 0 && initialReady >= initialTotal)
    );
    
    if (shouldClearPending) {
      setStoredGenerationState(false, 0);
      setIsPendingGeneration(false);
      setPendingCount(0);
    }
    
    // Always sync with server props
    setTotalNewIdeas(initialTotal);
    setReadyCount(initialReady);
  }, [initialTotal, initialReady]);

  useEffect(() => {
    // Poll while generating (including pending state)
    if (!isGenerating) return;

    const interval = setInterval(checkForUpdates, POLL_INTERVAL);
    // Also check immediately when we start
    checkForUpdates();
    
    return () => clearInterval(interval);
  }, [isGenerating, checkForUpdates]);

  // Check sessionStorage on every render to catch pending state that survived remount
  // This is needed because useEffect may not re-run during Next.js revalidation
  const storedState = typeof window !== "undefined" ? getStoredGenerationState() : { isPending: false, count: 0, baselineCount: 0, startedAt: 0 };
  
  // Only consider it pending if there's explicit pending state (from clicking Generate)
  const effectiveIsPending = isPendingGeneration || storedState.isPending;
  const effectivePendingCount = isPendingGeneration ? pendingCount : storedState.count;

  // Show bar if we have new ideas OR if generation is pending
  const displayTotal = effectiveIsPending ? effectivePendingCount : totalNewIdeas;
  const displayReady = readyCount;

  if (displayTotal === 0 && !effectiveIsPending) {
    return null;
  }

  // Recalculate isGenerating and isReadyForReview with effective values
  // Only show "generating" if there's explicit pending state - not for old incomplete thumbnails
  const effectiveIsGenerating = effectiveIsPending;
  const effectiveIsReadyForReview = !effectiveIsPending && totalNewIdeas > 0;

  const content = (
    <>
      <div className="flex items-center gap-3">
        <div className={cn(
          "flex items-center justify-center w-10 h-10 rounded-full",
          effectiveIsGenerating ? "bg-[var(--grey-100)]" : "bg-white/80"
        )}>
          {effectiveIsGenerating ? (
            <Loader2 className="h-5 w-5 text-[var(--grey-500)] animate-spin" />
          ) : (
            <Sparkles className="h-5 w-5 text-indigo-600" />
          )}
        </div>
        <div>
          {effectiveIsGenerating ? (
            <>
              <p className="text-sm font-medium text-[var(--grey-800)]">
                Generating {displayTotal} {displayTotal === 1 ? "idea" : "ideas"}...
              </p>
              <p className="text-sm text-[var(--grey-500)]">
                {effectiveIsPending && totalNewIdeas === 0
                  ? "Starting generation..." 
                  : `${displayReady} of ${totalNewIdeas || displayTotal} thumbnails ready`
                }
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-[var(--grey-800)]">
                {displayTotal} new {displayTotal === 1 ? "idea" : "ideas"} to review
              </p>
              <p className="text-sm text-[var(--grey-500)]">
                Review and accept ideas to add them to your queue
              </p>
            </>
          )}
        </div>
      </div>

      {effectiveIsReadyForReview && (
        <div className="flex items-center gap-1 text-sm font-medium text-[var(--grey-800)]">
          Review Now
          <ChevronRight className="h-4 w-4" />
        </div>
      )}
    </>
  );

  // Make entire bar clickable when ready for review
  if (effectiveIsReadyForReview) {
    return (
      <button
        onClick={onReviewClick}
        className="mb-6 w-full rounded-lg p-4 flex items-center justify-between gap-4 text-left transition-all duration-200 cursor-pointer bg-gradient-to-r from-indigo-100 via-purple-100 to-pink-100 hover:from-indigo-200 hover:via-purple-200 hover:to-pink-200 border border-indigo-200 hover:border-indigo-300 shadow-sm hover:shadow-md"
      >
        {content}
      </button>
    );
  }

  // Non-clickable version during generation (neutral styling)
  return (
    <div className="mb-6 rounded-lg p-4 flex items-center justify-between gap-4 bg-white border border-[var(--grey-200)] shadow-sm">
      {content}
    </div>
  );
}

