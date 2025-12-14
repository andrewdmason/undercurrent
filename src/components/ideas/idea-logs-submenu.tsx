"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Loader2, MessageSquare, Wrench, ExternalLink, AlertCircle, CheckCircle2, Copy, Check, Expand } from "lucide-react";
import { cn } from "@/lib/utils";
import { GenerationLog, ChatLog } from "@/lib/types";
import {
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface IdeaLogsSubmenuProps {
  ideaId: string;
  projectId: string;
}

// Type labels for generation logs
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

// Format time ago
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

type LogItem = {
  id: string;
  type: "tool" | "chat";
  timestamp: string;
  label: string;
  color: string;
  hasError?: boolean;
  chatId?: string;
  data: GenerationLog | ChatLog;
};

export function IdeaLogsSubmenu({ ideaId, projectId }: IdeaLogsSubmenuProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [selectedLog, setSelectedLog] = useState<LogItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [expandedContent, setExpandedContent] = useState<{ title: string; content: string } | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchLogs = async () => {
    setIsLoading(true);
    const supabase = createClient();

    // Fetch generation logs for this idea
    const { data: genLogs } = await supabase
      .from("generation_logs")
      .select("*")
      .eq("idea_id", ideaId)
      .order("created_at", { ascending: false });

    // Fetch chat logs for this idea via idea_chats
    const { data: chatLogs } = await supabase
      .from("chat_logs")
      .select(`
        *,
        idea_chats!inner (
          id,
          name,
          idea_id
        )
      `)
      .eq("idea_chats.idea_id", ideaId)
      .order("created_at", { ascending: false });

    // Convert to unified format
    const toolItems: LogItem[] = (genLogs || []).map((log) => {
      const typeInfo = typeLabels[log.type] || typeLabels.other;
      return {
        id: log.id,
        type: "tool" as const,
        timestamp: log.created_at,
        label: typeInfo.label,
        color: typeInfo.color,
        hasError: !!log.error,
        data: log as GenerationLog,
      };
    });

    const chatItems: LogItem[] = (chatLogs || []).map((log) => ({
      id: log.id,
      type: "chat" as const,
      timestamp: log.created_at,
      label: "Chat",
      color: "bg-purple-100 text-purple-700",
      chatId: log.chat_id,
      data: log as ChatLog,
    }));

    // Combine and sort by timestamp (newest first)
    const allLogs = [...toolItems, ...chatItems].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    setLogs(allLogs);
    setIsLoading(false);
    setHasLoaded(true);
  };

  // Fetch on mount
  useEffect(() => {
    fetchLogs();
  }, [ideaId]);

  // Refetch when submenu is opened
  const handleSubMenuOpen = () => {
    if (hasLoaded) {
      // Refetch in background to get latest logs
      fetchLogs();
    }
  };

  const handleCopy = async (content: string, fieldName: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleLogClick = (log: LogItem, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedLog(log);
    setDialogOpen(true);
  };

  const getFullLogUrl = (log: LogItem) => {
    if (log.type === "tool") {
      return `/logs/tools?logId=${log.id}&project=${projectId}`;
    }
    return `/logs/chat?chatId=${log.chatId}&project=${projectId}`;
  };

  return (
    <>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger 
          className="flex items-center gap-2 h-8 px-2 rounded-md text-xs text-[var(--grey-800)] hover:bg-[var(--grey-50-a)] cursor-pointer"
          onPointerEnter={handleSubMenuOpen}
        >
          <Wrench className="h-3.5 w-3.5" />
          View Logs
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="w-[280px] max-h-[400px] overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-[var(--grey-400)]" />
            </div>
          ) : logs.length === 0 ? (
            <div className="px-3 py-4 text-sm text-[var(--grey-500)] text-center">
              No logs yet
            </div>
          ) : (
            <>
              {logs.slice(0, 10).map((log) => (
                <DropdownMenuItem
                  key={`${log.type}-${log.id}`}
                  onClick={(e) => handleLogClick(log, e)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {log.type === "tool" ? (
                      log.hasError ? (
                        <AlertCircle size={12} className="text-[var(--red-500)] flex-shrink-0" />
                      ) : (
                        <CheckCircle2 size={12} className="text-[var(--green-500)] flex-shrink-0" />
                      )
                    ) : (
                      <MessageSquare size={12} className="text-purple-500 flex-shrink-0" />
                    )}
                    <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded flex-shrink-0", log.color)}>
                      {log.label}
                    </span>
                    <span className="text-xs text-[var(--grey-400)] truncate">
                      {formatTimeAgo(new Date(log.timestamp))}
                    </span>
                  </div>
                </DropdownMenuItem>
              ))}
              {logs.length > 10 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link
                      href={`/logs/tools?project=${projectId}`}
                      className="flex items-center justify-center gap-1 text-xs text-[var(--grey-500)]"
                    >
                      View all logs
                      <ExternalLink size={10} />
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
            </>
          )}
        </DropdownMenuSubContent>
      </DropdownMenuSub>

      {/* Quick View Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
              <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {selectedLog?.type === "tool" ? (
                  selectedLog.hasError ? (
                    <AlertCircle size={16} className="text-[var(--red-500)]" />
                  ) : (
                    <CheckCircle2 size={16} className="text-[var(--green-500)]" />
                  )
                ) : (
                  <MessageSquare size={16} className="text-purple-500" />
                )}
                <DialogTitle className="flex items-center gap-2">
                  <span className={cn("text-xs font-medium px-2 py-0.5 rounded", selectedLog?.color)}>
                    {selectedLog?.label}
                  </span>
                  <span className="text-sm text-[var(--grey-500)]" title={selectedLog ? new Date(selectedLog.timestamp).toLocaleString() : ""}>
                    {selectedLog && formatTimeAgo(new Date(selectedLog.timestamp))}
                  </span>
                </DialogTitle>
              </div>
              {selectedLog && (
                <Link
                  href={getFullLogUrl(selectedLog)}
                  className="text-xs text-[var(--cyan-600)] hover:underline flex items-center gap-1"
                  onClick={() => setDialogOpen(false)}
                >
                  Open full view
                  <ExternalLink size={10} />
                </Link>
              )}
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0">
            {selectedLog?.type === "tool" ? (
              <ToolLogDetail
                log={selectedLog.data as GenerationLog}
                onCopy={handleCopy}
                copiedField={copiedField}
                onExpand={(title, content) => setExpandedContent({ title, content })}
              />
            ) : selectedLog?.type === "chat" ? (
              <ChatLogDetail
                log={selectedLog.data as ChatLog}
                onCopy={handleCopy}
                copiedField={copiedField}
              />
            ) : null}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Expanded Content Dialog */}
      <Dialog open={!!expandedContent} onOpenChange={(open) => !open && setExpandedContent(null)}>
        <DialogContent className="sm:max-w-6xl w-[90vw] h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0 flex flex-row items-center justify-between">
            <DialogTitle>{expandedContent?.title}</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => expandedContent && handleCopy(expandedContent.content, "dialog")}
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
              {expandedContent?.content}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Tool Log Detail Component
interface ToolLogDetailProps {
  log: GenerationLog;
  onCopy: (content: string, fieldName: string) => void;
  copiedField: string | null;
  onExpand: (title: string, content: string) => void;
}

function ToolLogDetail({ log, onCopy, copiedField, onExpand }: ToolLogDetailProps) {
  const typeInfo = typeLabels[log.type] || typeLabels.other;
  const createdAt = new Date(log.created_at);

  return (
    <div className="space-y-4 py-2">
      {/* Metadata */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-[var(--grey-500)]">Type:</span>{" "}
          <span className={cn("px-1.5 py-0.5 rounded text-xs font-medium", typeInfo.color)}>
            {typeInfo.label}
          </span>
        </div>
        <div>
          <span className="text-[var(--grey-500)]">Model:</span>{" "}
          <span className="text-[var(--grey-800)]">{log.model}</span>
        </div>
        <div className="col-span-2">
          <span className="text-[var(--grey-500)]">Created:</span>{" "}
          <span className="text-[var(--grey-800)]">
            {createdAt.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Error */}
      {log.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-red-700 font-medium text-sm mb-1">
            <AlertCircle size={14} />
            Error
          </div>
          <p className="text-sm text-red-600">{log.error}</p>
        </div>
      )}

      {/* Prompt */}
      {log.prompt_sent && (
        <ContentSection
          title="Prompt Sent"
          content={log.prompt_sent}
          onCopy={onCopy}
          copiedField={copiedField}
          fieldName="prompt"
          onExpand={onExpand}
        />
      )}

      {/* Response */}
      {log.response_raw && (
        <ContentSection
          title="Response"
          content={log.response_raw}
          onCopy={onCopy}
          copiedField={copiedField}
          fieldName="response"
          onExpand={onExpand}
        />
      )}
    </div>
  );
}

// Chat Log Detail Component
interface ChatLogDetailProps {
  log: ChatLog;
  onCopy: (content: string, fieldName: string) => void;
  copiedField: string | null;
}

function ChatLogDetail({ log, onCopy, copiedField }: ChatLogDetailProps) {
  const messages = (log.messages_sent || []) as Array<{ role: string; content: string }>;
  const response = log.response_raw || "";
  const createdAt = new Date(log.created_at);

  return (
    <div className="space-y-4 py-2">
      {/* Metadata */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-[var(--grey-500)]">Model:</span>{" "}
          <span className="text-[var(--grey-800)]">{log.model}</span>
        </div>
        <div>
          <span className="text-[var(--grey-500)]">Messages:</span>{" "}
          <span className="text-[var(--grey-800)]">{messages.length}</span>
        </div>
        <div className="col-span-2">
          <span className="text-[var(--grey-500)]">Created:</span>{" "}
          <span className="text-[var(--grey-800)]">
            {createdAt.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Error */}
      {log.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-red-700 font-medium text-sm mb-1">
            <AlertCircle size={14} />
            Error
          </div>
          <p className="text-sm text-red-600">{log.error}</p>
        </div>
      )}

      {/* Messages */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-[var(--grey-700)]">Messages</h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCopy(JSON.stringify(messages, null, 2), "messages")}
            className="h-6 px-2 text-xs"
          >
            {copiedField === "messages" ? <Check size={12} /> : <Copy size={12} />}
          </Button>
        </div>
        <div className="space-y-2 max-h-[200px] overflow-auto">
          {messages.filter((m: { role: string }) => m.role !== "system").map((msg: { role: string; content: string }, i: number) => (
            <div
              key={i}
              className={cn(
                "p-2 rounded text-sm",
                msg.role === "user"
                  ? "bg-[var(--grey-100)] text-[var(--grey-800)]"
                  : "bg-[var(--cyan-50)] text-[var(--grey-800)]"
              )}
            >
              <div className="text-xs font-medium text-[var(--grey-500)] mb-1 uppercase">
                {msg.role}
              </div>
              <div className="whitespace-pre-wrap line-clamp-4">{msg.content}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Response */}
      {response && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-[var(--grey-700)]">Response</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCopy(response, "response")}
              className="h-6 px-2 text-xs"
            >
              {copiedField === "response" ? <Check size={12} /> : <Copy size={12} />}
            </Button>
          </div>
          <div className="bg-[var(--grey-50)] rounded-lg p-3 max-h-[200px] overflow-auto">
            <pre className="text-sm text-[var(--grey-800)] whitespace-pre-wrap font-mono line-clamp-10">
              {response}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

// Content Section Component
interface ContentSectionProps {
  title: string;
  content: string;
  onCopy: (content: string, fieldName: string) => void;
  copiedField: string | null;
  fieldName: string;
  onExpand: (title: string, content: string) => void;
}

function ContentSection({ title, content, onCopy, copiedField, fieldName, onExpand }: ContentSectionProps) {
  const lines = content.split("\n").length;
  const isLong = lines > 15 || content.length > 2000;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-[var(--grey-700)]">{title}</h4>
        <div className="flex items-center gap-1">
          {isLong && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onExpand(title, content)}
              className="h-6 px-2 text-xs"
            >
              <Expand size={12} />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCopy(content, fieldName)}
            className="h-6 px-2 text-xs"
          >
            {copiedField === fieldName ? <Check size={12} /> : <Copy size={12} />}
          </Button>
        </div>
      </div>
      <div className="bg-[var(--grey-50)] rounded-lg p-3 max-h-[200px] overflow-auto">
        <pre className="text-sm text-[var(--grey-800)] whitespace-pre-wrap font-mono">
          {isLong ? content.slice(0, 2000) + "..." : content}
        </pre>
      </div>
    </div>
  );
}
