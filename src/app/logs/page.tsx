import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { GenerationLog, ChatLog } from "@/lib/types";
import { GenerationLogCard } from "./generation-log-card";
import { ChatLogsView } from "./chat-logs-view";
import { AppHeader } from "@/components/layout/app-header";
import { LogsTabs } from "./logs-tabs";

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; logId?: string }>;
}) {
  const { tab = "generation", logId } = await searchParams;
  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // Verify user is an app admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    redirect("/");
  }

  // Fetch generation logs with project name
  const { data: generationLogs, error: genError } = await supabase
    .from("generation_logs")
    .select(
      `
      *,
      projects (name)
    `
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (genError) {
    console.error("Error fetching generation logs:", genError);
  }

  // Fetch chat logs with related data
  const { data: chatLogs, error: chatError } = await supabase
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
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (chatError) {
    console.error("Error fetching chat logs:", chatError);
  }

  const typedGenerationLogs = (generationLogs || []) as (GenerationLog & {
    projects: { name: string } | null;
  })[];

  const typedChatLogs = (chatLogs || []) as (ChatLog & {
    projects: { name: string } | null;
    idea_chats: { name: string; ideas: { title: string } | null } | null;
  })[];

  return (
    <div className="min-h-screen bg-[var(--grey-50)] flex flex-col">
      <AppHeader />
      
      {/* Page Header */}
      <div className="border-b border-[var(--border)] bg-[var(--grey-0)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div>
            <h1 className="text-xl font-medium text-[var(--grey-800)] tracking-[-0.25px]">
              AI Logs
            </h1>
            <p className="text-sm text-[var(--grey-400)] mt-0.5">
              Audit AI-generated content, prompts, and conversations
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--border)] bg-[var(--grey-0)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <LogsTabs 
            currentTab={tab} 
            generationCount={typedGenerationLogs.length}
            chatCount={typedChatLogs.length}
          />
        </div>
      </div>

      {/* Content */}
      <div className={tab === "chat" ? "max-w-7xl mx-auto px-4 sm:px-6 py-6" : "max-w-6xl mx-auto px-4 sm:px-6 py-6"}>
        {tab === "generation" ? (
          // Generation Logs
          typedGenerationLogs.length === 0 ? (
            <div className="text-center py-12 text-[var(--grey-400)]">
              <p>No generation logs yet.</p>
              <p className="text-sm mt-1">
                Logs will appear here after ideas are generated.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {typedGenerationLogs.map((log) => (
                <GenerationLogCard
                  key={log.id}
                  log={log}
                  projectName={log.projects?.name || "Unknown Project"}
                />
              ))}
            </div>
          )
        ) : (
          // Chat Logs - Detail View
          <ChatLogsView logs={typedChatLogs} initialLogId={logId} />
        )}
      </div>
    </div>
  );
}
