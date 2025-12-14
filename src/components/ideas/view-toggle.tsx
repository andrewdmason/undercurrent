"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, Columns3 } from "lucide-react";

export type ViewMode = "kanban" | "grid";

interface ViewToggleProps {
  currentView: ViewMode;
}

export function ViewToggle({ currentView }: ViewToggleProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const setView = (view: ViewMode) => {
    const params = new URLSearchParams(searchParams.toString());
    if (view === "kanban") {
      // Kanban is default, so remove param
      params.delete("view");
    } else {
      params.set("view", view);
    }
    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--grey-0)] p-0.5">
      <button
        onClick={() => setView("kanban")}
        className={`flex items-center justify-center w-8 h-8 rounded-md transition-colors ${
          currentView === "kanban"
            ? "bg-[var(--grey-50)] text-[var(--grey-800)]"
            : "text-[var(--grey-400)] hover:text-[var(--grey-800)]"
        }`}
        aria-label="Kanban view"
        title="Kanban view"
      >
        <Columns3 className="w-4 h-4" />
      </button>
      <button
        onClick={() => setView("grid")}
        className={`flex items-center justify-center w-8 h-8 rounded-md transition-colors ${
          currentView === "grid"
            ? "bg-[var(--grey-50)] text-[var(--grey-800)]"
            : "text-[var(--grey-400)] hover:text-[var(--grey-800)]"
        }`}
        aria-label="Grid view"
        title="Grid view"
      >
        <LayoutGrid className="w-4 h-4" />
      </button>
    </div>
  );
}

