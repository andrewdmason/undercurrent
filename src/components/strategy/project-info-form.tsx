"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Project } from "@/lib/types";
import { updateProjectInfo, checkSlugAvailability } from "@/lib/actions/project";
import { generateSlug } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, normalizeUrl } from "@/lib/utils";

interface ProjectInfoFormProps {
  project: Project;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";
type SlugStatus = "idle" | "checking" | "available" | "taken";

export function ProjectInfoForm({ project }: ProjectInfoFormProps) {
  const router = useRouter();
  const [name, setName] = useState(project.name);
  const [slug, setSlug] = useState(project.slug);
  const [url, setUrl] = useState(project.url || "");
  const [description, setDescription] = useState(project.description || "");
  const [businessObjectives, setBusinessObjectives] = useState(project.business_objectives || "");
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
    async (data: { name?: string; slug?: string; url?: string; description?: string; business_objectives?: string }) => {
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
        url: normalizeUrl(data.url || "") || null,
        description: data.description || null,
        business_objectives: data.business_objectives || null,
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
      saveChanges({ name, slug, url, description, business_objectives: businessObjectives });
    }, 800);
    return () => clearTimeout(timer);
  }, [name, slug, url, description, businessObjectives, project.name, saveChanges]);

  // Debounce effect for slug
  useEffect(() => {
    if (slug === project.slug) return;
    if (slugStatus !== "available") return; // Only save when slug is available
    const timer = setTimeout(() => {
      saveChanges({ name, slug, url, description, business_objectives: businessObjectives });
    }, 800);
    return () => clearTimeout(timer);
  }, [slug, name, url, description, businessObjectives, project.slug, slugStatus, saveChanges]);

  // Debounce effect for url
  useEffect(() => {
    const originalUrl = project.url || "";
    if (url === originalUrl) return;
    const timer = setTimeout(() => {
      saveChanges({ name, slug, url, description, business_objectives: businessObjectives });
    }, 800);
    return () => clearTimeout(timer);
  }, [url, name, slug, description, businessObjectives, project.url, saveChanges]);

  // Debounce effect for description
  useEffect(() => {
    const originalDesc = project.description || "";
    if (description === originalDesc) return;
    const timer = setTimeout(() => {
      saveChanges({ name, slug, url, description, business_objectives: businessObjectives });
    }, 800);
    return () => clearTimeout(timer);
  }, [description, name, slug, url, businessObjectives, project.description, saveChanges]);

  // Debounce effect for business objectives
  useEffect(() => {
    const originalObjectives = project.business_objectives || "";
    if (businessObjectives === originalObjectives) return;
    const timer = setTimeout(() => {
      saveChanges({ name, slug, url, description, business_objectives: businessObjectives });
    }, 800);
    return () => clearTimeout(timer);
  }, [businessObjectives, name, slug, url, description, project.business_objectives, saveChanges]);

  return (
    <div className="rounded-lg border border-[var(--border)] bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[var(--grey-800)]">
          Project Info
        </h2>
        <SaveStatusIndicator status={saveStatus} />
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-xs text-[var(--grey-600)]">
            Name
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter project name"
            className="h-8 rounded-lg bg-black/[0.03] border-0 focus-visible:ring-2 focus-visible:ring-[#007bc2]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug" className="text-xs text-[var(--grey-600)]">
            Permalink
          </Label>
          <div className="relative">
            <Input
              id="slug"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="my-project"
              className={cn(
                "h-8 rounded-lg bg-black/[0.03] border-0 focus-visible:ring-2 focus-visible:ring-[#007bc2] pr-8",
                slugError && "ring-2 ring-[#f72736] focus-visible:ring-[#f72736]"
              )}
            />
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
          </div>
          {slugError ? (
            <p className="text-xs text-[#f72736]">{slugError}</p>
          ) : (
            <p className="text-xs text-[var(--grey-400)]">
              Your project URL: undercurrent.app/{slug || "my-project"}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="url" className="text-xs text-[var(--grey-600)]">
            Website URL
          </Label>
          <Input
            id="url"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="example.com"
            className="h-8 rounded-lg bg-black/[0.03] border-0 focus-visible:ring-2 focus-visible:ring-[#007bc2]"
          />
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="description"
            className="text-xs text-[var(--grey-600)]"
          >
            Description
          </Label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your project..."
            rows={3}
            className={cn(
              "w-full rounded-lg bg-black/[0.03] border-0 px-3 py-2",
              "text-sm text-[var(--grey-800)] placeholder:text-[var(--grey-400)]",
              "focus:outline-none focus:ring-2 focus:ring-[#007bc2]",
              "resize-none"
            )}
          />
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="businessObjectives"
            className="text-xs text-[var(--grey-600)]"
          >
            Business Objectives
          </Label>
          <textarea
            id="businessObjectives"
            value={businessObjectives}
            onChange={(e) => setBusinessObjectives(e.target.value)}
            placeholder="What are your goals for video marketing? (e.g., drive sign-ups, increase sales, build brand awareness)&#10;&#10;How will you measure success?&#10;&#10;Who is your target audience?"
            rows={4}
            className={cn(
              "w-full rounded-lg bg-black/[0.03] border-0 px-3 py-2",
              "text-sm text-[var(--grey-800)] placeholder:text-[var(--grey-400)]",
              "focus:outline-none focus:ring-2 focus:ring-[#007bc2]",
              "resize-none"
            )}
          />
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
