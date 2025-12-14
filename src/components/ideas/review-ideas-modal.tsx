"use client";

import { IdeaWithChannels } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { IdeaReviewer } from "./idea-reviewer";

interface ReviewIdeasModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ideas: IdeaWithChannels[];
  projectId: string;
  projectSlug: string;
  characters?: Array<{ id: string; name: string; image_url: string | null }>;
  channels?: Array<{ id: string; platform: string; custom_label: string | null }>;
  templates?: Array<{ id: string; name: string }>;
}

export function ReviewIdeasModal({
  open,
  onOpenChange,
  ideas,
  projectId,
  projectSlug,
  characters = [],
  channels = [],
  templates = [],
}: ReviewIdeasModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
        showCloseButton={true}
      >
        <DialogHeader>
          <DialogTitle>Review New Ideas</DialogTitle>
          <DialogDescription>
            Accept ideas to add them to your create queue, or reject to remove them.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 min-h-0">
          <IdeaReviewer
            ideas={ideas}
            projectId={projectId}
            projectSlug={projectSlug}
            characters={characters}
            channels={channels}
            templates={templates}
            onComplete={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

