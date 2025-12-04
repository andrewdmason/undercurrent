import { cn } from "@/lib/utils";
import { ImageIcon } from "lucide-react";

interface ImageShimmerProps {
  className?: string;
}

export function ImageShimmer({ className }: ImageShimmerProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 bg-[var(--grey-200)]",
        "overflow-hidden flex items-center justify-center",
        className
      )}
    >
      {/* Centered icon */}
      <ImageIcon className="h-10 w-10 text-[var(--grey-400)] opacity-50" />
      
      {/* Shimmer animation overlay */}
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/30 to-transparent" />
    </div>
  );
}

