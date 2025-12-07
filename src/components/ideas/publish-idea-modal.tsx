"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Play, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { publishIdea } from "@/lib/actions/ideas";
import { PlatformIcon, getChannelLabel } from "./idea-card";

interface Channel {
  id: string;
  platform: string;
  custom_label: string | null;
  video_url: string | null;
}

interface PublishIdeaModalProps {
  ideaId: string;
  ideaTitle: string;
  channels: Channel[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PublishIdeaModal({
  ideaId,
  ideaTitle,
  channels,
  open,
  onOpenChange,
}: PublishIdeaModalProps) {
  const [channelUrls, setChannelUrls] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    channels.forEach((c) => {
      initial[c.id] = c.video_url || "";
    });
    return initial;
  });
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePublish = async () => {
    setIsSubmitting(true);
    try {
      const urlsToSave = channels.map((c) => ({
        channelId: c.id,
        videoUrl: channelUrls[c.id]?.trim() || null,
      }));

      const result = await publishIdea(ideaId, urlsToSave);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Video marked as published!");
        onOpenChange(false);
        router.refresh();
      }
    } catch (error) {
      toast.error("Failed to publish idea");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#007bc2]/10">
              <Play className="h-4 w-4 text-[#007bc2]" />
            </div>
            Mark as Published
          </DialogTitle>
          <DialogDescription className="text-left">
            You&apos;ve completed &ldquo;{ideaTitle}&rdquo;! Add the video URLs for each platform where you posted it.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {channels.length > 0 ? (
            channels.map((channel) => (
              <div key={channel.id} className="space-y-2">
                <Label htmlFor={`url-${channel.id}`} className="flex items-center gap-2 text-sm">
                  <PlatformIcon platform={channel.platform} className="h-4 w-4" />
                  {getChannelLabel(channel.platform, channel.custom_label)}
                </Label>
                <div className="relative">
                  <Input
                    id={`url-${channel.id}`}
                    type="url"
                    placeholder={`https://...`}
                    value={channelUrls[channel.id] || ""}
                    onChange={(e) =>
                      setChannelUrls((prev) => ({
                        ...prev,
                        [channel.id]: e.target.value,
                      }))
                    }
                    disabled={isSubmitting}
                    className="pr-10"
                  />
                  {channelUrls[channel.id] && (
                    <a
                      href={channelUrls[channel.id]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--grey-400)] hover:text-[var(--grey-600)]"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-[var(--grey-400)] text-center py-4">
              No distribution channels configured for this idea.
            </p>
          )}
          <p className="text-xs text-[var(--grey-400)]">
            All fields are optional. You can add or edit URLs later from the Published view.
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handlePublish}
            disabled={isSubmitting}
            className="bg-gradient-to-t from-[#262626] to-[#404040] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)] hover:brightness-110"
          >
            {isSubmitting ? "Publishing..." : "Mark as Published"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

