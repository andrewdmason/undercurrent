"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
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

interface GenerateIdeasModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (customInstructions?: string) => void;
  isGenerating: boolean;
}

export function GenerateIdeasModal({
  open,
  onOpenChange,
  onGenerate,
  isGenerating,
}: GenerateIdeasModalProps) {
  const [customInstructions, setCustomInstructions] = useState("");

  const handleGenerate = () => {
    onGenerate(customInstructions.trim() || undefined);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      // Clear when opening so each generation starts fresh
      setCustomInstructions("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex items-center justify-center size-8 rounded-lg bg-[var(--grey-50)]">
              <Sparkles className="size-4 text-[var(--grey-600)]" />
            </div>
            Generate New Ideas
          </DialogTitle>
          <DialogDescription className="text-left">
            Generate fresh video ideas based on your strategy.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <Textarea
            placeholder={`e.g., "Only generate ideas for Andrew" or "Focus on Instagram Reels" or "Just give me one idea"`}
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            disabled={isGenerating}
            rows={3}
            className="resize-none"
          />
          <p className="text-xs text-[var(--grey-400)] mt-2">
            Leave empty to use your default strategy, or add instructions to fine-tune this batch.
          </p>
        </div>

        <DialogFooter className="flex-row justify-end gap-2">
          <Button
            variant="ghost"
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

