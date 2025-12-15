"use client";

import { useState, useEffect } from "react";
import { IdeaWithChannels } from "@/lib/types";
import { NewIdeasAlertBar } from "./new-ideas-alert-bar";
import { ReviewIdeasModal } from "./review-ideas-modal";

interface NewIdeasSectionProps {
  ideas: IdeaWithChannels[];
  projectId: string;
  projectSlug: string;
  characters?: Array<{ id: string; name: string; image_url: string | null }>;
  channels?: Array<{ id: string; platform: string; custom_label: string | null }>;
  templates?: Array<{ id: string; name: string }>;
}

export function NewIdeasSection({
  ideas,
  projectId,
  projectSlug,
  characters = [],
  channels = [],
  templates = [],
}: NewIdeasSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const totalNewIdeas = ideas.length;
  const readyCount = ideas.filter((idea) => idea.image_url !== null).length;
  // Allow review as long as there are ideas - don't require ALL thumbnails to be ready
  // (some old ideas may have failed thumbnail generation)
  const isReadyForReview = totalNewIdeas > 0;

  // Close modal if ideas are no longer ready for review (e.g., new generation started)
  useEffect(() => {
    if (!isReadyForReview && isModalOpen) {
      setIsModalOpen(false);
    }
  }, [isReadyForReview, isModalOpen]);

  // Always render - the alert bar handles its own visibility
  // (it shows during pending generation even when ideas.length === 0)
  return (
    <>
      <NewIdeasAlertBar
        projectId={projectId}
        totalNewIdeas={totalNewIdeas}
        readyCount={readyCount}
        onReviewClick={() => setIsModalOpen(true)}
      />

      {/* Render modal when there are ideas to review */}
      {isReadyForReview && (
        <ReviewIdeasModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          ideas={ideas}
          projectId={projectId}
          projectSlug={projectSlug}
          characters={characters}
          channels={channels}
          templates={templates}
        />
      )}
    </>
  );
}

