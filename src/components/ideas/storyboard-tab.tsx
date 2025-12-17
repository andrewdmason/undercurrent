"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Sparkles,
  RefreshCw,
  Film,
  ImageIcon,
  Clock,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { IdeaScene, IdeaAsset, ASSET_TYPE_LABELS, AssetType } from "@/lib/types";
import {
  generateStoryboard,
  generateSceneThumbnail,
  generateAllSceneThumbnails,
} from "@/lib/actions/storyboard";

// Helper to format time as MM:SS
function formatTimeCode(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ImageShimmer } from "@/components/ui/shimmer";

interface StoryboardTabProps {
  ideaId: string;
  scenes: IdeaScene[];
  hasScript: boolean;
  onScenesUpdate: () => void;
  orientation?: "vertical" | "horizontal" | null;
}

export function StoryboardTab({
  ideaId,
  scenes,
  hasScript,
  onScenesUpdate,
  orientation,
}: StoryboardTabProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingThumbnails, setIsGeneratingThumbnails] = useState(false);
  const [generatingSceneId, setGeneratingSceneId] = useState<string | null>(null);
  const [localScenes, setLocalScenes] = useState<IdeaScene[]>(scenes);

  // Sync with props
  useEffect(() => {
    setLocalScenes(scenes);
  }, [scenes]);

  const handleGenerate = async () => {
    if (isGenerating) return;

    setIsGenerating(true);
    const toastId = toast.loading("Generating storyboard...");
    
    try {
      const result = await generateStoryboard(ideaId);
      if (result.error) {
        toast.error(result.error, { id: toastId });
      } else {
        toast.success(`Storyboard generated with ${result.scenes?.length || 0} scenes`, { id: toastId });
        onScenesUpdate();
        router.refresh();

        // Start generating thumbnails in background
        if (result.scenes && result.scenes.length > 0) {
          setIsGeneratingThumbnails(true);
          toast.loading("Generating scene thumbnails...", { id: "thumbnails" });
          generateAllSceneThumbnails(ideaId)
            .then(() => {
              toast.success("Scene thumbnails generated", { id: "thumbnails" });
              router.refresh();
              onScenesUpdate();
            })
            .catch((err) => {
              toast.error("Failed to generate some thumbnails", { id: "thumbnails" });
              console.error(err);
            })
            .finally(() => setIsGeneratingThumbnails(false));
        }
      }
    } catch (error) {
      toast.error("Failed to generate storyboard", { id: toastId });
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateSceneThumbnail = async (sceneId: string) => {
    if (generatingSceneId) return;

    setGeneratingSceneId(sceneId);
    try {
      const result = await generateSceneThumbnail(sceneId);
      if (result.error) {
        toast.error(result.error);
      } else {
        // Update local state optimistically
        setLocalScenes((prev) =>
          prev.map((s) =>
            s.id === sceneId ? { ...s, thumbnail_url: result.thumbnailUrl || null } : s
          )
        );
        router.refresh();
      }
    } catch (error) {
      toast.error("Failed to generate thumbnail");
      console.error(error);
    } finally {
      setGeneratingSceneId(null);
    }
  };

  // Header with actions
  const header = (
    <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
      <div className="flex items-center gap-3">
        <h4 className="text-sm font-medium text-[var(--grey-800)]">Storyboard</h4>
        {localScenes.length > 0 && (
          <span className="text-xs text-[var(--grey-400)]">
            {localScenes.length} scene{localScenes.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {localScenes.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsGeneratingThumbnails(true);
              toast.loading("Generating thumbnails...", { id: "thumbnails" });
              generateAllSceneThumbnails(ideaId)
                .then(() => {
                  toast.success("Thumbnails generated", { id: "thumbnails" });
                  router.refresh();
                  onScenesUpdate();
                })
                .catch((err) => {
                  toast.error("Failed to generate thumbnails", { id: "thumbnails" });
                  console.error(err);
                })
                .finally(() => setIsGeneratingThumbnails(false));
            }}
            disabled={isGeneratingThumbnails || !!generatingSceneId}
            className="h-7 px-2 gap-1.5"
            title={localScenes.some((s) => !s.thumbnail_url) ? "Generate all thumbnails" : "Regenerate all thumbnails"}
          >
            {isGeneratingThumbnails ? (
              <Loader2 size={14} className="animate-spin" />
            ) : localScenes.every((s) => s.thumbnail_url) ? (
              <RefreshCw size={14} />
            ) : (
              <ImageIcon size={14} />
            )}
            <span className="text-xs">
              {localScenes.every((s) => s.thumbnail_url) ? "Regenerate" : "Generate Thumbnails"}
            </span>
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleGenerate}
          disabled={isGenerating || !hasScript}
          className="h-7 px-2 gap-1.5"
          title={!hasScript ? "Generate a script first" : localScenes.length > 0 ? "Regenerate" : "Generate"}
        >
          {isGenerating ? (
            <Loader2 size={14} className="animate-spin" />
          ) : localScenes.length > 0 ? (
            <RefreshCw size={14} />
          ) : (
            <Sparkles size={14} />
          )}
          <span className="text-xs">{localScenes.length > 0 ? "Regenerate" : "Generate"}</span>
        </Button>
      </div>
    </div>
  );

  // Loading state
  if (isGenerating && localScenes.length === 0) {
    return (
      <>
        {header}
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--grey-50)] mb-4">
            <Loader2 className="h-6 w-6 text-[var(--grey-400)] animate-spin" />
          </div>
          <h3 className="text-sm font-medium text-[var(--grey-600)] mb-1">
            Generating Storyboard
          </h3>
          <p className="text-xs text-[var(--grey-400)] max-w-[200px]">
            Breaking your script into scenes...
          </p>
        </div>
      </>
    );
  }

  // Empty state
  if (localScenes.length === 0) {
    return (
      <>
        {header}
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--grey-50)] mb-4">
            <Film className="h-6 w-6 text-[var(--grey-300)]" />
          </div>
          <h3 className="text-sm font-medium text-[var(--grey-600)] mb-1">
            No Storyboard Yet
          </h3>
          <p className="text-xs text-[var(--grey-400)] max-w-[200px] mb-4">
            {hasScript
              ? "Generate a visual storyboard from your script."
              : "Create a script first, then generate a storyboard."}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            disabled={isGenerating || !hasScript}
            className="gap-2"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Generate Storyboard
          </Button>
        </div>
      </>
    );
  }

  // Scenes list
  return (
    <>
      {header}
      <div className="flex-1 min-h-0 overflow-auto">
        <div className="divide-y divide-[var(--border)]">
          {localScenes.map((scene) => (
            <SceneCard
              key={scene.id}
              scene={scene}
              isGeneratingThumbnail={generatingSceneId === scene.id || isGeneratingThumbnails}
              onGenerateThumbnail={() => handleGenerateSceneThumbnail(scene.id)}
              orientation={orientation}
            />
          ))}
        </div>
        {isGenerating && (
          <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 text-[var(--grey-400)] animate-spin mb-3" />
            <p className="text-sm text-[var(--grey-600)]">Regenerating storyboard...</p>
          </div>
        )}
      </div>
    </>
  );
}

