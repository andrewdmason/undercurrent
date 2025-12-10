"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Expand,
  Copy,
  Check,
} from "lucide-react";
import { GenerationLog } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface GenerationLogCardProps {
  log: GenerationLog;
  projectName: string;
}

export function GenerationLogCard({
  log,
  projectName,
}: GenerationLogCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [dialogContent, setDialogContent] = useState<{
    title: string;
    content: string;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const createdAt = new Date(log.created_at);
  const formattedDate = createdAt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const formattedTime = createdAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const ideasCount = log.ideas_created?.length || 0;
  const hasError = !!log.error;
  
  const typeLabels: Record<string, { label: string; color: string }> = {
    idea_generation: { label: "Ideas", color: "bg-blue-100 text-blue-700" },
    ai_character: { label: "AI Character", color: "bg-violet-100 text-violet-700" },
    thumbnail: { label: "Thumbnail", color: "bg-amber-100 text-amber-700" },
    other: { label: "Other", color: "bg-gray-100 text-gray-600" },
  };
  const typeInfo = typeLabels[log.type] || typeLabels.other;

  const handleCopy = async (content: string, fieldName: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const openDialog = (title: string, content: string) => {
    setDialogContent({ title, content });
  };

  return (
    <>
      <div className="bg-[var(--grey-0)] border border-[var(--border)] rounded-lg overflow-hidden">
        {/* Header - always visible */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-[var(--grey-50-a)] transition-colors"
        >
          <div className="flex items-center gap-3">
            {hasError ? (
              <AlertCircle size={18} className="text-[var(--red-500)]" />
            ) : (
              <CheckCircle2 size={18} className="text-[var(--green-500)]" />
            )}
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[var(--grey-800)]">
                  {projectName}
                </span>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${typeInfo.color}`}>
                  {typeInfo.label}
                </span>
              </div>
              <div className="text-xs text-[var(--grey-400)]">
                {formattedDate} at {formattedTime} · {log.model}
                {hasError ? (
                  <span className="text-[var(--red-500)]"> · Failed</span>
                ) : log.type === "idea_generation" ? (
                  <span> · {ideasCount} ideas created</span>
                ) : null}
              </div>
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp size={18} className="text-[var(--grey-400)]" />
          ) : (
            <ChevronDown size={18} className="text-[var(--grey-400)]" />
          )}
        </button>

        {/* Expanded content */}
        {isExpanded && (
          <div className="border-t border-[var(--border)] px-4 py-4 space-y-4">
            {/* Error message if present */}
            {hasError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="text-xs font-medium text-red-800 mb-1">
                  Error
                </div>
                <pre className="text-xs text-red-700 whitespace-pre-wrap font-mono">
                  {log.error}
                </pre>
              </div>
            )}

            {/* Prompt sent */}
            <TextSection
              title="Prompt Sent"
              content={log.prompt_sent}
              onExpand={() => openDialog("Prompt Sent", log.prompt_sent)}
              onCopy={() => handleCopy(log.prompt_sent, "prompt")}
              isCopied={copiedField === "prompt"}
            />

            {/* Response received */}
            {log.response_raw && (
              <TextSection
                title="Response Received"
                content={formatResponse(log.response_raw)}
                onExpand={() =>
                  openDialog(
                    "Response Received",
                    formatResponse(log.response_raw!)
                  )
                }
                onCopy={() =>
                  handleCopy(formatResponse(log.response_raw!), "response")
                }
                isCopied={copiedField === "response"}
              />
            )}

            {/* Ideas created */}
            {log.ideas_created && log.ideas_created.length > 0 && (
              <div>
                <div className="text-xs font-medium text-[var(--grey-600)] mb-2">
                  Ideas Created
                </div>
                <div className="flex flex-wrap gap-2">
                  {log.ideas_created.map((id) => (
                    <code
                      key={id}
                      className="text-xs bg-[var(--grey-50)] px-2 py-1 rounded text-[var(--grey-600)] font-mono"
                    >
                      {id.slice(0, 8)}...
                    </code>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expand Dialog */}
      <Dialog
        open={!!dialogContent}
        onOpenChange={(open) => !open && setDialogContent(null)}
      >
        <DialogContent className="sm:max-w-6xl w-[90vw] h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0 flex flex-row items-center justify-between">
            <DialogTitle>{dialogContent?.title}</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                dialogContent && handleCopy(dialogContent.content, "dialog")
              }
              className="gap-2"
            >
              {copiedField === "dialog" ? (
                <>
                  <Check size={14} />
                  Copied
                </>
              ) : (
                <>
                  <Copy size={14} />
                  Copy
                </>
              )}
            </Button>
          </DialogHeader>
          <div className="flex-1 overflow-auto bg-[var(--grey-50)] rounded-lg p-4">
            <pre className="text-sm text-[var(--grey-800)] whitespace-pre-wrap font-mono">
              {dialogContent?.content}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface TextSectionProps {
  title: string;
  content: string;
  onExpand: () => void;
  onCopy: () => void;
  isCopied: boolean;
}

function TextSection({
  title,
  content,
  onExpand,
  onCopy,
  isCopied,
}: TextSectionProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-medium text-[var(--grey-600)]">{title}</div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCopy}
            className="h-6 w-6 p-0"
            title={isCopied ? "Copied" : "Copy"}
          >
            {isCopied ? <Check size={14} /> : <Copy size={14} />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onExpand}
            className="h-6 w-6 p-0"
            title="Expand"
          >
            <Expand size={14} />
          </Button>
        </div>
      </div>
      <div className="bg-[var(--grey-50)] rounded-lg p-3 max-h-48 overflow-auto">
        <pre className="text-xs text-[var(--grey-800)] whitespace-pre-wrap font-mono">
          {content}
        </pre>
      </div>
    </div>
  );
}

function formatResponse(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return raw;
  }
}
