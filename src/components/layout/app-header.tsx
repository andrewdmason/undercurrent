"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { Settings, Users, ScrollText, LogOut, ChevronDown, Plus, Check, Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface Project {
  id: string;
  name: string;
  slug: string;
}

interface AppHeaderProps {
  newCount?: number;
  createCount?: number;
}

export function AppHeader({ newCount = 0, createCount = 0 }: AppHeaderProps) {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);

  const slug = params?.slug as string | undefined;
  
  // Hide header on onboarding pages
  const isOnboarding = pathname?.includes("/onboarding");
  if (isOnboarding) {
    return null;
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function loadProjects() {
      const supabase = createClient();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: projectUsers } = await supabase
        .from("project_users")
        .select("project_id")
        .eq("user_id", user.id);

      if (!projectUsers || projectUsers.length === 0) return;

      const projectIds = projectUsers.map((pu) => pu.project_id);
      
      const { data: projectsData } = await supabase
        .from("projects")
        .select("id, name, slug")
        .in("id", projectIds)
        .order("name");

      if (projectsData) {
        setProjects(projectsData);
        // If we have a slug, find that project; otherwise use first or last used
        if (slug) {
          const current = projectsData.find((p) => p.slug === slug);
          setCurrentProject(current || null);
        } else {
          // Try to get last used project from localStorage, otherwise use first
          const lastSlug = localStorage.getItem("undercurrent:lastProjectSlug");
          const lastProject = projectsData.find((p) => p.slug === lastSlug);
          setCurrentProject(lastProject || projectsData[0] || null);
        }
      }
    }

    loadProjects();
  }, [slug]);

  const handleSelectProject = (project: Project) => {
    localStorage.setItem("undercurrent:lastProjectSlug", project.slug);
    router.push(`/${project.slug}`);
  };

  const handleCreateProject = () => {
    router.push("/create-project");
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  // Navigation tabs - use currentProject slug so they work on all pages
  const navSlug = currentProject?.slug;
  const tabs = navSlug ? [
    {
      name: "New",
      href: `/${navSlug}/new`,
      count: newCount,
      isActive: pathname === `/${navSlug}/new` || pathname === `/${navSlug}`,
      badgeVariant: "strong" as const,
    },
    {
      name: "Create",
      href: `/${navSlug}/create`,
      count: createCount,
      isActive: pathname === `/${navSlug}/create`,
      badgeVariant: "default" as const,
    },
    {
      name: "Published",
      href: `/${navSlug}/published`,
      count: null,
      isActive: pathname === `/${navSlug}/published`,
      badgeVariant: "default" as const,
    },
  ] : [];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--border)] bg-[var(--grey-0)]">
      <div className="flex h-14 items-center px-4 gap-6">
        {/* Logo placeholder */}
        <div className="flex items-center shrink-0">
          <div className="w-8 h-8 rounded-lg bg-[var(--grey-100)] flex items-center justify-center">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              className="text-[var(--grey-400)]"
            >
              <path
                d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Main Navigation */}
        {navSlug && (
          <nav className="flex items-center gap-1">
            {tabs.map((tab) => (
              <Link
                key={tab.name}
                href={tab.href}
                className={cn(
                  "relative flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                  "hover:bg-[var(--grey-50-a)]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan-600)]",
                  tab.isActive
                    ? "text-[var(--grey-800)]"
                    : "text-[var(--grey-400)]"
                )}
              >
                {tab.name}
                {tab.count !== null && tab.count > 0 && (
                  <span
                    className={cn(
                      "inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold tabular-nums",
                      tab.isActive
                        ? tab.badgeVariant === "strong"
                          ? "bg-[#0d7377] text-white"
                          : "bg-[var(--grey-800)] text-white"
                        : tab.badgeVariant === "strong"
                          ? "bg-[#0d7377] text-white"
                          : "bg-[var(--grey-200)] text-[var(--grey-600)]"
                    )}
                  >
                    {tab.count > 99 ? "99+" : tab.count}
                  </span>
                )}
              </Link>
            ))}
          </nav>
        )}

        {/* Project Dropdown - Right aligned */}
        <div className="ml-auto">
          {mounted && currentProject ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 text-sm font-medium">
                  <span className="max-w-[200px] truncate">
                    {currentProject.name}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[220px]">
                <DropdownMenuItem asChild>
                  <Link href={`/${currentProject.slug}/settings`} className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    Project Settings
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuItem asChild>
                  <Link href={`/${currentProject.slug}/team`} className="cursor-pointer">
                    <Users className="mr-2 h-4 w-4" />
                    Manage Team
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Building2 className="mr-2 h-4 w-4" />
                    Switch Project
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-[200px]">
                    {projects.map((project) => (
                      <DropdownMenuItem
                        key={project.id}
                        onClick={() => handleSelectProject(project)}
                        className="cursor-pointer"
                      >
                        <span className="truncate flex-1">{project.name}</span>
                        {project.slug === currentProject.slug && (
                          <Check className="ml-2 h-4 w-4 text-[#007bc2]" />
                        )}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={handleCreateProject}
                      className="cursor-pointer"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Project
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem asChild>
                  <Link href={`/logs/tools?project=${currentProject.id}`} className="cursor-pointer">
                    <ScrollText className="mr-2 h-4 w-4" />
                    AI Logs
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem 
                  onClick={handleSignOut}
                  className="cursor-pointer"
                  variant="destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="ghost" disabled className="gap-2">
              <span className="opacity-50">Loading...</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
