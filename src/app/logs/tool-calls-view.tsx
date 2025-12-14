"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  ChevronRight,
  Expand,
} from "lucide-react";
import { GenerationLog } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type GenerationLogWithRelations = GenerationLog & {
  projects?: { name: string } | null;
  ideas?: { title: string } | null;
};

interface ToolCallsViewProps {
  logs: GenerationLogWithRelations[];
  initialLogId?: string;
}

const typeLabels: Record<string, { label: string; color: string }> = {
  idea_generation: { label: "Generate Ideas", color: "bg-blue-100 text-blue-700" },
  script_generation: { label: "Generate Script", color: "bg-emerald-100 text-emerald-700" },
  script_update: { label: "Update Script", color: "bg-teal-100 text-teal-700" },
  todo_generation: { label: "Generate Prep List", color: "bg-orange-100 text-orange-700" },
  todo_refresh: { label: "Refresh Prep List", color: "bg-rose-100 text-rose-700" },
  ai_character: { label: "AI Character", color: "bg-violet-100 text-violet-700" },
  thumbnail: { label: "Generate Thumbnail", color: "bg-amber-100 text-amber-700" },
  other: { label: "Other", color: "bg-gray-100 text-gray-600" },
};

export function ToolCallsView({ logs, initialLogId }: ToolCallsViewProps) {
  const [selectedLogId, setSelectedLogId] = useState<string | null>(
    initialLogId || logs[0]?.id || null
  );
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [dialogContent, setDialogContent] = useState<{
    title: string;
    content: string;
  } | null>(null);

  const selectedLog = logs.find((log) => log.id === selectedLogId);

  const handleCopy = async (content: string, fieldName: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-[var(--grey-400)]">
        <p>No tool call logs yet.</p>
        <p className="text-sm mt-1">
          Logs will appear here after AI operations.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex gap-6 min-h-[600px]">
        {/* Left Sidebar - Tool Call List */}
        <div className="w-80 flex-shrink-0">
          <div className="bg-[var(--grey-0)] border border-[var(--border)] rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border)]">
              <h3 className="text-xs font-semibold text-[var(--grey-600)] uppercase tracking-wider">
                Tool Calls ({logs.length})
              </h3>
            </div>
            <div className="divide-y divide-[var(--border)] max-h-[calc(100vh-300px)] overflow-auto">
              {logs.map((log) => (
                <ToolCallListItem
                  key={log.id}
                  log={log}
                  isSelected={log.id === selectedLogId}
                  onClick={() => setSelectedLogId(log.id)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Main Content - Selected Log Detail */}
        <div className="flex-1 min-w-0">
          {selectedLog ? (
            <ToolCallDetail
              log={selectedLog}
              onCopy={handleCopy}
              copiedField={copiedField}
              onExpand={(title, content) => setDialogContent({ title, content })}
            />
          ) : (
            <div className="bg-[var(--grey-0)] border border-[var(--border)] rounded-lg p-8 text-center text-[var(--grey-400)]">
              Select a tool call to view details
            </div>
          )}
        </div>
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

interface ToolCallListItemProps {
  log: GenerationLogWithRelations;
  isSelected: boolean;
  onClick: () => void;
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function ToolCallListItem({ log, isSelected, onClick }: ToolCallListItemProps) {
  const createdAt = new Date(log.created_at);
  const timeAgo = formatTimeAgo(createdAt);

  const hasError = !!log.error;
  const typeInfo = typeLabels[log.type] || typeLabels.other;
  const ideasCount = log.ideas_created?.length || 0;
  const ideaTitle = log.ideas?.title;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full px-4 py-3 text-left transition-colors",
        isSelected
          ? "bg-[var(--cyan-600)]/5 border-l-2 border-l-[var(--cyan-600)]"
          : "hover:bg-[var(--grey-50-a)] border-l-2 border-l-transparent"
      )}
    >
      <div className="flex items-start gap-2">
        {hasError ? (
          <AlertCircle size={14} className="text-[var(--red-500)] mt-0.5 flex-shrink-0" />
        ) : (
          <CheckCircle2 size={14} className="text-[var(--green-500)] mt-0.5 flex-shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${typeInfo.color}`}>
              {typeInfo.label}
            </span>
          </div>
          {ideaTitle && (
            <div className="text-sm text-[var(--grey-700)] mt-1 truncate">
              {ideaTitle}
            </div>
          )}
          <div className="text-xs text-[var(--grey-400)] mt-1">
            {timeAgo}
            {hasError ? (
              <span className="text-[var(--red-500)]"> · Failed</span>
            ) : log.type === "idea_generation" && ideasCount > 0 ? (
              <span> · {ideasCount} ideas</span>
            ) : null}
          </div>
        </div>
        <ChevronRight size={14} className={cn(
          "text-[var(--grey-300)] flex-shrink-0 mt-0.5",
          isSelected && "text-[var(--cyan-600)]"
        )} />
      </div>
    </button>
  );
}

interface ToolCallDetailProps {
  log: GenerationLogWithRelations;
  onCopy: (content: string, fieldName: string) => void;
  copiedField: string | null;
  onExpand: (title: string, content: string) => void;
}

function ToolCallDetail({ log, onCopy, copiedField, onExpand }: ToolCallDetailProps) {
  const createdAt = new Date(log.created_at);
  const formattedDate = createdAt.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const formattedTime = createdAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });

  const hasError = !!log.error;
  const typeInfo = typeLabels[log.type] || typeLabels.other;
  const ideasCount = log.ideas_created?.length || 0;
  const ideaTitle = log.ideas?.title;

  return (
    <div className="bg-[var(--grey-0)] border border-[var(--border)] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--border)]">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              {hasError ? (
                <AlertCircle size={18} className="text-[var(--red-500)]" />
              ) : (
                <CheckCircle2 size={18} className="text-[var(--green-500)]" />
              )}
              <span className={`text-sm font-medium px-2 py-0.5 rounded ${typeInfo.color}`}>
                {typeInfo.label}
              </span>
            </div>
            {ideaTitle && (
              <div className="text-sm font-medium text-[var(--grey-800)] mt-2">
                {ideaTitle}
              </div>
            )}
            <div className="text-xs text-[var(--grey-400)] mt-1">
              {formattedDate} at {formattedTime}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs px-2 py-1 rounded bg-[var(--grey-50)] text-[var(--grey-600)] font-medium">
              {log.model}
            </span>
            {log.type === "idea_generation" && ideasCount > 0 && (
              <span className="text-xs text-[var(--grey-400)]">
                {ideasCount} ideas created
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {hasError && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-sm font-medium text-red-800 mb-1">Error</div>
          <pre className="text-xs text-red-700 whitespace-pre-wrap font-mono">
            {log.error}
          </pre>
        </div>
      )}

      {/* Content */}
      <div className="px-6 py-4 space-y-4">
        {/* Prompt sent */}
        <TextSection
          title="Prompt Sent"
          content={log.prompt_sent}
          onExpand={() => onExpand("Prompt Sent", log.prompt_sent)}
          onCopy={() => onCopy(log.prompt_sent, "prompt")}
          isCopied={copiedField === "prompt"}
        />

        {/* Response received */}
        {log.response_raw && (
          <TextSection
            title="Response Received"
            content={formatResponse(log.response_raw)}
            onExpand={() =>
              onExpand("Response Received", formatResponse(log.response_raw!))
            }
            onCopy={() =>
              onCopy(formatResponse(log.response_raw!), "response")
            }
            isCopied={copiedField === "response"}
          />
        )}

        {/* Ideas created */}
        {log.ideas_created && log.ideas_created.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-[var(--grey-600)] uppercase tracking-wider mb-2">
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
    </div>
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
        <div className="text-xs font-semibold text-[var(--grey-600)] uppercase tracking-wider">
          {title}
        </div>
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
      <div className="bg-[var(--grey-50)] rounded-lg p-3 max-h-64 overflow-auto">
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
