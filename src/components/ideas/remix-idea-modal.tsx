"use client";

import { useState, useEffect, useRef } from "react";
import { RefreshCw, Loader2, Shuffle, Copy } from "lucide-react";
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

// Current idea's selections to pre-populate
export interface IdeaSelections {
  channelIds: string[];
  characterIds: string[];
  templateId: string | null;
}

export interface RemixOptions {
  characterIds: string[];
  channelIds: string[];
  templateId: string | null;
  customInstructions?: string;
  saveAsCopy: boolean;
}

interface RemixIdeaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRemix: (options: RemixOptions) => void;
  isRemixing: boolean;
  ideaTitle: string;
  currentSelections: IdeaSelections;
  characters?: CharacterOption[];
  channels?: ChannelOption[];
  templates?: TemplateOption[];
}

export function RemixIdeaModal({
  open,
  onOpenChange,
  onRemix,
  isRemixing,
  ideaTitle,
  currentSelections,
  characters = [],
  channels = [],
  templates = [],
}: RemixIdeaModalProps) {
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [customInstructions, setCustomInstructions] = useState("");
  const [saveAsCopy, setSaveAsCopy] = useState(false);
  
  // Track previous open state to only reset when modal first opens
  const wasOpen = useRef(false);

  // Pre-populate with current idea's selections when modal opens (not on every render)
  useEffect(() => {
    // Only reset when transitioning from closed to open
    if (open && !wasOpen.current) {
      setSelectedCharacterIds(currentSelections.characterIds);
      setSelectedTemplateId(currentSelections.templateId);
      setCustomInstructions("");
      setSaveAsCopy(false);
    }
    wasOpen.current = open;
  }, [open, currentSelections]);

  const handleRemix = () => {
    // Derive channels from selected template
    const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
    const channelIds = selectedTemplate?.channels?.map(c => c.id) || [];
    
    onRemix({
      characterIds: selectedCharacterIds,
      channelIds,
      templateId: selectedTemplateId,
      customInstructions: customInstructions.trim() || undefined,
      saveAsCopy,
    });
  };

  // Character selection handlers
  const toggleCharacter = (id: string) => {
    if (selectedCharacterIds.includes(id)) {
      setSelectedCharacterIds(selectedCharacterIds.filter((cid) => cid !== id));
    } else {
      setSelectedCharacterIds([...selectedCharacterIds, id]);
    }
  };

  const clearCharacters = () => {
    setSelectedCharacterIds([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex items-center justify-center size-8 rounded-lg bg-[var(--grey-50)]">
              <RefreshCw className="size-4 text-[var(--grey-600)]" />
            </div>
            Remix Idea
          </DialogTitle>
          <DialogDescription className="text-left">
            Transform &ldquo;{ideaTitle}&rdquo; into a fresh new concept with different parameters.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-5">
          {/* Characters - Avatar Grid (only show if characters exist) */}
          {characters.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-[var(--grey-600)]">
                Characters
              </label>
              <div className="flex flex-wrap gap-2">
                {/* Clear/Any option */}
                <button
                  type="button"
                  onClick={clearCharacters}
                  disabled={isRemixing}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
                    selectedCharacterIds.length === 0
                      ? "bg-[var(--grey-800)] text-white border-[var(--grey-800)]"
                      : "bg-white text-[var(--grey-600)] border-[var(--grey-200)] hover:border-[var(--grey-300)]"
                  )}
                >
                  <Shuffle className="size-3" />
                  Any
                </button>
                {/* Character avatars */}
                {characters.map((character) => {
                  const isSelected = selectedCharacterIds.includes(character.id);
                  return (
                    <button
                      key={character.id}
                      type="button"
                      onClick={() => toggleCharacter(character.id)}
                      disabled={isRemixing}
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
                {/* Any/None option */}
                <button
                  type="button"
                  onClick={() => setSelectedTemplateId(null)}
                  disabled={isRemixing}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
                    selectedTemplateId === null
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
                      disabled={isRemixing}
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

          {/* Custom Instructions */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-[var(--grey-600)]">
              Remix Instructions
              <span className="font-normal text-[var(--grey-400)] ml-1">(optional)</span>
            </label>
            <Textarea
              placeholder={`e.g., "Make it more humorous" or "Focus on a different angle"`}
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              disabled={isRemixing}
              rows={2}
              className="resize-none border-[var(--grey-200)]"
            />
          </div>

          {/* Save as Copy Checkbox */}
          <div className="flex items-center gap-3 pt-2">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={saveAsCopy}
                onChange={(e) => setSaveAsCopy(e.target.checked)}
                disabled={isRemixing}
                className="size-4 rounded border-[var(--grey-300)] text-[var(--grey-800)] focus:ring-[var(--grey-400)] cursor-pointer"
              />
              <span className="text-sm text-[var(--grey-600)] group-hover:text-[var(--grey-800)] flex items-center gap-1.5">
                <Copy className="size-3.5" />
                Save as copy
              </span>
            </label>
            <span className="text-xs text-[var(--grey-400)]">
              {saveAsCopy ? "Creates a new idea, keeps original" : "Replaces the original idea"}
            </span>
          </div>
        </div>

        <DialogFooter className="flex-row justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isRemixing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRemix}
            disabled={isRemixing}
          >
            {isRemixing ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Remixing...
              </>
            ) : (
              <>
                <RefreshCw className="size-4" />
                Remix
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

