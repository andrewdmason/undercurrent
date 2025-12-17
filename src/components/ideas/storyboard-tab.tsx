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
  LayoutGrid,
  LayoutList,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { IdeaScene, IdeaAsset, ASSET_TYPE_LABELS, AssetType, SceneType, SCENE_TYPE_LABELS, GenerationLog } from "@/lib/types";
import { User, Type, BarChart3, Video, ImageIcon as ImagePlaceholder, Monitor } from "lucide-react";
import {
  generateStoryboard,
  generateSceneThumbnail,
  generateAllSceneThumbnails,
  getSceneThumbnailLog,
} from "@/lib/actions/storyboard";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Helper to format time as MM:SS
function formatTimeCode(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ImageShimmer } from "@/components/ui/shimmer";

type ViewMode = "list" | "grid";

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
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  
  // Generation log dialog state
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<GenerationLog | null>(null);
  const [isLoadingLog, setIsLoadingLog] = useState(false);

  const handleViewLog = async (sceneId: string) => {
    setIsLoadingLog(true);
    setLogDialogOpen(true);
    setSelectedLog(null);
    
    const result = await getSceneThumbnailLog(sceneId);
    setIsLoadingLog(false);
    
    if (result.error) {
      toast.error(result.error);
      setLogDialogOpen(false);
    } else {
      setSelectedLog(result.log);
    }
  };

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
        {/* View toggle */}
        {localScenes.length > 0 && (
          <div className="flex items-center border border-[var(--border)] rounded-md overflow-hidden">
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-1.5 transition-colors",
                viewMode === "list"
                  ? "bg-[var(--grey-100)] text-[var(--grey-700)]"
                  : "text-[var(--grey-400)] hover:text-[var(--grey-600)]"
              )}
              title="List view"
            >
              <LayoutList size={14} />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-1.5 transition-colors",
                viewMode === "grid"
                  ? "bg-[var(--grey-100)] text-[var(--grey-700)]"
                  : "text-[var(--grey-400)] hover:text-[var(--grey-600)]"
              )}
              title="Grid view"
            >
              <LayoutGrid size={14} />
            </button>
          </div>
        )}
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

  // Scenes list or grid
  return (
    <>
      {header}
      <div className="flex-1 min-h-0 overflow-auto">
        {viewMode === "list" ? (
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
        ) : (
          <div className="space-y-6 p-4">
            {sectionOrder.map((sectionTitle) => (
              <GridSectionGroup
                key={sectionTitle}
                sectionTitle={sectionTitle}
                scenes={groupedScenes[sectionTitle]}
                generatingSceneId={generatingSceneId}
                isGeneratingThumbnails={isGeneratingThumbnails}
                onGenerateThumbnail={handleGenerateSceneThumbnail}
                onViewLog={handleViewLog}
                orientation={orientation}
              />
            ))}
          </div>
        )}
        {isGenerating && (
          <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 text-[var(--grey-400)] animate-spin mb-3" />
            <p className="text-sm text-[var(--grey-600)]">Regenerating storyboard...</p>
          </div>
        )}
      </div>

      {/* Generation Log Dialog */}
      <Dialog open={logDialogOpen} onOpenChange={setLogDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Generation Log</DialogTitle>
          </DialogHeader>
          {isLoadingLog ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--grey-400)]" />
            </div>
          ) : selectedLog ? (
            <div className="flex-1 overflow-auto space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[var(--grey-400)] text-xs mb-1">Model</p>
                  <p className="font-mono text-[var(--grey-700)]">{selectedLog.model}</p>
                </div>
                <div>
                  <p className="text-[var(--grey-400)] text-xs mb-1">Generated</p>
                  <p className="text-[var(--grey-700)]">
                    {new Date(selectedLog.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              
              <div>
                <p className="text-[var(--grey-400)] text-xs mb-1">Prompt Sent</p>
                <pre className="bg-[var(--grey-50)] p-3 rounded-lg text-xs text-[var(--grey-700)] whitespace-pre-wrap font-mono overflow-auto max-h-48">
                  {selectedLog.prompt_sent}
                </pre>
              </div>
              
              {selectedLog.response_raw && (
                <div>
                  <p className="text-[var(--grey-400)] text-xs mb-1">Response</p>
                  <pre className="bg-[var(--grey-50)] p-3 rounded-lg text-xs text-[var(--grey-700)] whitespace-pre-wrap font-mono overflow-auto max-h-32">
                    {selectedLog.response_raw}
                  </pre>
                </div>
              )}
              
              {selectedLog.error && (
                <div>
                  <p className="text-red-500 text-xs mb-1">Error</p>
                  <pre className="bg-red-50 p-3 rounded-lg text-xs text-red-700 whitespace-pre-wrap font-mono">
                    {selectedLog.error}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <p className="text-[var(--grey-400)] text-sm py-4">No generation log found for this thumbnail.</p>
          )}
        </DialogContent>
      </Dialog>
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

        {/* Direction and Dialogue in two-column layout */}
        <div className="grid grid-cols-2 gap-3 mt-1">
          {/* Direction column (left) */}
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
          
          {/* Dialogue column (right) */}
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

// Scene type icon with color coding
function SceneTypeIcon({ type, size = 12 }: { type: SceneType; size?: number }) {
  const iconClass = "flex-shrink-0";
  switch (type) {
    case "a_roll":
      return <User size={size} className={cn(iconClass, "text-blue-500")} />;
    case "title":
      return <Type size={size} className={cn(iconClass, "text-amber-500")} />;
    case "graphic":
      return <BarChart3 size={size} className={cn(iconClass, "text-pink-500")} />;
    case "b_roll_footage":
      return <Video size={size} className={cn(iconClass, "text-purple-500")} />;
    case "b_roll_image":
      return <ImagePlaceholder size={size} className={cn(iconClass, "text-green-500")} />;
    case "screen_recording":
      return <Monitor size={size} className={cn(iconClass, "text-orange-500")} />;
    default:
      return <Film size={size} className={cn(iconClass, "text-gray-400")} />;
  }
}

// Grid view section group
interface GridSectionGroupProps {
  sectionTitle: string;
  scenes: IdeaScene[];
  generatingSceneId: string | null;
  isGeneratingThumbnails: boolean;
  onGenerateThumbnail: (sceneId: string) => void;
  onViewLog: (sceneId: string) => void;
  orientation?: "vertical" | "horizontal" | null;
}

function GridSectionGroup({
  sectionTitle,
  scenes,
  generatingSceneId,
  isGeneratingThumbnails,
  onGenerateThumbnail,
  onViewLog,
  orientation,
}: GridSectionGroupProps) {
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

      {/* Scene Grid */}
      <div className={cn(
        "grid gap-3",
        orientation === "vertical" 
          ? "grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8" 
          : "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6"
      )}>
        {scenes.map((scene) => (
          <GridSceneCard
            key={scene.id}
            scene={scene}
            isGeneratingThumbnail={generatingSceneId === scene.id || isGeneratingThumbnails}
            onGenerateThumbnail={() => onGenerateThumbnail(scene.id)}
            onViewLog={() => onViewLog(scene.id)}
            orientation={orientation}
          />
        ))}
      </div>
    </div>
  );
}

// Grid view scene card with larger thumbnail and hover details
interface GridSceneCardProps {
  scene: IdeaScene;
  isGeneratingThumbnail: boolean;
  onGenerateThumbnail: () => void;
  onViewLog: () => void;
  orientation?: "vertical" | "horizontal" | null;
}

function GridSceneCard({ scene, isGeneratingThumbnail, onGenerateThumbnail, onViewLog, orientation }: GridSceneCardProps) {
  const hasThumbnail = !!scene.thumbnail_url;
  const isVertical = orientation === "vertical";
  const sceneAssets = scene.assets?.map((sa) => sa.asset).filter(Boolean) as IdeaAsset[] || [];
  const duration = scene.end_time_seconds - scene.start_time_seconds;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div>
          <HoverCard openDelay={200} closeDelay={100}>
            <HoverCardTrigger asChild>
              <div className="relative group cursor-pointer">
          <div className={cn(
            "relative rounded-lg overflow-hidden bg-[var(--grey-200)]",
            isVertical ? "aspect-[9/16]" : "aspect-video"
          )}>
            {hasThumbnail ? (
              <Image
                src={scene.thumbnail_url!}
                alt={scene.title}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 25vw, (max-width: 768px) 20vw, 16vw"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                {isGeneratingThumbnail ? (
                  <Loader2 className="h-5 w-5 text-[var(--grey-400)] animate-spin" />
                ) : (
                  <Film className="h-5 w-5 text-[var(--grey-300)]" />
                )}
              </div>
            )}

            {/* Scene number and type badge */}
            <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] font-medium flex items-center gap-1">
              <span>{scene.scene_number}</span>
              <SceneTypeIcon type={scene.scene_type} size={10} />
            </div>

            {/* Loading overlay */}
            {isGeneratingThumbnail && hasThumbnail && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                <Loader2 className="h-5 w-5 text-[var(--grey-400)] animate-spin" />
              </div>
            )}

            {/* Generate/regenerate button on hover */}
            {!isGeneratingThumbnail && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onGenerateThumbnail();
                }}
                className={cn(
                  "absolute inset-0 flex items-center justify-center",
                  "bg-black/60 text-white opacity-0 group-hover:opacity-100",
                  "transition-opacity duration-200"
                )}
                title={hasThumbnail ? "Regenerate thumbnail" : "Generate thumbnail"}
              >
                {hasThumbnail ? (
                  <RefreshCw className="h-4 w-4" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
        </div>
      </HoverCardTrigger>
      <HoverCardContent side="right" align="start" className="w-80 p-3">
        <div className="space-y-2">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SceneTypeIcon type={scene.scene_type} size={14} />
              <h4 className="text-sm font-medium text-[var(--grey-800)]">
                {scene.title}
              </h4>
            </div>
            <span className="text-[10px] text-[var(--grey-400)] tabular-nums">
              {formatTimeCode(scene.start_time_seconds)} ({duration}s)
            </span>
          </div>
          
          {/* Section and Type */}
          <div className="flex items-center gap-2">
            {scene.section_title && (
              <span className="text-[10px] text-[var(--grey-400)] uppercase tracking-wide">
                {scene.section_title}
              </span>
            )}
            <span className="text-[10px] text-[var(--grey-500)]">
              {SCENE_TYPE_LABELS[scene.scene_type]}
            </span>
          </div>

          {/* Direction */}
          {scene.direction && (
            <div>
              <p className="text-[10px] font-medium text-[var(--grey-500)] mb-0.5">Direction</p>
              <p className="text-xs text-[var(--grey-600)] italic leading-relaxed">
                {scene.direction}
              </p>
            </div>
          )}

          {/* Dialogue */}
          {scene.dialogue && (
            <div>
              <p className="text-[10px] font-medium text-[var(--grey-500)] mb-0.5">Dialogue</p>
              <p className="text-xs text-[var(--grey-700)] leading-relaxed">
                &ldquo;{scene.dialogue}&rdquo;
              </p>
            </div>
          )}

          {/* Assets */}
          {sceneAssets.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {sceneAssets.map((asset) => (
                <span
                  key={asset.id}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-[var(--grey-100)] text-[var(--grey-600)]"
                >
                  <AssetTypeIcon type={asset.type} />
                  {asset.title}
                </span>
              ))}
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={onGenerateThumbnail} disabled={isGeneratingThumbnail}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {hasThumbnail ? "Regenerate Thumbnail" : "Generate Thumbnail"}
        </ContextMenuItem>
        {hasThumbnail && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={onViewLog}>
              <FileText className="mr-2 h-4 w-4" />
              View Generation Log
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
