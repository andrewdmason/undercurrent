"use client";

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { BusinessTalent } from "@/lib/types";
import {
  createTalent,
  updateTalent,
  deleteTalent,
  uploadTalentImage,
} from "@/lib/actions/talent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Upload, User } from "lucide-react";
import { cn } from "@/lib/utils";

// Simple markdown renderer for bullet points
function renderSimpleMarkdown(text: string) {
  const lines = text.split("\n");
  const result: React.ReactNode[] = [];
  let currentList: string[] = [];

  const flushList = () => {
    if (currentList.length > 0) {
      result.push(
        <ul key={result.length} className="list-disc list-inside space-y-0.5">
          {currentList.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  lines.forEach((line, index) => {
    const bulletMatch = line.match(/^[\*\-]\s+(.+)$/);
    if (bulletMatch) {
      currentList.push(bulletMatch[1]);
    } else {
      flushList();
      if (line.trim()) {
        result.push(
          <p key={index} className={result.length > 0 ? "mt-1" : ""}>
            {line}
          </p>
        );
      }
    }
  });

  flushList();
  return result;
}

// Auto-expanding textarea hook
function useAutoExpandTextarea(value: string, minRows: number = 2, maxHeight: number = 200) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resize = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = "auto";
    const lineHeight = 20; // approximate line height in px
    const minHeight = minRows * lineHeight + 16; // 16px for padding
    const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${newHeight}px`;
    // Enable scrolling if content exceeds max height
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  };

  // Callback ref to resize when textarea is first mounted
  const setRef = (element: HTMLTextAreaElement | null) => {
    textareaRef.current = element;
    if (element) {
      resize(element);
    }
  };

  // Resize when value changes
  useLayoutEffect(() => {
    if (textareaRef.current) {
      resize(textareaRef.current);
    }
  }, [value, minRows, maxHeight]);

  return setRef;
}

interface TalentSectionProps {
  businessId: string;
  talent: BusinessTalent[];
}

export function TalentSection({ businessId, talent }: TalentSectionProps) {
  const [talentList, setTalentList] = useState<BusinessTalent[]>(talent);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAddNew = async () => {
    setIsAdding(true);
  };

  const handleSaveNew = async (data: { name: string; description: string }) => {
    const result = await createTalent(businessId, data);
    if (result.success && result.talent) {
      setTalentList([...talentList, result.talent]);
    }
    setIsAdding(false);
  };

  const handleUpdate = async (
    talentId: string,
    data: { name?: string; description?: string }
  ) => {
    await updateTalent(talentId, businessId, data);
    setTalentList(
      talentList.map((t) => (t.id === talentId ? { ...t, ...data } : t))
    );
  };

  const handleDelete = async (talentId: string) => {
    await deleteTalent(talentId, businessId);
    setTalentList(talentList.filter((t) => t.id !== talentId));
  };

  const handleImageUpload = async (talentId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const result = await uploadTalentImage(businessId, talentId, formData);
    if (result.success && result.imageUrl) {
      setTalentList(
        talentList.map((t) =>
          t.id === talentId ? { ...t, image_url: result.imageUrl! } : t
        )
      );
    }
  };

  return (
    <div className="rounded-lg border border-[var(--border)] bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-[var(--grey-800)]">
            On-Screen Talent
          </h2>
          <p className="text-xs text-[var(--grey-400)] mt-0.5">
            People who appear in your videos
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddNew}
          className="h-8 text-xs"
        >
          <Plus size={14} className="mr-1" />
          Add Talent
        </Button>
      </div>

      <div className="space-y-3">
        {talentList.map((t) => (
          <TalentCard
            key={t.id}
            talent={t}
            isEditing={editingId === t.id}
            onEdit={() => setEditingId(t.id)}
            onCancelEdit={() => setEditingId(null)}
            onUpdate={(data) => handleUpdate(t.id, data)}
            onDelete={() => handleDelete(t.id)}
            onImageUpload={(file) => handleImageUpload(t.id, file)}
          />
        ))}

        {isAdding && (
          <NewTalentForm
            onSave={handleSaveNew}
            onCancel={() => setIsAdding(false)}
          />
        )}

        {talentList.length === 0 && !isAdding && (
          <div className="text-center py-8 text-[var(--grey-400)] text-sm">
            No talent added yet. Add people who appear in your videos.
          </div>
        )}
      </div>
    </div>
  );
}

interface TalentCardProps {
  talent: BusinessTalent;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (data: { name?: string; description?: string }) => void;
  onDelete: () => void;
  onImageUpload: (file: File) => void;
}

function TalentCard({
  talent,
  isEditing,
  onEdit,
  onCancelEdit,
  onUpdate,
  onDelete,
  onImageUpload,
}: TalentCardProps) {
  const [name, setName] = useState(talent.name);
  const [description, setDescription] = useState(talent.description || "");
  const [isUploading, setIsUploading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLDivElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const textareaRef = useAutoExpandTextarea(description);

  // Check if description is truncated
  useEffect(() => {
    const el = descriptionRef.current;
    if (el && !isExpanded) {
      setIsTruncated(el.scrollHeight > el.clientHeight);
    }
  }, [talent.description, isExpanded]);

  const handleSave = () => {
    onUpdate({ name, description: description || undefined });
    onCancelEdit();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    await onImageUpload(file);
    setIsUploading(false);
  };

  if (isEditing) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--grey-50)] p-4">
        <div className="flex gap-4">
          <div
            className="w-16 h-16 rounded-lg bg-black/[0.03] flex items-center justify-center cursor-pointer hover:bg-black/[0.05] transition-colors overflow-hidden flex-shrink-0"
            onClick={() => fileInputRef.current?.click()}
          >
            {talent.image_url ? (
              <img
                src={talent.image_url}
                alt={talent.name}
                className="w-full h-full object-cover"
              />
            ) : isUploading ? (
              <div className="text-xs text-[var(--grey-400)]">...</div>
            ) : (
              <Upload size={16} className="text-[var(--grey-400)]" />
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          <div className="flex-1 space-y-3">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              className="h-8 rounded-lg bg-white border-[var(--border)] focus-visible:ring-2 focus-visible:ring-[#007bc2]"
            />
            <textarea
              ref={textareaRef}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (e.g., Host, Expert, Mascot)"
              className={cn(
                "w-full rounded-lg bg-white border border-[var(--border)] px-3 py-2",
                "text-sm text-[var(--grey-800)] placeholder:text-[var(--grey-400)]",
                "focus:outline-none focus:ring-2 focus:ring-[#007bc2]",
                "resize-none min-h-[56px]"
              )}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} className="h-7 text-xs">
                Save
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancelEdit}
                className="h-7 text-xs"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--grey-50)] p-4 group">
      <div className="flex gap-4">
        <div className="w-16 h-16 rounded-lg bg-black/[0.03] flex items-center justify-center overflow-hidden flex-shrink-0">
          {talent.image_url ? (
            <img
              src={talent.image_url}
              alt={talent.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <User size={24} className="text-[var(--grey-400)]" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-[var(--grey-800)]">
            {talent.name}
          </div>
          {talent.description && (
            <>
              <div
                ref={descriptionRef}
                className={cn(
                  "text-xs text-[var(--grey-400)] mt-1",
                  !isExpanded && "line-clamp-2"
                )}
              >
                {renderSimpleMarkdown(talent.description)}
              </div>
              {isTruncated && !isExpanded && (
                <button
                  onClick={() => setIsExpanded(true)}
                  className="text-xs text-[var(--grey-500)] hover:text-[var(--grey-700)] mt-1 font-medium"
                >
                  More
                </button>
              )}
              {isExpanded && (
                <button
                  onClick={() => setIsExpanded(false)}
                  className="text-xs text-[var(--grey-500)] hover:text-[var(--grey-700)] mt-1 font-medium"
                >
                  Less
                </button>
              )}
            </>
          )}
        </div>

        <div className="flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="h-7 w-7 p-0 text-[var(--grey-400)] hover:text-[var(--grey-800)]"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              <path d="m15 5 4 4" />
            </svg>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="h-7 w-7 p-0 text-[var(--grey-400)] hover:text-[#f72736]"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}

interface NewTalentFormProps {
  onSave: (data: { name: string; description: string }) => void;
  onCancel: () => void;
}

function NewTalentForm({ onSave, onCancel }: NewTalentFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const textareaRef = useAutoExpandTextarea(description);

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), description: description.trim() });
  };

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--grey-50)] p-4">
      <div className="flex gap-4">
        <div className="w-16 h-16 rounded-lg bg-black/[0.03] flex items-center justify-center flex-shrink-0">
          <User size={24} className="text-[var(--grey-400)]" />
        </div>

        <div className="flex-1 space-y-3">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            autoFocus
            className="h-8 rounded-lg bg-white border-[var(--border)] focus-visible:ring-2 focus-visible:ring-[#007bc2]"
          />
          <textarea
            ref={textareaRef}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (e.g., Host, Expert, Mascot)"
            className={cn(
              "w-full rounded-lg bg-white border border-[var(--border)] px-3 py-2",
              "text-sm text-[var(--grey-800)] placeholder:text-[var(--grey-400)]",
              "focus:outline-none focus:ring-2 focus:ring-[#007bc2]",
              "resize-none min-h-[56px]"
            )}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!name.trim()}
              className="h-7 text-xs"
            >
              Add Talent
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="h-7 text-xs"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}



