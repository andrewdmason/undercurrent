import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { GenerationLog } from "@/lib/types";
import { GenerationLogCard } from "./generation-log-card";

export default async function AdminPage() {
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

  // Fetch recent generation logs with project name
  const { data: logs, error } = await supabase
    .from("generation_logs")
    .select(
      `
      *,
      projects (name)
    `
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Error fetching generation logs:", error);
  }

  const typedLogs = (logs || []) as (GenerationLog & {
    projects: { name: string } | null;
  })[];

  return (
    <div className="min-h-screen bg-[var(--grey-50)]">
      {/* Header */}
      <div className="border-b border-[var(--border)] bg-[var(--grey-0)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div>
            <h1 className="text-xl font-medium text-[var(--grey-800)] tracking-[-0.25px]">
              Admin - Generation Logs
            </h1>
            <p className="text-sm text-[var(--grey-400)] mt-0.5">
              Audit AI-generated content and prompts
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {typedLogs.length === 0 ? (
          <div className="text-center py-12 text-[var(--grey-400)]">
            <p>No generation logs yet.</p>
            <p className="text-sm mt-1">
              Logs will appear here after ideas are generated.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {typedLogs.map((log) => (
              <GenerationLogCard
                key={log.id}
                log={log}
                projectName={log.projects?.name || "Unknown Project"}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
