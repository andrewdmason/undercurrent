interface ImagePlaceholderProps {
  prompt: string;
  aspectRatio?: "square" | "video" | "wide";
  className?: string;
}

export function ImagePlaceholder({
  prompt,
  aspectRatio = "video",
  className = "",
}: ImagePlaceholderProps) {
  const aspectClasses = {
    square: "aspect-square",
    video: "aspect-video",
    wide: "aspect-[2/1]",
  };

  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-grey-50 border border-grey-100-a ${aspectClasses[aspectRatio]} ${className}`}
    >
      {/* Diagonal stripes pattern */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 10px,
            rgba(0,0,0,0.03) 10px,
            rgba(0,0,0,0.03) 20px
          )`,
        }}
      />

      {/* Prompt text */}
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <p className="text-sm text-grey-400 text-center leading-relaxed font-mono">
          {prompt}
        </p>
      </div>

      {/* Corner label */}
      <div className="absolute top-3 left-3 px-2 py-1 bg-grey-800/80 rounded text-xs text-white font-medium">
        AI Image Prompt
      </div>
    </div>
  );
}









