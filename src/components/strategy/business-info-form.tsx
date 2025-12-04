"use client";

import { useState, useCallback, useEffect } from "react";
import { Business } from "@/lib/types";
import { updateBusinessInfo } from "@/lib/actions/business";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface BusinessInfoFormProps {
  business: Business;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function BusinessInfoForm({ business }: BusinessInfoFormProps) {
  const [name, setName] = useState(business.name);
  const [url, setUrl] = useState(business.url || "");
  const [description, setDescription] = useState(business.description || "");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  // Debounced save function
  const saveChanges = useCallback(
    async (data: { name?: string; url?: string; description?: string }) => {
      setSaveStatus("saving");
      const result = await updateBusinessInfo(business.id, {
        name: data.name,
        url: data.url || null,
        description: data.description || null,
      });

      if (result.error) {
        setSaveStatus("error");
        setTimeout(() => setSaveStatus("idle"), 3000);
      } else {
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      }
    },
    [business.id]
  );

  // Debounce effect for name
  useEffect(() => {
    if (name === business.name) return;
    const timer = setTimeout(() => {
      saveChanges({ name, url, description });
    }, 800);
    return () => clearTimeout(timer);
  }, [name, url, description, business.name, saveChanges]);

  // Debounce effect for url
  useEffect(() => {
    const originalUrl = business.url || "";
    if (url === originalUrl) return;
    const timer = setTimeout(() => {
      saveChanges({ name, url, description });
    }, 800);
    return () => clearTimeout(timer);
  }, [url, name, description, business.url, saveChanges]);

  // Debounce effect for description
  useEffect(() => {
    const originalDesc = business.description || "";
    if (description === originalDesc) return;
    const timer = setTimeout(() => {
      saveChanges({ name, url, description });
    }, 800);
    return () => clearTimeout(timer);
  }, [description, name, url, business.description, saveChanges]);

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
          <Label htmlFor="name" className="text-xs text-[var(--grey-600)]">
            Business Name
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter business name"
            className="h-8 rounded-lg bg-black/[0.03] border-0 focus-visible:ring-2 focus-visible:ring-[#007bc2]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="url" className="text-xs text-[var(--grey-600)]">
            Website URL
          </Label>
          <Input
            id="url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
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
            placeholder="Describe your business..."
            rows={3}
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


