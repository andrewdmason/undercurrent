"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { generateIdeas } from "@/lib/actions/ideas";

interface GenerateIdeasButtonProps {
  businessId: string;
}

export function GenerateIdeasButton({ businessId }: GenerateIdeasButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleClick = async () => {
    setIsGenerating(true);

    try {
      const result = await generateIdeas(businessId);

      if (result.error) {
        toast.error("Failed to generate ideas", {
          description: result.error,
        });
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
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button onClick={handleClick} disabled={isGenerating} className="gap-2">
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
  );
}
