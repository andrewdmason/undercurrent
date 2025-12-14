"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  User,
  Bot,
  Wrench,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { ChatLog } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ChatLogWithRelations = ChatLog & {
  projects?: { name: string } | null;
  idea_chats?: { name: string; ideas?: { title: string } | null } | null;
};

// Grouped chat session containing multiple log entries
interface ChatSession {
  chatId: string;
  chatName: string;
  ideaTitle: string;
  projectName: string;
  logs: ChatLogWithRelations[];
  lastActivity: Date;
  totalToolCalls: number;
  hasError: boolean;
}

interface ChatLogsViewProps {
  logs: ChatLogWithRelations[];
  initialChatId?: string;
  projectId?: string;
}

// Group logs by chat_id
function groupLogsByChatId(logs: ChatLogWithRelations[]): ChatSession[] {
  const grouped = new Map<string, ChatLogWithRelations[]>();
  
  for (const log of logs) {
    const chatId = log.chat_id;
    if (!grouped.has(chatId)) {
      grouped.set(chatId, []);
    }
    grouped.get(chatId)!.push(log);
  }
  
  const sessions: ChatSession[] = [];
  
  for (const [chatId, chatLogs] of grouped) {
    // Sort logs by created_at ascending (oldest first)
    chatLogs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    const firstLog = chatLogs[0];
    const lastLog = chatLogs[chatLogs.length - 1];
    
    const totalToolCalls = chatLogs.reduce((sum, log) => {
      return sum + (log.tool_calls_made?.length || 0);
    }, 0);
    
    const hasError = chatLogs.some(log => !!log.error);
    
    sessions.push({
      chatId,
      chatName: firstLog.idea_chats?.name || "Chat",
      ideaTitle: firstLog.idea_chats?.ideas?.title || "Unknown Idea",
      projectName: firstLog.projects?.name || "Unknown Project",
      logs: chatLogs,
      lastActivity: new Date(lastLog.created_at),
      totalToolCalls,
      hasError,
    });
  }
  
  // Sort sessions by last activity (most recent first)
  sessions.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
  
  return sessions;
}