interface SceneCardProps {
  scene: IdeaScene;
  isGeneratingThumbnail: boolean;
  onGenerateThumbnail: () => void;
  orientation?: "vertical" | "horizontal" | null;
}

function SceneCard({ scene, isGeneratingThumbnail, onGenerateThumbnail, orientation }: SceneCardProps) {
  const hasThumbnail = !!scene.thumbnail_url;
  const isVertical = orientation === "vertical";

  // Get unique assets for this scene
  const sceneAssets = scene.assets?.map((sa) => sa.asset).filter(Boolean) as IdeaAsset[] || [];

  return (
    <div className="flex gap-4 p-4">
      {/* Thumbnail */}
      <div className={cn("relative flex-shrink-0", isVertical ? "w-24" : "w-40")}>
        <div className={cn(
          "relative rounded-lg overflow-hidden bg-[var(--grey-100)] group",
          isVertical ? "aspect-[9/16]" : "aspect-video"
        )}>
          {hasThumbnail ? (
            <Image
              src={scene.thumbnail_url!}
              alt={scene.title}
              fill
              className="object-cover"
              sizes={isVertical ? "96px" : "160px"}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              {isGeneratingThumbnail ? (
                <Loader2 className="h-6 w-6 text-[var(--grey-400)] animate-spin" />
              ) : (
                <Film className="h-6 w-6 text-[var(--grey-300)]" />
              )}
            </div>
          )}

          {isGeneratingThumbnail && hasThumbnail && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
              <Loader2 className="h-6 w-6 text-[var(--grey-400)] animate-spin" />
            </div>
          )}

          {/* Generate thumbnail button on hover */}
          {!isGeneratingThumbnail && (
            <button
              onClick={onGenerateThumbnail}
              className={cn(
                "absolute inset-0 flex items-center justify-center",
                "bg-black/60 text-white opacity-0 group-hover:opacity-100",
                "transition-opacity duration-200"
              )}
              title={hasThumbnail ? "Regenerate thumbnail" : "Generate thumbnail"}
            >
              {hasThumbnail ? (
                <RefreshCw className="h-5 w-5" />
              ) : (
                <Sparkles className="h-5 w-5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Scene Details */}
      <div className="flex-1 min-w-0">
        {/* Scene header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <h4 className="text-sm font-medium text-[var(--grey-800)]">
              Scene {scene.scene_number}: {scene.title}
            </h4>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="inline-flex items-center gap-1 text-xs text-[var(--grey-500)]">
                <Clock className="h-3 w-3" />
                {formatTimeCode(scene.start_time_seconds)} – {formatTimeCode(scene.end_time_seconds)}
              </span>
              <span className="text-xs text-[var(--grey-400)]">
                ({scene.end_time_seconds - scene.start_time_seconds}s)
              </span>
            </div>
          </div>
        </div>

        {/* Script excerpt */}
        <p className="text-xs text-[var(--grey-600)] leading-relaxed line-clamp-3 mb-3">
          {scene.script_excerpt}
        </p>

        {/* Assets */}
        {sceneAssets.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {sceneAssets.map((asset) => (
              <span
                key={asset.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--grey-50)] text-[var(--grey-600)]"
              >
                <AssetTypeIcon type={asset.type} />
                {asset.title}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AssetTypeIcon({ type }: { type: AssetType }) {
  switch (type) {
    case "a_roll":
      return <span className="w-2 h-2 rounded-full bg-blue-400" />;
    case "b_roll_footage":
      return <span className="w-2 h-2 rounded-full bg-purple-400" />;
    case "b_roll_image":
      return <span className="w-2 h-2 rounded-full bg-green-400" />;
    case "b_roll_screen_recording":
      return <span className="w-2 h-2 rounded-full bg-orange-400" />;
    case "thumbnail":
      return <span className="w-2 h-2 rounded-full bg-pink-400" />;
    default:
      return <span className="w-2 h-2 rounded-full bg-gray-400" />;
  }
}
