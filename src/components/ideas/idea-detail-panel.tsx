"use client";

import { useState } from "react";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { Copy, Check, Instagram, Youtube, Linkedin, Facebook, Globe, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { IdeaWithChannels, DISTRIBUTION_PLATFORMS } from "@/lib/types";
import { IdeaActions } from "./idea-actions";
import { generateThumbnail } from "@/lib/actions/thumbnail";
import { cn } from "@/lib/utils";

interface IdeaDetailPanelProps {
  idea: IdeaWithChannels | null;
  businessId: string;
  open: boolean;
  onClose: () => void;
}

// Platform icons
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
    </svg>
  );
}

function SnapchatIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301a.603.603 0 0 1 .266-.067c.09 0 .18.018.27.046.57.15.749.554.749.81 0 .271-.18.615-.54.79-.466.225-1.14.39-1.665.45-.12.015-.21.09-.24.195a1.47 1.47 0 0 1-.045.165c-.03.075-.06.165-.06.255 0 .21.12.39.3.465 1.05.375 2.28 1.125 2.445 1.665.09.27.075.48-.03.66-.09.15-.24.27-.42.33-.3.12-.66.18-1.11.18-.36 0-.75-.03-1.17-.105-.36-.06-.645-.12-.87-.165a1.77 1.77 0 0 0-.405-.045c-.27 0-.525.09-.87.375-.72.57-1.44 1.59-2.595 1.59h-.045c-1.155 0-1.875-1.02-2.595-1.59-.33-.27-.585-.375-.87-.375a1.77 1.77 0 0 0-.405.045c-.225.045-.51.105-.87.165-.42.075-.81.105-1.17.105-.45 0-.81-.06-1.11-.18a.722.722 0 0 1-.42-.33c-.105-.18-.12-.39-.03-.66.165-.54 1.395-1.29 2.445-1.665.18-.075.3-.255.3-.465 0-.09-.03-.18-.06-.255a1.47 1.47 0 0 1-.045-.165c-.03-.105-.12-.18-.24-.195-.525-.06-1.2-.225-1.665-.45-.36-.175-.54-.52-.54-.79 0-.255.18-.66.75-.81a.61.61 0 0 1 .27-.046c.09 0 .18.022.27.067.36.18.72.285 1.02.3.21 0 .345-.045.405-.09a7.95 7.95 0 0 1-.033-.57c-.104-1.628-.23-3.654.3-4.847C7.86 1.07 11.216.793 12.206.793z"/>
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}

function PlatformIcon({ platform, className }: { platform: string; className?: string }) {
  const baseClass = cn("h-3.5 w-3.5", className);
  
  switch (platform) {
    case "tiktok":
      return <TikTokIcon className={cn(baseClass, "text-black")} />;
    case "instagram_reels":
      return <Instagram className={cn(baseClass, "text-pink-500")} />;
    case "youtube_shorts":
    case "youtube":
      return <Youtube className={cn(baseClass, "text-red-600")} />;
    case "snapchat_spotlight":
      return <SnapchatIcon className={cn(baseClass, "text-yellow-400")} />;
    case "linkedin":
      return <Linkedin className={cn(baseClass, "text-blue-700")} />;
    case "facebook":
      return <Facebook className={cn(baseClass, "text-blue-600")} />;
    case "x":
      return <XIcon className={cn(baseClass, "text-black")} />;
    default:
      return <Globe className={cn(baseClass, "text-[var(--grey-500)]")} />;
  }
}

function getChannelLabel(platform: string, customLabel?: string | null): string {
  if (platform === "custom" && customLabel) {
    return customLabel;
  }
  return DISTRIBUTION_PLATFORMS.find((p) => p.value === platform)?.label || platform;
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
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);

  if (!idea) return null;

  const imageUrl = idea.image_url || getPlaceholderImage(idea.id);
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
            <div className="group/image relative w-full overflow-hidden rounded-lg bg-[var(--grey-50)] flex-shrink-0">
              <Image
                src={imageUrl}
                alt=""
                width={800}
                height={600}
                className={cn(
                  "w-full h-auto",
                  isGeneratingThumbnail && "opacity-50"
                )}
                sizes="(max-width: 768px) 100vw, 480px"
              />
              
              {/* Loading shimmer overlay */}
              {isGeneratingThumbnail && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <div className="animate-spin">
                    <RefreshCw className="h-8 w-8 text-white drop-shadow-md" />
                  </div>
                </div>
              )}

              {/* Regenerate button on hover */}
              {!isGeneratingThumbnail && (
                <button
                  onClick={handleGenerateThumbnail}
                  className={cn(
                    "absolute bottom-3 right-3 p-2 rounded-md",
                    "bg-black/60 text-white opacity-0 group-hover/image:opacity-100",
                    "transition-opacity duration-200",
                    "hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-white/50"
                  )}
                  title="Generate AI thumbnail"
                  aria-label="Generate AI thumbnail"
                >
                  <RefreshCw className="h-5 w-5" />
                </button>
              )}
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
