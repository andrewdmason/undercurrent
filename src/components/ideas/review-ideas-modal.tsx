"use client";

import { IdeaWithChannels } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { IdeasStack } from "./ideas-stack";

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
        className="sm:max-w-[500px] max-h-[90vh] overflow-hidden flex flex-col p-0"
        showCloseButton={true}
      >
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>Review New Ideas</DialogTitle>
          <DialogDescription>
            Accept ideas to add them to your create queue, or reject to remove them.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <IdeasStack
            ideas={ideas}
            projectId={projectId}
            projectSlug={projectSlug}
            characters={characters}
            channels={channels}
            templates={templates}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
