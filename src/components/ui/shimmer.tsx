import { cn } from "@/lib/utils";
import { ImageIcon, Loader2 } from "lucide-react";

interface ImageShimmerProps {
  className?: string;
  /** Show a spinner to indicate active loading */
  showSpinner?: boolean;
}

export function ImageShimmer({ className, showSpinner = true }: ImageShimmerProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 bg-[var(--grey-100)]",
        "overflow-hidden flex items-center justify-center",
        className
      )}
    >
      {/* Shimmer gradient overlay */}
      <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" />
      
      {/* Centered icon with optional spinner */}
      <div className="relative flex flex-col items-center gap-2">
        <ImageIcon className="h-10 w-10 text-[var(--grey-300)]" />
        {showSpinner && (
          <Loader2 className="h-5 w-5 text-[var(--grey-400)] animate-spin" />
        )}
      </div>
    </div>
  );
}

