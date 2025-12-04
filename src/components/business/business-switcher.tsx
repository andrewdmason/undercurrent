"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Business {
  id: string;
  name: string;
}

export function BusinessSwitcher() {
  const router = useRouter();
  const params = useParams();
  const currentBusinessId = params.businessId as string;
  
  const [mounted, setMounted] = useState(false);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [currentBusiness, setCurrentBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function loadBusinesses() {
      const supabase = createClient();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all businesses the user belongs to
      const { data: businessUsers } = await supabase
        .from("business_users")
        .select("business_id")
        .eq("user_id", user.id);

      if (!businessUsers || businessUsers.length === 0) {
        setLoading(false);
        return;
      }

      const businessIds = businessUsers.map((bu) => bu.business_id);
      
      const { data: businessesData } = await supabase
        .from("businesses")
        .select("id, name")
        .in("id", businessIds)
        .order("name");

      if (businessesData) {
        setBusinesses(businessesData);
        const current = businessesData.find((b) => b.id === currentBusinessId);
        setCurrentBusiness(current || null);
      }
      
      setLoading(false);
    }

    loadBusinesses();
  }, [currentBusinessId]);

  const handleSelectBusiness = (business: Business) => {
    // Store as last selected
    localStorage.setItem("undercurrent:lastBusinessId", business.id);
    router.push(`/${business.id}`);
  };

  const handleCreateNew = () => {
    router.push("/create-business");
  };

  if (!mounted || loading) {
    return (
      <Button variant="ghost" disabled className="min-w-[120px]">
        Loading...
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2">
          <span className="max-w-[200px] truncate font-medium">
            {currentBusiness?.name || "Select business"}
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="opacity-50"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[200px]">
        <DropdownMenuLabel>Your businesses</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {businesses.map((business) => (
          <DropdownMenuItem
            key={business.id}
            onClick={() => handleSelectBusiness(business)}
            className="cursor-pointer"
          >
            <span className="truncate">{business.name}</span>
            {business.id === currentBusinessId && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="ml-auto"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleCreateNew} className="cursor-pointer">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2"
          >
            <path d="M5 12h14" />
            <path d="M12 5v14" />
          </svg>
          Add business
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


