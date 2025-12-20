"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Project, ProjectRole } from "@/lib/types";
import { updateProjectInfo, checkSlugAvailability } from "@/lib/actions/project";
import { generateSlug } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ProjectSettingsFormProps {
  project: Project;
  userRole: ProjectRole;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";
type SlugStatus = "idle" | "checking" | "available" | "taken";

export function ProjectSettingsForm({ project, userRole }: ProjectSettingsFormProps) {
  const router = useRouter();
  const isAdmin = userRole === "admin";
  const [name, setName] = useState(project.name);
  const [slug, setSlug] = useState(project.slug);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [slugStatus, setSlugStatus] = useState<SlugStatus>("idle");
  const [slugError, setSlugError] = useState<string | null>(null);

  // Format slug as user types
  const handleSlugChange = (value: string) => {
    const formatted = generateSlug(value);
    setSlug(formatted);
    setSlugError(null);
    setSlugStatus("idle");
  };

  // Check slug availability when it changes
  useEffect(() => {
    if (slug === project.slug) {
      setSlugStatus("idle");
      return;
    }

    if (!slug) {
      setSlugError("Permalink is required");
      return;
    }

    const timer = setTimeout(async () => {
      setSlugStatus("checking");
      const { available } = await checkSlugAvailability(slug, project.id);
      if (available) {
        setSlugStatus("available");
        setSlugError(null);
      } else {
        setSlugStatus("taken");
        setSlugError("This permalink is already taken");
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [slug, project.slug, project.id]);

  // Debounced save function
  const saveChanges = useCallback(
    async (data: { name?: string; slug?: string }) => {
      // Don't save if slug is taken or empty
      if (data.slug !== project.slug) {
        if (!data.slug || slugStatus === "taken" || slugStatus === "checking") {
          return;
        }
      }

      setSaveStatus("saving");
      const result = await updateProjectInfo(project.id, {
        name: data.name,
        slug: data.slug,
      });

      if (result.error) {
        setSaveStatus("error");
        if (result.error.includes("permalink")) {
          setSlugError(result.error);
        }
        setTimeout(() => setSaveStatus("idle"), 3000);
      } else {
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);

        // If slug changed, redirect to new URL
        if (result.newSlug && result.newSlug !== project.slug) {
          // Update localStorage
          localStorage.setItem("undercurrent:lastProjectSlug", result.newSlug);
          router.push(`/${result.newSlug}/settings`);
        }
      }
    },
    [project.id, project.slug, slugStatus, router]
  );

  // Debounce effect for name
  useEffect(() => {
    if (name === project.name) return;
    const timer = setTimeout(() => {
      saveChanges({ name, slug });
    }, 800);
    return () => clearTimeout(timer);
  }, [name, slug, project.name, saveChanges]);

  // Debounce effect for slug
  useEffect(() => {
    if (slug === project.slug) return;
    if (slugStatus !== "available") return; // Only save when slug is available
    const timer = setTimeout(() => {
      saveChanges({ name, slug });
    }, 800);
    return () => clearTimeout(timer);
  }, [slug, name, project.slug, slugStatus, saveChanges]);

  return (
    <div className="rounded-lg border border-[var(--border)] bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[var(--grey-800)]">
          Project Settings
        </h2>
        <SaveStatusIndicator status={saveStatus} />
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-xs text-[var(--grey-600)]">
            Name
            {!isAdmin && <span className="ml-1 text-[var(--grey-400)]">(admin only)</span>}
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter project name"
            disabled={!isAdmin}
            className={cn(
              "h-8 rounded-lg bg-black/[0.03] border-0 focus-visible:ring-2 focus-visible:ring-[#007bc2]",
              !isAdmin && "opacity-60 cursor-not-allowed"
            )}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug" className="text-xs text-[var(--grey-600)]">
            Permalink
            {!isAdmin && <span className="ml-1 text-[var(--grey-400)]">(admin only)</span>}
          </Label>
          <div className="relative">
            <Input
              id="slug"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="my-project"
              disabled={!isAdmin}
              className={cn(
                "h-8 rounded-lg bg-black/[0.03] border-0 focus-visible:ring-2 focus-visible:ring-[#007bc2] pr-8",
                slugError && "ring-2 ring-[#f72736] focus-visible:ring-[#f72736]",
                !isAdmin && "opacity-60 cursor-not-allowed"
              )}
            />
            {isAdmin && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                {slugStatus === "checking" && (
                  <svg className="h-4 w-4 animate-spin text-[var(--grey-400)]" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {slugStatus === "available" && (
                  <svg className="h-4 w-4 text-[#00975a]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                {slugStatus === "taken" && (
                  <svg className="h-4 w-4 text-[#f72736]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                )}
              </div>
            )}
          </div>
          {slugError ? (
            <p className="text-xs text-[#f72736]">{slugError}</p>
          ) : (
            <p className="text-xs text-[var(--grey-400)]">
              Your project URL: undercurrent.app/{slug || "my-project"}
            </p>
          )}
        </div>
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


