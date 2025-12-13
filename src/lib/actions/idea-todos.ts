"use server";

import { createClient } from "@/lib/supabase/server";
import { openai, DEFAULT_MODEL } from "@/lib/openai";
import { revalidatePath } from "next/cache";
import { readFile } from "fs/promises";
import path from "path";
import { IdeaTodo, GeneratedTodo } from "@/lib/types";

// Helper to get project slug and revalidate paths
async function revalidateIdeaPaths(ideaId: string) {
  const supabase = await createClient();
  const { data: idea } = await supabase
    .from("ideas")
    .select("project_id, projects(slug)")
    .eq("id", ideaId)
    .single();

  const project = idea?.projects as { slug: string } | null;
  if (project?.slug) {
    revalidatePath(`/${project.slug}`);
    revalidatePath(`/${project.slug}/ideas/${ideaId}`);
  }
  return idea?.project_id;
}

// Get todos for an idea
export async function getIdeaTodos(ideaId: string): Promise<{ data: IdeaTodo[] | null; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("idea_todos")
    .select("*")
    .eq("idea_id", ideaId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching idea todos:", error);
    return { data: null, error: error.message };
  }

  return { data: data as IdeaTodo[], error: null };
}

// Toggle todo completion with optional outcome
export async function toggleTodoComplete(
  todoId: string,
  isComplete: boolean,
  outcome?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get the todo to find idea_id and current details
  const { data: todo, error: fetchError } = await supabase
    .from("idea_todos")
    .select("idea_id, details")
    .eq("id", todoId)
    .single();

  if (fetchError || !todo) {
    return { success: false, error: "Todo not found" };
  }

  // Build updated details with outcome if provided
  let updatedDetails = todo.details;
  if (isComplete && outcome) {
    // Append outcome section to details
    const outcomeSeparator = "\n\n---\n\n";
    const outcomeSection = `## Outcome\n\n${outcome}`;
    updatedDetails = todo.details
      ? `${todo.details}${outcomeSeparator}${outcomeSection}`
      : outcomeSection;
  }

  const { error } = await supabase
    .from("idea_todos")
    .update({
      is_complete: isComplete,
      details: updatedDetails,
      updated_at: new Date().toISOString(),
    })
    .eq("id", todoId);

  if (error) {
    console.error("Error updating todo:", error);
    return { success: false, error: error.message };
  }

  await revalidateIdeaPaths(todo.idea_id);
  return { success: true };
}

