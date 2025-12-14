"use client";

import { X, Check, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface StackActionBarProps {
  onReject: () => void;
  onAccept: () => void;
  onRemix: () => void;
  disabled?: boolean;
}

export function StackActionBar({
  onReject,
  onAccept,
  onRemix,
  disabled = false,
}: StackActionBarProps) {
  return (
    <div className="flex items-center gap-4">
      {/* Reject button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onReject}
            disabled={disabled}
            className={cn(
              "flex items-center justify-center w-14 h-14 rounded-full",
              "bg-white border-2 border-[var(--grey-200)]",
              "text-[var(--grey-400)] hover:text-destructive hover:border-destructive",
              "transition-all duration-150",
              "hover:scale-110 active:scale-95",
              "focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            )}
            aria-label="Reject idea"
          >
            <X className="h-6 w-6" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Reject <kbd className="ml-1 px-1 py-0.5 rounded bg-[var(--grey-100)] text-[10px]">←</kbd></p>
        </TooltipContent>
      </Tooltip>

      {/* Remix button (smaller, secondary) */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onRemix}
            disabled={disabled}
            className={cn(
              "flex items-center justify-center w-11 h-11 rounded-full",
              "bg-white border-2 border-[var(--grey-200)]",
              "text-[var(--grey-400)] hover:text-[var(--cyan-600)] hover:border-[var(--cyan-600)]",
              "transition-all duration-150",
              "hover:scale-110 active:scale-95",
              "focus:outline-none focus:ring-2 focus:ring-[var(--cyan-600)] focus:ring-offset-2",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            )}
            aria-label="Remix idea"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Remix <kbd className="ml-1 px-1 py-0.5 rounded bg-[var(--grey-100)] text-[10px]">R</kbd></p>
        </TooltipContent>
      </Tooltip>

      {/* Accept button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onAccept}
            disabled={disabled}
            className={cn(
              "flex items-center justify-center w-14 h-14 rounded-full",
              "bg-[var(--green-500)] border-2 border-[var(--green-500)]",
              "text-white hover:bg-[var(--green-600)] hover:border-[var(--green-600)]",
              "transition-all duration-150",
              "hover:scale-110 active:scale-95",
              "focus:outline-none focus:ring-2 focus:ring-[var(--green-500)] focus:ring-offset-2",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            )}
            aria-label="Accept idea"
          >
            <Check className="h-6 w-6" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Accept <kbd className="ml-1 px-1 py-0.5 rounded bg-[var(--grey-100)] text-[10px]">→</kbd></p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
