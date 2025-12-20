import { createClient } from "@/lib/supabase/server";
import { GenerationLog } from "@/lib/types";
import { ToolCallsView } from "../tool-calls-view";

export default async function ToolCallsPage({
  searchParams,
}: {
  searchParams: Promise<{ logId?: string; project?: string }>;
}) {
  const { logId, project: projectId } = await searchParams;
  const supabase = await createClient();

  // Fetch generation logs with project name and idea title (filtered by project if provided)
  let genQuery = supabase
    .from("generation_logs")
    .select(
      `
      *,
      projects (name),
      ideas (title)
    `
    );
  
  if (projectId) {
    genQuery = genQuery.eq("project_id", projectId);
  }
  
  const { data: generationLogs, error: genError } = await genQuery
    .order("created_at", { ascending: false })
    .limit(50);

  if (genError) {
    console.error("Error fetching generation logs:", genError);
  }

  const typedGenerationLogs = (generationLogs || []) as (GenerationLog & {
    projects: { name: string } | null;
    ideas: { title: string } | null;
  })[];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <ToolCallsView logs={typedGenerationLogs} initialLogId={logId} />
    </div>
  );
}



