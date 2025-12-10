"use client";

import { useState, useEffect } from "react";
import { useOnboarding } from "./onboarding-context";
import { addTopic } from "@/lib/actions/project";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowRight, ArrowLeft, Plus, Sparkles, Trash2, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProjectTopic } from "@/lib/types";
import { SuggestTopicsModal } from "@/components/strategy/suggest-topics-modal";

export function TopicsStep() {
  const { project, topics, setTopics, goNext, goBack, addTopic: addTopicToContext } = useOnboarding();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSuggestModalOpen, setIsSuggestModalOpen] = useState(false);

  const includedTopics = topics.filter((t) => !t.is_excluded);

  const handleSaveTopic = async (data: { name: string; description: string }) => {
    const result = await addTopic(project.id, {
      name: data.name,
      description: data.description || null,
      is_excluded: false,
    });

    if (result.success && result.topic) {
      addTopicToContext(result.topic);
    }

    setIsDialogOpen(false);
  };

  const handleTopicAddedFromModal = (topic: ProjectTopic) => {
    addTopicToContext(topic);
  };

  const handleDeleteTopic = async (topicId: string) => {
    // Import deleteTopic dynamically to avoid circular deps
    const { deleteTopic } = await import("@/lib/actions/project");
    await deleteTopic(topicId);
    setTopics(topics.filter((t) => t.id !== topicId));
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="space-y-3">
        <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight">
          What topics should your videos cover?
        </h1>
        <p className="text-lg text-slate-500">
          Define content themes to guide idea generation. You can always add more later.
        </p>
      </div>

      {/* Topic list */}
      <div className="space-y-3">
        {includedTopics.map((topic) => (
          <div
            key={topic.id}
            className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 group"
          >
            <div>
              <span className="text-base font-medium text-slate-800">{topic.name}</span>
              {topic.description && (
                <p className="text-sm text-slate-400 mt-0.5">{topic.description}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteTopic(topic.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 text-slate-400 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        {/* Add topic buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsDialogOpen(true)}
            className="h-11"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add topic manually
          </Button>
          <Button
            onClick={() => setIsSuggestModalOpen(true)}
            className="bg-violet-600 hover:bg-violet-700 text-white h-11"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Suggest with AI
          </Button>
        </div>

        {/* Empty state */}
        {includedTopics.length === 0 && (
          <div className="text-center py-8 text-slate-400">
            No topics added yet. Add some topics or let AI suggest them for you.
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4">
        <Button variant="outline" onClick={goBack} className="h-11">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={goNext} className="h-11 px-6">
          {includedTopics.length > 0 ? (
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

      {/* Add Topic Dialog */}
      <AddTopicDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSaveTopic}
      />

      {/* Suggest Topics Modal */}
      <SuggestTopicsModal
        open={isSuggestModalOpen}
        onOpenChange={setIsSuggestModalOpen}
        projectId={project.id}
        onTopicAdded={handleTopicAddedFromModal}
      />
    </div>
  );
}

interface AddTopicDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; description: string }) => Promise<void>;
}

function AddTopicDialog({ isOpen, onClose, onSave }: AddTopicDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setName("");
      setDescription("");
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!name.trim()) return;

    setIsSaving(true);
    await onSave({
      name: name.trim(),
      description: description.trim(),
    });
    setIsSaving(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[520px] rounded-xl">
        <DialogHeader className="px-4 min-h-8">
          <DialogTitle className="text-base font-semibold text-slate-800">
            Add Topic
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 px-4 pb-4">
          {/* Name input */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-600">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Behind the scenes, Product tutorials, Customer stories..."
              autoFocus
              className="h-10"
            />
          </div>

          {/* Description input */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-600">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this topic covers and what kind of videos it includes..."
              rows={4}
              className={cn(
                "w-full rounded-lg border border-slate-200 bg-white px-3 py-2",
                "text-sm text-slate-800 placeholder:text-slate-400",
                "focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent",
                "resize-none"
              )}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={isSaving}
              className="h-10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!name.trim() || isSaving}
              className="h-10"
            >
              {isSaving ? "Saving..." : "Add Topic"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

