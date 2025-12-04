"use client";

import { useState } from "react";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const hash = ideaId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return `https://picsum.photos/seed/${hash}/800/600`;
}

export function IdeaDetailPanel({
  idea,
  businessId,
  open,
  onClose,
}: IdeaDetailPanelProps) {
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  if (!idea) return null;

  const imageUrl = idea.image_url || getPlaceholderImage(idea.id);
  const timeAgo = formatDistanceToNow(new Date(idea.created_at), { addSuffix: true });

  const handleCopyPrompt = async () => {
    if (!idea.prompt) return;
    try {
      await navigator.clipboard.writeText(idea.prompt);
      setCopiedPrompt(true);
      toast.success("Prompt copied to clipboard");
      setTimeout(() => setCopiedPrompt(false), 2000);
    } catch {
      toast.error("Failed to copy prompt");
    }
  };

  const handleCopyScript = async () => {
    if (!idea.script) return;
    try {
      await navigator.clipboard.writeText(idea.script);
      setCopiedScript(true);
      toast.success("Script copied to clipboard");
      setTimeout(() => setCopiedScript(false), 2000);
    } catch {
      toast.error("Failed to copy script");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-5xl w-[90vw] h-[85vh] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-[var(--border)] flex-shrink-0">
          <DialogTitle className="text-base font-semibold text-[var(--grey-800)] pr-8">
            {idea.title}
          </DialogTitle>
        </DialogHeader>

        {/* Two-column layout */}
        <div className="flex-1 flex min-h-0">
          {/* Left column - Image & Description */}
          <div className="w-1/2 border-r border-[var(--border)] p-6 flex flex-col">
            {/* Image */}
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-[var(--grey-50)] flex-shrink-0">
              <Image
                src={imageUrl}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 480px"
              />
            </div>

            {/* Meta info */}
            <div className="flex items-center justify-between mt-4 flex-shrink-0">
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
              <div className="mt-4 flex-1 min-h-0">
                <h4 className="text-xs font-semibold text-[var(--grey-600)] uppercase tracking-wider mb-2">
                  Description
                </h4>
                <p className="text-sm text-[var(--grey-800)] leading-relaxed">
                  {idea.description}
                </p>
              </div>
            )}

            {/* Coming soon placeholder */}
            <div className="mt-4 rounded-lg bg-[var(--grey-50)] border border-[var(--border)] p-4 flex-shrink-0">
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

          {/* Right column - Script & Underlord Prompt */}
          <div className="w-1/2 p-6 flex flex-col gap-4 min-h-0">
            {/* Script */}
            {idea.script && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-2 flex-shrink-0">
                  <h4 className="text-xs font-semibold text-[var(--grey-600)] uppercase tracking-wider">
                    Script
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyScript}
                    className="h-6 w-6 p-0"
                    title={copiedScript ? "Copied" : "Copy"}
                  >
                    {copiedScript ? (
                      <Check size={14} className="text-[#00975a]" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </Button>
                </div>
                <div className="flex-1 rounded-lg bg-[var(--grey-50)] border border-[var(--border)] p-4 overflow-auto min-h-0">
                  <pre className="text-xs text-[var(--grey-800)] whitespace-pre-wrap font-mono leading-relaxed">
                    {idea.script}
                  </pre>
                </div>
              </div>
            )}

            {/* Underlord Prompt */}
            {idea.prompt && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-2 flex-shrink-0">
                  <h4 className="text-xs font-semibold text-[var(--grey-600)] uppercase tracking-wider">
                    Underlord Prompt
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyPrompt}
                    className="h-6 w-6 p-0"
                    title={copiedPrompt ? "Copied" : "Copy"}
                  >
                    {copiedPrompt ? (
                      <Check size={14} className="text-[#00975a]" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </Button>
                </div>
                <div className="flex-1 rounded-lg bg-[var(--grey-50)] border border-[var(--border)] p-4 overflow-auto min-h-0">
                  <pre className="text-xs text-[var(--grey-800)] whitespace-pre-wrap font-mono leading-relaxed">
                    {idea.prompt}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
