"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  MessageSquare,
  User,
  Bot,
  Wrench,
  ChevronRight,
} from "lucide-react";
import { ChatLog } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ChatLogWithRelations = ChatLog & {
  projects?: { name: string } | null;
  idea_chats?: { name: string; ideas?: { title: string } | null } | null;
};

interface ChatLogsViewProps {
  logs: ChatLogWithRelations[];
  initialLogId?: string;
}

export function ChatLogsView({ logs, initialLogId }: ChatLogsViewProps) {
  const [selectedLogId, setSelectedLogId] = useState<string | null>(
    initialLogId || logs[0]?.id || null
  );
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const selectedLog = logs.find((log) => log.id === selectedLogId);

  const handleCopy = async (content: string, fieldName: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-[var(--grey-400)]">
        <p>No chat logs yet.</p>
        <p className="text-sm mt-1">
          Logs will appear here after chat conversations.
        </p>
      </div>
    );
  }

  return (
    <div className="flex gap-6 min-h-[600px]">
      {/* Left Sidebar - Chat List */}
      <div className="w-80 flex-shrink-0">
        <div className="bg-[var(--grey-0)] border border-[var(--border)] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <h3 className="text-xs font-semibold text-[var(--grey-600)] uppercase tracking-wider">
              Chat Logs ({logs.length})
            </h3>
          </div>
          <div className="divide-y divide-[var(--border)] max-h-[calc(100vh-300px)] overflow-auto">
            {logs.map((log) => (
              <ChatLogListItem
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
          <ChatLogDetail
            log={selectedLog}
            onCopy={handleCopy}
            copiedField={copiedField}
          />
        ) : (
          <div className="bg-[var(--grey-0)] border border-[var(--border)] rounded-lg p-8 text-center text-[var(--grey-400)]">
            Select a chat log to view details
          </div>
        )}
      </div>
    </div>
  );
}

interface ChatLogListItemProps {
  log: ChatLogWithRelations;
  isSelected: boolean;
  onClick: () => void;
}

function ChatLogListItem({ log, isSelected, onClick }: ChatLogListItemProps) {
  const createdAt = new Date(log.created_at);
  const formattedDate = createdAt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const formattedTime = createdAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const hasError = !!log.error;
  const ideaTitle = log.idea_chats?.ideas?.title || "Unknown Idea";
  const chatName = log.idea_chats?.name || "Chat";

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
          <div className="text-sm font-medium text-[var(--grey-800)] truncate">
            {ideaTitle}
          </div>
          <div className="text-xs text-[var(--grey-400)] truncate">
            {chatName} · {formattedDate} at {formattedTime}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--grey-50)] text-[var(--grey-500)]">
              {log.model}
            </span>
            {log.tool_calls_made && log.tool_calls_made.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--green-500)]/10 text-[var(--green-500)]">
                {log.tool_calls_made.length} tool call{log.tool_calls_made.length > 1 ? "s" : ""}
              </span>
            )}
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

interface ChatLogDetailProps {
  log: ChatLogWithRelations;
  onCopy: (content: string, fieldName: string) => void;
  copiedField: string | null;
}

