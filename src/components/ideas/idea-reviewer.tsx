"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { RefreshCw, LayoutTemplate, Check, Loader2, Shuffle, Copy, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { IdeaWithChannels, DISTRIBUTION_PLATFORMS } from "@/lib/types";
import {
  acceptIdea,
  rejectIdea,
  remixIdea,
  undoRejectIdea,
  undoAcceptIdea,
} from "@/lib/actions/ideas";
import { generateThumbnail } from "@/lib/actions/thumbnail";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ImageShimmer } from "@/components/ui/shimmer";
import { ImageLightbox, ImageExpandButton } from "@/components/ui/image-lightbox";
import { PlatformIcon } from "./idea-card";
import { PlatformIcon as StrategyPlatformIcon, getPlatformLabel } from "@/components/strategy/platform-icon";
import { usePollThumbnails } from "@/hooks/use-poll-thumbnails";

interface IdeaReviewerProps {
  ideas: IdeaWithChannels[];
  projectId: string;
  projectSlug: string;
  characters?: Array<{ id: string; name: string; image_url: string | null }>;
  channels?: Array<{ id: string; platform: string; custom_label: string | null }>;
  templates?: Array<{ id: string; name: string }>;
  onComplete?: () => void;
}

interface ActionStats {
  accepted: number;
  rejected: number;
}

interface RecentRejection {
  id: string;
  title: string;
  timestamp: number;
}

type ReviewStep = "review" | "remix" | "reject-reason";

// Quick rejection reason options
const REJECTION_REASONS = [
  "Not relevant to my audience",
  "Bad timing",
  "Topic doesn't fit",
  "Wrong format/template",
  "Already covered this",
];

