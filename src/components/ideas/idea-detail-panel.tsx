"use client";

import { useState } from "react";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { Copy, Check, X } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Idea } from "@/lib/types";
import { IdeaActions } from "./idea-actions";

interface IdeaDetailPanelProps {
  idea: Idea | null;
  businessId: string;
  open: boolean;
  onClose: () => void;
}

function getPlaceholderImage(ideaId: string): string {
  // Use picsum.photos with a consistent seed based on idea ID hash
  const hash = ideaId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return `https://picsum.photos/seed/${hash}/800/600`;
}

export function IdeaDetailPanel({
  idea,
  businessId,
  open,
  onClose,
}: IdeaDetailPanelProps) {
  const [copied, setCopied] = useState(false);

  if (!idea) return null;

  const imageUrl = idea.image_url || getPlaceholderImage(idea.id);
  const timeAgo = formatDistanceToNow(new Date(idea.created_at), { addSuffix: true });

  const handleCopyPrompt = async () => {
    if (!idea.prompt) return;

    try {
      await navigator.clipboard.writeText(idea.prompt);
      setCopied(true);
      toast.success("Prompt copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy prompt");
    }
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b border-[var(--border)] flex-shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base font-semibold text-[var(--grey-800)] pr-8">
              {idea.title}
            </SheetTitle>
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-md p-1 hover:bg-[var(--grey-50-a)] transition-colors"
              aria-label="Close panel"
            >
              <X size={20} className="text-[var(--grey-400)]" />
            </button>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {/* Image */}
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-[var(--grey-50)]">
              <Image
                src={imageUrl}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 512px"
              />
            </div>

            {/* Meta info */}
            <div className="flex items-center justify-between">
              <IdeaActions
                ideaId={idea.id}
                businessId={businessId}
                rating={idea.rating}
                bookmarked={idea.bookmarked}
                size="md"
              />
              <span className="text-xs text-[var(--grey-400)]">
                {timeAgo}
              </span>
            </div>

            {/* Description */}
            {idea.description && (
              <div>
                <h4 className="text-xs font-semibold text-[var(--grey-600)] uppercase tracking-wider mb-2">
                  Description
                </h4>
                <p className="text-sm text-[var(--grey-800)] leading-relaxed">
                  {idea.description}
                </p>
              </div>
            )}

            {/* Prompt */}
            {idea.prompt && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-[var(--grey-600)] uppercase tracking-wider">
                    Underlord Prompt
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyPrompt}
                    className="h-7 gap-1.5 text-xs"
                  >
                    {copied ? (
                      <>
                        <Check size={14} className="text-[#00975a]" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <div className="rounded-lg bg-[var(--grey-50)] border border-[var(--border)] p-4">
                  <pre className="text-xs text-[var(--grey-800)] whitespace-pre-wrap font-mono leading-relaxed">
                    {idea.prompt}
                  </pre>
                </div>
              </div>
            )}

            {/* Coming soon: Chat iteration */}
            <div className="rounded-lg bg-[var(--grey-50)] border border-[var(--border)] p-4">
              <div className="flex items-center gap-2 text-[var(--grey-400)]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span className="text-xs">
                  Prompt iteration via chat coming soon
                </span>
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

