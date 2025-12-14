"use client";

import { useState } from "react";
import Image from "next/image";
import { RefreshCw, LayoutTemplate } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { IdeaWithChannels, DISTRIBUTION_PLATFORMS } from "@/lib/types";
import { generateThumbnail } from "@/lib/actions/thumbnail";
import { ImageShimmer } from "@/components/ui/shimmer";
import { ImageLightbox, ImageExpandButton } from "@/components/ui/image-lightbox";
import { PlatformIcon } from "./idea-card";

type StackPosition = "front" | "middle" | "back";
type DismissDirection = "left" | "right" | null;

interface StackCardProps {
  idea: IdeaWithChannels;
  position: StackPosition;
  dismissDirection?: DismissDirection;
  projectId: string;
  /** When true, background cards should animate to their new positions */
  isStackAnimating?: boolean;
}

export function StackCard({
  idea,
  position,
  dismissDirection,
  projectId,
  isStackAnimating = false,
}: StackCardProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  
  const hasImage = !!idea.image_url;
  const showShimmer = isGenerating || !hasImage;

  const handleGenerateThumbnail = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isGenerating) return;

    setIsGenerating(true);
    try {
      const result = await generateThumbnail(idea.id, projectId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Thumbnail generated");
      }
    } catch (error) {
      toast.error("Failed to generate thumbnail");
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Position styles for stack effect
  // Cards peek out from behind - offset down and slightly scaled
  // When stack is animating, background cards move toward their "promoted" positions
  const getPositionStyles = () => {
    if (position === "front") {
      if (dismissDirection === "left") {
        return {
          zIndex: 30,
          transform: "translateX(-120%) translateY(0) rotate(-12deg) scale(1)",
          opacity: 0,
        };
      }
      if (dismissDirection === "right") {
        return {
          zIndex: 30,
          transform: "translateX(120%) translateY(0) rotate(12deg) scale(1)",
          opacity: 0,
        };
      }
      return {
        zIndex: 30,
        transform: "translateX(0) translateY(0) rotate(0) scale(1)",
        opacity: 1,
      };
    }
    
    if (position === "middle") {
      // When animating, move toward front position
      if (isStackAnimating) {
        return {
          zIndex: 20,
          transform: "translateX(0) translateY(0) rotate(0) scale(1)",
          opacity: 1,
        };
      }
      return {
        zIndex: 20,
        transform: "translateX(0) translateY(12px) rotate(0) scale(0.96)",
        opacity: 1,
      };
    }
    
    // back
    // When animating, move toward middle position
    if (isStackAnimating) {
      return {
        zIndex: 10,
        transform: "translateX(0) translateY(12px) rotate(0) scale(0.96)",
        opacity: 1,
      };
    }
    return {
      zIndex: 10,
      transform: "translateX(0) translateY(24px) rotate(0) scale(0.92)",
      opacity: 1,
    };
  };

  const styles = getPositionStyles();

  return (
    <>
      <div
        className={cn(
          "absolute inset-0 rounded-2xl overflow-hidden",
          "bg-white border border-[var(--border)]",
          // Front card animates when being dismissed
          // Background cards animate when stack is animating (so they smoothly move up)
          (position === "front" && dismissDirection) && "transition-all duration-300 ease-out",
          (position !== "front" && isStackAnimating) && "transition-all duration-300 ease-out",
          position === "front" && "shadow-xl",
          position === "middle" && "shadow-lg",
          position === "back" && "shadow-md"
        )}
        style={{
          zIndex: styles.zIndex,
          transform: styles.transform,
          opacity: styles.opacity,
        }}
      >
        {/* Image area - takes up ~60% of card height */}
        <div className="relative w-full h-[55%] overflow-hidden bg-[var(--grey-100)]">
          {hasImage ? (
            <Image
              src={idea.image_url!}
              alt=""
              fill
              className={cn(
                "object-cover",
                showShimmer && "opacity-0"
              )}
              sizes="400px"
              priority={position === "front"}
            />
          ) : (
            <ImageShimmer />
          )}

          {/* Shimmer overlay */}
          {showShimmer && hasImage && (
            <div className="absolute inset-0">
              <ImageShimmer />
            </div>
          )}

          {/* Bottom gradient for channel badges */}
          {idea.channels && idea.channels.length > 0 && !showShimmer && (
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none" />
          )}

          {/* Channel badges */}
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

          {/* Expand image button - only on front card */}
          {position === "front" && hasImage && !showShimmer && (
            <ImageExpandButton
              onClick={(e) => {
                e.stopPropagation();
                setLightboxOpen(true);
              }}
            />
          )}

          {/* Regenerate thumbnail button - only show when there's an image to regenerate */}
          {position === "front" && hasImage && !showShimmer && (
            <button
              onClick={handleGenerateThumbnail}
              disabled={isGenerating}
              className={cn(
                "absolute bottom-3 right-3 p-2 rounded-md transition-opacity duration-200",
                "focus:outline-none focus:ring-2 focus:ring-white/50",
                "disabled:cursor-not-allowed",
                "bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-black/80"
              )}
              title="Regenerate thumbnail"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Content area */}
        <div className="p-4 h-[45%] overflow-hidden">
          {/* Title */}
          <h3 className="text-lg font-medium text-[var(--grey-800)] tracking-[-0.08px] line-clamp-2 mb-2">
            {idea.title}
          </h3>

          {/* Template badge */}
          {idea.template && (
            <div className="flex items-center gap-1 mb-2">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--grey-50)] text-[var(--grey-600)]">
                <LayoutTemplate className="h-3 w-3" />
                {idea.template.name}
              </span>
            </div>
          )}

          {/* Description */}
          {idea.description && (
            <p className="text-sm text-[var(--grey-400)] tracking-[-0.001px] leading-relaxed line-clamp-4">
              {idea.description}
            </p>
          )}
        </div>
      </div>

      {/* Lightbox for front card */}
      {position === "front" && hasImage && (
        <ImageLightbox
          src={idea.image_url!}
          open={lightboxOpen}
          onOpenChange={setLightboxOpen}
        />
      )}
    </>
  );
}

// Helper function to get channel label
function getChannelLabel(platform: string, customLabel?: string | null): string {
  if (platform === "custom" && customLabel) {
    return customLabel;
  }
  return DISTRIBUTION_PLATFORMS.find((p) => p.value === platform)?.label || platform;
}
