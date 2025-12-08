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
  MessageSquare,
} from "lucide-react";
import { ChatLog } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ChatLogCardProps {
  log: ChatLog & {
    businesses?: { name: string } | null;
    idea_chats?: { name: string; ideas?: { title: string } | null } | null;
  };
}

export function ChatLogCard({ log }: ChatLogCardProps) {
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

  const hasError = !!log.error;
  const businessName = log.businesses?.name || "Unknown Business";
  const chatName = log.idea_chats?.name || "Unknown Chat";
  const ideaTitle = log.idea_chats?.ideas?.title || "Unknown Idea";

  const handleCopy = async (content: string, fieldName: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const openDialog = (title: string, content: string) => {
    setDialogContent({ title, content });
  };

  // Parse messages for display
  const messagesSent = log.messages_sent as Array<{ role: string; content: string }> | null;
  const messageCount = messagesSent?.length || 0;

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
              <div className="text-sm font-medium text-[var(--grey-800)] flex items-center gap-2">
                <MessageSquare size={14} className="text-[var(--grey-400)]" />
                {ideaTitle}
                <span className="text-[var(--grey-400)] font-normal">· {chatName}</span>
              </div>
              <div className="text-xs text-[var(--grey-400)]">
                {businessName} · {formattedDate} at {formattedTime} · {log.model}
                {hasError ? (
                  <span className="text-[var(--red-500)]"> · Failed</span>
                ) : (
                  <>
                    {log.input_tokens && log.output_tokens && (
                      <span> · {log.input_tokens + log.output_tokens} tokens</span>
                    )}
                    {log.tool_calls_made && log.tool_calls_made.length > 0 && (
                      <span className="text-[var(--green-500)]"> · {log.tool_calls_made.length} tool calls</span>
                    )}
                  </>
                )}
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

            {/* Messages sent */}
            {messagesSent && messagesSent.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-medium text-[var(--grey-600)]">
                    Messages Sent ({messageCount})
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(JSON.stringify(messagesSent, null, 2), "messages")}
                      className="h-6 w-6 p-0"
                      title={copiedField === "messages" ? "Copied" : "Copy"}
                    >
                      {copiedField === "messages" ? <Check size={14} /> : <Copy size={14} />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDialog("Messages Sent", JSON.stringify(messagesSent, null, 2))}
                      className="h-6 w-6 p-0"
                      title="Expand"
                    >
                      <Expand size={14} />
                    </Button>
                  </div>
                </div>
                <div className="bg-[var(--grey-50)] rounded-lg p-3 max-h-48 overflow-auto">
                  <div className="space-y-2">
                    {messagesSent.slice(-3).map((msg, idx) => (
                      <div key={idx} className="text-xs">
                        <span className="font-medium text-[var(--grey-600)]">{msg.role}:</span>
                        <span className="text-[var(--grey-500)] ml-1">
                          {msg.content.slice(0, 100)}
                          {msg.content.length > 100 && "..."}
                        </span>
                      </div>
                    ))}
                    {messagesSent.length > 3 && (
                      <div className="text-xs text-[var(--grey-400)]">
                        + {messagesSent.length - 3} more messages
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Response */}
            {log.response_raw && (
              <TextSection
                title="Response"
                content={log.response_raw}
                onExpand={() => openDialog("Response", log.response_raw!)}
                onCopy={() => handleCopy(log.response_raw!, "response")}
                isCopied={copiedField === "response"}
              />
            )}

            {/* Tool calls */}
            {log.tool_calls_made && log.tool_calls_made.length > 0 && (
              <div>
                <div className="text-xs font-medium text-[var(--grey-600)] mb-2">
                  Tool Calls
                </div>
                <div className="flex flex-wrap gap-2">
                  {log.tool_calls_made.map((tc, idx) => (
                    <code
                      key={idx}
                      className="text-xs bg-[var(--grey-50)] px-2 py-1 rounded text-[var(--grey-600)] font-mono"
                    >
                      {tc.function?.name || "unknown"}
                    </code>
                  ))}
                </div>
              </div>
            )}

            {/* Token usage */}
            {(log.input_tokens || log.output_tokens) && (
              <div className="flex gap-4 text-xs text-[var(--grey-500)]">
                {log.input_tokens && <span>Input: {log.input_tokens} tokens</span>}
                {log.output_tokens && <span>Output: {log.output_tokens} tokens</span>}
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
          {content.slice(0, 500)}
          {content.length > 500 && "..."}
        </pre>
      </div>
    </div>
  );
}

