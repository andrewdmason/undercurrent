"use client";

import { useState } from "react";
import { Sparkles, Loader2, Minus, Plus, Shuffle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { PlatformIcon } from "@/components/strategy/platform-icon";

// Types for the options passed to the modal
export interface CharacterOption {
  id: string;
  name: string;
  image_url: string | null;
}

export interface ChannelOption {
  id: string;
  platform: string;
  custom_label: string | null;
}

export interface TemplateOption {
  id: string;
  name: string;
  channels?: Array<{ id: string; platform: string }>;
}

export interface TopicOption {
  id: string;
  name: string;
}

export interface GenerationOptions {
  count: number;
  characterIds: string[] | "random";
  channelIds: string[] | "random";
  templateId: string | "random";
  topicId: string | "random";
  customInstructions?: string;
}

interface GenerateIdeasModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (options: GenerationOptions) => void;
  isGenerating: boolean;
  characters?: CharacterOption[];
  channels?: ChannelOption[];
  templates?: TemplateOption[];
  topics?: TopicOption[];
}

export function GenerateIdeasModal({
  open,
  onOpenChange,
  onGenerate,
  isGenerating,
  characters = [],
  channels = [],
  templates = [],
  topics = [],
}: GenerateIdeasModalProps) {
  const [count, setCount] = useState(5);
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[] | "random">("random");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | "random">("random");
  const [selectedTopicId, setSelectedTopicId] = useState<string | "random">("random");
  const [customInstructions, setCustomInstructions] = useState("");

  const handleGenerate = () => {
    onGenerate({
      count,
      characterIds: selectedCharacterIds,
      channelIds: "random", // Channels are now inferred from selected template
      templateId: selectedTemplateId,
      topicId: selectedTopicId,
      customInstructions: customInstructions.trim() || undefined,
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      // Reset to defaults when opening
      setCount(5);
      setSelectedCharacterIds("random");
      setSelectedTemplateId("random");
      setSelectedTopicId("random");
      setCustomInstructions("");
    }
    onOpenChange(newOpen);
  };

  // Character selection handlers
  const toggleCharacter = (id: string) => {
    if (selectedCharacterIds === "random") {
      setSelectedCharacterIds([id]);
    } else if (selectedCharacterIds.includes(id)) {
      const newIds = selectedCharacterIds.filter((cid) => cid !== id);
      setSelectedCharacterIds(newIds.length === 0 ? "random" : newIds);
    } else {
      setSelectedCharacterIds([...selectedCharacterIds, id]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex items-center justify-center size-8 rounded-lg bg-[var(--grey-50)]">
              <Sparkles className="size-4 text-[var(--grey-600)]" />
            </div>
            Generate New Ideas
          </DialogTitle>
          <DialogDescription className="text-left">
            Configure what kind of ideas to generate, or leave on defaults for a random mix.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-5">
          {/* Number of Ideas */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-[var(--grey-600)]">
              Number of Ideas
            </label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => setCount(Math.max(1, count - 1))}
                disabled={count <= 1 || isGenerating}
              >
                <Minus className="size-3" />
              </Button>
              <span className="w-8 text-center text-sm font-medium tabular-nums">
                {count}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => setCount(Math.min(10, count + 1))}
                disabled={count >= 10 || isGenerating}
              >
                <Plus className="size-3" />
              </Button>
              {/* Quick presets */}
              <div className="flex gap-1 ml-2">
                {[1, 3, 5, 10].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCount(n)}
                    disabled={isGenerating}
                    className={cn(
                      "px-2 py-1 text-xs rounded-md transition-colors",
                      count === n
                        ? "bg-[var(--grey-800)] text-white"
                        : "bg-[var(--grey-50)] text-[var(--grey-600)] hover:bg-[var(--grey-100)]"
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Characters - Avatar Grid (only show if characters exist) */}
          {characters.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-[var(--grey-600)]">
                Characters
              </label>
              <div className="flex flex-wrap gap-2">
                {/* Random/Any option */}
                <button
                  type="button"
                  onClick={() => setSelectedCharacterIds("random")}
                  disabled={isGenerating}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
                    selectedCharacterIds === "random"
                      ? "bg-[var(--grey-800)] text-white border-[var(--grey-800)]"
                      : "bg-white text-[var(--grey-600)] border-[var(--grey-200)] hover:border-[var(--grey-300)]"
                  )}
                >
                  <Shuffle className="size-3" />
                  Any
                </button>
                {/* Character avatars */}
                {characters.map((character) => {
                  const isSelected =
                    selectedCharacterIds !== "random" &&
                    selectedCharacterIds.includes(character.id);
                  return (
                    <button
                      key={character.id}
                      type="button"
                      onClick={() => toggleCharacter(character.id)}
                      disabled={isGenerating}
                      className={cn(
                        "relative flex items-center gap-2 px-2 py-1.5 rounded-full text-xs font-medium transition-colors border",
                        isSelected
                          ? "bg-[var(--grey-800)] text-white border-[var(--grey-800)]"
                          : "bg-white text-[var(--grey-600)] border-[var(--grey-200)] hover:border-[var(--grey-300)]"
                      )}
                    >
                      {character.image_url ? (
                        <img
                          src={character.image_url}
                          alt={character.name}
                          className="size-5 rounded-full object-cover"
                        />
                      ) : (
                        <div className="size-5 rounded-full bg-[var(--grey-200)] flex items-center justify-center text-[10px] font-medium">
                          {character.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span>{character.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Template - Single Select Chips (only show if templates exist) */}
          {templates.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-[var(--grey-600)]">
                Template
              </label>
              <div className="flex flex-wrap gap-2">
                {/* Random/Any option */}
                <button
                  type="button"
                  onClick={() => setSelectedTemplateId("random")}
                  disabled={isGenerating}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
                    selectedTemplateId === "random"
                      ? "bg-[var(--grey-800)] text-white border-[var(--grey-800)]"
                      : "bg-white text-[var(--grey-600)] border-[var(--grey-200)] hover:border-[var(--grey-300)]"
                  )}
                >
                  <Shuffle className="size-3" />
                  Any
                </button>
                {/* Template chips */}
                {templates.map((template) => {
                  const isSelected = selectedTemplateId === template.id;
                  const templateChannels = template.channels || [];
                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => setSelectedTemplateId(template.id)}
                      disabled={isGenerating}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
                        isSelected
                          ? "bg-[var(--grey-800)] text-white border-[var(--grey-800)]"
                          : "bg-white text-[var(--grey-600)] border-[var(--grey-200)] hover:border-[var(--grey-300)]"
                      )}
                    >
                      {templateChannels.length > 0 && (
                        <span className="flex items-center gap-0.5">
                          {templateChannels.map((channel) => (
                            <PlatformIcon
                              key={channel.id}
                              platform={channel.platform}
                              className={cn("size-3", isSelected ? "text-white/70" : "text-[var(--grey-400)]")}
                            />
                          ))}
                        </span>
                      )}
                      <span>{template.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Topic - Single Select Chips (only show if topics exist) */}
          {topics.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-[var(--grey-600)]">
                Topic
              </label>
              <div className="flex flex-wrap gap-2">
                {/* Random/Any option */}
                <button
                  type="button"
                  onClick={() => setSelectedTopicId("random")}
                  disabled={isGenerating}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
                    selectedTopicId === "random"
                      ? "bg-[var(--grey-800)] text-white border-[var(--grey-800)]"
                      : "bg-white text-[var(--grey-600)] border-[var(--grey-200)] hover:border-[var(--grey-300)]"
                  )}
                >
                  <Shuffle className="size-3" />
                  Any
                </button>
                {/* Topic chips */}
                {topics.map((topic) => {
                  const isSelected = selectedTopicId === topic.id;
                  return (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() => setSelectedTopicId(topic.id)}
                      disabled={isGenerating}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
                        isSelected
                          ? "bg-[var(--grey-800)] text-white border-[var(--grey-800)]"
                          : "bg-white text-[var(--grey-600)] border-[var(--grey-200)] hover:border-[var(--grey-300)]"
                      )}
                    >
                      <span>{topic.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Custom Instructions */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-[var(--grey-600)]">
              Additional Instructions
              <span className="font-normal text-[var(--grey-400)] ml-1">(optional)</span>
            </label>
            <Textarea
              placeholder={`e.g., "Make them funny" or "Focus on holiday themes"`}
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              disabled={isGenerating}
              rows={2}
              className="resize-none border-[var(--grey-200)]"
            />
          </div>
        </div>

        <DialogFooter className="flex-row justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                Generate
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
