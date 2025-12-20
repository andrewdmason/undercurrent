"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatPanel } from "./chat-panel";
import { cn } from "@/lib/utils";

interface OnboardingChatProps {
  ideaId: string;
  projectSlug: string;
  /** Called when user confirms they want to generate assets */
  onGenerate: () => void;
  /** Whether generation is in progress */
  isGenerating?: boolean;
  className?: string;
}

export function OnboardingChat({
  ideaId,
  projectSlug,
  onGenerate,
  isGenerating = false,
  className,
}: OnboardingChatProps) {
  const [isReady, setIsReady] = useState(false);
  const [summary, setSummary] = useState("");

  const handleReadyToGenerate = (contextSummary: string) => {
    setIsReady(true);
    setSummary(contextSummary);
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Main chat area */}
      <div className="flex-1 min-h-0">
        <ChatPanel
          ideaId={ideaId}
          projectSlug={projectSlug}
          mode="onboarding"
          variant="main"
          onReadyToGenerate={handleReadyToGenerate}
        />
      </div>

      {/* Generate button - shows when AI indicates readiness */}
      {isReady && (
        <div className="mt-4 p-4 rounded-lg border border-[var(--cyan-600)]/30 bg-[var(--cyan-600)]/5">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-[var(--cyan-600)]/10">
              <Sparkles className="h-5 w-5 text-[var(--cyan-600)]" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-[var(--grey-800)] mb-1">
                Ready to generate your assets
              </h4>
              {summary && (
                <p className="text-xs text-[var(--grey-500)] mb-3 line-clamp-2">
                  {summary}
                </p>
              )}
              <Button
                onClick={onGenerate}
                disabled={isGenerating}
                className="bg-[var(--cyan-600)] hover:bg-[var(--cyan-600)]/90 text-white"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Talking Points & Script
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


