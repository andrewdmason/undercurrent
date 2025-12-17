"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Instagram, Youtube, Linkedin, Facebook, Globe, RefreshCw, Check, X, Play, Ban, LayoutTemplate, Clock, Loader2, Trash2, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { IdeaWithChannels, DISTRIBUTION_PLATFORMS } from "@/lib/types";
import { generateThumbnail } from "@/lib/actions/thumbnail";
import { acceptIdea, cancelIdea, deleteIdea } from "@/lib/actions/ideas";
import { ImageShimmer } from "@/components/ui/shimmer";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { ViewType } from "./ideas-feed";
import { IdeaAsset } from "@/lib/types";

interface IdeaCardProps {
  idea: IdeaWithChannels;
  projectId: string;
  projectSlug?: string;
  href?: string;
  onClick?: () => void;
  isLoadingImage?: boolean;
  isRemixing?: boolean;
  viewType: ViewType;
  onReject?: () => void;
  onPublish?: () => void;
  onRemix?: () => void;
  prepTimeMinutes?: number; // Total remaining prep time in minutes
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

function YouTubeShortsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 98.94 122.88" fill="currentColor" className={className}>
      <path fillRule="evenodd" clipRule="evenodd" d="M63.49 2.71c11.59-6.04 25.94-1.64 32.04 9.83 6.1 11.47 1.65 25.66-9.94 31.7l-9.53 5.01c8.21.3 16.04 4.81 20.14 12.52 6.1 11.47 1.66 25.66-9.94 31.7l-50.82 26.7c-11.59 6.04-25.94 1.64-32.04-9.83-6.1-11.47-1.65-25.66 9.94-31.7l9.53-5.01c-8.21-.3-16.04-4.81-20.14-12.52-6.1-11.47-1.65-25.66 9.94-31.7l50.82-26.7zM36.06 42.53v37.89l30.76-18.9-30.76-18.99z"/>
    </svg>
  );
}

export function PlatformIcon({ platform, className }: { platform: string; className?: string }) {
  const baseClass = cn("h-3.5 w-3.5", className);
  
  switch (platform) {
    case "tiktok":
      return <TikTokIcon className={cn(baseClass, "text-black dark:text-white")} />;
    case "instagram_reels":
      return <Instagram className={cn(baseClass, "text-pink-500")} />;
    case "youtube_shorts":
      return <YouTubeShortsIcon className={cn(baseClass, "text-red-600")} />;
    case "youtube":
      return <Youtube className={cn(baseClass, "text-red-600")} />;
    case "snapchat_spotlight":
      return <SnapchatIcon className={cn(baseClass, "text-yellow-400")} />;
    case "linkedin":
      return <Linkedin className={cn(baseClass, "text-blue-700")} />;
    case "facebook":
      return <Facebook className={cn(baseClass, "text-blue-600")} />;
    case "x":
      return <XIcon className={cn(baseClass, "text-black dark:text-white")} />;
    default:
      return <Globe className={cn(baseClass, "text-[var(--grey-500)]")} />;
  }
}

export function getChannelLabel(platform: string, customLabel?: string | null): string {
  if (platform === "custom" && customLabel) {
    return customLabel;
  }
  return DISTRIBUTION_PLATFORMS.find((p) => p.value === platform)?.label || platform;
}

// Helper to format time as "Xh Ymin"
function formatPrepTime(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}

