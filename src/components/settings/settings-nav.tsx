"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface SettingsNavProps {
  slug: string;
}

const tabs = [
  { label: "General", href: "" },
  { label: "Topics", href: "/topics" },
  { label: "Channels", href: "/channels" },
  { label: "Characters", href: "/characters" },
  { label: "Style Templates", href: "/templates" },
];

export function SettingsNav({ slug }: SettingsNavProps) {
  const pathname = usePathname();
  const basePath = `/${slug}/settings`;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-2">
      <div className="h-9 p-1 bg-[var(--grey-50)] rounded-lg inline-flex">
        {tabs.map((tab) => {
          const href = `${basePath}${tab.href}`;
          const isActive = tab.href === ""
            ? pathname === basePath || pathname === `${basePath}/`
            : pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={tab.href}
              href={href}
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
