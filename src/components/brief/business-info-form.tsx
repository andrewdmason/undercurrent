"use client";

import { useState, useCallback, useEffect } from "react";
import { Project } from "@/lib/types";
import { updateProjectInfo } from "@/lib/actions/project";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, normalizeUrl } from "@/lib/utils";

interface BusinessInfoFormProps {
  project: Project;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function BusinessInfoForm({ project }: BusinessInfoFormProps) {
  const [url, setUrl] = useState(project.url || "");
  const [description, setDescription] = useState(project.description || "");
  const [businessObjectives, setBusinessObjectives] = useState(project.business_objectives || "");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  // Debounced save function
  const saveChanges = useCallback(
    async (data: { url?: string; description?: string; business_objectives?: string }) => {
      setSaveStatus("saving");
      const result = await updateProjectInfo(project.id, {
        url: normalizeUrl(data.url || "") || null,
        description: data.description || null,
        business_objectives: data.business_objectives || null,
      });

      if (result.error) {
        setSaveStatus("error");
        setTimeout(() => setSaveStatus("idle"), 3000);
      } else {
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      }
    },
    [project.id]
  );

  // Debounce effect for url
  useEffect(() => {
    const originalUrl = project.url || "";
    if (url === originalUrl) return;
    const timer = setTimeout(() => {
      saveChanges({ url, description, business_objectives: businessObjectives });
    }, 800);
    return () => clearTimeout(timer);
  }, [url, description, businessObjectives, project.url, saveChanges]);

  // Debounce effect for description
  useEffect(() => {
    const originalDesc = project.description || "";
    if (description === originalDesc) return;
    const timer = setTimeout(() => {
      saveChanges({ url, description, business_objectives: businessObjectives });
    }, 800);
    return () => clearTimeout(timer);
  }, [description, url, businessObjectives, project.description, saveChanges]);

  // Debounce effect for business objectives
  useEffect(() => {
    const originalObjectives = project.business_objectives || "";
    if (businessObjectives === originalObjectives) return;
    const timer = setTimeout(() => {
      saveChanges({ url, description, business_objectives: businessObjectives });
    }, 800);
    return () => clearTimeout(timer);
  }, [businessObjectives, url, description, project.business_objectives, saveChanges]);

  return (
    <div className="rounded-lg border border-[var(--border)] bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[var(--grey-800)]">
          Business Info
        </h2>
        <SaveStatusIndicator status={saveStatus} />
      </div>

      <div className="space-y-4">
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
            Business Description
          </Label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your business and what makes it unique..."
            rows={6}
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
            rows={8}
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



