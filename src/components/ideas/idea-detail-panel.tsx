"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { Copy, Check, RefreshCw, X, Play, Ban } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { IdeaWithChannels } from "@/lib/types";
import { generateThumbnail } from "@/lib/actions/thumbnail";
import { acceptIdea, cancelIdea } from "@/lib/actions/ideas";
import { cn } from "@/lib/utils";
import { ImageShimmer } from "@/components/ui/shimmer";
import { PlatformIcon, getChannelLabel } from "./idea-card";
import { ViewType } from "./ideas-feed";
import { ScriptDisplay } from "./script-display";

interface IdeaDetailPanelProps {
  idea: IdeaWithChannels | null;
  businessId: string;
  businessSlug?: string;
  open: boolean;
  onClose: () => void;
  viewType: ViewType;
  onReject?: () => void;
  onPublish?: () => void;
}

export function IdeaDetailPanel({
  idea,
  businessId,
  businessSlug,
  open,
  onClose,
  viewType,
  onReject,
  onPublish,
}: IdeaDetailPanelProps) {
  const router = useRouter();
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);

  if (!idea) return null;

  const hasImage = !!idea.image_url;
  const showShimmer = isGeneratingThumbnail || !hasImage;
  const timeAgo = formatDistanceToNow(new Date(idea.created_at), { addSuffix: true });

  const handleGenerateThumbnail = async () => {
    if (isGeneratingThumbnail) return;

    setIsGeneratingThumbnail(true);
    try {
      const result = await generateThumbnail(idea.id, businessId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Thumbnail generated successfully");
      }
    } catch (error) {
      toast.error("Failed to generate thumbnail");
      console.error(error);
    } finally {
      setIsGeneratingThumbnail(false);
    }
  };

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

  const handleAccept = async (e?: React.MouseEvent) => {
    // Shift+click goes directly to create view
    if (e?.shiftKey && businessSlug) {
      setIsAccepting(true);
      try {
        const result = await acceptIdea(idea.id);
        if (result.error) {
          toast.error(result.error);
        } else {
          onClose();
          router.push(`/${businessSlug}/ideas/${idea.id}`);
        }
      } catch (error) {
        toast.error("Failed to accept idea");
        console.error(error);
      } finally {
        setIsAccepting(false);
      }
      return;
    }
    
    if (isAccepting) return;

    setIsAccepting(true);
    try {
      const result = await acceptIdea(idea.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Idea accepted!", {
          action: businessSlug ? {
            label: "View",
            onClick: () => router.push(`/${businessSlug}/ideas/${idea.id}`),
          } : undefined,
        });
        onClose();
        router.refresh();
      }
    } catch (error) {
      toast.error("Failed to accept idea");
      console.error(error);
    } finally {
      setIsAccepting(false);
    }
  };

  const handleCancel = async () => {
    if (isCanceling) return;

    setIsCanceling(true);
    try {
      const result = await cancelIdea(idea.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Idea removed from Create");
        onClose();
        router.refresh();
      }
    } catch (error) {
      toast.error("Failed to cancel idea");
      console.error(error);
    } finally {
      setIsCanceling(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-5xl w-[90vw] h-[85vh] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-[var(--border)] flex-shrink-0">
          <div className="pr-8">
            {/* Channel Tags */}
            {idea.channels && idea.channels.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {idea.channels.map((channel) => (
                  <span
                    key={channel.id}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium",
                      "bg-[var(--grey-50)] text-[var(--grey-600)]"
                    )}
                  >
                    <PlatformIcon platform={channel.platform} />
                    {getChannelLabel(channel.platform, channel.custom_label)}
                  </span>
                ))}
              </div>
            )}
            <DialogTitle className="text-base font-semibold text-[var(--grey-800)]">
              {idea.title}
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* Two-column layout */}
        <div className="flex-1 flex min-h-0">
          {/* Left column - Image & Description */}
          <div className="w-1/2 border-r border-[var(--border)] p-6 flex flex-col">
            {/* Image */}
            <div className="group/image relative w-full aspect-video overflow-hidden rounded-lg bg-[var(--grey-100)] flex-shrink-0">
              {hasImage && (
              <Image
                  src={idea.image_url!}
                alt=""
                  fill
                  className={cn(
                    "object-cover",
                    showShimmer && "opacity-0"
                  )}
                sizes="(max-width: 768px) 100vw, 480px"
              />
              )}
              
              {/* Shimmer loading state */}
              {showShimmer && <ImageShimmer />}

              {/* Regenerate button on hover (only show when not loading) */}
              {!showShimmer && (
                <button
                  onClick={handleGenerateThumbnail}
                  className={cn(
                    "absolute bottom-3 right-3 p-2 rounded-md",
                    "bg-black/60 text-white opacity-0 group-hover/image:opacity-100",
                    "transition-opacity duration-200",
                    "hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-white/50"
                  )}
                  title="Regenerate thumbnail"
                  aria-label="Regenerate thumbnail"
                >
                  <RefreshCw className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Meta info & Actions */}
            <div className="flex items-center justify-between mt-4 flex-shrink-0">
              <div className="flex items-center gap-2">
                {viewType === "inbox" && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onReject?.()}
                      className="text-[var(--grey-400)] hover:text-destructive hover:bg-destructive/10"
                    >
                      <X className="h-4 w-4 mr-1.5" />
                      Reject
                    </Button>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          onClick={handleAccept}
                          disabled={isAccepting}
                          className="bg-[var(--green-500)] hover:bg-[var(--green-500)]/90 text-white"
                        >
                          <Check className="h-4 w-4 mr-1.5" />
                          {isAccepting ? "Adding..." : "Accept"}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p>Shift+click to accept & open</p>
                      </TooltipContent>
                    </Tooltip>
                  </>
                )}
                {viewType === "queue" && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCancel}
                      disabled={isCanceling}
                      className="text-[var(--grey-400)] hover:text-destructive hover:bg-destructive/10"
                    >
                      <Ban className="h-4 w-4 mr-1.5" />
                      {isCanceling ? "Canceling..." : "Cancel"}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => onPublish?.()}
                      className="bg-gradient-to-t from-[#262626] to-[#404040] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)] hover:brightness-110"
                    >
                      <Play className="h-4 w-4 mr-1.5" />
                      Publish
                    </Button>
                  </>
                )}
                {viewType === "published" && (
                  <span className="text-xs text-[var(--green-500)] font-medium flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" />
                    Published
                  </span>
                )}
              </div>
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
                  <ScriptDisplay script={idea.script} />
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
