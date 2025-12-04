"use client";

import { useRouter, useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { Bookmark } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BusinessSwitcher } from "@/components/business/business-switcher";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function AppHeader() {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const businessId = params?.businessId as string | undefined;
  const isOnSavedPage = pathname?.includes("/saved");

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4">
        <div className="flex items-center gap-4">
          <Link href={businessId ? `/${businessId}` : "/"} className="font-semibold text-lg hover:opacity-80 transition-opacity">
            Undercurrent
          </Link>
          <BusinessSwitcher />
        </div>
        <div className="ml-auto flex items-center gap-2">
          {/* Saved Ideas Link */}
          {businessId && (
            <Link
              href={`/${businessId}/saved`}
              className={cn(
                "inline-flex items-center justify-center w-8 h-8 rounded-md transition-colors",
                "hover:bg-[var(--grey-50-a)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan-600)]",
                isOnSavedPage ? "text-[#1a5eff]" : "text-[var(--grey-400)]"
              )}
              aria-label="Saved ideas"
              title="Saved ideas"
            >
              <Bookmark size={18} className={cn(isOnSavedPage && "fill-current")} />
            </Link>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[160px]">
              <DropdownMenuItem disabled className="text-muted-foreground">
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

