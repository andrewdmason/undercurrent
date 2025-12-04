"use client";

import { useState } from "react";
import { IdeaWithChannels } from "@/lib/types";
import { IdeaCard } from "./idea-card";
import { IdeaDetailPanel } from "./idea-detail-panel";
import { Skeleton } from "@/components/ui/skeleton";

interface IdeasFeedProps {
  ideas: IdeaWithChannels[];
  businessId: string;
}

export function IdeasFeed({ ideas, businessId }: IdeasFeedProps) {
  const [selectedIdea, setSelectedIdea] = useState<IdeaWithChannels | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const handleCardClick = (idea: IdeaWithChannels) => {
    setSelectedIdea(idea);
    setPanelOpen(true);
  };

  const handleClosePanel = () => {
    setPanelOpen(false);
    // Delay clearing the idea to allow the close animation to complete
    setTimeout(() => setSelectedIdea(null), 300);
  };

  return (
    <>
      {/* Ideas Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ideas.map((idea) => (
          <IdeaCard
            key={idea.id}
            idea={idea}
            businessId={businessId}
            onClick={() => handleCardClick(idea)}
          />
        ))}
      </div>

      {/* Detail Panel */}
      <IdeaDetailPanel
        idea={selectedIdea}
        businessId={businessId}
        open={panelOpen}
        onClose={handleClosePanel}
      />
    </>
  );
}

// Loading skeleton for the feed
export function IdeasFeedSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-[var(--border)] overflow-hidden">
          <Skeleton className="aspect-[4/3] w-full" />
          <div className="p-3 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
            <div className="flex justify-between pt-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Empty state
export function IdeasEmptyState() {
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
      <p className="text-sm text-[var(--grey-400)] text-center max-w-sm">
        Click &quot;Generate Ideas&quot; to create your first batch of video ideas.
      </p>
    </div>
  );
}