function ChatLogDetail({ log, onCopy, copiedField }: ChatLogDetailProps) {
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
  const projectName = log.projects?.name || "Unknown Project";
  const chatName = log.idea_chats?.name || "Unknown Chat";
  const ideaTitle = log.idea_chats?.ideas?.title || "Unknown Idea";

  const messagesSent = log.messages_sent as Array<{ role: string; content: string }> | null;

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
              <h2 className="text-lg font-medium text-[var(--grey-800)]">
                {ideaTitle}
              </h2>
            </div>
            <div className="text-sm text-[var(--grey-400)] mt-1">
              {chatName} · {projectName}
            </div>
            <div className="text-xs text-[var(--grey-400)] mt-1">
              {formattedDate} at {formattedTime}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs px-2 py-1 rounded bg-[var(--grey-50)] text-[var(--grey-600)] font-medium">
              {log.model}
            </span>
            {(log.input_tokens || log.output_tokens) && (
              <span className="text-xs text-[var(--grey-400)]">
                {(log.input_tokens || 0) + (log.output_tokens || 0)} tokens
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

      {/* Tool Calls */}
      {log.tool_calls_made && log.tool_calls_made.length > 0 && (
        <div className="mx-6 mt-4">
          <div className="text-xs font-semibold text-[var(--grey-600)] uppercase tracking-wider mb-2">
            Tool Calls
          </div>
          <div className="flex flex-wrap gap-2">
            {log.tool_calls_made.map((tc, idx) => (
              <code
                key={idx}
                className="text-xs bg-[var(--green-500)]/10 text-[var(--green-500)] px-2 py-1 rounded font-mono"
              >
                {tc.function?.name || "unknown"}
              </code>
            ))}
          </div>
        </div>
      )}

      {/* Conversation */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs font-semibold text-[var(--grey-600)] uppercase tracking-wider">
            Conversation ({messagesSent?.length || 0} messages)
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCopy(JSON.stringify(messagesSent, null, 2), "messages")}
            className="h-7 px-2 gap-1.5 text-xs"
          >
            {copiedField === "messages" ? (
              <>
                <Check size={12} />
                Copied
              </>
            ) : (
              <>
                <Copy size={12} />
                Copy JSON
              </>
            )}
          </Button>
        </div>

        {/* Messages */}
        <div className="space-y-3 max-h-[calc(100vh-450px)] overflow-auto pr-2">
          {messagesSent?.map((msg, idx) => (
            <MessageBubble key={idx} role={msg.role} content={msg.content} />
          ))}

          {/* Response */}
          {log.response_raw && (
            <MessageBubble role="assistant" content={log.response_raw} isResponse />
          )}
        </div>
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  role: string;
  content: string;
  isResponse?: boolean;
}

function MessageBubble({ role, content, isResponse }: MessageBubbleProps) {
  const isUser = role === "user";
  const isSystem = role === "system";
  const isTool = role === "tool";
  const isAssistant = role === "assistant";

  const getIcon = () => {
    if (isUser) return <User size={14} />;
    if (isTool) return <Wrench size={14} />;
    return <Bot size={14} />;
  };

  const getRoleLabel = () => {
    if (isUser) return "User";
    if (isSystem) return "System";
    if (isTool) return "Tool";
    if (isResponse) return "Response";
    return "Assistant";
  };

  return (
    <div
      className={cn(
        "rounded-lg p-4",
        isUser && "bg-[#443bf510] border border-[#443bf520]",
        isSystem && "bg-[var(--grey-50)] border border-[var(--grey-100)]",
        isTool && "bg-amber-50 border border-amber-200",
        isAssistant && !isResponse && "bg-[var(--grey-50)] border border-[var(--grey-100)]",
        isResponse && "bg-[var(--cyan-600)]/5 border border-[var(--cyan-600)]/20"
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className={cn(
            "p-1 rounded",
            isUser && "bg-[#443bf520] text-[#443bf5]",
            isSystem && "bg-[var(--grey-100)] text-[var(--grey-500)]",
            isTool && "bg-amber-200 text-amber-700",
            isAssistant && !isResponse && "bg-[var(--grey-100)] text-[var(--grey-500)]",
            isResponse && "bg-[var(--cyan-600)]/20 text-[var(--cyan-600)]"
          )}
        >
          {getIcon()}
        </div>
        <span
          className={cn(
            "text-xs font-semibold uppercase tracking-wider",
            isUser && "text-[#443bf5]",
            isSystem && "text-[var(--grey-500)]",
            isTool && "text-amber-700",
            isAssistant && !isResponse && "text-[var(--grey-500)]",
            isResponse && "text-[var(--cyan-600)]"
          )}
        >
          {getRoleLabel()}
        </span>
      </div>
      <div className="text-sm text-[var(--grey-800)] whitespace-pre-wrap font-mono leading-relaxed">
        {content}
      </div>
    </div>
  );
}
