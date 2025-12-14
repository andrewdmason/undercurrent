import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Project, ProjectRole } from "@/lib/types";

interface SettingsLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    slug: string;
  }>;
}

export default async function SettingsLayout({ children, params }: SettingsLayoutProps) {
  const { slug } = await params;
  const supabase = await createClient();

  // Verify user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    notFound();
  }

  // Get project by slug
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!project) {
    notFound();
  }

  // Verify user has access to this project and get their role
  const { data: membership } = await supabase
    .from("project_members")
    .select("id, role")
    .eq("project_id", project.id)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    notFound();
  }

  const typedProject = project as Project;
  const userRole = (membership.role as ProjectRole) || "member";

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[var(--grey-25)]">
      <div className="flex-1 overflow-y-auto">
        <div className="pb-12">
          {/* Header */}
          <div>
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
              <h1 className="text-xl font-medium text-[var(--grey-800)] tracking-[-0.25px]">
                Project Settings
              </h1>
              <p className="text-sm text-[var(--grey-400)] mt-0.5">
                Manage your project name, permalink, and access
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
            {/* Pass data to children via a wrapper component or directly render */}
            <SettingsContent project={typedProject} userRole={userRole}>
              {children}
            </SettingsContent>
          </div>
        </div>
      </div>
    </div>
  );
}

// Client wrapper to pass data via context
import { SettingsProvider } from "@/components/settings/settings-context";

function SettingsContent({ 
  children, 
  project, 
  userRole 
}: { 
  children: React.ReactNode; 
  project: Project; 
  userRole: ProjectRole;
}) {
  return (
    <SettingsProvider
      project={project}
      characters={[]}
      channels={[]}
      topics={[]}
      templates={[]}
      userRole={userRole}
    >
      {children}
    </SettingsProvider>
  );
}
