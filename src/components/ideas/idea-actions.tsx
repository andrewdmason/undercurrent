"use client";

import { useState, useTransition } from "react";
import { ThumbsUp, ThumbsDown, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { updateIdeaRating, updateIdeaBookmark } from "@/lib/actions/ideas";

interface IdeaActionsProps {
  ideaId: string;
  businessId: string;
  rating: "up" | "down" | null;
  bookmarked: boolean;
  size?: "sm" | "md";
}

export function IdeaActions({
  ideaId,
  businessId,
  rating: initialRating,
  bookmarked: initialBookmarked,
  size = "sm",
}: IdeaActionsProps) {
  const [rating, setRating] = useState(initialRating);
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [isPending, startTransition] = useTransition();

  const iconSize = size === "sm" ? 16 : 20;
  const buttonPadding = size === "sm" ? "p-1.5" : "p-2";

  const handleRating = (newRating: "up" | "down") => {
    // If clicking the same rating, clear it; otherwise set the new rating
    const targetRating = rating === newRating ? null : newRating;
    
    // Optimistic update
    setRating(targetRating);
    
    startTransition(async () => {
      const result = await updateIdeaRating(ideaId, targetRating, businessId);
      if (result.error) {
        // Revert on error
        setRating(initialRating);
      }
    });
  };

  const handleBookmark = () => {
    const targetBookmarked = !bookmarked;
    
    // Optimistic update
    setBookmarked(targetBookmarked);
    
    startTransition(async () => {
      const result = await updateIdeaBookmark(ideaId, targetBookmarked, businessId);
      if (result.error) {
        // Revert on error
        setBookmarked(initialBookmarked);
      }
    });
  };

  return (
    <div className={cn("flex items-center gap-1", isPending && "opacity-70")}>
      {/* Thumbs Up */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleRating("up");
        }}
        disabled={isPending}
        className={cn(
          buttonPadding,
          "rounded-md transition-all duration-150",
          "hover:bg-[var(--grey-50-a)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan-600)]",
          rating === "up" 
            ? "text-[#00975a]" 
            : "text-[var(--grey-400)] hover:text-[var(--grey-600)]"
        )}
        aria-label={rating === "up" ? "Remove like" : "Like this idea"}
      >
        <ThumbsUp 
          size={iconSize} 
          className={cn(rating === "up" && "fill-current")}
        />
      </button>

      {/* Thumbs Down */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleRating("down");
        }}
        disabled={isPending}
        className={cn(
          buttonPadding,
          "rounded-md transition-all duration-150",
          "hover:bg-[var(--grey-50-a)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan-600)]",
          rating === "down" 
            ? "text-[#f72736]" 
            : "text-[var(--grey-400)] hover:text-[var(--grey-600)]"
        )}
        aria-label={rating === "down" ? "Remove dislike" : "Dislike this idea"}
      >
        <ThumbsDown 
          size={iconSize}
          className={cn(rating === "down" && "fill-current")}
        />
      </button>

      {/* Bookmark */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleBookmark();
        }}
        disabled={isPending}
        className={cn(
          buttonPadding,
          "rounded-md transition-all duration-150",
          "hover:bg-[var(--grey-50-a)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan-600)]",
          bookmarked 
            ? "text-[#1a5eff]" 
            : "text-[var(--grey-400)] hover:text-[var(--grey-600)]"
        )}
        aria-label={bookmarked ? "Remove from saved" : "Save this idea"}
      >
        <Bookmark 
          size={iconSize}
          className={cn(bookmarked && "fill-current")}
        />
      </button>
    </div>
  );
}

