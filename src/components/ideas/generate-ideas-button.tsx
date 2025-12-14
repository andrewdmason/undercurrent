"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { generateIdeas } from "@/lib/actions/ideas";
import { 
  GenerateIdeasModal, 
  GenerationOptions,
  CharacterOption,
  ChannelOption,
  TemplateOption,
  TopicOption,
} from "./generate-ideas-modal";

interface GenerateIdeasButtonProps {
  projectId: string;
  characters?: CharacterOption[];
  channels?: ChannelOption[];
  templates?: TemplateOption[];
  topics?: TopicOption[];
}

export function GenerateIdeasButton({ 
  projectId,
  characters = [],
  channels = [],
  templates = [],
  topics = [],
}: GenerateIdeasButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleGenerate = async (options: GenerationOptions) => {
    setIsGenerating(true);
    setIsModalOpen(false);

    // Dispatch event immediately so alert bar shows generating state
    window.dispatchEvent(new CustomEvent("ideas-generation-start", { 
      detail: { count: options.count } 
    }));

    try {
      const result = await generateIdeas(projectId, {
        count: options.count,
        characterIds: options.characterIds === "random" ? undefined : options.characterIds,
        channelIds: options.channelIds === "random" ? undefined : options.channelIds,
        templateId: options.templateId === "random" ? undefined : options.templateId,
        topicId: options.topicId === "random" ? undefined : options.topicId,
        customInstructions: options.customInstructions,
      });

      if (result.error) {
        toast.error("Failed to generate ideas", {
          description: result.error,
        });
        window.dispatchEvent(new CustomEvent("ideas-generation-error"));
      } else {
        toast.success("Ideas generated!", {
          description: `${result.count} new video ideas are ready.`,
        });
      }
    } catch (error) {
      toast.error("Something went wrong", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
      window.dispatchEvent(new CustomEvent("ideas-generation-error"));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsModalOpen(true)}
        disabled={isGenerating}
        className="gap-2"
      >
        {isGenerating ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles size={16} />
            Generate Ideas
          </>
        )}
      </Button>

      <GenerateIdeasModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onGenerate={handleGenerate}
        isGenerating={isGenerating}
        characters={characters}
        channels={channels}
        templates={templates}
        topics={topics}
      />
    </>
  );
}
