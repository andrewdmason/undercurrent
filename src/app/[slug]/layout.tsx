import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";

interface ProjectLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function ProjectLayout({
  children,
  params,
}: ProjectLayoutProps) {
  const { slug } = await params;
  const supabase = await createClient();

  // Get project by slug
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("slug", slug)
    .single();

  if (!project) {
    notFound();
  }

  // Get counts for tabs
  const [{ count: newCount }, { count: createCount }] = await Promise.all([
    supabase
      .from("ideas")
      .select("*", { count: "exact", head: true })
      .eq("project_id", project.id)
      .eq("status", "new"),
    supabase
      .from("ideas")
      .select("*", { count: "exact", head: true })
      .eq("project_id", project.id)
      .eq("status", "accepted"),
  ]);

  // AppHeader handles its own visibility (hides on onboarding routes)
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <AppHeader 
        newCount={newCount ?? 0} 
        createCount={createCount ?? 0} 
      />
      <main className="flex-1 min-h-0 flex flex-col">{children}</main>
    </div>
  );
}
