"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { IdeaWithChannels } from "@/lib/types";
import { PlatformIcon } from "./idea-card";

interface KanbanCardProps {
  idea: IdeaWithChannels;
  projectSlug: string;
}

// Helper to format time as "Xh Ymin"
function formatPrepTime(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}

export function KanbanCard({ idea, projectSlug }: KanbanCardProps) {
  const router = useRouter();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: idea.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleClick = (e: React.MouseEvent) => {
    // Only navigate if not dragging
    if (!isDragging) {
      router.push(`/${projectSlug}/ideas/${idea.id}`);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className={cn(
        "group rounded-lg border border-[var(--border)] bg-[var(--grey-0)] overflow-hidden cursor-grab active:cursor-grabbing",
        "transition-shadow duration-150 touch-none",
        isDragging ? "shadow-lg opacity-90" : "hover:shadow-md"
      )}
    >
      {/* Image */}
      <div className="relative w-full aspect-video bg-[var(--grey-100)]">
        {idea.image_url ? (
          <Image
            src={idea.image_url}
            alt=""
            fill
            className="object-cover"
            sizes="280px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-[var(--grey-200)] animate-pulse" />
          </div>
        )}

        {/* Channel badges on image */}
        {idea.channels && idea.channels.length > 0 && idea.image_url && (
          <>
            <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
            <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
              {idea.channels.slice(0, 3).map((channel) => (
                <PlatformIcon
                  key={channel.id}
                  platform={channel.platform}
                  className="h-3.5 w-3.5 !text-white drop-shadow-md"
                />
              ))}
              {idea.channels.length > 3 && (
                <span className="text-[10px] text-white/80 drop-shadow-md">
                  +{idea.channels.length - 3}
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Title */}
        <h4 className="text-sm font-medium text-[var(--grey-800)] line-clamp-2 leading-snug">
          {idea.title}
        </h4>

        {/* Prep Time */}
        {idea.prepTimeMinutes !== undefined && idea.prepTimeMinutes > 0 && (
          <div className="flex items-center gap-1 mt-2 text-xs text-[var(--grey-400)]">
            <Clock className="h-3 w-3" />
            <span>{formatPrepTime(idea.prepTimeMinutes)} remaining</span>
          </div>
        )}
      </div>
    </div>
  );
}
