"use client";

import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function GenerateIdeasButton() {
  const handleClick = () => {
    toast.info("Coming soon!", {
      description: "AI idea generation will be available after completing onboarding.",
    });
  };

  return (
    <Button onClick={handleClick} className="gap-2">
      <Sparkles size={16} />
      Generate Ideas
    </Button>
  );
}


