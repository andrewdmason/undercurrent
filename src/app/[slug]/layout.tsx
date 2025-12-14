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

  // Get count of new ideas awaiting review (not accepted, not rejected)
  const { count: newIdeasCount } = await supabase
    .from("ideas")
    .select("*", { count: "exact", head: true })
    .eq("project_id", project.id)
    .is("accepted_at", null)
    .is("reject_reason", null);

  // AppHeader handles its own visibility (hides on onboarding routes)
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <AppHeader ideasCount={newIdeasCount ?? 0} />
      <main className="flex-1 min-h-0 flex flex-col">{children}</main>
    </div>
  );
}
