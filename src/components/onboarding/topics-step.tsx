"use client";

import { useState } from "react";
import { useOnboarding } from "./onboarding-context";
import { addTopic } from "@/lib/actions/project";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, ArrowLeft, Plus, Sparkles, Trash2, Loader2, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProjectTopic } from "@/lib/types";
import { SuggestTopicsModal } from "@/components/strategy/suggest-topics-modal";

export function TopicsStep() {
  const { project, topics, setTopics, goNext, goBack, addTopic: addTopicToContext } = useOnboarding();
  const [isAdding, setIsAdding] = useState(false);
  const [newTopicName, setNewTopicName] = useState("");
  const [isSuggestModalOpen, setIsSuggestModalOpen] = useState(false);

  const includedTopics = topics.filter((t) => !t.is_excluded);

  const handleAddTopic = async () => {
    if (!newTopicName.trim()) return;

    const result = await addTopic(project.id, {
      name: newTopicName.trim(),
      is_excluded: false,
    });

    if (result.success && result.topic) {
      addTopicToContext(result.topic);
    }

    setNewTopicName("");
    setIsAdding(false);
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

        {/* Add topic form */}
        {isAdding ? (
          <div className="flex gap-2">
            <Input
              value={newTopicName}
              onChange={(e) => setNewTopicName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddTopic();
                if (e.key === "Escape") {
                  setIsAdding(false);
                  setNewTopicName("");
                }
              }}
              placeholder="Topic name..."
              autoFocus
              className="flex-1 h-11"
            />
            <Button onClick={handleAddTopic} disabled={!newTopicName.trim()} className="h-11">
              Add
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsAdding(false);
                setNewTopicName("");
              }}
              className="h-11"
            >
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsAdding(true)}
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
        )}

        {/* Empty state */}
        {includedTopics.length === 0 && !isAdding && (
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

