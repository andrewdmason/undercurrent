"use client";

import { useState, useRef, useEffect } from "react";
import { Volume2, VolumeX, Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface YouTubeEmbedProps {
  videoId: string;
  orientation?: "vertical" | "horizontal";
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
  className?: string;
  onReady?: () => void;
}

/**
 * Lightweight YouTube embed component optimized for video discovery
 *
 * Features:
 * - Starts muted with autoplay (browser requirement)
 * - Click anywhere to toggle mute
 * - Loops the video
 * - Responsive aspect ratio based on orientation
 */
export function YouTubeEmbed({
  videoId,
  orientation = "horizontal",
  autoplay = true,
  muted: initialMuted = true,
  loop = true,
  className,
  onReady,
}: YouTubeEmbedProps) {
  const [isMuted, setIsMuted] = useState(initialMuted);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showPlayOverlay, setShowPlayOverlay] = useState(!autoplay);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Build the YouTube embed URL with parameters
  const embedUrl = new URL(`https://www.youtube.com/embed/${videoId}`);
  embedUrl.searchParams.set("autoplay", autoplay ? "1" : "0");
  embedUrl.searchParams.set("mute", isMuted ? "1" : "0");
  embedUrl.searchParams.set("loop", loop ? "1" : "0");
  embedUrl.searchParams.set("playlist", videoId); // Required for loop to work
  embedUrl.searchParams.set("controls", "0"); // Hide controls for cleaner look
  embedUrl.searchParams.set("modestbranding", "1");
  embedUrl.searchParams.set("rel", "0"); // Don't show related videos
  embedUrl.searchParams.set("playsinline", "1");
  embedUrl.searchParams.set("enablejsapi", "1");

  // Handle iframe load
  useEffect(() => {
    if (isLoaded && onReady) {
      onReady();
    }
  }, [isLoaded, onReady]);

  // Toggle mute via postMessage to the iframe
  const toggleMute = () => {
    if (iframeRef.current?.contentWindow) {
      const command = isMuted ? "unMute" : "mute";
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: "command",
          func: command,
          args: [],
        }),
        "*"
      );
      setIsMuted(!isMuted);
    }
  };

  // Start playing if showing play overlay
  const handlePlay = () => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: "command",
          func: "playVideo",
          args: [],
        }),
        "*"
      );
      setShowPlayOverlay(false);
    }
  };

  // Determine aspect ratio based on orientation
  const aspectRatio = orientation === "vertical" ? "aspect-[9/16]" : "aspect-video";

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-xl bg-black",
        aspectRatio,
        className
      )}
    >
      {/* YouTube iframe */}
      <iframe
        ref={iframeRef}
        src={embedUrl.toString()}
        className="absolute inset-0 h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        onLoad={() => setIsLoaded(true)}
      />

      {/* Loading state */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
        </div>
      )}

      {/* Play overlay (if not autoplaying) */}
      {showPlayOverlay && isLoaded && (
        <button
          onClick={handlePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity hover:bg-black/50"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-lg">
            <Play className="h-8 w-8 text-slate-900 ml-1" />
          </div>
        </button>
      )}

      {/* Mute toggle button */}
      {isLoaded && !showPlayOverlay && (
        <button
          onClick={toggleMute}
          className={cn(
            "absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full",
            "bg-black/60 text-white backdrop-blur-sm transition-all",
            "hover:bg-black/80 hover:scale-105",
            "focus:outline-none focus:ring-2 focus:ring-white/50"
          )}
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? (
            <VolumeX className="h-5 w-5" />
          ) : (
            <Volume2 className="h-5 w-5" />
          )}
        </button>
      )}

      {/* Muted indicator text */}
      {isLoaded && !showPlayOverlay && isMuted && (
        <div className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
          Tap to unmute
        </div>
      )}
    </div>
  );
}

