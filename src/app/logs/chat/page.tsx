import { createClient } from "@/lib/supabase/server";
import { ChatLog } from "@/lib/types";
import { ChatLogsView } from "../chat-logs-view";

export default async function ChatLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ chatId?: string; project?: string }>;
}) {
  const { chatId, project: projectId } = await searchParams;
  const supabase = await createClient();

  // Fetch chat logs with related data (filtered by project if provided)
  let chatQuery = supabase
    .from("chat_logs")
    .select(
      `
      *,
      projects (name),
      idea_chats (
        name,
        ideas (title)
      )
    `
    );
  
  if (projectId) {
    chatQuery = chatQuery.eq("project_id", projectId);
  }
  
  const { data: chatLogs, error: chatError } = await chatQuery
    .order("created_at", { ascending: false })
    .limit(50);

  if (chatError) {
    console.error("Error fetching chat logs:", chatError);
  }

  const typedChatLogs = (chatLogs || []) as (ChatLog & {
    projects: { name: string } | null;
    idea_chats: { name: string; ideas: { title: string } | null } | null;
  })[];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <ChatLogsView logs={typedChatLogs} initialChatId={chatId} projectId={projectId} />
    </div>
  );
}

