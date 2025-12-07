"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface ScriptDisplayProps {
  script: string;
  className?: string;
}

type ScriptPart =
  | { type: "scene"; content: string }
  | { type: "speaker"; name: string; modifier?: string; unscripted?: boolean }
  | { type: "visual"; content: string }
  | { type: "dialogue"; content: string };

function parseScript(script: string): ScriptPart[] {
  const lines = script.split("\n");
  const parts: ScriptPart[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip dividers (---)
    if (trimmedLine === "---") {
      continue;
    }

    // Scene heading: ### Scene Name
    if (trimmedLine.startsWith("### ")) {
      const sceneName = trimmedLine.slice(4);
      parts.push({ type: "scene", content: sceneName });
      continue;
    }

    // Speaker: **Name** or **Name (V.O.)** or **Name (O.S.)** or **Name (unscripted)**
    // Matches any name in bold, with optional modifier inside
    const speakerMatch = trimmedLine.match(/^\*\*([A-Za-z][A-Za-z0-9 ]*?)(?:\s*\((V\.O\.|O\.S\.|unscripted)\))?\*\*$/);
    if (speakerMatch) {
      const name = speakerMatch[1];
      const modifier = speakerMatch[2];
      const unscripted = modifier === "unscripted";
      
      parts.push({
        type: "speaker",
        name,
        modifier: unscripted ? undefined : modifier,
        unscripted,
      });
      continue;
    }

    // Visual direction: *[anything]* or *anything* (italics)
    const visualMatch = trimmedLine.match(/^\*\[(.+)\]\*$/) || trimmedLine.match(/^\*(.+)\*$/);
    if (visualMatch) {
      // Remove brackets if present
      const content = visualMatch[1].replace(/^\[|\]$/g, "");
      parts.push({ type: "visual", content });
      continue;
    }

    // Empty lines
    if (trimmedLine === "") {
      continue;
    }

    // Everything else is dialogue
    parts.push({ type: "dialogue", content: trimmedLine });
  }

  return parts;
}

export function ScriptDisplay({ script, className }: ScriptDisplayProps) {
  const parts = useMemo(() => parseScript(script), [script]);

  // Find the previous speaker before a given index
  const getPreviousSpeaker = (currentIndex: number): string | null => {
    for (let i = currentIndex - 1; i >= 0; i--) {
      const part = parts[i];
      if (part.type === "speaker") {
        return part.name;
      }
      // Reset on scene change - always show speaker after a new scene
      if (part.type === "scene") {
        return null;
      }
    }
    return null;
  };

  return (
    <div className={cn("space-y-3", className)}>
      {parts.map((part, index) => {
        switch (part.type) {
          case "scene":
            return (
              <h3
                key={index}
                className="text-base font-semibold text-[var(--grey-800)] mt-4 first:mt-0"
              >
                {part.content}
              </h3>
            );

          case "speaker": {
            const previousSpeaker = getPreviousSpeaker(index);
            const shouldShow = previousSpeaker !== part.name || part.unscripted;
            
            if (!shouldShow) {
              return null;
            }
            
            return (
              <p
                key={index}
                className="text-sm font-semibold text-[var(--grey-800)] mt-3 ml-24"
              >
                {part.name}
                {(part.modifier || part.unscripted) && (
                  <span className="font-normal text-[var(--grey-500)]">
                    {" "}({part.unscripted ? "unscripted" : part.modifier})
                  </span>
                )}
              </p>
            );
          }

          case "visual":
            return (
              <p
                key={index}
                className="text-sm italic text-[var(--grey-400)]"
              >
                {part.content}
              </p>
            );

          case "dialogue":
            return (
              <p
                key={index}
                className="text-sm leading-relaxed mx-12 text-[var(--grey-800)] font-mono"
              >
                {part.content}
              </p>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}

