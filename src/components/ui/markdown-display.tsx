"use client";

import { useMemo, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MarkdownDisplayProps {
  content: string;
  className?: string;
}

// Parse inline formatting (bold, italic)
function formatInlineText(text: string): ReactNode {
  // Split on **bold** patterns first
  const boldParts = text.split(/(\*\*[^*]+\*\*)/g);
  
  return boldParts.map((part, i) => {
    // Check if this part is bold (wrapped in **)
    if (part.startsWith("**") && part.endsWith("**")) {
      const boldText = part.slice(2, -2);
      return (
        <strong key={i} className="font-semibold">
          {boldText}
        </strong>
      );
    }
    // Check for italic (*text* but not **)
    const italicParts = part.split(/(\*[^*]+\*)/g);
    return italicParts.map((italicPart, j) => {
      if (italicPart.startsWith("*") && italicPart.endsWith("*") && !italicPart.startsWith("**")) {
        const italicText = italicPart.slice(1, -1);
        return (
          <em key={`${i}-${j}`} className="italic">
            {italicText}
          </em>
        );
      }
      return italicPart;
    });
  });
}

type MarkdownBlock =
  | { type: "h1"; content: string }
  | { type: "h2"; content: string }
  | { type: "h3"; content: string }
  | { type: "bullet"; content: string; indent: number }
  | { type: "numbered"; content: string; number: string; indent: number }
  | { type: "paragraph"; content: string };

function parseMarkdown(content: string): MarkdownBlock[] {
  const lines = content.split("\n");
  const blocks: MarkdownBlock[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines
    if (trimmed === "") {
      continue;
    }

    // H1: # Heading
    if (trimmed.startsWith("# ")) {
      blocks.push({ type: "h1", content: trimmed.slice(2) });
      continue;
    }

    // H2: ## Heading
    if (trimmed.startsWith("## ")) {
      blocks.push({ type: "h2", content: trimmed.slice(3) });
      continue;
    }

    // H3: ### Heading
    if (trimmed.startsWith("### ")) {
      blocks.push({ type: "h3", content: trimmed.slice(4) });
      continue;
    }

    // Bullet list: - item or * item
    const bulletMatch = line.match(/^(\s*)([-*])\s+(.+)$/);
    if (bulletMatch) {
      const indent = Math.floor(bulletMatch[1].length / 2); // 2 spaces = 1 indent level
      blocks.push({ type: "bullet", content: bulletMatch[3], indent });
      continue;
    }

    // Numbered list: 1. item
    const numberedMatch = line.match(/^(\s*)(\d+)\.\s+(.+)$/);
    if (numberedMatch) {
      const indent = Math.floor(numberedMatch[1].length / 2);
      blocks.push({ type: "numbered", content: numberedMatch[3], number: numberedMatch[2], indent });
      continue;
    }

    // Everything else is a paragraph
    blocks.push({ type: "paragraph", content: trimmed });
  }

  return blocks;
}

// Base indentation for list items (in rem)
const LIST_BASE_INDENT = 0.75;
const LIST_INDENT_PER_LEVEL = 1.25;

export function MarkdownDisplay({ content, className }: MarkdownDisplayProps) {
  const blocks = useMemo(() => parseMarkdown(content), [content]);

  return (
    <div className={cn("space-y-2", className)}>
      {blocks.map((block, index) => {
        switch (block.type) {
          case "h1":
            return (
              <h1
                key={index}
                className="text-xl font-bold text-[var(--grey-800)] mt-6 first:mt-0"
              >
                {formatInlineText(block.content)}
              </h1>
            );

          case "h2":
            return (
              <h2
                key={index}
                className="text-lg font-semibold text-[var(--grey-800)] mt-5 first:mt-0"
              >
                {formatInlineText(block.content)}
              </h2>
            );

          case "h3":
            return (
              <h3
                key={index}
                className="text-base font-semibold text-[var(--grey-800)] mt-4 first:mt-0"
              >
                {formatInlineText(block.content)}
              </h3>
            );

          case "bullet":
            return (
              <div
                key={index}
                className="flex gap-2 text-sm text-[var(--grey-700)]"
                style={{ paddingLeft: `${LIST_BASE_INDENT + block.indent * LIST_INDENT_PER_LEVEL}rem` }}
              >
                <span className="text-[var(--grey-400)] select-none">•</span>
                <span className="flex-1">{formatInlineText(block.content)}</span>
              </div>
            );

          case "numbered":
            return (
              <div
                key={index}
                className="flex gap-2 text-sm text-[var(--grey-700)]"
                style={{ paddingLeft: `${LIST_BASE_INDENT + block.indent * LIST_INDENT_PER_LEVEL}rem` }}
              >
                <span className="text-[var(--grey-500)] select-none min-w-[1.25rem]">{block.number}.</span>
                <span className="flex-1">{formatInlineText(block.content)}</span>
              </div>
            );

          case "paragraph":
            return (
              <p
                key={index}
                className="text-sm leading-relaxed text-[var(--grey-700)]"
              >
                {formatInlineText(block.content)}
              </p>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}



