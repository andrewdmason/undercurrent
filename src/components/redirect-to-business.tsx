"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface RedirectToBusinessProps {
  businessSlugs: string[];
}

export function RedirectToBusiness({ businessSlugs }: RedirectToBusinessProps) {
  const router = useRouter();

  useEffect(() => {
    // Check localStorage for last selected business
    const lastBusinessSlug = localStorage.getItem("undercurrent:lastBusinessSlug");
    
    // If last business is in the list of user's businesses, go there
    if (lastBusinessSlug && businessSlugs.includes(lastBusinessSlug)) {
      router.replace(`/${lastBusinessSlug}`);
    } else {
      // Otherwise, go to the first business and save it
      const firstBusinessSlug = businessSlugs[0];
      localStorage.setItem("undercurrent:lastBusinessSlug", firstBusinessSlug);
      router.replace(`/${firstBusinessSlug}`);
    }
  }, [businessSlugs, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-muted-foreground">Loading...</div>
    </div>
  );
}
