"use client";

import { useState, useCallback, useEffect } from "react";
import { updateContentSources } from "@/lib/actions/business";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContentSourcesSectionProps {
  businessId: string;
  sources: string[];
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function ContentSourcesSection({
  businessId,
  sources: initialSources,
}: ContentSourcesSectionProps) {
  const [sources, setSources] = useState<string[]>(initialSources);
  const [newSource, setNewSource] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  // Save changes to the server
  const saveChanges = useCallback(
    async (updatedSources: string[]) => {
      setSaveStatus("saving");
      const result = await updateContentSources(businessId, updatedSources);

      if (result.error) {
        setSaveStatus("error");
        setTimeout(() => setSaveStatus("idle"), 3000);
      } else {
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      }
    },
    [businessId]
  );

  const handleAddSource = () => {
    if (!newSource.trim()) return;

    const updatedSources = [...sources, newSource.trim()];
    setSources(updatedSources);
    setNewSource("");
    setIsAdding(false);
    saveChanges(updatedSources);
  };

  const handleRemoveSource = (index: number) => {
    const updatedSources = sources.filter((_, i) => i !== index);
    setSources(updatedSources);
    saveChanges(updatedSources);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddSource();
    } else if (e.key === "Escape") {
      setIsAdding(false);
      setNewSource("");
    }
  };

  return (
    <div className="rounded-lg border border-[var(--border)] bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-[var(--grey-800)]">
            Content Inspiration Sources
          </h2>
          <p className="text-xs text-[var(--grey-400)] mt-0.5">
            URLs or topics to inspire idea generation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SaveStatusIndicator status={saveStatus} />
          {!isAdding && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAdding(true)}
              className="h-8 text-xs"
            >
              <Plus size={14} className="mr-1" />
              Add Source
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {/* Source Pills */}
        {sources.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {sources.map((source, index) => (
              <div
                key={index}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5",
                  "bg-[var(--grey-50)] text-sm text-[var(--grey-800)]",
                  "group"
                )}
              >
                <span className="max-w-[200px] truncate">{source}</span>
                <button
                  onClick={() => handleRemoveSource(index)}
                  className={cn(
                    "inline-flex items-center justify-center w-4 h-4 rounded-full",
                    "text-[var(--grey-400)] hover:text-[var(--grey-800)] hover:bg-black/[0.05]",
                    "transition-colors"
                  )}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add new source input */}
        {isAdding && (
          <div className="flex gap-2">
            <Input
              value={newSource}
              onChange={(e) => setNewSource(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter URL or search term..."
              autoFocus
              className="h-8 flex-1 rounded-lg bg-black/[0.03] border-0 focus-visible:ring-2 focus-visible:ring-[#007bc2]"
            />
            <Button
              size="sm"
              onClick={handleAddSource}
              disabled={!newSource.trim()}
              className="h-8 text-xs"
            >
              Add
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsAdding(false);
                setNewSource("");
              }}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
          </div>
        )}

        {/* Empty state */}
        {sources.length === 0 && !isAdding && (
          <div className="text-center py-6 text-[var(--grey-400)] text-sm">
            No sources added yet. Add URLs or topics to inspire idea generation.
          </div>
        )}
      </div>
    </div>
  );
}

function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;

  return (
    <span
      className={cn(
        "text-xs transition-opacity",
        status === "saving" && "text-[var(--grey-400)]",
        status === "saved" && "text-[#00975a]",
        status === "error" && "text-[#f72736]"
      )}
    >
      {status === "saving" && "Saving..."}
      {status === "saved" && "Saved"}
      {status === "error" && "Error saving"}
    </span>
  );
}