// Generate todos for an idea
export async function generateIdeaTodos(
  ideaId: string,
  existingScript?: string | null
): Promise<{ success: boolean; todos?: IdeaTodo[]; error?: string }> {
  const supabase = await createClient();

  // Fetch the idea with all related data
  const { data: idea, error: ideaError } = await supabase
    .from("ideas")
    .select(`
      id,
      title,
      description,
      script,
      project_id,
      idea_characters (
        project_characters (
          name,
          description
        )
      ),
      idea_topics (
        project_topics (
          name,
          description
        )
      ),
      project_templates (
        name,
        description
      )
    `)
    .eq("id", ideaId)
    .single();

  if (ideaError || !idea) {
    console.error("Error fetching idea:", ideaError);
    return { success: false, error: "Idea not found" };
  }

  // Fetch project context
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("name, description")
    .eq("id", idea.project_id)
    .single();

  if (projectError || !project) {
    console.error("Error fetching project:", projectError);
    return { success: false, error: "Project not found" };
  }

  // Extract characters
  const characters = (idea.idea_characters as unknown as Array<{
    project_characters: { name: string; description: string | null } | null;
  }> || [])
    .map(ic => ic.project_characters)
    .filter(Boolean) as Array<{ name: string; description: string | null }>;

  // Extract topics
  const topics = (idea.idea_topics as unknown as Array<{
    project_topics: { name: string; description: string | null } | null;
  }> || [])
    .map(it => it.project_topics)
    .filter(Boolean) as Array<{ name: string; description: string | null }>;

  // Extract template
  const template = idea.project_templates as unknown as { name: string; description: string | null } | null;

  // Use provided script or fall back to idea's script
  const script = existingScript ?? idea.script;

  // Build the prompt from template
  const promptTemplate = await readFile(
    path.join(process.cwd(), "prompts", "generate-idea-todos.md"),
    "utf-8"
  );

  // Format characters section
  const charactersSection =
    characters.length > 0
      ? characters
          .map((c) => `- **${c.name}**: ${c.description || "No description"}`)
          .join("\n")
      : "No specific characters assigned.";

  // Format topics section
  const topicsSection =
    topics.length > 0
      ? topics.map((t) => `- **${t.name}**: ${t.description || ""}`).join("\n")
      : "No specific topics.";

  // Format template section
  const templateSection = template
    ? `**Template:** ${template.name}\n${template.description || ""}`
    : "No specific template assigned.";

  // Format script section
  const scriptSection = script
    ? `**Script:**\n\n${script}`
    : "No script generated yet.";

  // Build the final prompt
  const prompt = promptTemplate
    .replace("{{ideaTitle}}", idea.title || "Untitled")
    .replace("{{ideaDescription}}", idea.description || "No description")
    .replace("{{template}}", templateSection)
    .replace("{{script}}", scriptSection)
    .replace("{{topics}}", topicsSection)
    .replace("{{characters}}", charactersSection)
    .replace("{{projectName}}", project.name || "Unnamed Project")
    .replace("{{projectDescription}}", project.description || "No description provided.");

  try {
    // Call ChatGPT
    const completion = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
    });

    const responseRaw = completion.choices[0]?.message?.content || "";
    const parsed = JSON.parse(responseRaw);

    const generatedTodos: GeneratedTodo[] = parsed.todos || [];

    if (generatedTodos.length === 0) {
      // No todos needed - that's okay
      return { success: true, todos: [] };
    }

    // Convert generated todos to database format
    const todosToInsert = generatedTodos.map((todo, index) => {
      // For script_finalization, store questions as JSON in details
      let details = todo.details || null;
      if (todo.type === "script_finalization" && todo.questions) {
        details = JSON.stringify(todo.questions);
      }

      return {
        idea_id: ideaId,
        type: todo.type,
        title: todo.title,
        details,
        time_estimate_minutes: todo.time_estimate_minutes || null,
        sort_order: index,
      };
    });

    // Delete existing todos and insert new ones
    await supabase.from("idea_todos").delete().eq("idea_id", ideaId);

    const { data: insertedTodos, error: insertError } = await supabase
      .from("idea_todos")
      .insert(todosToInsert)
      .select();

    if (insertError) {
      throw new Error(`Failed to save todos: ${insertError.message}`);
    }

    await revalidateIdeaPaths(ideaId);

    return { success: true, todos: insertedTodos as IdeaTodo[] };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error generating todos:", error);
    return { success: false, error: errorMessage };
  }
}

