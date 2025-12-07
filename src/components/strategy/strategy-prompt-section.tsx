"use client";

import { useState, useCallback, useEffect } from "react";
import { updateStrategyPrompt } from "@/lib/actions/business";
import { cn } from "@/lib/utils";

interface StrategyPromptSectionProps {
  businessId: string;
  strategyPrompt: string;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function StrategyPromptSection({
  businessId,
  strategyPrompt: initialPrompt,
}: StrategyPromptSectionProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  // Save changes to the server
  const saveChanges = useCallback(
    async (value: string) => {
      setSaveStatus("saving");
      const result = await updateStrategyPrompt(businessId, value || null);

      if (result.error) {
        setSaveStatus("error");
        setTimeout(() => setSaveStatus("idle"), 3000);
      } else {
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      }
    },
    [businessId]
  );

  // Debounced auto-save
  useEffect(() => {
    if (prompt === initialPrompt) return;

    const timer = setTimeout(() => {
      saveChanges(prompt);
    }, 800);

    return () => clearTimeout(timer);
  }, [prompt, initialPrompt, saveChanges]);

  return (
    <div className="rounded-lg border border-[var(--border)] bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-[var(--grey-800)]">
            Video Marketing Strategy
          </h2>
          <p className="text-xs text-[var(--grey-400)] mt-0.5">
            Your strategy document in markdown format
          </p>
        </div>
        <SaveStatusIndicator status={saveStatus} />
      </div>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={`# Video Marketing Strategy

## Distribution Channels
- Instagram
- TikTok
- Shorts

## Content Themes
- Product highlights
- Behind the scenes
- Customer testimonials

## Style & Tone
- Casual and approachable
- High energy
- On-brand colors and fonts

## Production Notes
- Film in-store with natural lighting
- Use iPhone for quick content
- Include captions for accessibility`}
        className={cn(
          "w-full min-h-[300px] rounded-lg bg-black/[0.03] border-0 px-4 py-3",
          "text-sm text-[var(--grey-800)] placeholder:text-[var(--grey-400)]",
          "focus:outline-none focus:ring-2 focus:ring-[#007bc2]",
          "resize-y font-mono"
        )}
      />

      <p className="text-xs text-[var(--grey-400)] mt-2">
        Supports markdown formatting
      </p>
    </div>
  );
}

function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;

  return (
    <span
      className={cn(
        "text-xs transition-opacity",
        status === "saving" && "text-[var(--grey-400)]",
        status === "saved" && "text-[#00975a]",
        status === "error" && "text-[#f72736]"
      )}
    >
      {status === "saving" && "Saving..."}
      {status === "saved" && "Saved"}
      {status === "error" && "Error saving"}
    </span>
  );
}




