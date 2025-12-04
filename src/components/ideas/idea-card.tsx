"use client";

import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Idea } from "@/lib/types";
import { IdeaActions } from "./idea-actions";

interface IdeaCardProps {
  idea: Idea;
  businessId: string;
  onClick: () => void;
}

function getPlaceholderImage(ideaId: string): string {
  // Use picsum.photos with a consistent seed based on idea ID hash
  // This ensures the same idea always gets the same image
  const hash = ideaId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return `https://picsum.photos/seed/${hash}/400/300`;
}

export function IdeaCard({ idea, businessId, onClick }: IdeaCardProps) {
  const imageUrl = idea.image_url || getPlaceholderImage(idea.id);
  const timeAgo = formatDistanceToNow(new Date(idea.created_at), { addSuffix: true });

  return (
    <article
      onClick={onClick}
      className={cn(
        "group cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--grey-5)]",
        "overflow-hidden transition-all duration-150",
        "hover:bg-[var(--grey-50-a)] hover:shadow-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan-600)]"
      )}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      role="button"
      aria-label={`View details for ${idea.title}`}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--grey-50)]">
        <Image
          src={imageUrl}
          alt=""
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Title */}
        <h3 className="text-sm font-medium text-[var(--grey-800)] tracking-[-0.08px] line-clamp-2 mb-1">
          {idea.title}
        </h3>

        {/* Description */}
        {idea.description && (
          <p className="text-xs text-[var(--grey-400)] tracking-[-0.001px] leading-relaxed line-clamp-2 mb-3">
            {idea.description}
          </p>
        )}

        {/* Footer: Actions + Timestamp */}
        <div className="flex items-center justify-between">
          <IdeaActions
            ideaId={idea.id}
            businessId={businessId}
            rating={idea.rating}
            bookmarked={idea.bookmarked}
            size="sm"
          />
          <span className="text-[11px] text-[var(--grey-400)]">
            {timeAgo}
          </span>
        </div>
      </div>
    </article>
  );
}

