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
        <Button
          variant="ghost"
          size="sm"
          onClick={handleGenerate}
          disabled={isGenerating || !hasScript}
          className="h-7 px-2 gap-1.5"
          title={!hasScript ? "Generate a script first" : localScenes.length > 0 ? "Regenerate storyboard and assets" : "Generate storyboard"}
        >
          {isGenerating ? (
            <Loader2 size={14} className="animate-spin" />
          ) : localScenes.length > 0 ? (
            <RefreshCw size={14} />
          ) : (
            <Sparkles size={14} />
          )}
          <span className="text-xs">{localScenes.length > 0 ? "Regen Storyboard" : "Generate"}</span>
        </Button>
        {localScenes.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsGeneratingThumbnails(true);
              toast.loading("Generating sketches...", { id: "thumbnails" });
              generateAllSceneThumbnails(ideaId)
                .then(() => {
                  toast.success("Sketches generated", { id: "thumbnails" });
                  router.refresh();
                  onScenesUpdate();
                })
                .catch((err) => {
                  toast.error("Failed to generate sketches", { id: "thumbnails" });
                  console.error(err);
                })
                .finally(() => setIsGeneratingThumbnails(false));
            }}
            disabled={isGeneratingThumbnails || !!generatingSceneId}
            className="h-7 px-2 gap-1.5"
            title={localScenes.some((s) => !s.thumbnail_url) ? "Generate scene sketches" : "Regenerate scene sketches"}
          >
            {isGeneratingThumbnails ? (
              <Loader2 size={14} className="animate-spin" />
            ) : localScenes.every((s) => s.thumbnail_url) ? (
              <RefreshCw size={14} />
            ) : (
              <ImageIcon size={14} />
            )}
            <span className="text-xs">
              {localScenes.every((s) => s.thumbnail_url) ? "Regen Sketches" : "Gen Sketches"}
            </span>
          </Button>
        )}
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

  // Group scenes by section_title
  const groupedScenes = localScenes.reduce((acc, scene) => {
    const section = scene.section_title || "Untitled Section";
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(scene);
    return acc;
  }, {} as Record<string, IdeaScene[]>);

  // Preserve section order based on first scene in each section
  const sectionOrder = Object.keys(groupedScenes).sort((a, b) => {
    const aFirst = groupedScenes[a][0]?.scene_number || 0;
    const bFirst = groupedScenes[b][0]?.scene_number || 0;
    return aFirst - bFirst;
  });

  // Scenes list
  return (
    <>
      {header}
      <div className="flex-1 min-h-0 overflow-auto">
        <div className="space-y-6 p-4">
          {sectionOrder.map((sectionTitle) => (
            <SectionGroup
              key={sectionTitle}
              sectionTitle={sectionTitle}
              scenes={groupedScenes[sectionTitle]}
              generatingSceneId={generatingSceneId}
              isGeneratingThumbnails={isGeneratingThumbnails}
              onGenerateThumbnail={handleGenerateSceneThumbnail}
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

interface SectionGroupProps {
  sectionTitle: string;
  scenes: IdeaScene[];
  generatingSceneId: string | null;
  isGeneratingThumbnails: boolean;
  onGenerateThumbnail: (sceneId: string) => void;
  orientation?: "vertical" | "horizontal" | null;
}

function SectionGroup({
  sectionTitle,
  scenes,
  generatingSceneId,
  isGeneratingThumbnails,
  onGenerateThumbnail,
  orientation,
}: SectionGroupProps) {
  // Calculate section duration
  const firstScene = scenes[0];
  const lastScene = scenes[scenes.length - 1];
  const startTime = firstScene?.start_time_seconds || 0;
  const endTime = lastScene?.end_time_seconds || 0;
  const duration = endTime - startTime;

  return (
    <div>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--border)]">
        <h3 className="text-sm font-semibold text-[var(--grey-700)]">
          {sectionTitle}
        </h3>
        <span className="text-xs text-[var(--grey-400)]">
          {formatTimeCode(startTime)} – {formatTimeCode(endTime)} ({duration}s)
        </span>
      </div>

      {/* Scene Cards */}
      <div className="space-y-2">
        {scenes.map((scene) => (
          <SceneCard
            key={scene.id}
            scene={scene}
            isGeneratingThumbnail={generatingSceneId === scene.id || isGeneratingThumbnails}
            onGenerateThumbnail={() => onGenerateThumbnail(scene.id)}
            orientation={orientation}
          />
        ))}
      </div>
    </div>
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
  const duration = scene.end_time_seconds - scene.start_time_seconds;

  return (
    <div className="flex gap-3 p-3 rounded-lg bg-[var(--grey-50)] hover:bg-[var(--grey-100)] transition-colors">
      {/* Thumbnail - smaller for shot-level scenes */}
      <div className={cn("relative flex-shrink-0", isVertical ? "w-16" : "w-24")}>
        <div className={cn(
          "relative rounded overflow-hidden bg-[var(--grey-200)] group",
          isVertical ? "aspect-[9/16]" : "aspect-video"
        )}>
          {hasThumbnail ? (
            <Image
              src={scene.thumbnail_url!}
              alt={scene.title}
              fill
              className="object-cover"
              sizes={isVertical ? "64px" : "96px"}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              {isGeneratingThumbnail ? (
                <Loader2 className="h-4 w-4 text-[var(--grey-400)] animate-spin" />
              ) : (
                <Film className="h-4 w-4 text-[var(--grey-300)]" />
              )}
            </div>
          )}

          {isGeneratingThumbnail && hasThumbnail && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
              <Loader2 className="h-4 w-4 text-[var(--grey-400)] animate-spin" />
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
                <RefreshCw className="h-3 w-3" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Scene Details - more compact */}
      <div className="flex-1 min-w-0">
        {/* Scene header with inline timing */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-medium text-[var(--grey-400)] tabular-nums">
            {scene.scene_number}
          </span>
          <h4 className="text-xs font-medium text-[var(--grey-700)] truncate">
            {scene.title}
          </h4>
          <span className="text-[10px] text-[var(--grey-400)] tabular-nums ml-auto flex-shrink-0">
            {formatTimeCode(scene.start_time_seconds)} ({duration}s)
          </span>
        </div>

        {/* Dialogue and Direction in two-column layout */}
        <div className="grid grid-cols-2 gap-3 mt-1">
          {/* Dialogue column */}
          <div className="min-w-0">
            {scene.dialogue ? (
              <p className="text-[11px] text-[var(--grey-700)] leading-relaxed line-clamp-3">
                &ldquo;{scene.dialogue}&rdquo;
              </p>
            ) : (
              <p className="text-[11px] text-[var(--grey-300)] italic">
                No dialogue
              </p>
            )}
          </div>
          
          {/* Direction column */}
          <div className="min-w-0">
            {scene.direction ? (
              <p className="text-[11px] text-[var(--grey-500)] italic leading-relaxed line-clamp-3">
                {scene.direction}
              </p>
            ) : (
              <p className="text-[11px] text-[var(--grey-300)] italic">
                No direction
              </p>
            )}
          </div>
        </div>

        {/* Assets - inline badges */}
        {sceneAssets.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {sceneAssets.map((asset) => (
              <span
                key={asset.id}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-white text-[var(--grey-600)] border border-[var(--grey-200)]"
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
