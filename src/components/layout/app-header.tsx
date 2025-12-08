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

interface Business {
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
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [currentBusiness, setCurrentBusiness] = useState<Business | null>(null);

  const slug = params?.slug as string | undefined;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function loadBusinesses() {
      const supabase = createClient();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: businessUsers } = await supabase
        .from("business_users")
        .select("business_id")
        .eq("user_id", user.id);

      if (!businessUsers || businessUsers.length === 0) return;

      const businessIds = businessUsers.map((bu) => bu.business_id);
      
      const { data: businessesData } = await supabase
        .from("businesses")
        .select("id, name, slug")
        .in("id", businessIds)
        .order("name");

      if (businessesData) {
        setBusinesses(businessesData);
        // If we have a slug, find that business; otherwise use first or last used
        if (slug) {
          const current = businessesData.find((b) => b.slug === slug);
          setCurrentBusiness(current || null);
        } else {
          // Try to get last used business from localStorage, otherwise use first
          const lastSlug = localStorage.getItem("undercurrent:lastBusinessSlug");
          const lastBusiness = businessesData.find((b) => b.slug === lastSlug);
          setCurrentBusiness(lastBusiness || businessesData[0] || null);
        }
      }
    }

    loadBusinesses();
  }, [slug]);

  const handleSelectBusiness = (business: Business) => {
    localStorage.setItem("undercurrent:lastBusinessSlug", business.slug);
    router.push(`/${business.slug}`);
  };

  const handleCreateBusiness = () => {
    router.push("/create-business");
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  // Navigation tabs - use currentBusiness slug so they work on all pages
  const navSlug = currentBusiness?.slug;
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

        {/* Business Dropdown - Right aligned */}
        <div className="ml-auto">
          {mounted && currentBusiness ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 text-sm font-medium">
                  <span className="max-w-[200px] truncate">
                    {currentBusiness.name}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[220px]">
                <DropdownMenuItem 
                  onClick={() => router.push(`/${currentBusiness.slug}/strategy`)}
                  className="cursor-pointer"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Project Settings
                </DropdownMenuItem>
                
                <DropdownMenuItem 
                  onClick={() => router.push(`/${currentBusiness.slug}/team`)}
                  className="cursor-pointer"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Manage Team
                </DropdownMenuItem>
                
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Building2 className="mr-2 h-4 w-4" />
                    Switch Project
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-[200px]">
                    {businesses.map((business) => (
                      <DropdownMenuItem
                        key={business.id}
                        onClick={() => handleSelectBusiness(business)}
                        className="cursor-pointer"
                      >
                        <span className="truncate flex-1">{business.name}</span>
                        {business.slug === currentBusiness.slug && (
                          <Check className="ml-2 h-4 w-4 text-[#007bc2]" />
                        )}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={handleCreateBusiness}
                      className="cursor-pointer"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Business
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem 
                  onClick={() => router.push("/logs")}
                  className="cursor-pointer"
                >
                  <ScrollText className="mr-2 h-4 w-4" />
                  Generation Logs
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
