"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface RedirectToProjectProps {
  projectSlugs: string[];
}

export function RedirectToProject({ projectSlugs }: RedirectToProjectProps) {
  const router = useRouter();

  useEffect(() => {
    // Check localStorage for last selected project
    const lastProjectSlug = localStorage.getItem("undercurrent:lastProjectSlug");
    
    // If last project is in the list of user's projects, go there
    if (lastProjectSlug && projectSlugs.includes(lastProjectSlug)) {
      router.replace(`/${lastProjectSlug}`);
    } else {
      // Otherwise, go to the first project and save it
      const firstProjectSlug = projectSlugs[0];
      localStorage.setItem("undercurrent:lastProjectSlug", firstProjectSlug);
      router.replace(`/${firstProjectSlug}`);
    }
  }, [projectSlugs, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-muted-foreground">Loading...</div>
    </div>
  );
}
