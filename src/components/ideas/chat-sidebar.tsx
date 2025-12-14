"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Send, MessageSquare, AlertTriangle, Check, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChatMessage, ChatMessageSkeleton } from "./chat-message";
import { createChat, listChats, getChatMessages, updateChatModel, deleteChat } from "@/lib/actions/chat";
import { ChatModel, IdeaChat, IdeaChatMessage, CHAT_MODELS, MODEL_CONTEXT_LIMITS } from "@/lib/types";

interface ChatSidebarProps {
  ideaId: string;
  projectSlug: string;
  scriptQuestions?: string[];
  onScriptUpdate?: (script: string) => void;
  onIdeaRegenerate?: () => void;
  onToolCallStart?: (toolName: string) => void;
  onToolCallEnd?: (toolName: string) => void;
}

interface StreamingMessage {
  content: string;
  toolCalls?: Array<{
    name: string;
    arguments: Record<string, unknown>;
  }>;
  toolResults?: Array<{
    name: string;
    result: {
      success: boolean;
      message?: string;
      error?: string;
    };
  }>;
  toolCallStartTime?: number;
}

export function ChatSidebar({ ideaId, projectSlug, scriptQuestions, onScriptUpdate, onIdeaRegenerate, onToolCallStart, onToolCallEnd }: ChatSidebarProps) {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // Refs for preventing double-init in React Strict Mode
  const initSentRef = useRef(false);
  const loadingChatsRef = useRef(false);
  const initChatIdRef = useRef<string | null>(null);

  // State
  const [chats, setChats] = useState<IdeaChat[]>([]);
  const [currentChat, setCurrentChat] = useState<IdeaChat | null>(null);
  const [messages, setMessages] = useState<IdeaChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<StreamingMessage | null>(null);
  const [totalTokens, setTotalTokens] = useState(0);

  // Calculate context window warning
  const contextLimit = currentChat ? MODEL_CONTEXT_LIMITS[currentChat.model] : null;
  const isNearContextLimit = contextLimit && totalTokens >= contextLimit.warning;

  // Load chats on mount
  useEffect(() => {
    loadChats();
  }, [ideaId]);

  // Load messages when chat changes
  useEffect(() => {
    if (currentChat) {
      loadMessages(currentChat.id);
    }
  }, [currentChat?.id]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingMessage]);

  // Calculate total tokens when messages change
  useEffect(() => {
    const total = messages.reduce((sum, msg) => sum + (msg.token_count || 0), 0);
    setTotalTokens(total);
  }, [messages]);

  const loadChats = async () => {
    // Prevent concurrent loads (React Strict Mode can double-call useEffect)
    if (loadingChatsRef.current) return;
    loadingChatsRef.current = true;
    
    setIsLoading(true);
    const result = await listChats(ideaId);
    if (result.chats) {
      setChats(result.chats);
      // Select the most recent chat, or create one if none exist
      if (result.chats.length > 0) {
        setCurrentChat(result.chats[result.chats.length - 1]);
      } else {
        // Auto-create first chat
        const newChatResult = await createChat(ideaId);
        if (newChatResult.chat) {
          setChats([newChatResult.chat]);
          setCurrentChat(newChatResult.chat);
        }
      }
    }
    setIsLoading(false);
    loadingChatsRef.current = false;
  };

  const loadMessages = async (chatId: string) => {
    // Skip if this is a stale call from a different chat (strict mode issue)
    if (initChatIdRef.current && initChatIdRef.current !== chatId) {
      return;
    }
    
    const result = await getChatMessages(chatId);
    if (result.messages) {
      setMessages(result.messages);
      
      // If no messages and we haven't sent init yet, send welcome message
      if (result.messages.length === 0 && !initSentRef.current) {
        initSentRef.current = true;
        initChatIdRef.current = chatId;
        sendInitMessage(chatId);
      }
    }
  };
  
  // Send initial welcome message
  const sendInitMessage = async (chatId: string) => {
    setIsSending(true);
    setStreamingMessage({ content: "" });
    
    try {
      const response = await fetch(`/api/chat/${ideaId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId,
          isInit: true,
          scriptQuestions,
          model: currentChat?.model || "gpt-5.1",
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      const decoder = new TextDecoder();
      let streamContent = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = buffer + decoder.decode(value);
        const lines = chunk.split("\n");
        
        if (!chunk.endsWith("\n")) {
          buffer = lines.pop() || "";
        } else {
          buffer = "";
        }
        
        const dataLines = lines.filter((line) => line.startsWith("data: "));

        for (const line of dataLines) {
          const jsonStr = line.slice(6);
          if (!jsonStr) continue;

          try {
            const data = JSON.parse(jsonStr);

            if (data.type === "text") {
              streamContent += data.content;
              setStreamingMessage({ content: streamContent });
            } else if (data.type === "error") {
              throw new Error(data.error);
            }
          } catch (e) {
            if (!(e instanceof SyntaxError)) {
              throw e;
            }
          }
        }
      }

      // Reload messages to get the saved welcome message
      await loadMessages(chatId);
    } catch (error) {
      console.error("Init message error:", error);
      // Don't show error toast for init - it's not user-initiated
    } finally {
      setIsSending(false);
      setStreamingMessage(null);
    }
  };

  const handleClearChat = async () => {
    if (!currentChat) return;
    
    // Delete current chat and create a new one
    const deleteResult = await deleteChat(currentChat.id);
    if (deleteResult.error) {
      toast.error(deleteResult.error);
      return;
    }
    
    const result = await createChat(ideaId, currentChat.model);
    if (result.chat) {
      setChats((prev) => prev.filter(c => c.id !== currentChat.id).concat(result.chat!));
      setCurrentChat(result.chat);
      setMessages([]);
      // Reset init refs so new welcome message can be sent
      initSentRef.current = false;
      initChatIdRef.current = null;
      toast.success("Chat cleared");
    } else if (result.error) {
      toast.error(result.error);
    }
  };

  const handleModelChange = async (model: ChatModel) => {
    if (!currentChat) return;

    const result = await updateChatModel(currentChat.id, model);
    if (result.success) {
      setCurrentChat({ ...currentChat, model });
      setChats((prev) =>
        prev.map((c) => (c.id === currentChat.id ? { ...c, model } : c))
      );
      toast.success(`Switched to ${CHAT_MODELS.find((m) => m.value === model)?.label}`);
    } else if (result.error) {
      toast.error(result.error);
    }
  };

  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || !currentChat || isSending) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    // Maintain focus on input so user can compose next message while AI responds
    inputRef.current?.focus();
    setIsSending(true);

    // Use initChatIdRef if available to ensure we send to the same chat as the welcome message
    const targetChatId = initChatIdRef.current || currentChat.id;

    // Optimistically add user message
    const tempUserMessage: IdeaChatMessage = {
      id: `temp-${Date.now()}`,
      chat_id: targetChatId,
      role: "user",
      content: userMessage,
      tool_calls: null,
      tool_call_id: null,
      token_count: Math.ceil(userMessage.length / 4),
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    // Start streaming
    setStreamingMessage({ content: "" });

    try {
      const response = await fetch(`/api/chat/${ideaId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: targetChatId,
          message: userMessage,
          model: currentChat.model,
          scriptQuestions, // Always pass questions so AI knows what to ask
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      const decoder = new TextDecoder();
      let streamContent = "";
      let toolCallStartTime = 0;
      let buffer = ""; // Buffer for incomplete lines across chunks
      const toolCalls: Array<{ name: string; arguments: Record<string, unknown> }> = [];
      const toolResults: Array<{ name: string; result: { success: boolean; message?: string; error?: string } }> = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Prepend any buffered incomplete line from previous chunk
        const chunk = buffer + decoder.decode(value);
        const lines = chunk.split("\n");
        
        // If chunk doesn't end with newline, last element is incomplete - save for next iteration
        if (!chunk.endsWith("\n")) {
          buffer = lines.pop() || "";
        } else {
          buffer = "";
        }
        
        const dataLines = lines.filter((line) => line.startsWith("data: "));

        for (const line of dataLines) {
          const jsonStr = line.slice(6);
          if (!jsonStr) continue;

          try {
            const data = JSON.parse(jsonStr);

            if (data.type === "text") {
              streamContent += data.content;
              setStreamingMessage((prev) => ({ 
                ...prev, 
                content: streamContent, 
                toolCalls, 
                toolResults 
              }));
            } else if (data.type === "tool_call") {
              toolCalls.push({ name: data.name, arguments: data.arguments });
              // Record when tool call started
              toolCallStartTime = Date.now();
              setStreamingMessage({ 
                content: streamContent, 
                toolCalls, 
                toolResults,
                toolCallStartTime
              });
              // Notify parent that a tool call is starting
              onToolCallStart?.(data.name);
            } else if (data.type === "tool_result") {
              // Ensure tool call indicator shows for at least 800ms
              const minDisplayTime = 800;
              const elapsed = Date.now() - (toolCallStartTime || 0);
              const remaining = Math.max(0, minDisplayTime - elapsed);
              
              // Delay showing the result if needed
              await new Promise(resolve => setTimeout(resolve, remaining));
              
              toolResults.push({ name: data.name, result: data.result });
              setStreamingMessage((prev) => ({ 
                ...prev, 
                content: streamContent, 
                toolCalls, 
                toolResults,
                toolCallStartTime: undefined
              }));
              // Notify parent that tool call ended
              onToolCallEnd?.(data.name);
              
              // Handle successful tool executions
              if (data.result.success) {
                if (data.name === "update_script") {
                  // Find the corresponding tool call to get the script
                  const scriptToolCall = toolCalls.find(tc => tc.name === "update_script");
                  if (scriptToolCall && scriptToolCall.arguments.script) {
                    onScriptUpdate?.(scriptToolCall.arguments.script as string);
                  }
                } else if (data.name === "generate_script") {
                  // Script is returned in the result for generate_script
                  if (data.result.script) {
                    onScriptUpdate?.(data.result.script as string);
                  }
                  router.refresh(); // Refresh to update todos
                } else if (data.name === "regenerate_idea") {
                  onIdeaRegenerate?.();
                  router.refresh();
                }
              }
            } else if (data.type === "error") {
              throw new Error(data.error);
            } else if (data.type === "done") {
              // Streaming complete
            }
          } catch (e) {
            if (e instanceof SyntaxError) {
              console.warn("Failed to parse SSE chunk:", jsonStr);
            } else {
              throw e;
            }
          }
        }
      }

      // Reload messages to get the saved versions
      await loadMessages(targetChatId);
    } catch (error) {
      console.error("Chat error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to send message");
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));
    } finally {
      setIsSending(false);
      setStreamingMessage(null);
      // Keep focus on input so user can continue typing
      inputRef.current?.focus();
    }
  }, [inputValue, currentChat, isSending, ideaId, router, onToolCallStart, onToolCallEnd, onScriptUpdate, onIdeaRegenerate, scriptQuestions]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col min-h-0 rounded-lg border border-[var(--border)] bg-[var(--grey-0)] overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
          <MessageSquare className="h-4 w-4 text-[var(--grey-400)]" />
          <h4 className="text-xs font-semibold text-[var(--grey-600)] uppercase tracking-wider">
            AI Chat
          </h4>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-sm text-[var(--grey-400)]">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 rounded-lg border border-[var(--border)] bg-[var(--grey-0)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-[var(--grey-400)]" />
          <h4 className="text-xs font-semibold text-[var(--grey-600)] uppercase tracking-wider">
            AI Chat
          </h4>
        </div>

        <div className="flex items-center gap-0.5">
          {/* Clear chat button */}
          <button
            onClick={handleClearChat}
            disabled={messages.length === 0 || isSending}
            className={cn(
              "p-1.5 rounded text-[var(--grey-400)] hover:bg-[var(--grey-50)] hover:text-[var(--grey-600)] transition-colors",
              (messages.length === 0 || isSending) && "opacity-50 cursor-not-allowed"
            )}
            title="Clear chat"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>

          {/* Model selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                className="p-1.5 rounded text-[var(--grey-400)] hover:bg-[var(--grey-50)] hover:text-[var(--grey-600)] transition-colors"
                title={`Model: ${CHAT_MODELS.find((m) => m.value === currentChat?.model)?.label || "Select"}`}
              >
                <Settings2 className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[160px]">
              {CHAT_MODELS.map((model) => (
                <DropdownMenuItem
                  key={model.value}
                  onClick={() => handleModelChange(model.value)}
                  className="flex items-center justify-between text-xs"
                >
                  <span>
                    {model.label}
                    <span className="text-[var(--grey-400)] ml-1">({model.provider})</span>
                  </span>
                  {currentChat?.model === model.value && (
                    <Check className="h-3 w-3" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Context window warning */}
      {isNearContextLimit && (
        <div className="px-4 py-2 bg-[#f72736]/10 border-b border-[#f72736]/20">
          <div className="flex items-center gap-2 text-xs text-[#f72736]">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>
              Chat is getting long ({Math.round((totalTokens / contextLimit!.max) * 100)}% of context).
              Consider starting a new chat.
            </span>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-auto p-3 space-y-3">
        {messages.length === 0 && !streamingMessage ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--grey-50)] mb-3">
              <MessageSquare className="h-5 w-5 text-[var(--grey-300)]" />
            </div>
            <p className="text-xs text-[var(--grey-500)] max-w-[180px]">
              Ask me to refine your script, change the hook, add a CTA, or anything else.
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                role={msg.role as "user" | "assistant" | "tool"}
                content={msg.content}
                toolCalls={msg.tool_calls?.map(tc => ({
                  name: tc.function.name,
                  arguments: JSON.parse(tc.function.arguments) as Record<string, unknown>,
                }))}
              />
            ))}
            {streamingMessage && (
              <>
                {streamingMessage.content || streamingMessage.toolCalls?.length ? (
                  <ChatMessage
                    role="assistant"
                    content={streamingMessage.content}
                    toolCalls={streamingMessage.toolCalls}
                    isStreaming={isSending}
                    pendingToolCalls={
                      (streamingMessage.toolCalls?.length || 0) > (streamingMessage.toolResults?.length || 0)
                    }
                  />
                ) : (
                  <ChatMessageSkeleton />
                )}
                {streamingMessage.toolResults?.map((tr, idx) => (
                  <ChatMessage
                    key={`tool-result-${idx}`}
                    role="tool"
                    content=""
                    toolResult={tr}
                  />
                ))}
              </>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-[var(--border)]">
        <div className="flex items-end gap-2 px-3 py-2 rounded-lg bg-[var(--grey-50)] border border-[var(--border)] focus-within:ring-2 focus-within:ring-[var(--cyan-600)] focus-within:border-transparent">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask AI to refine the script..."
            rows={1}
            className="flex-1 bg-transparent text-xs text-[var(--grey-800)] placeholder:text-[var(--grey-400)] outline-none resize-none min-h-[18px] max-h-[100px]"
            style={{ height: "auto" }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = `${Math.min(target.scrollHeight, 100)}px`;
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSend}
            disabled={!inputValue.trim() || isSending}
            className={cn(
              "p-1 h-auto rounded-md",
              inputValue.trim() && !isSending
                ? "text-[var(--grey-800)] hover:bg-[var(--grey-100)]"
                : "text-[var(--grey-300)]"
            )}
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

