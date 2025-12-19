"use client";

import { useState, useEffect, useRef } from "react";
import { useOnboarding } from "./onboarding-context";
import { updateProjectInfo, addTopic, deleteTopic } from "@/lib/actions/project";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  SkipForward,
  Sparkles,
  Plus,
  Trash2,
  Pencil,
  X,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TopicItem {
  id?: string; // Only set for saved topics
  name: string;
  description: string;
  isEditing?: boolean;
}

export function TopicsStep() {
  const { project, topics, setTopics, goNext, goBack } = useOnboarding();

  // Content strategy state
  const [contentStrategy, setContentStrategy] = useState(project.content_preferences || "");
  const [topicsToInclude, setTopicsToInclude] = useState<TopicItem[]>([]);
  const [topicsToAvoid, setTopicsToAvoid] = useState<TopicItem[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const hasStartedGeneration = useRef(false);

  // Initialize from existing topics if available
  useEffect(() => {
    if (topics.length > 0 || project.content_preferences) {
      // Already have data, don't auto-generate
      const included = topics
        .filter((t) => !t.is_excluded)
        .map((t) => ({ id: t.id, name: t.name, description: t.description || "" }));
      const excluded = topics
        .filter((t) => t.is_excluded)
        .map((t) => ({ id: t.id, name: t.name, description: t.description || "" }));

      setTopicsToInclude(included);
      setTopicsToAvoid(excluded);
      setHasGenerated(true);
    }
  }, []);

  // Auto-generate on mount if no existing data
  useEffect(() => {
    if (!hasStartedGeneration.current && !project.content_preferences && topics.length === 0) {
      hasStartedGeneration.current = true;
      generateContentStrategy();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateContentStrategy = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/onboarding/generate-content-strategy/${project.id}`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to generate content strategy");
      }

      const data = await response.json();
      if (data.contentStrategy) {
        setContentStrategy(data.contentStrategy);
      }
      if (data.topicsToInclude) {
        setTopicsToInclude(data.topicsToInclude.map((t: TopicItem) => ({ ...t, id: undefined })));
      }
      if (data.topicsToAvoid) {
        setTopicsToAvoid(data.topicsToAvoid.map((t: TopicItem) => ({ ...t, id: undefined })));
      }
    } catch (error) {
      console.error("Failed to generate content strategy:", error);
    } finally {
      setIsLoading(false);
      setHasGenerated(true);
    }
  };

  // Topic editing functions
  const handleAddTopic = (isExcluded: boolean) => {
    const newTopic: TopicItem = { name: "", description: "", isEditing: true };
    if (isExcluded) {
      setTopicsToAvoid([...topicsToAvoid, newTopic]);
    } else {
      setTopicsToInclude([...topicsToInclude, newTopic]);
    }
  };

  const handleUpdateTopic = (
    isExcluded: boolean,
    index: number,
    field: "name" | "description",
    value: string
  ) => {
    if (isExcluded) {
      const updated = [...topicsToAvoid];
      updated[index] = { ...updated[index], [field]: value };
      setTopicsToAvoid(updated);
    } else {
      const updated = [...topicsToInclude];
      updated[index] = { ...updated[index], [field]: value };
      setTopicsToInclude(updated);
    }
  };

  const handleToggleEdit = (isExcluded: boolean, index: number) => {
    if (isExcluded) {
      const updated = [...topicsToAvoid];
      updated[index] = { ...updated[index], isEditing: !updated[index].isEditing };
      setTopicsToAvoid(updated);
    } else {
      const updated = [...topicsToInclude];
      updated[index] = { ...updated[index], isEditing: !updated[index].isEditing };
      setTopicsToInclude(updated);
    }
  };

  const handleDeleteTopic = (isExcluded: boolean, index: number) => {
    if (isExcluded) {
      setTopicsToAvoid(topicsToAvoid.filter((_, i) => i !== index));
    } else {
      setTopicsToInclude(topicsToInclude.filter((_, i) => i !== index));
    }
  };

  const handleContinue = async () => {
    setIsSaving(true);

    try {
      // Save content preferences
      await updateProjectInfo(project.id, {
        content_preferences: contentStrategy.trim() || null,
      });

      // Delete all existing topics first
      for (const topic of topics) {
        await deleteTopic(topic.id);
      }

      // Add new topics
      const newTopics = [];

      for (const topic of topicsToInclude) {
        if (topic.name.trim()) {
          const result = await addTopic(project.id, {
            name: topic.name.trim(),
            description: topic.description.trim() || null,
            is_excluded: false,
          });
          if (result.success && result.topic) {
            newTopics.push(result.topic);
          }
        }
      }

      for (const topic of topicsToAvoid) {
        if (topic.name.trim()) {
          const result = await addTopic(project.id, {
            name: topic.name.trim(),
            description: topic.description.trim() || null,
            is_excluded: true,
          });
          if (result.success && result.topic) {
            newTopics.push(result.topic);
          }
        }
      }

      // Update context
      setTopics(newTopics);
    } catch (error) {
      console.error("Failed to save content strategy:", error);
    } finally {
      setIsSaving(false);
      goNext();
    }
  };

  const hasContent =
    contentStrategy.trim() ||
    topicsToInclude.some((t) => t.name.trim()) ||
    topicsToAvoid.some((t) => t.name.trim());

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="space-y-3">
        <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight">
          Your content strategy
        </h1>
        <p className="text-lg text-slate-500">
          We&apos;ve created a content plan based on your business. Edit anything that doesn&apos;t fit.
        </p>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
          <span>Creating your content strategy...</span>
        </div>
      )}

      {/* Content */}
      {!isLoading && (
        <div className="space-y-8">
          {/* Content Strategy Section */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700">Content Strategy</label>
            <textarea
              value={contentStrategy}
              onChange={(e) => setContentStrategy(e.target.value)}
              placeholder="Describe your overall content approach..."
              rows={6}
              className={cn(
                "w-full rounded-xl border border-slate-200 bg-white px-4 py-3",
                "text-base text-slate-800 placeholder:text-slate-400",
                "focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent",
                "resize-none"
              )}
            />
          </div>

          {/* Topics to Include */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700">Topics to Cover</label>
            <div className="space-y-2">
              {topicsToInclude.map((topic, index) => (
                <TopicCard
                  key={index}
                  topic={topic}
                  onUpdate={(field, value) => handleUpdateTopic(false, index, field, value)}
                  onToggleEdit={() => handleToggleEdit(false, index)}
                  onDelete={() => handleDeleteTopic(false, index)}
                />
              ))}
              <Button
                variant="outline"
                onClick={() => handleAddTopic(false)}
                className="h-10 text-sm"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add topic
              </Button>
            </div>
          </div>

          {/* Topics to Avoid */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700">Topics to Avoid</label>
            <div className="space-y-2">
              {topicsToAvoid.map((topic, index) => (
                <TopicCard
                  key={index}
                  topic={topic}
                  onUpdate={(field, value) => handleUpdateTopic(true, index, field, value)}
                  onToggleEdit={() => handleToggleEdit(true, index)}
                  onDelete={() => handleDeleteTopic(true, index)}
                  isExcluded
                />
              ))}
              <Button
                variant="outline"
                onClick={() => handleAddTopic(true)}
                className="h-10 text-sm"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add topic to avoid
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4">
        <Button variant="outline" onClick={goBack} className="h-11">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        {hasGenerated && !isLoading && (
          <Button variant="outline" onClick={generateContentStrategy} className="h-11">
            <Sparkles className="mr-2 h-4 w-4" />
            Regenerate
          </Button>
        )}
        <Button
          onClick={handleContinue}
          disabled={isLoading || isSaving}
          className="h-11 px-6"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : hasContent ? (
            <>
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          ) : (
            <>
              Skip for now
              <SkipForward className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

interface TopicCardProps {
  topic: TopicItem;
  onUpdate: (field: "name" | "description", value: string) => void;
  onToggleEdit: () => void;
  onDelete: () => void;
  isExcluded?: boolean;
}

function TopicCard({ topic, onUpdate, onToggleEdit, onDelete, isExcluded }: TopicCardProps) {
  if (topic.isEditing) {
    return (
      <div
        className={cn(
          "p-4 rounded-xl border-2 space-y-3",
          isExcluded ? "border-red-200 bg-red-50/50" : "border-violet-200 bg-violet-50/50"
        )}
      >
        <Input
          value={topic.name}
          onChange={(e) => onUpdate("name", e.target.value)}
          placeholder="Topic name"
          className="h-9"
          autoFocus
        />
        <Input
          value={topic.description}
          onChange={(e) => onUpdate("description", e.target.value)}
          placeholder="Brief description (optional)"
          className="h-9"
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onDelete} className="h-8 text-slate-500">
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            onClick={onToggleEdit}
            disabled={!topic.name.trim()}
            className="h-8"
          >
            <Check className="mr-1 h-4 w-4" />
            Done
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-start justify-between p-4 rounded-xl border group",
        isExcluded
          ? "border-red-200 bg-red-50/30"
          : "border-slate-200 bg-white"
      )}
    >
      <div className="flex-1 min-w-0">
        <span className={cn("font-medium", isExcluded ? "text-red-900" : "text-slate-900")}>
          {topic.name}
        </span>
        {topic.description && (
          <p className={cn("text-sm mt-0.5", isExcluded ? "text-red-600/70" : "text-slate-500")}>
            {topic.description}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleEdit}
          className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="h-8 w-8 p-0 text-slate-400 hover:text-red-500"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
