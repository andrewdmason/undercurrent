"use client";

import { ChatPanel } from "./chat-panel";

interface ChatSidebarProps {
  ideaId: string;
  projectSlug: string;
  onScriptUpdate?: (script: string) => void;
  onIdeaRegenerate?: () => void;
  onToolCallStart?: (toolName: string) => void;
  onToolCallEnd?: (toolName: string) => void;
}

export function ChatSidebar({
  ideaId,
  projectSlug,
  onScriptUpdate,
  onIdeaRegenerate,
  onToolCallStart,
  onToolCallEnd,
}: ChatSidebarProps) {
  return (
    <ChatPanel
      ideaId={ideaId}
      projectSlug={projectSlug}
      mode="refinement"
      variant="sidebar"
      onScriptUpdate={onScriptUpdate}
      onIdeaRegenerate={onIdeaRegenerate}
      onToolCallStart={onToolCallStart}
      onToolCallEnd={onToolCallEnd}
    />
  );
}