// Refresh asset todos after script is finalized (adds new ones, doesn't duplicate)
export async function refreshAssetTodos(
  ideaId: string,
  script: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get existing todos
  const { data: existingTodos } = await supabase
    .from("idea_todos")
    .select("*")
    .eq("idea_id", ideaId);

  // Fetch the idea with all related data (same as generateIdeaTodos)
  const { data: idea, error: ideaError } = await supabase
    .from("ideas")
    .select(`
      id,
      title,
      description,
      project_id,
      idea_characters (
        project_characters (
          name,
          description
        )
      ),
      idea_topics (
        project_topics (
          name,
          description
        )
      ),
      project_templates (
        name,
        description
      )
    `)
    .eq("id", ideaId)
    .single();

  if (ideaError || !idea) {
    console.error("Error fetching idea:", ideaError);
    return { success: false, error: "Idea not found" };
  }

  // Fetch project context
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("name, description")
    .eq("id", idea.project_id)
    .single();

  if (projectError || !project) {
    return { success: false, error: "Project not found" };
  }

  // Extract characters
  const characters = (idea.idea_characters as unknown as Array<{
    project_characters: { name: string; description: string | null } | null;
  }> || [])
    .map(ic => ic.project_characters)
    .filter(Boolean) as Array<{ name: string; description: string | null }>;

  // Extract topics
  const topics = (idea.idea_topics as unknown as Array<{
    project_topics: { name: string; description: string | null } | null;
  }> || [])
    .map(it => it.project_topics)
    .filter(Boolean) as Array<{ name: string; description: string | null }>;

  // Extract template
  const template = idea.project_templates as unknown as { name: string; description: string | null } | null;

  // Build a specialized prompt for refreshing asset todos
  const promptTemplate = await readFile(
    path.join(process.cwd(), "prompts", "generate-idea-todos.md"),
    "utf-8"
  );

  // Format sections
  const charactersSection =
    characters.length > 0
      ? characters.map((c) => `- **${c.name}**: ${c.description || "No description"}`).join("\n")
      : "No specific characters assigned.";

  const topicsSection =
    topics.length > 0
      ? topics.map((t) => `- **${t.name}**: ${t.description || ""}`).join("\n")
      : "No specific topics.";

  const templateSection = template
    ? `**Template:** ${template.name}\n${template.description || ""}`
    : "No specific template assigned.";

  // Build the prompt with script
  let prompt = promptTemplate
    .replace("{{ideaTitle}}", idea.title || "Untitled")
    .replace("{{ideaDescription}}", idea.description || "No description")
    .replace("{{template}}", templateSection)
    .replace("{{script}}", `**Script:**\n\n${script}`)
    .replace("{{topics}}", topicsSection)
    .replace("{{characters}}", charactersSection)
    .replace("{{projectName}}", project.name || "Unnamed Project")
    .replace("{{projectDescription}}", project.description || "No description provided.");

  // Add instruction to focus on asset/prep todos only, not script_finalization
  prompt += `\n\n## Additional Context\n\nThe script has already been finalized, so DO NOT include any \`script_finalization\` todos. Focus only on \`asset\` and \`physical_prep\` todos based on the script content.`;

  // Include existing asset todos to avoid duplicates
  const existingAssetTitles = (existingTodos || [])
    .filter(t => t.type === "asset" || t.type === "physical_prep")
    .map(t => t.title);

  if (existingAssetTitles.length > 0) {
    prompt += `\n\nExisting todos (avoid duplicating these):\n${existingAssetTitles.map(t => `- ${t}`).join("\n")}`;
  }

  try {
    const completion = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const responseRaw = completion.choices[0]?.message?.content || "";
    const parsed = JSON.parse(responseRaw);
    const generatedTodos: GeneratedTodo[] = parsed.todos || [];

    // Filter to only asset/physical_prep todos that aren't duplicates
    const newTodos = generatedTodos.filter(
      t => (t.type === "asset" || t.type === "physical_prep") &&
        !existingAssetTitles.includes(t.title)
    );

    if (newTodos.length === 0) {
      return { success: true };
    }

    // Get max sort_order from existing todos
    const maxSortOrder = Math.max(0, ...(existingTodos || []).map(t => t.sort_order));

    const todosToInsert = newTodos.map((todo, index) => ({
      idea_id: ideaId,
      type: todo.type,
      title: todo.title,
      details: todo.details || null,
      time_estimate_minutes: todo.time_estimate_minutes || null,
      sort_order: maxSortOrder + 1 + index,
    }));

    const { error: insertError } = await supabase
      .from("idea_todos")
      .insert(todosToInsert);

    if (insertError) {
      throw new Error(`Failed to save new todos: ${insertError.message}`);
    }

    await revalidateIdeaPaths(ideaId);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error refreshing asset todos:", error);
    return { success: false, error: errorMessage };
  }
}

// Mark the script_finalization todo complete with context summary as outcome
export async function completeScriptFinalization(
  ideaId: string,
  contextSummary: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Find the script_finalization todo for this idea
  const { data: todo, error: fetchError } = await supabase
    .from("idea_todos")
    .select("id, details")
    .eq("idea_id", ideaId)
    .eq("type", "script_finalization")
    .eq("is_complete", false)
    .single();

  if (fetchError || !todo) {
    // No incomplete script_finalization todo - that's okay
    return { success: true };
  }

  // Mark complete with context summary as outcome
  return toggleTodoComplete(todo.id, true, contextSummary);
}
