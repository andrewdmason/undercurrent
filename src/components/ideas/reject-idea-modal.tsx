"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X } from "lucide-react";
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
import { rejectIdea } from "@/lib/actions/ideas";

interface RejectIdeaModalProps {
  ideaId: string;
  ideaTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RejectIdeaModal({
  ideaId,
  ideaTitle,
  open,
  onOpenChange,
}: RejectIdeaModalProps) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReject = async (skipReason: boolean = false) => {
    setIsSubmitting(true);
    try {
      const result = await rejectIdea(ideaId, skipReason ? undefined : reason || undefined);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Idea rejected");
        setReason("");
        onOpenChange(false);
        router.refresh();
      }
    } catch (error) {
      toast.error("Failed to reject idea");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-destructive/10">
              <X className="h-4 w-4 text-destructive" />
            </div>
            Reject Idea
          </DialogTitle>
          <DialogDescription className="text-left">
            You&apos;re rejecting &ldquo;{ideaTitle}&rdquo;. Would you like to share why? This helps improve future suggestions.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <Textarea
            placeholder="Optional: Why are you rejecting this idea? (e.g., not on brand, too similar to past content, bad timing...)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="min-h-[100px]"
            disabled={isSubmitting}
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={() => handleReject(true)}
            disabled={isSubmitting}
            className="text-[var(--grey-400)]"
          >
            Skip
          </Button>
          <Button
            onClick={() => handleReject(false)}
            disabled={isSubmitting}
            variant="destructive"
          >
            {isSubmitting ? "Rejecting..." : "Reject Idea"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

