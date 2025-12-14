import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { IdeaTodo } from "@/lib/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ideaId: string }> }
) {
  const { ideaId } = await params;
  const supabase = await createClient();

  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Add artificial delay to simulate slower API
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Fetch todos for the idea
  const { data: todos, error } = await supabase
    .from("idea_todos")
    .select("*")
    .eq("idea_id", ideaId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching prep list:", error);
    return NextResponse.json({ error: "Failed to fetch prep list" }, { status: 500 });
  }

  // Calculate totals
  const totalMinutes = (todos as IdeaTodo[]).reduce(
    (sum, todo) => sum + (todo.time_estimate_minutes || 0),
    0
  );
  const remainingMinutes = (todos as IdeaTodo[])
    .filter(todo => !todo.is_complete)
    .reduce((sum, todo) => sum + (todo.time_estimate_minutes || 0), 0);

  return NextResponse.json({
    todos: todos as IdeaTodo[],
    totalMinutes,
    remainingMinutes,
  });
}
