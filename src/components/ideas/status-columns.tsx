"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Clock, Trash2, Send, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { IdeaWithChannels, PRODUCTION_STATUS_LABELS, ProductionStatus } from "@/lib/types";
import { PlatformIcon } from "@/components/strategy/platform-icon";
import { generateThumbnail } from "@/lib/actions/thumbnail";
import { deleteIdea } from "@/lib/actions/ideas";
import { cn } from "@/lib/utils";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { RemixIdeaModal, RemixOptions } from "./remix-idea-modal";
import { PublishIdeaModal } from "./publish-idea-modal";
import { remixIdea } from "@/lib/actions/ideas";

interface StatusColumnsProps {
  ideas: IdeaWithChannels[];
  projectSlug: string;
  projectId?: string;
  characters?: Array<{ id: string; name: string; image_url: string | null }>;
  channels?: Array<{ id: string; platform: string; custom_label: string | null }>;
  templates?: Array<{ id: string; name: string }>;
}

export function StatusColumns({ 
  ideas, 
  projectSlug,
  projectId,
  characters = [],
  channels = [],
  templates = [],
}: StatusColumnsProps) {
  const router = useRouter();
  const [remixModalIdea, setRemixModalIdea] = useState<IdeaWithChannels | null>(null);
  const [publishModalIdea, setPublishModalIdea] = useState<IdeaWithChannels | null>(null);
  const [isRemixing, setIsRemixing] = useState(false);

  // Group ideas by status
  const ideasByStatus = {
    preproduction: ideas.filter((idea) => idea.status === "preproduction"),
    production: ideas.filter((idea) => idea.status === "production"),
    postproduction: ideas.filter((idea) => idea.status === "postproduction"),
  };

  const handleRemix = async (options: RemixOptions) => {
    if (isRemixing || !remixModalIdea) return;

    setIsRemixing(true);
    try {
      const result = await remixIdea(remixModalIdea.id, {
        characterIds: options.characterIds,
        channelIds: options.channelIds,
        templateId: options.templateId,
        customInstructions: options.customInstructions,
        saveAsCopy: options.saveAsCopy,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        setRemixModalIdea(null);
        if (result.isCopy) {
          toast.success(`Created remix: "${result.title}"`);
        } else {
          toast.success("Idea remixed successfully");
        }
        router.refresh();
      }
    } catch (error) {
      toast.error("Failed to remix idea");
      console.error(error);
    } finally {
      setIsRemixing(false);
    }
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-4">
        {(["preproduction", "production", "postproduction"] as const).map((status) => (
          <StatusColumn
            key={status}
            status={status}
            ideas={ideasByStatus[status]}
            projectSlug={projectSlug}
            projectId={projectId}
            onRemix={(idea) => setRemixModalIdea(idea)}
            onPublish={(idea) => setPublishModalIdea(idea)}
          />
        ))}
      </div>

      {/* Remix Modal */}
      {remixModalIdea && (
        <RemixIdeaModal
          open={!!remixModalIdea}
          onOpenChange={(open) => {
            if (!open) setRemixModalIdea(null);
          }}
          onRemix={handleRemix}
          isRemixing={isRemixing}
          ideaTitle={remixModalIdea.title}
          currentSelections={{
            channelIds: remixModalIdea.channels?.map(c => c.id) || [],
            characterIds: remixModalIdea.characters?.map(c => c.id) || [],
            templateId: remixModalIdea.template?.id || null,
          }}
          characters={characters}
          channels={channels}
          templates={templates}
        />
      )}

      {/* Publish Modal */}
      {publishModalIdea && (
        <PublishIdeaModal
          ideaId={publishModalIdea.id}
          ideaTitle={publishModalIdea.title}
          channels={publishModalIdea.channels}
          open={!!publishModalIdea}
          onOpenChange={(open) => {
            if (!open) setPublishModalIdea(null);
          }}
        />
      )}
    </>
  );
}

interface StatusColumnProps {
  status: ProductionStatus;
  ideas: IdeaWithChannels[];
  projectSlug: string;
  projectId?: string;
  onRemix: (idea: IdeaWithChannels) => void;
  onPublish: (idea: IdeaWithChannels) => void;
}

function StatusColumn({ status, ideas, projectSlug, projectId, onRemix, onPublish }: StatusColumnProps) {
  return (
    <div className="flex flex-col min-h-[400px]">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-sm font-medium text-[var(--grey-600)]">
          {PRODUCTION_STATUS_LABELS[status]}
        </h3>
        <span className="text-xs text-[var(--grey-400)] tabular-nums">
          {ideas.length}
        </span>
      </div>

      {/* Column Content */}
      <div className="flex-1 bg-[var(--grey-50)] rounded-lg p-2 space-y-2">
        {ideas.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-sm text-[var(--grey-400)]">
            No ideas
          </div>
        ) : (
          ideas.map((idea) => (
            <ColumnCard 
              key={idea.id} 
              idea={idea} 
              projectSlug={projectSlug}
              projectId={projectId}
              onRemix={() => onRemix(idea)}
              onPublish={() => onPublish(idea)}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface ColumnCardProps {
  idea: IdeaWithChannels;
  projectSlug: string;
  projectId?: string;
  onRemix: () => void;
  onPublish: () => void;
}

function ColumnCard({ idea, projectSlug, projectId, onRemix, onPublish }: ColumnCardProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const hasImage = !!idea.image_url;

  const handleGenerateThumbnail = async () => {
    if (isGenerating || !projectId) return;

    setIsGenerating(true);
    try {
      const result = await generateThumbnail(idea.id, projectId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Thumbnail generated successfully");
        router.refresh();
      }
    } catch (error) {
      toast.error("Failed to generate thumbnail");
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async () => {
    try {
      const result = await deleteIdea(idea.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Idea deleted");
        router.refresh();
      }
    } catch (error) {
      toast.error("Failed to delete idea");
      console.error(error);
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <Link
          href={`/${projectSlug}/ideas/${idea.id}`}
          className="group block bg-white rounded-lg border border-[var(--border)] shadow-sm hover:shadow-md transition-shadow overflow-hidden cursor-pointer"
        >
          {/* Thumbnail */}
          {idea.image_url && (
            <div className="relative aspect-video overflow-hidden">
              <Image
                src={idea.image_url}
                alt={idea.title}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
              {/* Channel icons overlay */}
              {idea.channels.length > 0 && (
                <div className="absolute bottom-2 left-2 flex items-center gap-1">
                  {idea.channels.map((channel) => (
                    <div
                      key={channel.id}
                      className="w-5 h-5 rounded bg-black/60 flex items-center justify-center"
                    >
                      <PlatformIcon
                        platform={channel.platform}
                        className="w-3 h-3 text-white"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Content */}
          <div className="p-3">
            <h4 className="text-sm font-medium text-[var(--grey-800)] line-clamp-2">
              {idea.title}
            </h4>
            
            {/* Prep time */}
            {idea.prepTimeMinutes !== undefined && idea.prepTimeMinutes > 0 && (
              <div className="flex items-center gap-1 mt-2 text-xs text-[var(--grey-400)]">
                <Clock className="h-3 w-3" />
                <span>{idea.prepTimeMinutes}min remaining</span>
              </div>
            )}
          </div>
        </Link>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={onRemix} className="cursor-pointer">
          <Sparkles className="mr-2 h-4 w-4" />
          Remix Idea
        </ContextMenuItem>
        <ContextMenuItem
          onClick={handleGenerateThumbnail}
          disabled={isGenerating}
          className="cursor-pointer"
        >
          <RefreshCw className={cn("mr-2 h-4 w-4", isGenerating && "animate-spin")} />
          {hasImage ? "Regenerate Thumbnail" : "Generate Thumbnail"}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onPublish} className="cursor-pointer">
          <Send className="mr-2 h-4 w-4" />
          Mark as Published
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={handleDelete}
          className="text-[#f72736] focus:text-[#f72736] cursor-pointer"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Idea
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}


