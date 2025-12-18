"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Tool Calls", href: "/logs/tools" },
  { label: "Chat Logs", href: "/logs/chat" },
];

export function LogsNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project");
  const projectParam = projectId ? `?project=${projectId}` : "";

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-2">
      <div className="h-9 p-1 bg-[var(--grey-50)] rounded-lg inline-flex">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`);

          return (
            <Link
              key={tab.href}
              href={`${tab.href}${projectParam}`}
              className={cn(
                "rounded-md px-3 text-sm font-medium inline-flex items-center justify-center",
                isActive
                  ? "bg-white text-[var(--grey-800)] shadow-sm"
                  : "text-[var(--grey-400)] hover:text-[var(--grey-600)]"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}



