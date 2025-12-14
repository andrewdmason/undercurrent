"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { IdeaWithChannels } from "@/lib/types";
import { remixIdea } from "@/lib/actions/ideas";
import { IdeaCard } from "./idea-card";
import { IdeaDetailPanel } from "./idea-detail-panel";
import { RejectIdeaModal } from "./reject-idea-modal";
import { PublishIdeaModal } from "./publish-idea-modal";
import { RemixIdeaModal, RemixOptions } from "./remix-idea-modal";
import { GenerateIdeasButton } from "./generate-ideas-button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePollThumbnails } from "@/hooks/use-poll-thumbnails";

export type ViewType = "inbox" | "queue" | "published";

interface IdeasFeedProps {
  ideas: IdeaWithChannels[];
  projectId: string;
  projectSlug?: string;
  viewType: ViewType;
  // Project options for remix modal (only needed for inbox view)
  characters?: Array<{ id: string; name: string; image_url: string | null }>;
  channels?: Array<{ id: string; platform: string; custom_label: string | null }>;
  templates?: Array<{ id: string; name: string }>;
}

export function IdeasFeed({ 
  ideas, 
  projectId, 
  projectSlug, 
  viewType,
  characters = [],
  channels = [],
  templates = [],
}: IdeasFeedProps) {
  const router = useRouter();
  const [selectedIdea, setSelectedIdea] = useState<IdeaWithChannels | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  
  // Modal states
  const [rejectModalIdea, setRejectModalIdea] = useState<IdeaWithChannels | null>(null);
  const [publishModalIdea, setPublishModalIdea] = useState<IdeaWithChannels | null>(null);
  const [remixModalIdea, setRemixModalIdea] = useState<IdeaWithChannels | null>(null);
  const [isRemixing, setIsRemixing] = useState(false);

  // Find ideas that are missing thumbnails
  const pendingIdeaIds = useMemo(
    () => ideas.filter((idea) => !idea.image_url).map((idea) => idea.id),
    [ideas]
  );

  // Poll for thumbnail updates and refresh when new ones are detected
  const handleThumbnailUpdate = useCallback(() => {
    router.refresh();
  }, [router]);

  usePollThumbnails({
    pendingIdeaIds,
    onUpdate: handleThumbnailUpdate,
    enabled: pendingIdeaIds.length > 0,
  });

  const handleCardClick = (idea: IdeaWithChannels) => {
    // For inbox (New), don't do anything on card click
    if (viewType === "inbox") {
      return;
    }
    // For published, open the modal
    setSelectedIdea(idea);
    setPanelOpen(true);
  };

  const handleClosePanel = () => {
    setPanelOpen(false);
    // Delay clearing the idea to allow the close animation to complete
    setTimeout(() => setSelectedIdea(null), 300);
  };

  const handleRemix = async (options: RemixOptions) => {
    if (isRemixing || !remixModalIdea) return;

    setIsRemixing(true);
    try {
      const result = await remixIdea(remixModalIdea.id, {
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
          toast.success(`Created remix: "${result.title}"`);
        } else {
          toast.success("Idea remixed successfully");
        }
        router.refresh();
      }
    } catch (error) {
      toast.error("Failed to remix idea");
      console.error(error);
    } finally {
      setIsRemixing(false);
    }
  };

  return (
    <>
      {/* Feed - Grid for queue, single column for others */}
      <div className={viewType === "queue" 
        ? "grid grid-cols-3 gap-4" 
        : "flex flex-col gap-4"
      }>
        {ideas.map((idea) => (
          <IdeaCard
            key={idea.id}
            idea={idea}
            projectId={projectId}
            projectSlug={projectSlug}
            href={viewType === "queue" && projectSlug ? `/${projectSlug}/ideas/${idea.id}` : undefined}
            onClick={() => handleCardClick(idea)}
            isLoadingImage={!idea.image_url}
            isRemixing={isRemixing && remixModalIdea?.id === idea.id}
            viewType={viewType}
            onReject={() => setRejectModalIdea(idea)}
            onPublish={() => setPublishModalIdea(idea)}
            onRemix={() => setRemixModalIdea(idea)}
            prepTimeMinutes={idea.prepTimeMinutes}
          />
        ))}
      </div>

      {/* Detail Panel */}
      <IdeaDetailPanel
        idea={selectedIdea}
        projectId={projectId}
        projectSlug={projectSlug}
        open={panelOpen}
        onClose={handleClosePanel}
        viewType={viewType}
        onReject={() => {
          if (selectedIdea) {
            setRejectModalIdea(selectedIdea);
          }
        }}
        onPublish={() => {
          if (selectedIdea) {
            setPublishModalIdea(selectedIdea);
          }
        }}
      />

      {/* Reject Modal */}
      {rejectModalIdea && (
        <RejectIdeaModal
          ideaId={rejectModalIdea.id}
          ideaTitle={rejectModalIdea.title}
          projectId={projectId}
          open={!!rejectModalIdea}
          onOpenChange={(open) => {
            if (!open) setRejectModalIdea(null);
          }}
        />
      )}

      {/* Publish Modal */}
      {publishModalIdea && (
        <PublishIdeaModal
          ideaId={publishModalIdea.id}
          ideaTitle={publishModalIdea.title}
          channels={publishModalIdea.channels}
          open={!!publishModalIdea}
          onOpenChange={(open) => {
            if (!open) setPublishModalIdea(null);
          }}
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
            channelIds: remixModalIdea.channels?.map(c => c.id) || [],
            characterIds: remixModalIdea.characters?.map(c => c.id) || [],
            templateId: remixModalIdea.template?.id || null,
          }}
          characters={characters}
          channels={channels}
          templates={templates}
        />
      )}
    </>
  );
}

// Loading skeleton for the feed
export function IdeasFeedSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-[var(--border)] bg-[var(--grey-0)] overflow-hidden">
          <Skeleton className="aspect-video w-full" />
          <div className="p-4 space-y-3">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-24" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Empty state
interface IdeasEmptyStateProps {
  projectId?: string;
  characters?: Array<{ id: string; name: string; image_url: string | null }>;
  channels?: Array<{ id: string; platform: string; custom_label: string | null }>;
  templates?: Array<{ id: string; name: string }>;
  topics?: Array<{ id: string; name: string }>;
}

export function IdeasEmptyState({
  projectId,
  characters = [],
  channels = [],
  templates = [],
  topics = [],
}: IdeasEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--grey-50)] mb-6">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-[var(--grey-400)]"
        >
          <polygon points="23 7 16 12 23 17 23 7" />
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
        </svg>
      </div>
      <h3 className="text-lg font-normal text-[var(--grey-800)] mb-2">
        No ideas yet
      </h3>
      <p className="text-sm text-[var(--grey-400)] text-center max-w-sm mb-6">
        Generate your first batch of video ideas to get started.
      </p>
      {projectId && (
        <GenerateIdeasButton
          projectId={projectId}
          characters={characters}
          channels={channels}
          templates={templates}
          topics={topics}
        />
      )}
    </div>
  );
}


