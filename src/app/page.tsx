import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { RedirectToProject } from "@/components/redirect-to-project";

export default async function HomePage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/login");
  }

  // Get user's projects with their slugs
  const { data: projectUsers } = await supabase
    .from("project_users")
    .select("project_id")
    .eq("user_id", user.id);

  // If no projects, redirect to create one
  if (!projectUsers || projectUsers.length === 0) {
    redirect("/create-project");
  }

  // Get the project slugs
  const projectIds = projectUsers.map((pu) => pu.project_id);
  
  const { data: projects } = await supabase
    .from("projects")
    .select("slug")
    .in("id", projectIds);

  if (!projects || projects.length === 0) {
    redirect("/create-project");
  }

  const projectSlugs = projects.map((p) => p.slug);

  // Use client component to check localStorage and redirect
  return <RedirectToProject projectSlugs={projectSlugs} />;
}
