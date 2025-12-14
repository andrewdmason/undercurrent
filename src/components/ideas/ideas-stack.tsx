"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { IdeaWithChannels } from "@/lib/types";
import { acceptIdea, rejectIdea, remixIdea, undoRejectIdea, undoAcceptIdea } from "@/lib/actions/ideas";
import { StackCard } from "./stack-card";
import { StackActionBar } from "./stack-action-bar";
import { RejectIdeaModal } from "./reject-idea-modal";
import { RemixIdeaModal, RemixOptions } from "./remix-idea-modal";
import { usePollThumbnails } from "@/hooks/use-poll-thumbnails";

interface IdeasStackProps {
  ideas: IdeaWithChannels[];
  projectId: string;
  projectSlug: string;
  characters?: Array<{ id: string; name: string; image_url: string | null }>;
  channels?: Array<{ id: string; platform: string; custom_label: string | null }>;
  templates?: Array<{ id: string; name: string }>;
}

type DismissDirection = "left" | "right" | null;

interface ActionStats {
  accepted: number;
  rejected: number;
}

export function IdeasStack({
  ideas: serverIdeas,
  projectId,
  projectSlug,
  characters = [],
  channels = [],
  templates = [],
}: IdeasStackProps) {
  const router = useRouter();
  
  // Local copy of ideas - we manage this independently of server refreshes during animations
  const [localIdeas, setLocalIdeas] = useState<IdeaWithChannels[]>(serverIdeas);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissDirection, setDismissDirection] = useState<DismissDirection>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [stats, setStats] = useState<ActionStats>({ accepted: 0, rejected: 0 });
  
  // Track if we're mid-action to ignore server refreshes
  const isProcessingRef = useRef(false);

  // Sync local ideas with server ideas ONLY when not processing
  useEffect(() => {
    if (!isProcessingRef.current) {
      setLocalIdeas(serverIdeas);
      // Reset index if it's now out of bounds
      setCurrentIndex((prev) => Math.min(prev, Math.max(0, serverIdeas.length - 1)));
    }
  }, [serverIdeas]);

  // Modal states
  const [rejectModalIdea, setRejectModalIdea] = useState<{ id: string; title: string } | null>(null);
  const [remixModalIdea, setRemixModalIdea] = useState<IdeaWithChannels | null>(null);
  const [isRemixing, setIsRemixing] = useState(false);

  // Current idea - use LOCAL ideas array
  const currentIdea = localIdeas[currentIndex];
  const nextIdea = localIdeas[currentIndex + 1];
  const thirdIdea = localIdeas[currentIndex + 2];
  const isStackEmpty = currentIndex >= localIdeas.length;


  // Find ideas that are missing thumbnails (only for visible cards)
  const visibleIdeas = [currentIdea, nextIdea, thirdIdea].filter(Boolean);
  const pendingIdeaIds = visibleIdeas
    .filter((idea) => !idea.image_url)
    .map((idea) => idea.id);

  // Poll for thumbnail updates
  const handleThumbnailUpdate = useCallback(() => {
    router.refresh();
  }, [router]);

  usePollThumbnails({
    pendingIdeaIds,
    onUpdate: handleThumbnailUpdate,
    enabled: pendingIdeaIds.length > 0,
  });

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs or modals are open
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        rejectModalIdea ||
        remixModalIdea ||
        isAnimating ||
        isStackEmpty
      ) {
        return;
      }

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          handleReject();
          break;
        case "ArrowRight":
          e.preventDefault();
          handleAccept();
          break;
        case "r":
        case "R":
          e.preventDefault();
          handleRemixClick();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, isAnimating, isStackEmpty, rejectModalIdea, remixModalIdea]);

  // Animate card dismissal and remove from local state
  const dismissCard = useCallback((direction: DismissDirection, ideaIdToRemove: string): Promise<void> => {
    setDismissDirection(direction);
    setIsAnimating(true);

    return new Promise((resolve) => {
      // Wait for animation to complete
      setTimeout(() => {
        // Remove the dismissed idea from local state
        setLocalIdeas((prev) => prev.filter((idea) => idea.id !== ideaIdToRemove));
        setDismissDirection(null);
        setIsAnimating(false);
        resolve();
      }, 300);
    });
  }, [currentIndex, localIdeas.length, isAnimating]);

  // Handle accept action
  const handleAccept = async () => {
    if (!currentIdea || isAnimating) return;

    const ideaToAccept = currentIdea;
    
    // Mark as processing to ignore server refreshes
    isProcessingRef.current = true;
    
    // Update stats
    setStats((prev) => ({ ...prev, accepted: prev.accepted + 1 }));

    try {
      // Start animation immediately for responsiveness
      const animationPromise = dismissCard("right", ideaToAccept.id);
      
      // Call server action in parallel
      const result = await acceptIdea(ideaToAccept.id);
      if (result.error) {
        toast.error(result.error);
        setStats((prev) => ({ ...prev, accepted: prev.accepted - 1 }));
        isProcessingRef.current = false;
        return;
      }

      // Wait for animation to complete
      await animationPromise;

      toast.success("Idea accepted!", {
        action: {
          label: "Undo",
          onClick: () => handleUndoAccept(ideaToAccept.id, ideaToAccept.title),
        },
      });
      
      // Done processing - allow server refreshes again
      isProcessingRef.current = false;
    } catch (error) {
      toast.error("Failed to accept idea");
      console.error(error);
      isProcessingRef.current = false;
    }
  };

  // Handle reject action (lightweight - no modal)
  const handleReject = async () => {
    if (!currentIdea || isAnimating) return;

    const ideaToReject = currentIdea;
    
    // Mark as processing to ignore server refreshes
    isProcessingRef.current = true;
    
    // Update stats
    setStats((prev) => ({ ...prev, rejected: prev.rejected + 1 }));

    try {
      // Start animation immediately for responsiveness
      const animationPromise = dismissCard("left", ideaToReject.id);
      
      // Call server action in parallel
      const result = await rejectIdea(ideaToReject.id);
      if (result.error) {
        toast.error(result.error);
        setStats((prev) => ({ ...prev, rejected: prev.rejected - 1 }));
        isProcessingRef.current = false;
        return;
      }

      // Wait for animation to complete
      await animationPromise;

      toast("Idea rejected", {
        action: {
          label: "Undo",
          onClick: () => handleUndoReject(ideaToReject.id, ideaToReject.title),
        },
        cancel: {
          label: "Add reason",
          onClick: () => setRejectModalIdea({ id: ideaToReject.id, title: ideaToReject.title }),
        },
      });

      // Done processing - allow server refreshes again
      isProcessingRef.current = false;
    } catch (error) {
      toast.error("Failed to reject idea");
      console.error(error);
      isProcessingRef.current = false;
    }
  };

  // Handle undo accept
  const handleUndoAccept = async (ideaId: string, ideaTitle: string) => {
    try {
      const result = await undoAcceptIdea(ideaId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setStats((prev) => ({ ...prev, accepted: prev.accepted - 1 }));
      toast.success(`"${ideaTitle}" restored`);
      router.refresh();
    } catch (error) {
      toast.error("Failed to undo");
      console.error(error);
    }
  };

  // Handle undo reject
  const handleUndoReject = async (ideaId: string, ideaTitle: string) => {
    try {
      const result = await undoRejectIdea(ideaId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setStats((prev) => ({ ...prev, rejected: prev.rejected - 1 }));
      toast.success(`"${ideaTitle}" restored`);
      router.refresh();
    } catch (error) {
      toast.error("Failed to undo");
      console.error(error);
    }
  };

  // Handle remix click
  const handleRemixClick = () => {
    if (!currentIdea || isAnimating) return;
    setRemixModalIdea(currentIdea);
  };

  // Handle remix submission
  const handleRemix = async (options: RemixOptions) => {
    if (isRemixing || !remixModalIdea) return;

    setIsRemixing(true);
    const remixedIdeaId = remixModalIdea.id;
    
    try {
      const result = await remixIdea(remixedIdeaId, {
        characterIds: options.characterIds,
        channelIds: options.channelIds,
        templateId: options.templateId,
        customInstructions: options.customInstructions,
        saveAsCopy: options.saveAsCopy,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        setRemixModalIdea(null);
        
        if (result.isCopy) {
          // For copies, refresh to get the new idea
          toast.success(`Created remix: "${result.title}"`);
          router.refresh();
        } else {
          // For in-place remix, update local state to show loading state
          // The idea has new title/description and image is being regenerated
          setLocalIdeas((prev) =>
            prev.map((idea) =>
              idea.id === remixedIdeaId
                ? {
                    ...idea,
                    title: result.title || idea.title,
                    image_url: null, // Clear to show loading shimmer
                  }
                : idea
            )
          );
          toast.success("Idea remixed - regenerating thumbnail...");
          // Refresh to get full updated data
          router.refresh();
        }
      }
    } catch (error) {
      toast.error("Failed to remix idea");
      console.error(error);
    } finally {
      setIsRemixing(false);
    }
  };

  return (
    <div className="flex flex-col items-center">
      {/* Progress indicator */}
      {!isStackEmpty && (
        <div className="mb-4 text-sm text-[var(--grey-400)]">
          {currentIndex + 1} of {localIdeas.length} ideas
        </div>
      )}

      {/* Card stack - mb-12 gives room for stacked cards to peek out below */}
      <div className="relative w-full max-w-[400px] aspect-[3/4] mb-12">
        {isStackEmpty ? (
          <StackEmptyState
            stats={stats}
            projectSlug={projectSlug}
            projectId={projectId}
          />
        ) : (
          <>
            {/* Third card (back) */}
            {thirdIdea && (
              <StackCard
                idea={thirdIdea}
                position="back"
                projectId={projectId}
                isStackAnimating={isAnimating}
              />
            )}

            {/* Second card (middle) */}
            {nextIdea && (
              <StackCard
                idea={nextIdea}
                position="middle"
                projectId={projectId}
                isStackAnimating={isAnimating}
              />
            )}

            {/* Current card (front) */}
            {currentIdea && (
              <StackCard
                idea={currentIdea}
                position="front"
                dismissDirection={dismissDirection}
                projectId={projectId}
              />
            )}
          </>
        )}
      </div>

      {/* Action bar */}
      {!isStackEmpty && (
        <StackActionBar
          onReject={handleReject}
          onAccept={handleAccept}
          onRemix={handleRemixClick}
          disabled={isAnimating}
        />
      )}

      {/* Reject Modal (for adding reason after rejection) */}
      {rejectModalIdea && (
        <RejectIdeaModal
          ideaId={rejectModalIdea.id}
          ideaTitle={rejectModalIdea.title}
          projectId={projectId}
          open={!!rejectModalIdea}
          onOpenChange={(open) => {
            if (!open) setRejectModalIdea(null);
          }}
          alreadyRejected={true}
        />
      )}

      {/* Remix Modal */}
      {remixModalIdea && (
        <RemixIdeaModal
          open={!!remixModalIdea}
          onOpenChange={(open) => {
            if (!open) setRemixModalIdea(null);
          }}
          onRemix={handleRemix}
          isRemixing={isRemixing}
          ideaTitle={remixModalIdea.title}
          currentSelections={{
            channelIds: remixModalIdea.channels?.map((c) => c.id) || [],
            characterIds: remixModalIdea.characters?.map((c) => c.id) || [],
            templateId: remixModalIdea.template?.id || null,
          }}
          characters={characters}
          channels={channels}
          templates={templates}
        />
      )}
    </div>
  );
}

// Empty state when all ideas are processed
interface StackEmptyStateProps {
  stats: ActionStats;
  projectSlug: string;
  projectId: string;
}

function StackEmptyState({ stats, projectSlug, projectId }: StackEmptyStateProps) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 rounded-2xl border-2 border-dashed border-[var(--grey-200)] bg-[var(--grey-25)]">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--green-50)] mb-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-[var(--green-500)]"
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      </div>
      
      <h3 className="text-lg font-medium text-[var(--grey-800)] mb-2">
        All caught up!
      </h3>
      
      <p className="text-sm text-[var(--grey-400)] mb-4">
        You&apos;ve reviewed all your ideas.
      </p>

      {(stats.accepted > 0 || stats.rejected > 0) && (
        <div className="flex gap-4 text-sm mb-6">
          {stats.accepted > 0 && (
            <span className="text-[var(--green-500)]">
              {stats.accepted} accepted
            </span>
          )}
          {stats.rejected > 0 && (
            <span className="text-[var(--grey-400)]">
              {stats.rejected} rejected
            </span>
          )}
        </div>
      )}

      <p className="text-xs text-[var(--grey-400)]">
        Generate more ideas to keep your pipeline flowing.
      </p>
    </div>
  );
}

// Loading skeleton for the stack
export function IdeasStackSkeleton() {
  return (
    <div className="flex flex-col items-center">
      <div className="mb-4 h-5 w-24 bg-[var(--grey-100)] rounded animate-pulse" />
      
      <div className="relative w-full max-w-[400px] aspect-[3/4] mb-6">
        <div className="absolute inset-0 rounded-2xl bg-[var(--grey-100)] animate-pulse" />
      </div>

      <div className="flex gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="w-14 h-14 rounded-full bg-[var(--grey-100)] animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
