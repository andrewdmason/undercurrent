"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Sparkles, MessageSquare } from "lucide-react";

interface LogsTabsProps {
  currentTab: string;
  generationCount: number;
  chatCount: number;
}

export function LogsTabs({ currentTab, generationCount, chatCount }: LogsTabsProps) {
  const tabs = [
    {
      id: "generation",
      label: "Generation Logs",
      icon: Sparkles,
      count: generationCount,
      href: "/logs?tab=generation",
    },
    {
      id: "chat",
      label: "Chat Logs",
      icon: MessageSquare,
      count: chatCount,
      href: "/logs?tab=chat",
    },
  ];

  return (
    <div className="flex gap-1">
      {tabs.map((tab) => {
        const isActive = currentTab === tab.id;
        const Icon = tab.icon;

        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative",
              isActive
                ? "text-[var(--grey-800)]"
                : "text-[var(--grey-400)] hover:text-[var(--grey-600)]"
            )}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
            {tab.count > 0 && (
              <span
                className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full",
                  isActive
                    ? "bg-[var(--grey-800)] text-white"
                    : "bg-[var(--grey-100)] text-[var(--grey-500)]"
                )}
              >
                {tab.count}
              </span>
            )}
            {/* Active indicator */}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--grey-800)]" />
            )}
          </Link>
        );
      })}
    </div>
  );
}