export function IdeaReviewer({
  ideas: serverIdeas,
  projectId,
  projectSlug,
  characters = [],
  channels = [],
  templates = [],
  onComplete,
}: IdeaReviewerProps) {
  const router = useRouter();

  // Local copy of ideas
  const [localIdeas, setLocalIdeas] = useState<IdeaWithChannels[]>(serverIdeas);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [stats, setStats] = useState<ActionStats>({ accepted: 0, rejected: 0 });

  // Current step in the review flow
  const [step, setStep] = useState<ReviewStep>("review");

  // Recent rejection for inline "add reason" prompt
  const [recentRejection, setRecentRejection] = useState<RecentRejection | null>(null);

  // Remix state
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>([]);
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [remixInstructions, setRemixInstructions] = useState("");
  const [saveAsCopy, setSaveAsCopy] = useState(false);
  const [isRemixing, setIsRemixing] = useState(false);

  // Reject reason state
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [customReason, setCustomReason] = useState("");
  const [isSubmittingReason, setIsSubmittingReason] = useState(false);

  // Track if we're mid-action to ignore server refreshes
  const isProcessingRef = useRef(false);

  // Other UI state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);

  // Sync local ideas with server ideas ONLY when not processing
  useEffect(() => {
    if (!isProcessingRef.current) {
      setLocalIdeas(serverIdeas);
      setCurrentIndex((prev) => Math.min(prev, Math.max(0, serverIdeas.length - 1)));
    }
  }, [serverIdeas]);

  // Current idea
  const currentIdea = localIdeas[currentIndex];
  const isStackEmpty = currentIndex >= localIdeas.length;
  const hasImage = !!currentIdea?.image_url;
  const showShimmer = isGeneratingThumbnail || !hasImage;

  // Poll for thumbnail updates
  const pendingIdeaIds = currentIdea && !currentIdea.image_url ? [currentIdea.id] : [];
  
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
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        isTransitioning ||
        isStackEmpty
      ) {
        return;
      }

      if (step === "review") {
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
      } else if (e.key === "Escape") {
        e.preventDefault();
        resetToReview();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, isTransitioning, isStackEmpty, step]);

  // Reset to review step
  const resetToReview = () => {
    setStep("review");
    // Reset remix state
    setSelectedCharacterIds([]);
    setSelectedChannelIds([]);
    setSelectedTemplateId(null);
    setRemixInstructions("");
    setSaveAsCopy(false);
    // Reset reject reason state
    setSelectedReasons([]);
    setCustomReason("");
  };

  // Transition to next idea with crossfade
  const transitionToNext = useCallback((ideaIdToRemove: string): Promise<void> => {
    setIsTransitioning(true);

    return new Promise((resolve) => {
      setTimeout(() => {
        setLocalIdeas((prev) => prev.filter((idea) => idea.id !== ideaIdToRemove));
        setIsTransitioning(false);
        resetToReview();
        resolve();
      }, 200);
    });
  }, []);

  // Handle accept action
  const handleAccept = async () => {
    if (!currentIdea || isTransitioning || step !== "review") return;

    const ideaToAccept = currentIdea;
    isProcessingRef.current = true;
    setStats((prev) => ({ ...prev, accepted: prev.accepted + 1 }));

    try {
      const animationPromise = transitionToNext(ideaToAccept.id);
      const result = await acceptIdea(ideaToAccept.id);
      
      if (result.error) {
        toast.error(result.error);
        setStats((prev) => ({ ...prev, accepted: prev.accepted - 1 }));
        isProcessingRef.current = false;
        return;
      }

      await animationPromise;
      isProcessingRef.current = false;
    } catch (error) {
      toast.error("Failed to accept idea");
      console.error(error);
      isProcessingRef.current = false;
    }
  };

  // Handle reject - immediately reject and show inline "add reason" option
  const handleReject = async () => {
    if (!currentIdea || isTransitioning || step !== "review") return;

    const ideaToReject = currentIdea;
    
    isProcessingRef.current = true;
    setStats((prev) => ({ ...prev, rejected: prev.rejected + 1 }));

    try {
      const animationPromise = transitionToNext(ideaToReject.id);
      const result = await rejectIdea(ideaToReject.id);

      if (result.error) {
        toast.error(result.error);
        setStats((prev) => ({ ...prev, rejected: prev.rejected - 1 }));
        isProcessingRef.current = false;
        return;
      }

      await animationPromise;

      // Set recent rejection for inline "add reason" prompt
      setRecentRejection({
        id: ideaToReject.id,
        title: ideaToReject.title,
        timestamp: Date.now(),
      });

      // Auto-clear the recent rejection after 8 seconds
      setTimeout(() => {
        setRecentRejection((prev) => 
          prev?.id === ideaToReject.id ? null : prev
        );
      }, 8000);

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

  // Handle remix click - switch to remix step
  const handleRemixClick = () => {
    if (!currentIdea || isTransitioning) return;
    // Pre-populate with current idea's selections
    setSelectedCharacterIds(currentIdea.characters?.map((c) => c.id) || []);
    setSelectedChannelIds(currentIdea.channels?.map((c) => c.id) || []);
    setSelectedTemplateId(currentIdea.template?.id || null);
    setRemixInstructions("");
    setSaveAsCopy(false);
    setStep("remix");
  };

  // Handle remix submission
  const handleRemixSubmit = async () => {
    if (!currentIdea || isRemixing) return;

    setIsRemixing(true);
    const remixedIdeaId = currentIdea.id;

    try {
      const result = await remixIdea(remixedIdeaId, {
        characterIds: selectedCharacterIds,
        channelIds: selectedChannelIds,
        templateId: selectedTemplateId,
        customInstructions: remixInstructions.trim() || undefined,
        saveAsCopy,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        resetToReview();

        if (result.isCopy) {
          toast.success(`Created remix: "${result.title}"`);
          router.refresh();
        } else {
          setLocalIdeas((prev) =>
            prev.map((idea) =>
              idea.id === remixedIdeaId
                ? { ...idea, title: result.title || idea.title, image_url: null }
                : idea
            )
          );
          toast.success("Idea remixed - regenerating thumbnail...");
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

  // Handle add reason click - switch to reject-reason step
  const handleAddReasonClick = () => {
    if (!recentRejection) return;
    setSelectedReasons([]);
    setCustomReason("");
    setStep("reject-reason");
  };

  // Toggle a reason selection
  const toggleReason = (reason: string) => {
    setSelectedReasons((prev) =>
      prev.includes(reason)
        ? prev.filter((r) => r !== reason)
        : [...prev, reason]
    );
  };

  // Build full rejection reason
  const getFullReason = () => {
    const parts = [...selectedReasons];
    if (customReason.trim()) parts.push(customReason.trim());
    return parts.join(". ") || undefined;
  };

  // Submit rejection reason
  const handleSubmitReason = async () => {
    if (!recentRejection || isSubmittingReason) return;

    const reason = getFullReason();
    if (!reason) {
      resetToReview();
      setRecentRejection(null);
      return;
    }

    setIsSubmittingReason(true);
    try {
      // Update the rejection with the reason
      const result = await rejectIdea(recentRejection.id, reason);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Reason added");
      }
    } catch (error) {
      toast.error("Failed to add reason");
      console.error(error);
    } finally {
      setIsSubmittingReason(false);
      resetToReview();
      setRecentRejection(null);
    }
  };

  // Handle thumbnail regeneration
  const handleGenerateThumbnail = async () => {
    if (!currentIdea || isGeneratingThumbnail) return;

    setIsGeneratingThumbnail(true);
    try {
      const result = await generateThumbnail(currentIdea.id, projectId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Thumbnail generated");
      }
    } catch (error) {
      toast.error("Failed to generate thumbnail");
      console.error(error);
    } finally {
      setIsGeneratingThumbnail(false);
    }
  };

  // Character selection handlers
  const toggleCharacter = (id: string) => {
    if (selectedCharacterIds.includes(id)) {
      setSelectedCharacterIds(selectedCharacterIds.filter((cid) => cid !== id));
    } else {
      setSelectedCharacterIds([...selectedCharacterIds, id]);
    }
  };

  // Channel selection handlers
  const toggleChannel = (id: string) => {
    if (selectedChannelIds.includes(id)) {
      setSelectedChannelIds(selectedChannelIds.filter((cid) => cid !== id));
    } else {
      setSelectedChannelIds([...selectedChannelIds, id]);
    }
  };

  // Empty state
  if (isStackEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#00975a]/10 mb-4">
          <Check className="h-7 w-7 text-[#00975a]" />
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
              <span className="text-[#00975a]">
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
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Progress indicator */}
      <div className="text-sm text-[var(--grey-400)] mb-4">
        {currentIndex + 1} of {localIdeas.length} ideas
      </div>

      {/* Main content area with crossfade */}
      <div
        className={cn(
          "flex-1 transition-opacity duration-200",
          isTransitioning && "opacity-0"
        )}
      >
        {step === "review" && (
          // Review step - show idea content
          <div className="space-y-4">
            {/* Image container - landscape aspect ratio */}
            <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-[var(--grey-100)]">
              {hasImage ? (
                <Image
                  src={currentIdea.image_url!}
                  alt=""
                  fill
                  className={cn(
                    "object-cover",
                    showShimmer && "opacity-0"
                  )}
                  sizes="(max-width: 768px) 100vw, 700px"
                  priority
                />
              ) : (
                <ImageShimmer />
              )}

              {showShimmer && hasImage && (
                <div className="absolute inset-0">
                  <ImageShimmer />
                </div>
              )}

              {/* Channel badges */}
              {currentIdea.channels && currentIdea.channels.length > 0 && !showShimmer && (
                <>
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                  <div className="absolute bottom-3 left-3 flex items-center gap-2">
                    {currentIdea.channels.map((channel) => (
                      <span
                        key={channel.id}
                        className="text-white drop-shadow-md"
                        title={getChannelLabelLocal(channel.platform, channel.custom_label)}
                      >
                        <PlatformIcon platform={channel.platform} className="h-4 w-4 !text-white" />
                      </span>
                    ))}
                  </div>
                </>
              )}

              {/* Expand button */}
              {hasImage && !showShimmer && (
                <ImageExpandButton
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxOpen(true);
                  }}
                />
              )}

              {/* Regenerate thumbnail button */}
              {hasImage && !showShimmer && (
                <button
                  onClick={handleGenerateThumbnail}
                  disabled={isGeneratingThumbnail}
                  className={cn(
                    "absolute bottom-3 right-3 p-1.5 rounded transition-opacity duration-200",
                    "bg-black/60 text-white hover:bg-black/80",
                    "focus:outline-none focus:ring-2 focus:ring-white/50",
                    "disabled:cursor-not-allowed"
                  )}
                  title="Regenerate thumbnail"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", isGeneratingThumbnail && "animate-spin")} />
                </button>
              )}
            </div>

            {/* Content */}
            <div>
              <h3 className="text-lg font-medium text-[var(--grey-800)] tracking-[-0.08px] mb-2">
                {currentIdea.title}
              </h3>

              {/* Metadata row */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {currentIdea.template && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--grey-50)] text-[var(--grey-600)]">
                    <LayoutTemplate className="h-3 w-3" />
                    {currentIdea.template.name}
                  </span>
                )}
                {currentIdea.channels && currentIdea.channels.length > 0 && (
                  <span className="text-[10px] text-[var(--grey-400)]">
                    {currentIdea.channels.map((c) => getChannelLabelLocal(c.platform, c.custom_label)).join(", ")}
                  </span>
                )}
              </div>

              {/* Description */}
              {currentIdea.description && (
                <p className="text-sm text-[var(--grey-500)] leading-relaxed">
                  {currentIdea.description}
                </p>
              )}
            </div>
          </div>
        )}

        {step === "remix" && (
          // Remix step - show remix options inline
          <div className="space-y-5">
            <div>
              <h4 className="text-sm font-medium text-[var(--grey-800)] mb-1">
                Remix Idea
              </h4>
              <p className="text-xs text-[var(--grey-400)]">
                Transform &ldquo;{currentIdea.title}&rdquo; with different parameters
              </p>
            </div>

            {/* Characters */}
            {characters.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--grey-600)]">
                  Characters
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCharacterIds([])}
                    disabled={isRemixing}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
                      selectedCharacterIds.length === 0
                        ? "bg-[var(--grey-800)] text-white border-[var(--grey-800)]"
                        : "bg-white text-[var(--grey-600)] border-[var(--grey-200)] hover:border-[var(--grey-300)]"
                    )}
                  >
                    <Shuffle className="size-3" />
                    Any
                  </button>
                  {characters.map((character) => {
                    const isSelected = selectedCharacterIds.includes(character.id);
                    return (
                      <button
                        key={character.id}
                        type="button"
                        onClick={() => toggleCharacter(character.id)}
                        disabled={isRemixing}
                        className={cn(
                          "relative flex items-center gap-2 px-2 py-1.5 rounded-full text-xs font-medium transition-colors border",
                          isSelected
                            ? "bg-[var(--grey-800)] text-white border-[var(--grey-800)]"
                            : "bg-white text-[var(--grey-600)] border-[var(--grey-200)] hover:border-[var(--grey-300)]"
                        )}
                      >
                        {character.image_url ? (
                          <img
                            src={character.image_url}
                            alt={character.name}
                            className="size-5 rounded-full object-cover"
                          />
                        ) : (
                          <div className="size-5 rounded-full bg-[var(--grey-200)] flex items-center justify-center text-[10px] font-medium">
                            {character.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span>{character.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Channels */}
            {channels.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--grey-600)]">
                  Channels
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedChannelIds([])}
                    disabled={isRemixing}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
                      selectedChannelIds.length === 0
                        ? "bg-[var(--grey-800)] text-white border-[var(--grey-800)]"
                        : "bg-white text-[var(--grey-600)] border-[var(--grey-200)] hover:border-[var(--grey-300)]"
                    )}
                  >
                    <Shuffle className="size-3" />
                    Any
                  </button>
                  {channels.map((channel) => {
                    const isSelected = selectedChannelIds.includes(channel.id);
                    const label = getPlatformLabel(channel.platform, channel.custom_label);
                    return (
                      <button
                        key={channel.id}
                        type="button"
                        onClick={() => toggleChannel(channel.id)}
                        disabled={isRemixing}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
                          isSelected
                            ? "bg-[var(--grey-800)] text-white border-[var(--grey-800)]"
                            : "bg-white text-[var(--grey-600)] border-[var(--grey-200)] hover:border-[var(--grey-300)]"
                        )}
                      >
                        <StrategyPlatformIcon 
                          platform={channel.platform} 
                          className={cn("size-3.5", isSelected && "text-white")} 
                        />
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Templates */}
            {templates.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--grey-600)]">
                  Template
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTemplateId(null)}
                    disabled={isRemixing}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
                      selectedTemplateId === null
                        ? "bg-[var(--grey-800)] text-white border-[var(--grey-800)]"
                        : "bg-white text-[var(--grey-600)] border-[var(--grey-200)] hover:border-[var(--grey-300)]"
                    )}
                  >
                    <Shuffle className="size-3" />
                    Any
                  </button>
                  {templates.map((template) => {
                    const isSelected = selectedTemplateId === template.id;
                    return (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => setSelectedTemplateId(template.id)}
                        disabled={isRemixing}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
                          isSelected
                            ? "bg-[var(--grey-800)] text-white border-[var(--grey-800)]"
                            : "bg-white text-[var(--grey-600)] border-[var(--grey-200)] hover:border-[var(--grey-300)]"
                        )}
                      >
                        <span>{template.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Remix Instructions */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-[var(--grey-600)]">
                Instructions
                <span className="font-normal text-[var(--grey-400)] ml-1">(optional)</span>
              </label>
              <Textarea
                placeholder={`e.g., "Make it more humorous" or "Focus on a different angle"`}
                value={remixInstructions}
                onChange={(e) => setRemixInstructions(e.target.value)}
                disabled={isRemixing}
                rows={2}
                className="resize-none border-[var(--grey-200)]"
              />
            </div>

            {/* Save as Copy Checkbox */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={saveAsCopy}
                  onChange={(e) => setSaveAsCopy(e.target.checked)}
                  disabled={isRemixing}
                  className="size-4 rounded border-[var(--grey-300)] text-[var(--grey-800)] focus:ring-[var(--grey-400)] cursor-pointer"
                />
                <span className="text-sm text-[var(--grey-600)] group-hover:text-[var(--grey-800)] flex items-center gap-1.5">
                  <Copy className="size-3.5" />
                  Save as copy
                </span>
              </label>
              <span className="text-xs text-[var(--grey-400)]">
                {saveAsCopy ? "Creates a new idea, keeps original" : "Replaces the original idea"}
              </span>
            </div>
          </div>
        )}

        {step === "reject-reason" && recentRejection && (
          // Reject reason step - show reason options inline
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-[var(--grey-800)] mb-1">
                Why did you reject this?
              </h4>
              <p className="text-xs text-[var(--grey-400)]">
                Optional - helps improve future suggestions for &ldquo;{recentRejection.title}&rdquo;
              </p>
            </div>

            {/* Quick reason pills */}
            <div className="flex flex-wrap gap-2">
              {REJECTION_REASONS.map((reason) => (
                <button
                  key={reason}
                  onClick={() => toggleReason(reason)}
                  disabled={isSubmittingReason}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm transition-colors",
                    selectedReasons.includes(reason)
                      ? "bg-[var(--grey-800)] text-white"
                      : "bg-[var(--grey-50)] text-[var(--grey-600)] hover:bg-[var(--grey-100)]"
                  )}
                >
                  {reason}
                </button>
              ))}
            </div>

            {/* Custom reason input */}
            <div>
              <Textarea
                placeholder="Or describe in your own words..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                disabled={isSubmittingReason}
                rows={2}
                className="resize-none border-[var(--grey-200)]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Action bar - pinned at bottom */}
      <div className="flex items-center justify-end gap-3 pt-4 mt-4 border-t border-[var(--grey-100)]">
        {step === "review" && (
          <>
            {/* Recent rejection "add reason" link */}
            {recentRejection && (
              <button
                onClick={handleAddReasonClick}
                className="text-xs text-[#1a5eff] hover:underline transition-colors"
              >
                Add reason for rejection
              </button>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleReject}
                disabled={isTransitioning}
              >
                Reject
              </Button>
              <Button
                variant="outline"
                onClick={handleRemixClick}
                disabled={isTransitioning}
                className="gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Remix
              </Button>
              <Button
                variant="success"
                onClick={handleAccept}
                disabled={isTransitioning}
                className="gap-1.5"
              >
                <Check className="h-3.5 w-3.5" />
                Accept
              </Button>
            </div>
          </>
        )}

        {step === "remix" && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={resetToReview}
              disabled={isRemixing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRemixSubmit}
              disabled={isRemixing}
              className="gap-1.5"
            >
              {isRemixing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Remixing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3.5 w-3.5" />
                  Remix
                </>
              )}
            </Button>
          </div>
        )}

        {step === "reject-reason" && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                resetToReview();
                setRecentRejection(null);
              }}
              disabled={isSubmittingReason}
            >
              Skip
            </Button>
            <Button
              onClick={handleSubmitReason}
              disabled={isSubmittingReason || (selectedReasons.length === 0 && !customReason.trim())}
              className="gap-1.5"
            >
              {isSubmittingReason ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Reason"
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {currentIdea && hasImage && (
        <ImageLightbox
          src={currentIdea.image_url!}
          open={lightboxOpen}
          onOpenChange={setLightboxOpen}
        />
      )}
    </div>
  );
}

// Helper function to get channel label
function getChannelLabelLocal(platform: string, customLabel?: string | null): string {
  if (platform === "custom" && customLabel) {
    return customLabel;
  }
  return DISTRIBUTION_PLATFORMS.find((p) => p.value === platform)?.label || platform;
}