export function ChatLogsView({ logs, initialChatId, projectId }: ChatLogsViewProps) {
  const sessions = groupLogsByChatId(logs);
  
  const [selectedChatId, setSelectedChatId] = useState<string | null>(
    initialChatId || sessions[0]?.chatId || null
  );
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const selectedSession = sessions.find((s) => s.chatId === selectedChatId);

  const handleCopy = async (content: string, fieldName: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (sessions.length === 0) {
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
      {/* Left Sidebar - Chat Sessions List */}
      <div className="w-80 flex-shrink-0">
        <div className="bg-[var(--grey-0)] border border-[var(--border)] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <h3 className="text-xs font-semibold text-[var(--grey-600)] uppercase tracking-wider">
              Chat Sessions ({sessions.length})
            </h3>
          </div>
          <div className="divide-y divide-[var(--border)] max-h-[calc(100vh-300px)] overflow-auto">
            {sessions.map((session) => (
              <ChatSessionListItem
                key={session.chatId}
                session={session}
                isSelected={session.chatId === selectedChatId}
                onClick={() => setSelectedChatId(session.chatId)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Main Content - Selected Chat Detail */}
      <div className="flex-1 min-w-0">
        {selectedSession ? (
          <ChatSessionDetail
            session={selectedSession}
            onCopy={handleCopy}
            copiedField={copiedField}
            projectId={projectId}
          />
        ) : (
          <div className="bg-[var(--grey-0)] border border-[var(--border)] rounded-lg p-8 text-center text-[var(--grey-400)]">
            Select a chat to view details
          </div>
        )}
      </div>
    </div>
  );
}

interface ChatSessionListItemProps {
  session: ChatSession;
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

function ChatSessionListItem({ session, isSelected, onClick }: ChatSessionListItemProps) {
  const timeAgo = formatTimeAgo(session.lastActivity);

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
        {session.hasError ? (
          <AlertCircle size={14} className="text-[var(--red-500)] mt-0.5 flex-shrink-0" />
        ) : (
          <CheckCircle2 size={14} className="text-[var(--green-500)] mt-0.5 flex-shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-[var(--grey-800)] truncate">
            {session.ideaTitle}
          </div>
          <div className="text-xs text-[var(--grey-400)] truncate">
            {timeAgo}
            {session.logs.length > 1 && (
              <span> · {session.logs.length} exchanges</span>
            )}
            {session.totalToolCalls > 0 && (
              <span> · {session.totalToolCalls} tool call{session.totalToolCalls > 1 ? "s" : ""}</span>
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

interface ChatSessionDetailProps {
  session: ChatSession;
  onCopy: (content: string, fieldName: string) => void;
  copiedField: string | null;
  projectId?: string;
}

function ChatSessionDetail({ session, onCopy, copiedField, projectId }: ChatSessionDetailProps) {
  const firstLog = session.logs[0];
  const startTime = new Date(firstLog.created_at);
  const formattedDate = startTime.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const formattedTime = startTime.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  // Build a unified conversation from all logs
  const conversationItems = buildConversation(session.logs, projectId);

  // Get all messages for JSON export
  const allMessages = session.logs.flatMap(log => {
    const messages = log.messages_sent as Array<{ role: string; content: string }> | null;
    return messages || [];
  });

  return (
    <div className="bg-[var(--grey-0)] border border-[var(--border)] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--border)]">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              {session.hasError ? (
                <AlertCircle size={18} className="text-[var(--red-500)]" />
              ) : (
                <CheckCircle2 size={18} className="text-[var(--green-500)]" />
              )}
              <h2 className="text-lg font-medium text-[var(--grey-800)]">
                {session.ideaTitle}
              </h2>
            </div>
            <div className="text-sm text-[var(--grey-400)] mt-1">
              {session.chatName} · {session.projectName}
            </div>
            <div className="text-xs text-[var(--grey-400)] mt-1">
              {formattedDate} at {formattedTime}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs px-2 py-1 rounded bg-[var(--grey-50)] text-[var(--grey-600)] font-medium">
              {firstLog.model}
            </span>
            <span className="text-xs text-[var(--grey-400)]">
              {session.logs.length} exchange{session.logs.length > 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Conversation */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs font-semibold text-[var(--grey-600)] uppercase tracking-wider">
            Conversation
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCopy(JSON.stringify(allMessages, null, 2), "messages")}
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

        {/* Unified Conversation */}
        <div className="space-y-3 max-h-[calc(100vh-400px)] overflow-auto pr-2">
          {conversationItems.map((item, idx) => (
            <ConversationItem key={idx} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Types for conversation items
type ConversationItemType = 
  | { type: "message"; role: string; content: string; isResponse?: boolean }
  | { type: "tool_call"; toolName: string; result?: string; generationLogId?: string; projectId?: string }
  | { type: "error"; message: string };

function buildConversation(logs: ChatLogWithRelations[], projectId?: string): ConversationItemType[] {
  const items: ConversationItemType[] = [];
  
  for (const log of logs) {
    const messages = log.messages_sent as Array<{ role: string; content: string }> | null;
    
    if (messages) {
      // Add messages, skipping system messages that are just context
      for (const msg of messages) {
        // Skip system messages (they're just context)
        if (msg.role === "system") continue;
        
        // Skip assistant messages from previous logs (they're duplicated in messages_sent)
        // Only add user messages and tool responses from messages_sent
        if (msg.role === "user" || msg.role === "tool") {
          items.push({ type: "message", role: msg.role, content: msg.content });
        }
      }
    }
    
    // Add tool calls if any
    if (log.tool_calls_made && log.tool_calls_made.length > 0) {
      for (let i = 0; i < log.tool_calls_made.length; i++) {
        const tc = log.tool_calls_made[i];
        const toolName = tc.function?.name || "unknown";
        
        // Get the corresponding generation log ID if this is a generate_script or update_script call
        const toolCallId = tc.id;
        const genLogId = (toolName === "generate_script" || toolName === "update_script") && toolCallId && log.generation_log_ids?.[toolCallId]
          ? log.generation_log_ids[toolCallId]
          : undefined;
        
        items.push({ 
          type: "tool_call", 
          toolName,
          generationLogId: genLogId,
          projectId,
        });
      }
    }
    
    // Add the response
    if (log.response_raw) {
      items.push({ type: "message", role: "assistant", content: log.response_raw, isResponse: true });
    }
    
    // Add error if any
    if (log.error) {
      items.push({ type: "error", message: log.error });
    }
  }
  
  return items;
}

interface ConversationItemProps {
  item: ConversationItemType;
}

function ConversationItem({ item }: ConversationItemProps) {
  if (item.type === "error") {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="text-sm font-medium text-red-800 mb-1">Error</div>
        <pre className="text-xs text-red-700 whitespace-pre-wrap font-mono">
          {item.message}
        </pre>
      </div>
    );
  }
  
  if (item.type === "tool_call") {
    return (
      <div className="flex items-center gap-2 py-2">
        <div className="flex-1 h-px bg-[var(--border)]" />
        <div className="flex items-center gap-2">
          <Wrench size={12} className="text-[var(--green-500)]" />
          <code className="text-xs bg-[var(--green-500)]/10 text-[var(--green-500)] px-2 py-1 rounded font-mono">
            {item.toolName}
          </code>
          {item.generationLogId && (
            <Link
              href={`/logs/tools?logId=${item.generationLogId}${item.projectId ? `&project=${item.projectId}` : ""}`}
              className="inline-flex items-center gap-1 text-xs text-[var(--cyan-600)] hover:underline"
            >
              View log
              <ExternalLink size={10} />
            </Link>
          )}
        </div>
        <div className="flex-1 h-px bg-[var(--border)]" />
      </div>
    );
  }
  
  return <MessageBubble role={item.role} content={item.content} isResponse={item.isResponse} />;
}

const MAX_COLLAPSED_LINES = 8;
const MAX_COLLAPSED_CHARS = 500;

interface MessageBubbleProps {
  role: string;
  content: string;
  isResponse?: boolean;
}

function MessageBubble({ role, content, isResponse }: MessageBubbleProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const isUser = role === "user";
  const isSystem = role === "system";
  const isTool = role === "tool";
  const isAssistant = role === "assistant";

  // Check if content should be truncatable
  const lineCount = content.split('\n').length;
  const isTruncatable = lineCount > MAX_COLLAPSED_LINES || content.length > MAX_COLLAPSED_CHARS;
  
  // Get truncated content
  const getTruncatedContent = () => {
    const lines = content.split('\n');
    if (lines.length > MAX_COLLAPSED_LINES) {
      return lines.slice(0, MAX_COLLAPSED_LINES).join('\n');
    }
    if (content.length > MAX_COLLAPSED_CHARS) {
      return content.slice(0, MAX_COLLAPSED_CHARS);
    }
    return content;
  };

  const displayContent = isExpanded || !isTruncatable ? content : getTruncatedContent();

  const getIcon = () => {
    if (isUser) return <User size={14} />;
    if (isTool) return <Wrench size={14} />;
    return <Bot size={14} />;
  };

  const getRoleLabel = () => {
    if (isUser) return "User";
    if (isSystem) return "System";
    if (isTool) return "Tool Result";
    if (isResponse) return "Assistant";
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
        {isTruncatable && (
          <span className="text-[10px] text-[var(--grey-400)] ml-auto">
            {lineCount} lines
          </span>
        )}
      </div>
      <div className="text-sm text-[var(--grey-800)] whitespace-pre-wrap font-mono leading-relaxed">
        {displayContent}
        {!isExpanded && isTruncatable && (
          <span className="text-[var(--grey-400)]">...</span>
        )}
      </div>
      {isTruncatable && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "mt-2 flex items-center gap-1 text-xs font-medium transition-colors",
            isUser && "text-[#443bf5] hover:text-[#443bf5]/80",
            isSystem && "text-[var(--grey-500)] hover:text-[var(--grey-600)]",
            isTool && "text-amber-700 hover:text-amber-800",
            isAssistant && !isResponse && "text-[var(--grey-500)] hover:text-[var(--grey-600)]",
            isResponse && "text-[var(--cyan-600)] hover:text-[var(--cyan-700)]"
          )}
        >
          {isExpanded ? (
            <>
              <ChevronUp size={14} />
              Show less
            </>
          ) : (
            <>
              <ChevronDown size={14} />
              Show more
            </>
          )}
        </button>
      )}
    </div>
  );
}
