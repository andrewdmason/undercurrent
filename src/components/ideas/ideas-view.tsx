"use client";

import { useEffect, useState } from "react";
import { LayoutGrid, Columns3 } from "lucide-react";
import { IdeasFeed } from "./ideas-feed";
import { StatusColumns } from "./status-columns";
import { IdeaWithChannels } from "@/lib/types";

export type ViewMode = "grid" | "columns";

const STORAGE_KEY = "ideas-view-mode";

interface IdeasViewProps {
  ideas: IdeaWithChannels[];
  projectId: string;
  projectSlug: string;
}

export function IdeasView({ ideas, projectId, projectSlug }: IdeasViewProps) {
  const [currentView, setCurrentView] = useState<ViewMode>("grid");
  const [mounted, setMounted] = useState(false);

  // Load preference from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ViewMode | null;
    if (stored === "grid" || stored === "columns") {
      setCurrentView(stored);
    }
    setMounted(true);

    // Listen for view changes from ViewToggle
    const handleViewChange = (e: CustomEvent<ViewMode>) => {
      setCurrentView(e.detail);
    };
    window.addEventListener("ideas-view-change", handleViewChange as EventListener);
    return () => {
      window.removeEventListener("ideas-view-change", handleViewChange as EventListener);
    };
  }, []);

  // Avoid hydration mismatch by showing grid view during SSR
  const displayView = mounted ? currentView : "grid";

  return (
    <>
      {displayView === "columns" ? (
        <StatusColumns ideas={ideas} projectSlug={projectSlug} />
      ) : (
        <IdeasFeed ideas={ideas} projectId={projectId} projectSlug={projectSlug} viewType="queue" />
      )}
    </>
  );
}

export function ViewToggle() {
  const [currentView, setCurrentView] = useState<ViewMode>("grid");
  const [mounted, setMounted] = useState(false);

  // Load preference from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ViewMode | null;
    if (stored === "grid" || stored === "columns") {
      setCurrentView(stored);
    }
    setMounted(true);
  }, []);

  const setView = (view: ViewMode) => {
    setCurrentView(view);
    localStorage.setItem(STORAGE_KEY, view);
    // Dispatch custom event so IdeasView can update
    window.dispatchEvent(new CustomEvent("ideas-view-change", { detail: view }));
  };

  // Avoid hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div className="flex items-center bg-[var(--grey-50)] rounded-lg p-0.5">
        <div className="w-8 h-8" />
        <div className="w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="flex items-center bg-[var(--grey-50)] rounded-lg p-0.5">
      <button
        onClick={() => setView("grid")}
        className={`flex items-center justify-center w-8 h-8 rounded-md transition-colors ${
          currentView === "grid"
            ? "bg-white text-[var(--grey-800)] shadow-sm"
            : "text-[var(--grey-400)] hover:text-[var(--grey-600)]"
        }`}
        title="Grid view"
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
      <button
        onClick={() => setView("columns")}
        className={`flex items-center justify-center w-8 h-8 rounded-md transition-colors ${
          currentView === "columns"
            ? "bg-white text-[var(--grey-800)] shadow-sm"
            : "text-[var(--grey-400)] hover:text-[var(--grey-600)]"
        }`}
        title="Column view"
      >
        <Columns3 className="h-4 w-4" />
      </button>
    </div>
  );
}
