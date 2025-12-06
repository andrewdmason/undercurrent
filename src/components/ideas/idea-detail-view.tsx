"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Copy, Check, RefreshCw, ArrowLeft, Play, Ban, MessageSquare, Send, Sparkles, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IdeaWithChannels } from "@/lib/types";
import { generateThumbnail } from "@/lib/actions/thumbnail";
import { cancelIdea } from "@/lib/actions/ideas";
import { cn } from "@/lib/utils";
import { ImageShimmer } from "@/components/ui/shimmer";
import { PlatformIcon, getChannelLabel } from "./idea-card";
import { PublishIdeaModal } from "./publish-idea-modal";

interface IdeaDetailViewProps {
  idea: IdeaWithChannels;
  businessId: string;
  businessSlug: string;
}

export function IdeaDetailView({ idea, businessId, businessSlug }: IdeaDetailViewProps) {
  const router = useRouter();
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [underlordModalOpen, setUnderlordModalOpen] = useState(false);

  const hasImage = !!idea.image_url;
  const showShimmer = isGeneratingThumbnail || !hasImage;

  const handleGenerateThumbnail = async () => {
    if (isGeneratingThumbnail) return;

    setIsGeneratingThumbnail(true);
    try {
      const result = await generateThumbnail(idea.id, businessId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Thumbnail generated successfully");
        router.refresh();
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

  const handleCancel = async () => {
    if (isCanceling) return;

    setIsCanceling(true);
    try {
      const result = await cancelIdea(idea.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Idea removed from queue");
        router.push(`/${businessSlug}/queue`);
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
    <div className="flex-1 flex flex-col bg-[var(--grey-25)] min-h-0">
      {/* Back Navigation & Title Bar */}
      <div className="border-b border-[var(--border)] bg-[var(--grey-0)]">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-4">
          <Link
            href={`/${businessSlug}/queue`}
            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-[var(--grey-500)] hover:text-[var(--grey-800)] hover:bg-[var(--grey-50)] transition-colors flex-shrink-0"
            aria-label="Back to Queue"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <h1 className="text-base font-semibold text-[var(--grey-800)] tracking-[-0.2px] truncate">
              {idea.title}
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {idea.prompt && (
              <button
                onClick={() => setUnderlordModalOpen(true)}
                className="inline-flex items-center gap-1.5 h-8 px-4 text-xs font-medium rounded-lg bg-gradient-to-t from-[#262626] to-[#404040] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)] hover:brightness-110 transition-all"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Create with Underlord
              </button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-[var(--border)] bg-[var(--grey-0)] text-[var(--grey-500)] hover:bg-[var(--grey-50)] hover:text-[var(--grey-800)] transition-colors"
                  aria-label="More options"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="min-w-[160px] rounded-lg border border-[var(--border)] bg-[var(--grey-0)] p-1 shadow-[0px_8px_16px_rgba(0,0,0,0.12),0px_8px_8px_rgba(0,0,0,0.08)]"
              >
                <DropdownMenuItem
                  onClick={handleCancel}
                  disabled={isCanceling}
                  className="flex items-center gap-2 h-8 px-2 rounded-md text-xs text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                >
                  <Ban className="h-3.5 w-3.5" />
                  {isCanceling ? "Deleting..." : "Delete this idea"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Main Content - Three Column Layout */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="grid grid-cols-3 gap-6 h-full">
            {/* Left Column - Image & Info */}
            <div className="flex flex-col gap-4">

              {/* Image */}
              <div className="group/image relative w-full aspect-[4/3] overflow-hidden rounded-lg bg-[var(--grey-100)]">
                {hasImage && (
                  <Image
                    src={idea.image_url!}
                    alt=""
                    fill
                    className={cn(
                      "object-cover",
                      showShimmer && "opacity-0"
                    )}
                    style={{ objectPosition: "center 35%" }}
                    sizes="(max-width: 768px) 100vw, 400px"
                  />
                )}
                
                {showShimmer && <ImageShimmer />}

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

              {/* Meta & Actions */}
              <div className="flex items-center justify-between">
                <Button
                  size="sm"
                  onClick={() => setPublishModalOpen(true)}
                  className="bg-[var(--cyan-600)] hover:bg-[var(--cyan-600)]/90 text-white"
                >
                  <Play className="h-4 w-4 mr-1.5" />
                  Publish
                </Button>
                {idea.channels && idea.channels.length > 0 && (
                  <div className="flex items-center gap-1.5">
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
              </div>

              {/* Description */}
              {idea.description && (
                <div className="rounded-lg border border-[var(--border)] bg-[var(--grey-0)] p-4">
                  <h4 className="text-xs font-semibold text-[var(--grey-600)] uppercase tracking-wider mb-2">
                    Description
                  </h4>
                  <p className="text-sm text-[var(--grey-800)] leading-relaxed">
                    {idea.description}
                  </p>
                </div>
              )}
            </div>

            {/* Middle Column - Script */}
            <div className="flex flex-col min-h-0">
              {/* Script */}
              {idea.script && (
                <div className="flex-1 flex flex-col min-h-0 rounded-lg border border-[var(--border)] bg-[var(--grey-0)] overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                    <h4 className="text-xs font-semibold text-[var(--grey-600)] uppercase tracking-wider">
                      Script
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyScript}
                      className="h-7 px-2"
                      title={copiedScript ? "Copied" : "Copy"}
                    >
                      {copiedScript ? (
                        <Check size={14} className="text-[#00975a]" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </Button>
                  </div>
                  <div className="flex-1 overflow-auto p-4">
                    <pre className="text-sm text-[var(--grey-800)] whitespace-pre-wrap font-mono leading-relaxed">
                      {idea.script}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Chat Placeholder */}
            <div className="flex flex-col rounded-lg border border-[var(--border)] bg-[var(--grey-0)] overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
                <MessageSquare className="h-4 w-4 text-[var(--grey-400)]" />
                <h4 className="text-xs font-semibold text-[var(--grey-600)] uppercase tracking-wider">
                  Refine with AI
                </h4>
                <span className="ml-auto text-[10px] font-medium text-[var(--grey-400)] bg-[var(--grey-100)] px-2 py-0.5 rounded">
                  Coming soon
                </span>
              </div>

              {/* Empty State */}
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--grey-50)] mb-4">
                  <MessageSquare className="h-6 w-6 text-[var(--grey-300)]" />
                </div>
                <h3 className="text-sm font-medium text-[var(--grey-600)] mb-1">
                  Chat with AI
                </h3>
                <p className="text-xs text-[var(--grey-400)] max-w-[200px]">
                  Soon you&apos;ll be able to refine your script and prompt through conversation.
                </p>
              </div>

              {/* Disabled Input */}
              <div className="p-3 border-t border-[var(--border)]">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--grey-50)] border border-[var(--border)] opacity-50">
                  <input
                    type="text"
                    placeholder="Ask AI to refine the script..."
                    disabled
                    className="flex-1 bg-transparent text-sm text-[var(--grey-400)] placeholder:text-[var(--grey-300)] outline-none cursor-not-allowed"
                  />
                  <button
                    disabled
                    className="p-1.5 rounded-md text-[var(--grey-300)] cursor-not-allowed"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Publish Modal */}
      <PublishIdeaModal
        ideaId={idea.id}
        ideaTitle={idea.title}
        channels={idea.channels}
        open={publishModalOpen}
        onOpenChange={setPublishModalOpen}
      />

      {/* Underlord Prompt Modal */}
      <Dialog open={underlordModalOpen} onOpenChange={setUnderlordModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[var(--cyan-600)]" />
              Create with Underlord
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            <p className="text-sm text-[var(--grey-500)] mb-4">
              Copy this prompt and paste it into Underlord to generate your video.
            </p>
            <div className="relative rounded-lg border border-[var(--border)] bg-[var(--grey-50)]">
              <div className="absolute top-3 right-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyPrompt}
                  className="h-8 px-3 gap-1.5"
                >
                  {copiedPrompt ? (
                    <>
                      <Check size={14} className="text-[#00975a]" />
                      <span className="text-[#00975a]">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copy</span>
                    </>
                  )}
                </Button>
              </div>
              <div className="p-4 pt-12 max-h-[400px] overflow-auto">
                <pre className="text-sm text-[var(--grey-800)] whitespace-pre-wrap font-mono leading-relaxed">
                  {idea.prompt}
                </pre>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

