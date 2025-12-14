import { cn } from "@/lib/utils";
import { ImageIcon } from "lucide-react";

interface ImageShimmerProps {
  className?: string;
}

export function ImageShimmer({ className }: ImageShimmerProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 bg-[var(--grey-100)] animate-skeleton-pulse",
        "overflow-hidden flex items-center justify-center",
        className
      )}
    >
      {/* Centered icon */}
      <ImageIcon className="h-10 w-10 text-[var(--grey-300)]" />
    </div>
  );
}

