"use client";

import { useState, ReactNode } from "react";
import { ChevronDown, ChevronUp, FileText, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

// Simple markdown renderer for chat messages
function renderChatMarkdown(text: string): ReactNode {
  // Split into paragraphs
  const paragraphs = text.split(/\n\n+/);
  
  return paragraphs.map((paragraph, pIdx) => {
    // Check if it's a numbered list
    const numberedListMatch = paragraph.match(/^(\d+\.\s)/m);
    if (numberedListMatch && paragraph.includes('\n')) {
      const items = paragraph.split(/\n(?=\d+\.\s)/);
      return (
        <ol key={pIdx} className="list-decimal list-inside space-y-1 my-2">
          {items.map((item, i) => (
            <li key={i} className="text-xs">
              {renderInlineMarkdown(item.replace(/^\d+\.\s/, ''))}
            </li>
          ))}
        </ol>
      );
    }
    
    // Check if it's a bullet list
    if (paragraph.startsWith('- ') || paragraph.startsWith('• ')) {
      const items = paragraph.split(/\n(?=[-•]\s)/);
      return (
        <ul key={pIdx} className="list-disc list-inside space-y-1 my-2">
          {items.map((item, i) => (
            <li key={i} className="text-xs">
              {renderInlineMarkdown(item.replace(/^[-•]\s/, ''))}
            </li>
          ))}
        </ul>
      );
    }
    
    // Regular paragraph - handle line breaks within
    const lines = paragraph.split('\n');
    return (
      <p key={pIdx} className={pIdx > 0 ? "mt-2" : ""}>
        {lines.map((line, lIdx) => (
          <span key={lIdx}>
            {lIdx > 0 && <br />}
            {renderInlineMarkdown(line)}
          </span>
        ))}
      </p>
    );
  });
}

// Render inline markdown (bold, italic)
function renderInlineMarkdown(text: string): ReactNode {
  // Handle bold and italic
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|"[^"]+"|"[^"]+"|—)/g);
  
  return parts.map((part, i) => {
    // Bold: **text**
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    // Italic: *text*
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={i} className="italic">{part.slice(1, -1)}</em>;
    }
    // Smart quotes and em dash - just return as-is
    return part;
  });
}

interface ChatMessageProps {
  role: "user" | "assistant" | "tool";
  content: string;
  toolCalls?: Array<{
    name: string;
    arguments: Record<string, unknown>;
  }> | null;
  toolResult?: {
    name: string;
    result: {
      success: boolean;
      message?: string;
      error?: string;
    };
  } | null;
  isStreaming?: boolean;
  pendingToolCalls?: boolean;
}

export function ChatMessage({
  role,
  content,
  toolCalls,
  toolResult,
  isStreaming,
  pendingToolCalls,
}: ChatMessageProps) {
  const [isToolExpanded, setIsToolExpanded] = useState(false);

  if (role === "user") {
    return (
      <div className="flex justify-end pl-6">
        <div className="rounded-lg px-3 py-2 bg-[#443bf520] text-xs text-[var(--grey-800)]">
          {content}
        </div>
      </div>
    );
  }

  if (role === "assistant") {
    return (
      <div className="flex justify-start pr-6">
        <div className="space-y-2">
          {content && (
            <div className="rounded-lg px-3 py-2 bg-[var(--grey-50)] text-xs text-[var(--grey-800)]">
              <div className="chat-markdown">
                {renderChatMarkdown(content)}
              </div>
              {isStreaming && !toolCalls?.length && (
                <span className="inline-block w-1 h-3 bg-[var(--grey-400)] animate-pulse ml-0.5" />
              )}
            </div>
          )}
          {toolCalls && toolCalls.length > 0 && (
            <div className="space-y-1">
              {toolCalls.map((tc, idx) => (
                <ToolCallIndicator
                  key={idx}
                  name={tc.name}
                  arguments={tc.arguments}
                  expanded={isToolExpanded}
                  onToggle={() => setIsToolExpanded(!isToolExpanded)}
                  isPending={pendingToolCalls}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Tool result message
  if (toolResult) {
    return (
      <div className="flex justify-start pr-6">
        <div
          className={cn(
            "rounded-lg px-3 py-1.5 text-[11px]",
            toolResult.result.success
              ? "bg-[#00975a]/10 text-[#00975a]"
              : "bg-[#f72736]/10 text-[#f72736]"
          )}
        >
          {toolResult.result.success
            ? toolResult.result.message || "Success"
            : toolResult.result.error || "Failed"}
        </div>
      </div>
    );
  }

  return null;
}

interface ToolCallIndicatorProps {
  name: string;
  arguments: Record<string, unknown>;
  expanded: boolean;
  onToggle: () => void;
  isPending?: boolean;
}

function ToolCallIndicator({
  name,
  arguments: args,
  expanded,
  onToggle,
  isPending,
}: ToolCallIndicatorProps) {
  const getToolLabel = () => {
    switch (name) {
      case "update_script":
        return isPending ? "Updating script..." : "Updated script";
      case "generate_script":
        return isPending ? "Generating script..." : "Generated script";
      case "regenerate_idea":
        return isPending ? "Regenerating idea..." : "Regenerated idea";
      default:
        return name;
    }
  };

  const getToolIcon = () => {
    switch (name) {
      case "update_script":
        return <FileText className={cn("h-3 w-3", isPending && "animate-pulse")} />;
      case "generate_script":
        return <FileText className={cn("h-3 w-3", isPending && "animate-spin")} />;
      case "regenerate_idea":
        return <RefreshCw className={cn("h-3 w-3", isPending && "animate-spin")} />;
      default:
        return null;
    }
  };

  return (
    <div className={cn(
      "rounded-lg border border-[var(--border)] bg-[var(--grey-0)] overflow-hidden",
      isPending && "border-[var(--cyan-600)]/30 bg-[var(--cyan-600)]/5"
    )}>
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] transition-colors",
          isPending 
            ? "text-[var(--cyan-600)]" 
            : "text-[var(--grey-600)] hover:bg-[var(--grey-50)]"
        )}
      >
        {getToolIcon()}
        <span className="font-medium">{getToolLabel()}</span>
        {!isPending && (
          <span className="ml-auto">
            {expanded ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </span>
        )}
      </button>
      {expanded && !isPending && (
        <div className="px-2.5 py-2 border-t border-[var(--border)] bg-[var(--grey-50)]">
          <pre className="text-[10px] text-[var(--grey-500)] overflow-auto max-h-32 whitespace-pre-wrap font-mono">
            {JSON.stringify(args, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// Loading indicator for streaming
export function ChatMessageSkeleton() {
  return (
    <div className="flex justify-start pr-6">
      <div className="rounded-lg px-3 py-2 bg-[var(--grey-50)]">
        <div className="flex items-center gap-1">
          <span className="w-1 h-1 bg-[var(--grey-400)] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-1 h-1 bg-[var(--grey-400)] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-1 h-1 bg-[var(--grey-400)] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}

