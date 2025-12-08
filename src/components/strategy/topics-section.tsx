"use client";

import { useState } from "react";
import { BusinessTopic } from "@/lib/types";
import { addTopic, updateTopic, deleteTopic } from "@/lib/actions/business";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Ban } from "lucide-react";
import { cn } from "@/lib/utils";

interface TopicsSectionProps {
  businessId: string;
  topics: BusinessTopic[];
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function TopicsSection({
  businessId,
  topics: initialTopics,
}: TopicsSectionProps) {
  const [topics, setTopics] = useState<BusinessTopic[]>(initialTopics);
  const [isAddingIncluded, setIsAddingIncluded] = useState(false);
  const [isAddingExcluded, setIsAddingExcluded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const includedTopics = topics.filter((t) => !t.is_excluded);
  const excludedTopics = topics.filter((t) => t.is_excluded);

  const handleAddTopic = async (data: { name: string; description?: string; is_excluded?: boolean }) => {
    const result = await addTopic(businessId, data);
    if (result.success && result.topic) {
      setTopics([...topics, result.topic]);
    }
    setIsAddingIncluded(false);
    setIsAddingExcluded(false);
  };

  const handleUpdateTopic = async (
    topicId: string,
    data: Partial<BusinessTopic>
  ) => {
    await updateTopic(topicId, data);
    setTopics(topics.map((t) => (t.id === topicId ? { ...t, ...data } : t)));
  };

  const handleDeleteTopic = async (topicId: string) => {
    await deleteTopic(topicId);
    setTopics(topics.filter((t) => t.id !== topicId));
  };

  return (
    <div className="space-y-6">
      {/* Topics to Cover */}
      <div className="rounded-lg border border-[var(--border)] bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-[var(--grey-800)]">
              Topics to Cover
            </h2>
            <p className="text-xs text-[var(--grey-400)] mt-0.5">
              Content topics to inspire idea generation
            </p>
          </div>
          {!isAddingIncluded && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddingIncluded(true)}
              className="h-8 text-xs"
            >
              <Plus size={14} className="mr-1" />
              Add Topic
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {includedTopics.map((topic) => (
            <TopicCard
              key={topic.id}
              topic={topic}
              isEditing={editingId === topic.id}
              onEdit={() => setEditingId(topic.id)}
              onCancelEdit={() => setEditingId(null)}
              onUpdate={(data) => handleUpdateTopic(topic.id, data)}
              onDelete={() => handleDeleteTopic(topic.id)}
            />
          ))}

          {isAddingIncluded && (
            <NewTopicForm
              onSave={(data) => handleAddTopic({ ...data, is_excluded: false })}
              onCancel={() => setIsAddingIncluded(false)}
            />
          )}

          {includedTopics.length === 0 && !isAddingIncluded && (
            <div className="text-center py-8 text-[var(--grey-400)] text-sm">
              No topics added yet. Add content topics to inspire idea generation.
            </div>
          )}
        </div>
      </div>

      {/* Topics to Avoid */}
      <div className="rounded-lg border border-[var(--border)] bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-[var(--grey-800)] flex items-center gap-2">
              <Ban size={14} className="text-[var(--grey-400)]" />
              Topics to Avoid
            </h2>
            <p className="text-xs text-[var(--grey-400)] mt-0.5">
              Topics the AI should not generate ideas about
            </p>
          </div>
          {!isAddingExcluded && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddingExcluded(true)}
              className="h-8 text-xs"
            >
              <Plus size={14} className="mr-1" />
              Add Topic to Avoid
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {excludedTopics.map((topic) => (
            <TopicCard
              key={topic.id}
              topic={topic}
              isEditing={editingId === topic.id}
              onEdit={() => setEditingId(topic.id)}
              onCancelEdit={() => setEditingId(null)}
              onUpdate={(data) => handleUpdateTopic(topic.id, data)}
              onDelete={() => handleDeleteTopic(topic.id)}
              isExcluded
            />
          ))}

          {isAddingExcluded && (
            <NewTopicForm
              onSave={(data) => handleAddTopic({ ...data, is_excluded: true })}
              onCancel={() => setIsAddingExcluded(false)}
              isExcluded
            />
          )}

          {excludedTopics.length === 0 && !isAddingExcluded && (
            <div className="text-center py-8 text-[var(--grey-400)] text-sm">
              No excluded topics. Add topics you want the AI to avoid.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface TopicCardProps {
  topic: BusinessTopic;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (data: Partial<BusinessTopic>) => void;
  onDelete: () => void;
  isExcluded?: boolean;
}

function TopicCard({
  topic,
  isEditing,
  onEdit,
  onCancelEdit,
  onUpdate,
  onDelete,
  isExcluded,
}: TopicCardProps) {
  const [name, setName] = useState(topic.name);
  const [description, setDescription] = useState(topic.description || "");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const handleNameBlur = async () => {
    if (name !== topic.name && name.trim()) {
      setSaveStatus("saving");
      onUpdate({ name: name.trim() });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    }
  };

  const handleDescriptionBlur = async () => {
    if (description !== (topic.description || "")) {
      setSaveStatus("saving");
      onUpdate({ description: description || null });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    }
  };

  if (isEditing) {
    return (
      <div className={cn(
        "rounded-lg border p-4",
        isExcluded 
          ? "border-[var(--border)] bg-[var(--grey-50)]" 
          : "border-[var(--border)] bg-[var(--grey-50)]"
      )}>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-[var(--grey-800)]">
                Edit Topic
              </span>
              <SaveStatusIndicator status={saveStatus} />
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancelEdit}
                className="h-7 text-xs"
              >
                Done
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

          {/* Name input */}
          <div>
            <label className="text-xs text-[var(--grey-600)] mb-1.5 block">
              Topic Name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleNameBlur}
              placeholder={isExcluded ? "e.g., Politics" : "e.g., Upcoming Events"}
              className="h-8 rounded-lg bg-white border-[var(--border)] focus-visible:ring-2 focus-visible:ring-[#007bc2]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-[var(--grey-600)] mb-1.5 block">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleDescriptionBlur}
              placeholder={isExcluded 
                ? "e.g., Avoid anything that could be seen as partisan or divisive..." 
                : "e.g., Visit the website calendar and make videos that promote upcoming events..."}
              rows={3}
              className={cn(
                "w-full rounded-lg bg-white border border-[var(--border)] px-3 py-2",
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

  // Collapsed view
  return (
    <div
      className={cn(
        "rounded-lg border p-4 group cursor-pointer transition-colors",
        isExcluded
          ? "border-[var(--border)] bg-[var(--grey-50)] hover:border-[var(--grey-200)]"
          : "border-[var(--border)] bg-[var(--grey-50)] hover:border-[var(--grey-200)]"
      )}
      onClick={onEdit}
    >
      <div className="flex items-start gap-3">
        {/* Content */}
        <div className="flex-1 min-w-0">
          <span className={cn(
            "text-sm font-medium",
            isExcluded ? "text-[var(--grey-600)]" : "text-[var(--grey-800)]"
          )}>
            {topic.name}
          </span>
          {topic.description && (
            <p className="text-xs text-[var(--grey-400)] mt-0.5 line-clamp-2">
              {topic.description}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="h-7 w-7 p-0 text-[var(--grey-400)] hover:text-[#f72736]"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}

interface NewTopicFormProps {
  onSave: (data: { name: string; description?: string }) => void;
  onCancel: () => void;
  isExcluded?: boolean;
}

function NewTopicForm({ onSave, onCancel, isExcluded }: NewTopicFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = () => {
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
    });
  };

  const canSubmit = name.trim().length > 0;

  return (
    <div className={cn(
      "rounded-lg border p-4",
      isExcluded 
        ? "border-[var(--border)] bg-[var(--grey-50)]" 
        : "border-[var(--border)] bg-[var(--grey-50)]"
    )}>
      <div className="space-y-4">
        {/* Name input */}
        <div>
          <label className="text-xs text-[var(--grey-600)] mb-1.5 block">
            Topic Name
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={isExcluded ? "e.g., Politics" : "e.g., Upcoming Events"}
            autoFocus
            className="h-8 rounded-lg bg-white border-[var(--border)] focus-visible:ring-2 focus-visible:ring-[#007bc2]"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-xs text-[var(--grey-600)] mb-1.5 block">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={isExcluded 
              ? "e.g., Avoid anything that could be seen as partisan or divisive..." 
              : "e.g., Visit the website calendar and make videos that promote upcoming events..."}
            rows={3}
            className={cn(
              "w-full rounded-lg bg-white border border-[var(--border)] px-3 py-2",
              "text-sm text-[var(--grey-800)] placeholder:text-[var(--grey-400)]",
              "focus:outline-none focus:ring-2 focus:ring-[#007bc2]",
              "resize-none"
            )}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="h-7 text-xs"
          >
            {isExcluded ? "Add Topic to Avoid" : "Add Topic"}
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
