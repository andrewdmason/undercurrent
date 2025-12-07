"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { X, Expand } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageLightboxProps {
  src: string;
  alt?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImageLightbox({ src, alt = "", open, onOpenChange }: ImageLightboxProps) {
  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    };

    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={() => onOpenChange(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Close button */}
      <button
        onClick={() => onOpenChange(false)}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Image container */}
      <div
        className="relative max-w-[90vw] max-h-[90vh] z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={src}
          alt={alt}
          width={1920}
          height={1080}
          className="object-contain max-w-[90vw] max-h-[90vh] w-auto h-auto rounded-lg"
          priority
        />
      </div>
    </div>
  );
}

interface ImageExpandButtonProps {
  onClick: (e: React.MouseEvent) => void;
  className?: string;
}

export function ImageExpandButton({ onClick, className }: ImageExpandButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "absolute top-3 left-3 p-2 rounded-md",
        "bg-black/60 text-white opacity-0 group-hover:opacity-100",
        "transition-opacity duration-200",
        "hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-white/50",
        className
      )}
      title="View full size"
      aria-label="View full size image"
    >
      <Expand className="h-4 w-4" />
    </button>
  );
}

