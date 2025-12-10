import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { RedirectToProject } from "@/components/redirect-to-project";
import { LandingHeader } from "@/components/marketing/landing-header";
import { LandingHero } from "@/components/marketing/landing-hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { Features } from "@/components/marketing/features";
import { DescriptCallout } from "@/components/marketing/descript-callout";
import { FinalCta } from "@/components/marketing/final-cta";
import { LandingFooter } from "@/components/marketing/landing-footer";

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If not logged in, show the marketing landing page
  if (!user) {
    return (
      <div className="min-h-screen bg-white">
        <LandingHeader />
        <main>
          <LandingHero />
          <HowItWorks />
          <Features />
          <DescriptCallout />
          <FinalCta />
        </main>
        <LandingFooter />
      </div>
    );
  }

  // Logged in users: redirect to their project
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