export function IdeaCard({
  idea,
  projectId,
  projectSlug,
  href,
  onClick,
  isLoadingImage = false,
  isRemixing = false,
  viewType,
  onReject,
  onPublish,
  onRemix,
  prepTimeMinutes,
}: IdeaCardProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [prepListData, setPrepListData] = useState<{ assets: IdeaAsset[]; totalMinutes: number; remainingMinutes: number } | null>(null);
  const [isPrepListLoading, setIsPrepListLoading] = useState(false);
  const [prepListError, setPrepListError] = useState(false);
  const descriptionRef = useRef<HTMLParagraphElement>(null);
  const hasImage = !!idea.image_url;
  const showShimmer = isLoadingImage || isGenerating || isRemixing || !hasImage;
  const isVertical = idea.template?.orientation === "vertical";
  const timeAgo = formatDistanceToNow(new Date(idea.created_at), { addSuffix: true });

  // Fetch assets on hover
  const handlePrepListHover = async () => {
    if (prepListData || isPrepListLoading) return;
    
    setIsPrepListLoading(true);
    setPrepListError(false);
    
    try {
      const response = await fetch(`/api/ideas/${idea.id}/assets`);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setPrepListData(data);
    } catch {
      setPrepListError(true);
    } finally {
      setIsPrepListLoading(false);
    }
  };
  
  // Check if description is truncated
  useEffect(() => {
    const el = descriptionRef.current;
    if (el) {
      setIsTruncated(el.scrollHeight > el.clientHeight);
    }
  }, [idea.description]);
  
  const isClickable = viewType !== "inbox";

  const handleGenerateThumbnail = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isGenerating) return;

    setIsGenerating(true);
    try {
      const result = await generateThumbnail(idea.id, projectId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Thumbnail generated successfully");
      }
    } catch (error) {
      toast.error("Failed to generate thumbnail");
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAccept = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Shift+click goes directly to create view
    if (e.shiftKey && projectSlug) {
      setIsAccepting(true);
      try {
        const result = await acceptIdea(idea.id);
        if (result.error) {
          toast.error(result.error);
        } else {
          router.push(`/${projectSlug}/ideas/${idea.id}`);
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
          action: projectSlug ? {
            label: "View",
            onClick: () => router.push(`/${projectSlug}/ideas/${idea.id}`),
          } : undefined,
        });
        router.refresh();
      }
    } catch (error) {
      toast.error("Failed to accept idea");
      console.error(error);
    } finally {
      setIsAccepting(false);
    }
  };

  const handleReject = (e: React.MouseEvent) => {
    e.stopPropagation();
    onReject?.();
  };

  const handleCancel = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCanceling) return;

    setIsCanceling(true);
    try {
      const result = await cancelIdea(idea.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Idea removed from Create");
        router.refresh();
      }
    } catch (error) {
      toast.error("Failed to cancel idea");
      console.error(error);
    } finally {
      setIsCanceling(false);
    }
  };

  const handlePublish = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPublish?.();
  };

  const handleDelete = async () => {
    try {
      const result = await deleteIdea(idea.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Idea deleted");
        router.refresh();
      }
    } catch (error) {
      toast.error("Failed to delete idea");
      console.error(error);
    }
  };

  const handleContextPublish = () => {
    onPublish?.();
  };

  const handleContextRemix = () => {
    onRemix?.();
  };

  // Shared class names for card wrapper
  const baseCardClasses = cn(
    "group rounded-lg border border-[var(--border)] bg-[var(--grey-0)]",
    "overflow-hidden transition-all duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan-600)]"
  );

  // Card content (shared between Link and article variants)
  const cardContent = (
    <>
      {/* Image - Fixed landscape aspect ratio, vertical images letterboxed */}
      <div className="relative w-full aspect-video overflow-hidden bg-[var(--grey-100)]">
        {hasImage ? (
          <Image
            src={idea.image_url!}
            alt=""
            fill
            className={cn(
              "transition-transform duration-300 group-hover:scale-[1.02]",
              isVertical ? "object-contain" : "object-cover",
              showShimmer && "opacity-0"
            )}
            sizes="(max-width: 540px) 100vw, 540px"
          />
        ) : (
          <ImageShimmer />
        )}
        
        {/* Shimmer loading state */}
        {showShimmer && hasImage && (
          <div className="absolute inset-0">
            <ImageShimmer />
          </div>
        )}

        {/* Bottom gradient overlay for channel badges */}
        {idea.channels && idea.channels.length > 0 && !showShimmer && (
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none" />
        )}

        {/* Channel badges - white icons on gradient */}
        {idea.channels && idea.channels.length > 0 && !showShimmer && (
          <div className="absolute bottom-3 left-3 flex items-center gap-2">
            {idea.channels.map((channel) => (
              <span
                key={channel.id}
                className="text-white drop-shadow-md"
                title={getChannelLabel(channel.platform, channel.custom_label)}
              >
                <PlatformIcon platform={channel.platform} className="h-4 w-4 !text-white" />
              </span>
            ))}
          </div>
        )}

        {/* Generate/Regenerate button - hide for queue view */}
        {viewType !== "queue" && (
          <button
            onClick={handleGenerateThumbnail}
            disabled={isGenerating}
            className={cn(
              "absolute bottom-3 right-3 p-2 rounded-md transition-opacity duration-200",
              "focus:outline-none focus:ring-2 focus:ring-white/50",
              "disabled:cursor-not-allowed",
              hasImage && !isGenerating
                ? "bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-black/80"
                : "bg-[var(--grey-800)] text-white opacity-100"
            )}
            title={isGenerating ? "Generating..." : hasImage ? "Regenerate thumbnail" : "Generate thumbnail"}
            aria-label={isGenerating ? "Generating thumbnail" : hasImage ? "Regenerate thumbnail" : "Generate thumbnail"}
          >
            <RefreshCw className={cn("h-4 w-4", isGenerating && "animate-spin")} />
          </button>
        )}
      </div>

      {/* Image Lightbox */}
      {hasImage && (
        <ImageLightbox
          src={idea.image_url!}
          open={lightboxOpen}
          onOpenChange={setLightboxOpen}
        />
      )}

      {/* Content */}
      <div className="p-4">

        {/* Title */}
        <h3 className="text-base font-medium text-[var(--grey-800)] tracking-[-0.08px] line-clamp-2 mb-1.5">
          {idea.title}
        </h3>

        {/* Template badge - hide for queue view */}
        {viewType !== "queue" && idea.template && (
          <div className="flex items-center gap-1 mb-2">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--grey-50)] text-[var(--grey-600)]">
              <LayoutTemplate className="h-3 w-3" />
              {idea.template.name}
            </span>
          </div>
        )}

        {/* Prep time/time estimates hidden for now */}

        {/* Description - hide for queue view */}
        {viewType !== "queue" && idea.description && (
          <div className="mb-4">
            <p 
              ref={descriptionRef}
              className={cn(
                "text-sm text-[var(--grey-400)] tracking-[-0.001px] leading-relaxed",
                !isExpanded && "line-clamp-2"
              )}
            >
              {idea.description}
            </p>
            {viewType === "inbox" && isTruncated && !isExpanded && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(true);
                }}
                className="text-sm text-[var(--grey-600)] hover:text-[var(--grey-800)] mt-1 transition-colors underline"
              >
                more
              </button>
            )}
          </div>
        )}

        {/* Footer: Actions + Timestamp (hidden for queue view) */}
        {viewType !== "queue" && (
          <div className="flex items-center justify-between gap-3">
            {/* Actions based on view type */}
            <div className="flex items-center gap-2">
              {viewType === "inbox" && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleReject}
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
                  {onRemix && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemix();
                          }}
                          className="text-[var(--grey-600)] border-[var(--grey-200)] hover:bg-[var(--grey-50)]"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p>Remix this idea</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </>
              )}
              {viewType === "published" && (
                <span className="text-xs text-[var(--green-500)] font-medium flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" />
                  Published
                </span>
              )}
            </div>
            
            <span className="text-xs text-[var(--grey-400)] shrink-0">
              {timeAgo}
            </span>
          </div>
        )}
      </div>
    </>
  );

  // Context menu content
  const contextMenuContent = (
    <ContextMenuContent className="w-48">
      <ContextMenuItem
        onClick={handleContextRemix}
        disabled={!onRemix}
        className="cursor-pointer"
      >
        <Sparkles className="mr-2 h-4 w-4" />
        Remix Idea
      </ContextMenuItem>
      <ContextMenuItem
        onClick={handleGenerateThumbnail}
        disabled={isGenerating}
        className="cursor-pointer"
      >
        <RefreshCw className={cn("mr-2 h-4 w-4", isGenerating && "animate-spin")} />
        {hasImage ? "Regenerate Thumbnail" : "Generate Thumbnail"}
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
        onClick={handleContextPublish}
        disabled={!onPublish}
        className="cursor-pointer"
      >
        <Send className="mr-2 h-4 w-4" />
        Mark as Published
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
        onClick={handleDelete}
        className="text-[#f72736] focus:text-[#f72736] cursor-pointer"
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Delete Idea
      </ContextMenuItem>
    </ContextMenuContent>
  );

  // Render as Link if href provided, otherwise as article
  if (href) {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <Link
            href={href}
            className={cn(baseCardClasses, "cursor-pointer hover:shadow-md block")}
          >
            {cardContent}
          </Link>
        </ContextMenuTrigger>
        {contextMenuContent}
      </ContextMenu>
    );
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <article
          onClick={isClickable ? onClick : undefined}
          className={cn(baseCardClasses, isClickable && "cursor-pointer hover:shadow-md")}
          tabIndex={isClickable ? 0 : undefined}
          onKeyDown={isClickable ? (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onClick?.();
            }
          } : undefined}
          role={isClickable ? "button" : undefined}
          aria-label={isClickable ? `View details for ${idea.title}` : undefined}
        >
          {cardContent}
        </article>
      </ContextMenuTrigger>
      {contextMenuContent}
    </ContextMenu>
  );
}
