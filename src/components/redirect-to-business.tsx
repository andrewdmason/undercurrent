"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface RedirectToBusinessProps {
  businessIds: string[];
}

export function RedirectToBusiness({ businessIds }: RedirectToBusinessProps) {
  const router = useRouter();

  useEffect(() => {
    // Check localStorage for last selected business
    const lastBusinessId = localStorage.getItem("undercurrent:lastBusinessId");
    
    // If last business is in the list of user's businesses, go there
    if (lastBusinessId && businessIds.includes(lastBusinessId)) {
      router.replace(`/${lastBusinessId}`);
    } else {
      // Otherwise, go to the first business and save it
      const firstBusinessId = businessIds[0];
      localStorage.setItem("undercurrent:lastBusinessId", firstBusinessId);
      router.replace(`/${firstBusinessId}`);
    }
  }, [businessIds, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-muted-foreground">Loading...</div>
    </div>
  );
}


