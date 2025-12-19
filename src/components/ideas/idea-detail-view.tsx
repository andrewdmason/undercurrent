"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { usePollThumbnails } from "@/hooks/use-poll-thumbnails";
import { usePollAssets } from "@/hooks/use-poll-assets";
import Image from "next/image";
import Link from "next/link";
import { Copy, Check, RefreshCw, ArrowLeft, Play, Ban, Sparkles, MoreHorizontal, ListTodo, FileText, Loader2, User, Tag, Trash2, Upload, Film, Monitor, ImageIcon, MessageSquare, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IdeaWithChannels, ProjectTemplateWithChannels, DistributionChannel, IdeaAsset, IdeaScene, AssetType, ASSET_TYPE_LABELS, ProjectImage } from "@/lib/types";
import { generateThumbnail } from "@/lib/actions/thumbnail";
import { cancelIdea, generateUnderlordPrompt, remixIdea } from "@/lib/actions/ideas";
import { toggleAssetComplete, generateTalkingPoints, generateScript, generateAssetImage, generateAssetVideo, linkReferenceImage, unlinkReferenceImage, uploadReferenceImage, deleteReferenceImage, addReferenceImage, batchGenerateAssetImages, batchGenerateAssetVideos, updateAssetContent } from "@/lib/actions/idea-assets";
import { generateStoryboard, generateAllSceneThumbnails } from "@/lib/actions/storyboard";
import { updateTopic, deleteTopic, updateDistributionChannel, deleteDistributionChannel } from "@/lib/actions/project";
import { updateCharacter, deleteCharacter } from "@/lib/actions/characters";
import { cn } from "@/lib/utils";
import { ImageShimmer } from "@/components/ui/shimmer";
import { ImageLightbox, ImageExpandButton } from "@/components/ui/image-lightbox";
import { PlatformIcon, getChannelLabel } from "./idea-card";
import { PublishIdeaModal } from "./publish-idea-modal";
import { ScriptDisplay } from "./script-display";
import { MarkdownDisplay } from "@/components/ui/markdown-display";
import { TiptapEditor } from "@/components/ui/tiptap-editor";
import { ChatSidebar } from "./chat-sidebar";
import { CreateTemplateModal } from "@/components/strategy/create-template-modal";
import { IdeaLogsSubmenu } from "./idea-logs-submenu";
import { RemixIdeaModal, RemixOptions } from "./remix-idea-modal";
import { AssetReferenceImages } from "./asset-reference-images";
import { StoryboardTab } from "./storyboard-tab";

// Helper to get aspect ratio class based on template orientation
function getAspectRatioClass(orientation: "vertical" | "horizontal" | null | undefined): string {
  return orientation === "vertical" ? "aspect-[9/16]" : "aspect-video";
}

interface IdeaDetailViewProps {
  idea: IdeaWithChannels;
  projectId: string;
  projectSlug: string;
  projectChannels: DistributionChannel[];
  projectCharacters: Array<{ id: string; name: string; image_url: string | null }>;
  projectTemplates: Array<{ id: string; name: string; channels?: Array<{ id: string; platform: string }> }>;
  projectTopics: Array<{ id: string; name: string }>;
  projectImages: ProjectImage[];
  fullTemplate: ProjectTemplateWithChannels | null;
  initialAssets: IdeaAsset[];
  initialScenes: IdeaScene[];
}

// Helper to count dialogue words in a script and estimate duration
function getScriptStats(script: string): { wordCount: number; duration: string } {
  const lines = script.split("\n");
  let dialogueWords = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines
    if (!trimmed) continue;
    
    // Skip scene headings (### ...)
    if (trimmed.startsWith("### ")) continue;
    
    // Skip dividers (---)
    if (trimmed === "---") continue;
    
    // Skip speaker names (**Name** or **Name (V.O.)**)
    if (/^\*\*[A-Za-z][A-Za-z0-9 ]*?(?:\s*\((V\.O\.|O\.S\.|unscripted)\))?\*\*$/.test(trimmed)) continue;
    
    // Skip visual directions (*[...]* or *...*)
    if (/^\*\[.+\]\*$/.test(trimmed) || /^\*[^*]+\*$/.test(trimmed)) continue;
    
    // Count words in dialogue lines
    const words = trimmed.split(/\s+/).filter(w => w.length > 0);
    dialogueWords += words.length;
  }

  // Estimate duration: ~150 words per minute for natural conversational speech
  const totalSeconds = Math.round((dialogueWords / 150) * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  const duration = minutes > 0 
    ? `${minutes}:${seconds.toString().padStart(2, "0")}`
    : `0:${seconds.toString().padStart(2, "0")}`;

  return { wordCount: dialogueWords, duration };
}

export function IdeaDetailView({ idea, projectId, projectSlug, projectChannels, projectCharacters, projectTemplates, projectTopics, projectImages, fullTemplate, initialAssets, initialScenes }: IdeaDetailViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  // Read initial tab from URL, default to "talking_points"
  const validTabs = ["talking_points", "script", "storyboard", "assets"] as const;
  type TabType = typeof validTabs[number];
  const urlTab = searchParams.get("tab") as TabType | null;
  const initialTab: TabType = urlTab && validTabs.includes(urlTab) ? urlTab : "talking_points";
  
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [scenes, setScenes] = useState<IdeaScene[]>(initialScenes);
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);
  const [isGeneratingAssets, setIsGeneratingAssets] = useState(false);
  const [isGeneratingUnderlordPrompt, setIsGeneratingUnderlordPrompt] = useState(false);
  const [isScriptUpdating, setIsScriptUpdating] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState<string | null>(idea.prompt);
  const [isCanceling, setIsCanceling] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [underlordModalOpen, setUnderlordModalOpen] = useState(false);
  const [remixModalOpen, setRemixModalOpen] = useState(false);
  const [isRemixing, setIsRemixing] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [isGeneratingTalkingPoints, setIsGeneratingTalkingPoints] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [isGeneratingAssetImage, setIsGeneratingAssetImage] = useState(false);
  const [isGeneratingAssetVideo, setIsGeneratingAssetVideo] = useState(false);
  const [isBatchGeneratingImages, setIsBatchGeneratingImages] = useState(false);
  const [isBatchGeneratingVideos, setIsBatchGeneratingVideos] = useState(false);
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState<"talking_points" | "script" | null>(null);
  const [regenerateNotes, setRegenerateNotes] = useState("");
  const [assets, setAssets] = useState<IdeaAsset[]>(initialAssets);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [showChatSidebar, setShowChatSidebar] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  // When true, Assets tab shows the detail view for selectedAssetId; when false, shows the grid
  const [showAssetDetail, setShowAssetDetail] = useState(false);
  
  // Update URL when tab changes
  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
    // Reset asset detail view when switching away from Assets tab
    if (tab !== "assets") {
      setShowAssetDetail(false);
      setSelectedAssetId(null);
    }
    // Update URL without full page reload
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "talking_points") {
      params.delete("tab"); // Default tab, no need to show in URL
    } else {
      params.set("tab", tab);
    }
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    window.history.replaceState(null, "", newUrl);
  }, [pathname, searchParams]);

  // Sync assets state with initialAssets when server data changes (e.g., after router.refresh())
  useEffect(() => {
    setAssets(initialAssets);
  }, [initialAssets]);

  // Sync scenes state with initialScenes when server data changes
  useEffect(() => {
    setScenes(initialScenes);
  }, [initialScenes]);

  // Derive assets early so they can be used in useEffects
  const selectedAsset = selectedAssetId 
    ? assets.find(a => a.id === selectedAssetId) ?? null 
    : null;
  const scriptAsset = assets.find(a => a.type === "script");
  const talkingPointsAsset = assets.find(a => a.type === "talking_points");
  const currentScript = scriptAsset?.content_text || null;
  
  // Production assets for the Assets tab grid (excludes talking_points and script)
  const productionAssets = assets.filter(a => 
    a.type !== "talking_points" && a.type !== "script"
  );

  // Edit modal state
  const [editingTemplate, setEditingTemplate] = useState<ProjectTemplateWithChannels | null>(null);
  const [editingTopic, setEditingTopic] = useState<{ id: string; name: string; description?: string | null } | null>(null);
  const [editingCharacter, setEditingCharacter] = useState<{ id: string; name: string; description?: string | null; image_url: string | null } | null>(null);
  const [editingChannel, setEditingChannel] = useState<DistributionChannel | null>(null);

  const hasImage = !!idea.image_url;
  const showShimmer = isGeneratingThumbnail || isRemixing || !hasImage;

  // Poll for thumbnail updates when image is missing
  const handleThumbnailUpdate = useCallback(() => {
    router.refresh();
  }, [router]);

  usePollThumbnails({
    pendingIdeaIds: hasImage ? [] : [idea.id],
    onUpdate: handleThumbnailUpdate,
    enabled: !hasImage,
  });

  // Check if assets are likely being generated (idea updated within last 60 seconds and no assets)
  const isRecentlyUpdated = Date.now() - new Date(idea.updated_at).getTime() < 60000;
  const assetsLikelyGenerating = assets.length === 0 && isRecentlyUpdated;

  // Poll for asset updates when we think they're being generated
  const handleAssetUpdate = useCallback(() => {
    router.refresh();
  }, [router]);

  usePollAssets({
    ideaId: idea.id,
    currentAssetCount: assets.length,
    onUpdate: handleAssetUpdate,
    enabled: assetsLikelyGenerating,
  });

  const handleToggleAssetComplete = async (assetId: string) => {
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;
    
    const newIsComplete = !asset.is_complete;
    
    // Optimistic update
    setAssets(prev => 
      prev.map(a => 
        a.id === assetId ? { ...a, is_complete: newIsComplete } : a
      )
    );
    
    // Persist to database
    const result = await toggleAssetComplete(assetId, newIsComplete);
    if (!result.success) {
      // Revert on error
      setAssets(prev => 
        prev.map(a => 
          a.id === assetId ? { ...a, is_complete: asset.is_complete } : a
        )
      );
      toast.error(result.error || "Failed to update asset");
    }
  };

  const handleGenerateThumbnail = async () => {
    if (isGeneratingThumbnail) return;

    setIsGeneratingThumbnail(true);
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
      setIsGeneratingThumbnail(false);
    }
  };

  const handleGenerateAssets = async () => {
    if (isGeneratingAssets) return;

    setIsGeneratingAssets(true);
    const toastId = toast.loading("Generating storyboard...");

    try {
      // Generate storyboard which creates scenes AND assets together
      const result = await generateStoryboard(idea.id);
      if (result.error) {
        toast.error(result.error, { id: toastId });
      } else {
        toast.success(`Storyboard generated with ${result.scenes?.length || 0} scenes`, { id: toastId });
        router.refresh();

        // Generate scene thumbnails in background
        if (result.scenes && result.scenes.length > 0) {
          toast.loading("Generating scene thumbnails...", { id: "thumbnails" });
          generateAllSceneThumbnails(idea.id)
            .then(() => {
              toast.success("Scene thumbnails generated", { id: "thumbnails" });
              router.refresh();
            })
            .catch((err) => {
              toast.error("Failed to generate some thumbnails", { id: "thumbnails" });
              console.error(err);
            });
        }
      }
    } catch (error) {
      toast.error("Failed to generate storyboard", { id: toastId });
      console.error(error);
    } finally {
      setIsGeneratingAssets(false);
    }
  };

  const handleGenerateTalkingPoints = async (notes?: string) => {
    if (isGeneratingTalkingPoints) return;
    
    setIsGeneratingTalkingPoints(true);
    setRegenerateDialogOpen(null);
    setRegenerateNotes("");
    
    try {
      // Pass notes as regenerationNotes (third param), not userContext (second param)
      const result = await generateTalkingPoints(idea.id, undefined, notes?.trim() || undefined);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Talking points generated");
        router.refresh();
      }
    } catch (error) {
      toast.error("Failed to generate talking points");
      console.error(error);
    } finally {
      setIsGeneratingTalkingPoints(false);
    }
  };

  const handleGenerateScript = async (notes?: string) => {
    if (isGeneratingScript) return;
    
    // Check if talking points exist
    if (!talkingPointsAsset?.content_text) {
      toast.error("Generate talking points first before creating a script");
      return;
    }
    
    setIsGeneratingScript(true);
    setRegenerateDialogOpen(null);
    setRegenerateNotes("");
    
    try {
      const result = await generateScript(idea.id, notes?.trim() || undefined);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Script generated");
        router.refresh();
      }
    } catch (error) {
      toast.error("Failed to generate script");
      console.error(error);
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const handleGenerateAssetImage = async () => {
    if (!selectedAsset || isGeneratingAssetImage) return;
    
    setIsGeneratingAssetImage(true);
    try {
      const result = await generateAssetImage(selectedAsset.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Image generated");
        router.refresh();
      }
    } catch (error) {
      toast.error("Failed to generate image");
      console.error(error);
    } finally {
      setIsGeneratingAssetImage(false);
    }
  };

  const handleGenerateAssetVideo = async () => {
    if (!selectedAsset || isGeneratingAssetVideo) return;
    
    setIsGeneratingAssetVideo(true);
    try {
      const result = await generateAssetVideo(selectedAsset.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Video generated");
        router.refresh();
      }
    } catch (error) {
      toast.error("Failed to generate video");
      console.error(error);
    } finally {
      setIsGeneratingAssetVideo(false);
    }
  };

  const handleBatchGenerateImages = async () => {
    if (isBatchGeneratingImages) return;

    setIsBatchGeneratingImages(true);
    const toastId = toast.loading("Generating images for all assets...");
    try {
      const result = await batchGenerateAssetImages(idea.id);
      if (result.error) {
        toast.error(result.error, { id: toastId });
      } else {
        const message = result.generated > 0
          ? `Generated ${result.generated} image${result.generated !== 1 ? "s" : ""}${result.failed > 0 ? `, ${result.failed} failed` : ""}`
          : "No assets needed image generation";
        toast.success(message, { id: toastId });
        router.refresh();
      }
    } catch (error) {
      toast.error("Failed to batch generate images", { id: toastId });
      console.error(error);
    } finally {
      setIsBatchGeneratingImages(false);
    }
  };

  const handleBatchGenerateVideos = async () => {
    if (isBatchGeneratingVideos) return;

    setIsBatchGeneratingVideos(true);
    const toastId = toast.loading("Generating videos for all assets (this may take a while)...");
    try {
      const result = await batchGenerateAssetVideos(idea.id);
      if (result.error) {
        toast.error(result.error, { id: toastId });
      } else {
        const message = result.generated > 0
          ? `Generated ${result.generated} video${result.generated !== 1 ? "s" : ""}${result.failed > 0 ? `, ${result.failed} failed` : ""}`
          : "No assets needed video generation";
        toast.success(message, { id: toastId });
        router.refresh();
      }
    } catch (error) {
      toast.error("Failed to batch generate videos", { id: toastId });
      console.error(error);
    } finally {
      setIsBatchGeneratingVideos(false);
    }
  };

  const handleCopyPrompt = async () => {
    if (!currentPrompt) return;
    try {
      await navigator.clipboard.writeText(currentPrompt);
      setCopiedPrompt(true);
      toast.success("Prompt copied to clipboard");
      setTimeout(() => setCopiedPrompt(false), 2000);
    } catch {
      toast.error("Failed to copy prompt");
    }
  };

  const handleGenerateUnderlordPrompt = async () => {
    if (isGeneratingUnderlordPrompt) return;

    setIsGeneratingUnderlordPrompt(true);
    try {
      const result = await generateUnderlordPrompt(idea.id);
      if (result.error) {
        toast.error(result.error);
      } else if (result.underlordPrompt) {
        setCurrentPrompt(result.underlordPrompt);
        toast.success("Underlord prompt generated");
        router.refresh();
      }
    } catch (error) {
      toast.error("Failed to generate Underlord prompt");
      console.error(error);
    } finally {
      setIsGeneratingUnderlordPrompt(false);
    }
  };

  const handleOpenUnderlordModal = async () => {
    setUnderlordModalOpen(true);
    // If no prompt exists yet, generate it
    if (!currentPrompt && !isGeneratingUnderlordPrompt) {
      await handleGenerateUnderlordPrompt();
    }
  };

  const handleCancel = async () => {
    if (isCanceling) return;

    setIsCanceling(true);
    try {
      const result = await cancelIdea(idea.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Idea removed");
        router.push(`/${projectSlug}`);
        router.refresh();
      }
    } catch (error) {
      toast.error("Failed to cancel idea");
      console.error(error);
    } finally {
      setIsCanceling(false);
    }
  };

  const handleRemix = async (options: RemixOptions) => {
    if (isRemixing) return;

    setIsRemixing(true);
    try {
      const result = await remixIdea(idea.id, {
        characterIds: options.characterIds,
        channelIds: options.channelIds,
        templateId: options.templateId,
        customInstructions: options.customInstructions,
        saveAsCopy: options.saveAsCopy,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        setRemixModalOpen(false);
        if (result.isCopy) {
          toast.success(`Created remix: "${result.title}"`, {
            action: {
              label: "View",
              onClick: () => router.push(`/${projectSlug}/ideas/${result.ideaId}`),
            },
          });
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
    <div className="flex-1 flex flex-col bg-[var(--grey-25)] min-h-0">
      {/* Back Navigation & Title Bar */}
      <div className="border-b border-[var(--border)] bg-[var(--grey-0)]">
        <div className="px-6 py-3 flex items-center gap-4">
          <Link
            href={`/${projectSlug}`}
            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-[var(--grey-500)] hover:text-[var(--grey-800)] hover:bg-[var(--grey-50)] transition-colors flex-shrink-0"
            aria-label="Back to Ideas"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <h1 className="text-base font-semibold text-[var(--grey-800)] tracking-[-0.2px] truncate">
              {idea.title}
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setRemixModalOpen(true)}
              className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg transition-all border border-[var(--border)] bg-[var(--grey-0)] text-[var(--grey-600)] hover:bg-[var(--grey-50)] hover:text-[var(--grey-800)]"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Remix
            </button>
            <button
              onClick={handleOpenUnderlordModal}
              disabled={!currentScript}
              title={!currentScript ? "Generate a script first" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 h-8 px-4 text-xs font-medium rounded-lg transition-all",
                currentScript
                  ? "bg-gradient-to-t from-[#262626] to-[#404040] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)] hover:brightness-110"
                  : "bg-[var(--grey-100)] text-[var(--grey-400)] cursor-not-allowed"
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Create with Underlord
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-[var(--border)] bg-[var(--grey-0)] text-[var(--grey-500)] hover:bg-[var(--grey-50)] hover:text-[var(--grey-800)] transition-colors"
                  aria-label="More options"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="min-w-[160px] rounded-lg border border-[var(--border)] bg-[var(--grey-0)] p-1 shadow-[0px_8px_16px_rgba(0,0,0,0.12),0px_8px_8px_rgba(0,0,0,0.08)]"
              >
                <DropdownMenuItem
                  onClick={() => setPublishModalOpen(true)}
                  className="flex items-center gap-2 h-8 px-2 rounded-md text-xs text-[var(--grey-800)] hover:bg-[var(--grey-50-a)] cursor-pointer"
                >
                  <Play className="h-3.5 w-3.5" />
                  Publish
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[var(--grey-100-a)] -mx-1 my-1" />
                <DropdownMenuItem
                  onClick={() => {
                    if (talkingPointsAsset?.content_text) {
                      setRegenerateDialogOpen("talking_points");
                    } else {
                      handleGenerateTalkingPoints();
                    }
                  }}
                  disabled={isGeneratingTalkingPoints}
                  className="flex items-center gap-2 h-8 px-2 rounded-md text-xs text-[var(--grey-800)] hover:bg-[var(--grey-50-a)] cursor-pointer disabled:opacity-50"
                >
                  {isGeneratingTalkingPoints ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  {talkingPointsAsset?.content_text ? "Regenerate Talking Points" : "Generate Talking Points"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    if (scriptAsset?.content_text) {
                      setRegenerateDialogOpen("script");
                    } else {
                      handleGenerateScript();
                    }
                  }}
                  disabled={isGeneratingScript || !talkingPointsAsset?.content_text}
                  className="flex items-center gap-2 h-8 px-2 rounded-md text-xs text-[var(--grey-800)] hover:bg-[var(--grey-50-a)] cursor-pointer disabled:opacity-50"
                >
                  {isGeneratingScript ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  {scriptAsset?.content_text ? "Regenerate Script" : "Generate Script"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleGenerateThumbnail}
                  disabled={isGeneratingThumbnail}
                  className="flex items-center gap-2 h-8 px-2 rounded-md text-xs text-[var(--grey-800)] hover:bg-[var(--grey-50-a)] cursor-pointer disabled:opacity-50"
                >
                  {isGeneratingThumbnail ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  Regenerate Thumbnail
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleGenerateAssets}
                  disabled={isGeneratingAssets || !scriptAsset?.content_text}
                  className="flex items-center gap-2 h-8 px-2 rounded-md text-xs text-[var(--grey-800)] hover:bg-[var(--grey-50-a)] cursor-pointer disabled:opacity-50"
                >
                  {isGeneratingAssets ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  {scenes.length > 0 ? "Regenerate Storyboard" : "Generate Storyboard"}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[var(--grey-100-a)] -mx-1 my-1" />
                <DropdownMenuItem
                  onClick={() => setShowChatSidebar(!showChatSidebar)}
                  className="flex items-center gap-2 h-8 px-2 rounded-md text-xs text-[var(--grey-800)] hover:bg-[var(--grey-50-a)] cursor-pointer"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  {showChatSidebar ? "Hide AI Chat" : "Show AI Chat"}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[var(--grey-100-a)] -mx-1 my-1" />
                <IdeaLogsSubmenu ideaId={idea.id} projectId={projectId} />
                <DropdownMenuSeparator className="bg-[var(--grey-100-a)] -mx-1 my-1" />
                <DropdownMenuItem
                  onClick={handleCancel}
                  disabled={isCanceling}
                  className="flex items-center gap-2 h-8 px-2 rounded-md text-xs text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                >
                  <Ban className="h-3.5 w-3.5" />
                  {isCanceling ? "Deleting..." : "Delete this idea"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Main Content - Three Column Layout */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full px-6 py-6 flex flex-col">
          <div className="grid gap-6 flex-1 min-h-0 overflow-hidden" style={{ gridTemplateColumns: showChatSidebar ? '340px minmax(400px, 1fr) 300px' : '340px minmax(400px, 1fr)' }}>
            {/* Left Column - Image & Info */}
            <div className="flex flex-col gap-4 min-h-0 h-full">

              {/* Image */}
              <div className="group/image relative w-full aspect-video overflow-hidden rounded-lg bg-[var(--grey-100)]">
                {hasImage && (
                  <Image
                    src={idea.image_url!}
                    alt=""
                    fill
                    className={cn(
                      fullTemplate?.orientation === "vertical" ? "object-contain" : "object-cover",
                      showShimmer && "opacity-0"
                    )}
                    sizes="(max-width: 768px) 100vw, 400px"
                  />
                )}
                
                {showShimmer && <ImageShimmer />}

                {/* Expand image button - top left on hover */}
                {hasImage && !showShimmer && (
                  <ImageExpandButton
                    onClick={() => setLightboxOpen(true)}
                    className="opacity-0 group-hover/image:opacity-100"
                  />
                )}

                {!showShimmer && (
                  <button
                    onClick={handleGenerateThumbnail}
                    className={cn(
                      "absolute bottom-3 right-3 p-2 rounded-md",
                      "bg-black/60 text-white opacity-0 group-hover/image:opacity-100",
                      "transition-opacity duration-200",
                      "hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-white/50"
                    )}
                    title="Regenerate thumbnail"
                    aria-label="Regenerate thumbnail"
                  >
                    <RefreshCw className="h-5 w-5" />
                  </button>
                )}
              </div>

              {/* Image Lightbox */}
              {hasImage && (
                <ImageLightbox
                  src={idea.image_url!}
                  open={lightboxOpen}
                  onOpenChange={setLightboxOpen}
                />
              )}

              {/* Description Card with all metadata */}
              <DescriptionCard 
                idea={idea} 
                fullTemplate={fullTemplate} 
                setEditingTemplate={setEditingTemplate} 
                setEditingTopic={setEditingTopic} 
                setEditingCharacter={setEditingCharacter}
              />
            </div>

            {/* Middle Column - Tabs */}
            <div className="flex flex-col min-h-0 h-full">
              <Tabs
                value={activeTab}
                onValueChange={(v) => handleTabChange(v as typeof activeTab)}
                className="flex-1 flex flex-col min-h-0"
              >
                {/* Tab Bar - Pill/Segmented style matching Creative Brief */}
                <TabsList className="flex-shrink-0 h-9 p-1 bg-[var(--grey-50)] rounded-lg inline-flex w-auto mb-4">
                  <TabsTrigger 
                    value="talking_points"
                    className="rounded-md px-3 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-[var(--grey-800)] data-[state=active]:shadow-sm data-[state=inactive]:bg-transparent data-[state=inactive]:text-[var(--grey-400)] data-[state=inactive]:shadow-none hover:text-[var(--grey-600)] cursor-default"
                  >
                    Talking Points
                  </TabsTrigger>
                  <TabsTrigger
                    value="script"
                    className="rounded-md px-3 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-[var(--grey-800)] data-[state=active]:shadow-sm data-[state=inactive]:bg-transparent data-[state=inactive]:text-[var(--grey-400)] data-[state=inactive]:shadow-none hover:text-[var(--grey-600)] cursor-default"
                  >
                    Script
                  </TabsTrigger>
                  <TabsTrigger
                    value="storyboard"
                    className="rounded-md px-3 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-[var(--grey-800)] data-[state=active]:shadow-sm data-[state=inactive]:bg-transparent data-[state=inactive]:text-[var(--grey-400)] data-[state=inactive]:shadow-none hover:text-[var(--grey-600)] cursor-default"
                  >
                    Storyboard
                  </TabsTrigger>
                  <TabsTrigger
                    value="assets"
                    className="rounded-md px-3 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-[var(--grey-800)] data-[state=active]:shadow-sm data-[state=inactive]:bg-transparent data-[state=inactive]:text-[var(--grey-400)] data-[state=inactive]:shadow-none hover:text-[var(--grey-600)] cursor-default"
                  >
                    Assets
                    {productionAssets.length > 0 && (
                      <span className="ml-1.5 text-xs text-[var(--grey-400)]">
                        ({productionAssets.length})
                      </span>
                    )}
                  </TabsTrigger>
                </TabsList>

                {/* Talking Points Tab */}
                <TabsContent value="talking_points" className="flex-1 min-h-0 m-0 data-[state=inactive]:hidden">
                  <div className="h-full flex flex-col rounded-lg border border-[var(--border)] bg-[var(--grey-0)] overflow-hidden">
                    <TalkingPointsTabContent
                      talkingPointsAsset={talkingPointsAsset}
                      isGeneratingTalkingPoints={isGeneratingTalkingPoints}
                      handleGenerateTalkingPoints={handleGenerateTalkingPoints}
                      setRegenerateDialogOpen={setRegenerateDialogOpen}
                    />
                  </div>
                </TabsContent>

                {/* Script Tab */}
                <TabsContent value="script" className="flex-1 min-h-0 m-0 data-[state=inactive]:hidden">
                  <div className="h-full flex flex-col rounded-lg border border-[var(--border)] bg-[var(--grey-0)] overflow-hidden">
                    <ScriptTabContent
                      scriptAsset={scriptAsset}
                      talkingPointsAsset={talkingPointsAsset}
                      isGeneratingScript={isGeneratingScript}
                      isScriptUpdating={isScriptUpdating}
                      handleGenerateScript={handleGenerateScript}
                      setRegenerateDialogOpen={setRegenerateDialogOpen}
                      setActiveTab={handleTabChange}
                    />
                  </div>
                </TabsContent>

                {/* Storyboard Tab */}
                <TabsContent value="storyboard" className="flex-1 min-h-0 m-0 data-[state=inactive]:hidden">
                  <div className="h-full flex flex-col rounded-lg border border-[var(--border)] bg-[var(--grey-0)] overflow-hidden relative">
                    <StoryboardTab
                      ideaId={idea.id}
                      scenes={scenes}
                      hasScript={!!scriptAsset?.content_text}
                      onScenesUpdate={() => router.refresh()}
                      orientation={fullTemplate?.orientation}
                    />
                  </div>
                </TabsContent>

                {/* Assets Tab */}
                <TabsContent value="assets" className="flex-1 min-h-0 m-0 data-[state=inactive]:hidden">
                  <div className="h-full flex flex-col rounded-lg border border-[var(--border)] bg-[var(--grey-0)] overflow-hidden">
                    <AssetsTabContent
                      productionAssets={productionAssets}
                      selectedAsset={selectedAsset}
                      showAssetDetail={showAssetDetail}
                      setShowAssetDetail={setShowAssetDetail}
                      setSelectedAssetId={setSelectedAssetId}
                      handleToggleAssetComplete={handleToggleAssetComplete}
                      handleGenerateAssetImage={handleGenerateAssetImage}
                      handleGenerateAssetVideo={handleGenerateAssetVideo}
                      handleGenerateAssets={handleGenerateAssets}
                      handleBatchGenerateImages={handleBatchGenerateImages}
                      handleBatchGenerateVideos={handleBatchGenerateVideos}
                      isGeneratingAssetImage={isGeneratingAssetImage}
                      isGeneratingAssetVideo={isGeneratingAssetVideo}
                      isGeneratingAssets={isGeneratingAssets}
                      isBatchGeneratingImages={isBatchGeneratingImages}
                      isBatchGeneratingVideos={isBatchGeneratingVideos}
                      hasScript={!!scriptAsset?.content_text}
                      projectImages={projectImages}
                      idea={idea}
                      router={router}
                      assetsLikelyGenerating={assetsLikelyGenerating}
                      templateOrientation={fullTemplate?.orientation ?? null}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Right Column - Chat (full height) */}
            {showChatSidebar && (
              <div className="flex flex-col min-h-0 h-full">
                <ChatSidebar
                  ideaId={idea.id}
                  projectSlug={projectSlug}
                  onScriptUpdate={() => router.refresh()}
                  onIdeaRegenerate={() => router.refresh()}
                  onToolCallStart={(toolName) => {
                    if (toolName === "update_script") setIsScriptUpdating(true);
                  }}
                  onToolCallEnd={(toolName) => {
                    // Add minimum delay so shimmer is visible
                    if (toolName === "update_script") {
                      setTimeout(() => setIsScriptUpdating(false), 800);
                    }
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Publish Modal */}
      <PublishIdeaModal
        ideaId={idea.id}
        ideaTitle={idea.title}
        channels={idea.channels}
        open={publishModalOpen}
        onOpenChange={setPublishModalOpen}
      />

      {/* Remix Modal */}
      <RemixIdeaModal
        open={remixModalOpen}
        onOpenChange={setRemixModalOpen}
        onRemix={handleRemix}
        isRemixing={isRemixing}
        ideaTitle={idea.title}
        currentSelections={{
          channelIds: idea.channels?.map(c => c.id) || [],
          characterIds: idea.characters?.map(c => c.id) || [],
          templateId: idea.template?.id || null,
        }}
        characters={projectCharacters}
        channels={projectChannels.map(c => ({
          id: c.id,
          platform: c.platform,
          custom_label: c.custom_label,
        }))}
        templates={projectTemplates}
      />

      {/* Underlord Prompt Modal */}
      <Dialog open={underlordModalOpen} onOpenChange={setUnderlordModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#007bc2]" />
              Create with Underlord
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            {isGeneratingUnderlordPrompt ? (
              // Loading state
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--grey-50)] mb-4">
                  <Loader2 className="h-6 w-6 text-[#007bc2] animate-spin" />
                </div>
                <h3 className="text-sm font-medium text-[var(--grey-600)] mb-1">
                  Generating Underlord Prompt
                </h3>
                <p className="text-xs text-[var(--grey-400)] max-w-[240px]">
                  Creating detailed editing instructions based on your script...
                </p>
              </div>
            ) : currentPrompt ? (
              // Prompt content
              <>
                <p className="text-sm text-[var(--grey-500)] mb-4">
                  Copy this prompt and paste it into Underlord to generate your video.
                </p>
                <div className="relative rounded-lg border border-[var(--border)] bg-[var(--grey-50)]">
                  <div className="absolute top-3 right-3 flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleGenerateUnderlordPrompt}
                      className="h-8 px-2"
                      title="Regenerate prompt"
                    >
                      <RefreshCw size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyPrompt}
                      className="h-8 px-3 gap-1.5"
                    >
                      {copiedPrompt ? (
                        <>
                          <Check size={14} className="text-[#00975a]" />
                          <span className="text-[#00975a]">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          <span>Copy</span>
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="p-4 pt-12 max-h-[400px] overflow-auto">
                    <pre className="text-sm text-[var(--grey-800)] whitespace-pre-wrap font-mono leading-relaxed">
                      {currentPrompt}
                    </pre>
                  </div>
                </div>
              </>
            ) : (
              // Error/fallback state (shouldn't normally happen)
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-sm text-[var(--grey-500)]">
                  Unable to generate prompt. Please try again.
                </p>
                <Button
                  size="sm"
                  onClick={handleGenerateUnderlordPrompt}
                  className="mt-4 bg-[var(--cyan-600)] hover:bg-[var(--cyan-600)]/90 text-white"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Try Again
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Edit Modal */}
      <CreateTemplateModal
        open={!!editingTemplate}
        onOpenChange={(open) => !open && setEditingTemplate(null)}
        projectId={projectId}
        channels={projectChannels}
        onTemplateCreated={() => {}}
        onTemplateUpdated={() => router.refresh()}
        editingTemplate={editingTemplate}
      />

      {/* Topic Edit Modal */}
      <TopicEditModal
        topic={editingTopic}
        onClose={() => setEditingTopic(null)}
        projectId={projectId}
        onUpdate={() => router.refresh()}
      />

      {/* Character Edit Modal */}
      <CharacterEditModal
        character={editingCharacter}
        onClose={() => setEditingCharacter(null)}
        projectId={projectId}
        onUpdate={() => router.refresh()}
      />

      {/* Channel Edit Modal */}
      <ChannelEditModal
        channel={editingChannel}
        onClose={() => setEditingChannel(null)}
        onUpdate={() => router.refresh()}
      />

      {/* Regenerate Dialog */}
      <Dialog 
        open={regenerateDialogOpen !== null} 
        onOpenChange={(open) => {
          if (!open) {
            setRegenerateDialogOpen(null);
            setRegenerateNotes("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {regenerateDialogOpen === "talking_points" ? "Regenerate Talking Points" : "Regenerate Script"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--grey-700)]">
                Notes for regeneration <span className="text-[var(--grey-400)] font-normal">(optional)</span>
              </label>
              <Textarea
                placeholder="e.g., Make it more conversational, focus more on the benefits, shorter intro..."
                value={regenerateNotes}
                onChange={(e) => setRegenerateNotes(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-[var(--grey-500)]">
                Add any specific instructions or changes you want in the regenerated content.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setRegenerateDialogOpen(null);
                  setRegenerateNotes("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (regenerateDialogOpen === "talking_points") {
                    handleGenerateTalkingPoints(regenerateNotes);
                  } else {
                    handleGenerateScript(regenerateNotes);
                  }
                }}
                disabled={isGeneratingTalkingPoints || isGeneratingScript}
              >
                {(isGeneratingTalkingPoints || isGeneratingScript) ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  "Regenerate"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

// ===========================================
// Description Card with Truncation
// ===========================================

interface DescriptionCardProps {
  idea: IdeaWithChannels;
  fullTemplate: ProjectTemplateWithChannels | null;
  setEditingTemplate: (template: ProjectTemplateWithChannels) => void;
  setEditingTopic: (topic: { id: string; name: string; description?: string | null }) => void;
  setEditingCharacter: (character: { id: string; name: string; description?: string | null; image_url: string | null }) => void;
}

function DescriptionCard({ 
  idea, 
  fullTemplate, 
  setEditingTemplate, 
  setEditingTopic, 
  setEditingCharacter 
}: DescriptionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--grey-0)] p-4">
      {idea.description && (
        <>
          <h4 className="text-xs font-semibold text-[var(--grey-600)] uppercase tracking-wider mb-2">
            Description
          </h4>
          <div className="relative">
            <p className={cn(
              "text-sm text-[var(--grey-800)] leading-relaxed",
              !isExpanded && "line-clamp-3"
            )}>
              {idea.description}
            </p>
            {!isExpanded && idea.description.length > 200 && (
              <button
                onClick={() => setIsExpanded(true)}
                className="text-sm text-[var(--grey-500)] hover:text-[var(--grey-700)] mt-1 underline"
              >
                more
              </button>
            )}
          </div>
        </>
      )}
      
      {/* All Pills - Template (with channel icons), Characters, Topics */}
      {(idea.template || (idea.characters?.length ?? 0) > 0 || (idea.topics?.length ?? 0) > 0) && (
        <div className={cn("flex items-center gap-1.5 flex-wrap", idea.description && "mt-4 pt-4 border-t border-[var(--border)]")}>
          {/* Template Pill with embedded channel icons */}
          {idea.template && fullTemplate && (
            <button
              onClick={() => setEditingTemplate(fullTemplate)}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--grey-50)] text-[var(--grey-600)] hover:bg-[var(--grey-100)] transition-colors cursor-pointer"
            >
              {fullTemplate.channels.length > 0 && (
                <span className="flex items-center gap-0.5">
                  {fullTemplate.channels.map((channel) => (
                    <PlatformIcon
                      key={channel.id}
                      platform={channel.platform}
                      className="size-3 text-[var(--grey-400)]"
                    />
                  ))}
                </span>
              )}
              {idea.template.name}
            </button>
          )}
          {/* Topic Pills */}
          {idea.topics?.map((topic) => (
            <button
              key={topic.id}
              onClick={() => setEditingTopic(topic)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--grey-50)] text-[var(--grey-600)] hover:bg-[var(--grey-100)] transition-colors cursor-pointer"
            >
              <Tag className="h-3 w-3" />
              {topic.name}
            </button>
          ))}
          {/* Character Avatars */}
          {idea.characters?.map((character) => (
            <button
              key={character.id}
              onClick={() => setEditingCharacter(character)}
              className="hover:ring-2 hover:ring-[var(--grey-300)] rounded-full transition-all cursor-pointer"
              title={character.name}
            >
              {character.image_url ? (
                <div className="w-5 h-5 rounded-full overflow-hidden">
                  <Image
                    src={character.image_url}
                    alt={character.name}
                    width={20}
                    height={20}
                    className="w-full h-full object-cover scale-125"
                  />
                </div>
              ) : (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--grey-100)] text-[var(--grey-500)]">
                  <User className="h-3 w-3" />
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ===========================================
// Edit Modal Components
// ===========================================

interface TopicEditModalProps {
  topic: { id: string; name: string; description?: string | null } | null;
  onClose: () => void;
  projectId: string;
  onUpdate: () => void;
}

function TopicEditModal({ topic, onClose, projectId, onUpdate }: TopicEditModalProps) {
  const [name, setName] = useState(topic?.name || "");
  const [description, setDescription] = useState(topic?.description || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Reset form when topic changes
  if (topic && !initialized) {
    setName(topic.name);
    setDescription(topic.description || "");
    setInitialized(true);
  }
  
  // Reset initialized flag when modal closes
  if (!topic && initialized) {
    setInitialized(false);
  }

  const handleSave = async () => {
    if (!topic || !name.trim()) return;
    setIsSaving(true);
    await updateTopic(topic.id, { name: name.trim(), description: description.trim() || null });
    setIsSaving(false);
    onUpdate();
    onClose();
  };

  const handleDelete = async () => {
    if (!topic) return;
    setIsDeleting(true);
    await deleteTopic(topic.id);
    setIsDeleting(false);
    onUpdate();
    onClose();
  };

  return (
    <Dialog open={!!topic} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[520px] rounded-lg">
        <DialogHeader className="px-4 min-h-8">
          <DialogTitle className="text-xs font-semibold text-[var(--grey-800)]">
            Edit Topic
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 px-4 pb-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--grey-600)]">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Upcoming Events"
              className="h-8 rounded-lg bg-black/[0.03] border-0 text-xs focus-visible:ring-2 focus-visible:ring-[#007bc2]"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--grey-600)]">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Visit the website calendar and make videos that promote upcoming events..."
              rows={3}
              className={cn(
                "w-full rounded-lg bg-black/[0.03] border-0 px-3 py-2",
                "text-xs text-[var(--grey-800)] placeholder:text-[var(--grey-400)]",
                "focus:outline-none focus:ring-2 focus:ring-[#007bc2]",
                "resize-none"
              )}
            />
          </div>
          <div className="flex justify-between pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting || isSaving}
              className="h-8 text-xs text-[var(--grey-400)] hover:text-[#f72736]"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onClose} disabled={isSaving} className="h-8 text-xs">
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={!name.trim() || isSaving} className="h-8 text-xs">
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface CharacterEditModalProps {
  character: { id: string; name: string; description?: string | null; image_url: string | null } | null;
  onClose: () => void;
  projectId: string;
  onUpdate: () => void;
}

function CharacterEditModal({ character, onClose, projectId, onUpdate }: CharacterEditModalProps) {
  const [name, setName] = useState(character?.name || "");
  const [description, setDescription] = useState(character?.description || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Reset form when character changes
  if (character && !initialized) {
    setName(character.name);
    setDescription(character.description || "");
    setInitialized(true);
  }
  
  // Reset initialized flag when modal closes
  if (!character && initialized) {
    setInitialized(false);
  }

  const handleSave = async () => {
    if (!character || !name.trim()) return;
    setIsSaving(true);
    await updateCharacter(character.id, projectId, { name: name.trim(), description: description.trim() || null });
    setIsSaving(false);
    onUpdate();
    onClose();
  };

  const handleDelete = async () => {
    if (!character) return;
    setIsDeleting(true);
    await deleteCharacter(character.id, projectId);
    setIsDeleting(false);
    onUpdate();
    onClose();
  };

  return (
    <Dialog open={!!character} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[520px] rounded-lg">
        <DialogHeader className="px-4 min-h-8">
          <DialogTitle className="text-xs font-semibold text-[var(--grey-800)]">
            Edit Character
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 px-4 pb-4">
          {/* Avatar preview */}
          <div className="flex justify-center">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-black/[0.03] flex items-center justify-center">
              {character?.image_url ? (
                <img
                  src={character.image_url}
                  alt={character.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={32} className="text-[var(--grey-400)]" />
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--grey-600)]">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter name"
              className="h-8 rounded-lg bg-black/[0.03] border-0 text-xs focus-visible:ring-2 focus-visible:ring-[#007bc2]"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--grey-600)]">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this character's role, personality, and on-camera strengths..."
              rows={5}
              className={cn(
                "w-full rounded-lg bg-black/[0.03] border-0 px-3 py-2",
                "text-xs text-[var(--grey-800)] placeholder:text-[var(--grey-400)]",
                "focus:outline-none focus:ring-2 focus:ring-[#007bc2]",
                "resize-none"
              )}
            />
          </div>
          <div className="flex justify-between pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting || isSaving}
              className="h-8 text-xs text-[var(--grey-400)] hover:text-[#f72736]"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onClose} disabled={isSaving} className="h-8 text-xs">
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={!name.trim() || isSaving} className="h-8 text-xs">
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ChannelEditModalProps {
  channel: DistributionChannel | null;
  onClose: () => void;
  onUpdate: () => void;
}

function ChannelEditModal({ channel, onClose, onUpdate }: ChannelEditModalProps) {
  const [customLabel, setCustomLabel] = useState(channel?.custom_label || "");
  const [goalCount, setGoalCount] = useState(channel?.goal_count?.toString() || "");
  const [goalCadence, setGoalCadence] = useState<"weekly" | "monthly" | null>(channel?.goal_cadence || null);
  const [notes, setNotes] = useState(channel?.notes || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Reset form when channel changes
  if (channel && !initialized) {
    setCustomLabel(channel.custom_label || "");
    setGoalCount(channel.goal_count?.toString() || "");
    setGoalCadence(channel.goal_cadence);
    setNotes(channel.notes || "");
    setInitialized(true);
  }
  
  // Reset initialized flag when modal closes
  if (!channel && initialized) {
    setInitialized(false);
  }

  const handleSave = async () => {
    if (!channel) return;
    setIsSaving(true);
    await updateDistributionChannel(channel.id, {
      custom_label: customLabel.trim() || null,
      goal_count: goalCount ? parseInt(goalCount, 10) : null,
      goal_cadence: goalCadence,
      notes: notes.trim() || null,
    });
    setIsSaving(false);
    onUpdate();
    onClose();
  };

  const handleDelete = async () => {
    if (!channel) return;
    setIsDeleting(true);
    await deleteDistributionChannel(channel.id);
    setIsDeleting(false);
    onUpdate();
    onClose();
  };

  const platformLabel = channel ? getChannelLabel(channel.platform, channel.custom_label) : "";

  return (
    <Dialog open={!!channel} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[520px] rounded-lg">
        <DialogHeader className="px-4 min-h-8">
          <DialogTitle className="text-xs font-semibold text-[var(--grey-800)] flex items-center gap-2">
            {channel && <PlatformIcon platform={channel.platform} />}
            Edit {platformLabel}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 px-4 pb-4">
          {/* Custom label (only for custom platform) */}
          {channel?.platform === "custom" && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--grey-600)]">Channel Name</label>
              <Input
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="e.g., Company Blog, Newsletter"
                className="h-8 rounded-lg bg-black/[0.03] border-0 text-xs focus-visible:ring-2 focus-visible:ring-[#007bc2]"
              />
            </div>
          )}
          
          {/* Production goal */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--grey-600)]">Production Goal</label>
            <div className="flex gap-2">
              <Input
                type="text"
                inputMode="numeric"
                value={goalCount}
                onChange={(e) => setGoalCount(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="0"
                className="h-8 w-20 rounded-lg bg-black/[0.03] border-0 text-xs focus-visible:ring-2 focus-visible:ring-[#007bc2]"
              />
              <select
                value={goalCadence || ""}
                onChange={(e) => setGoalCadence(e.target.value ? (e.target.value as "weekly" | "monthly") : null)}
                className="h-8 px-3 rounded-lg bg-black/[0.03] border-0 text-xs focus:outline-none focus:ring-2 focus:ring-[#007bc2]"
              >
                <option value="">Select...</option>
                <option value="weekly">per week</option>
                <option value="monthly">per month</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--grey-600)]">Strategy Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Cross-post from TikTok, focus on educational content..."
              rows={2}
              className={cn(
                "w-full rounded-lg bg-black/[0.03] border-0 px-3 py-2",
                "text-xs text-[var(--grey-800)] placeholder:text-[var(--grey-400)]",
                "focus:outline-none focus:ring-2 focus:ring-[#007bc2]",
                "resize-none"
              )}
            />
          </div>

          <div className="flex justify-between pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting || isSaving}
              className="h-8 text-xs text-[var(--grey-400)] hover:text-[#f72736]"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onClose} disabled={isSaving} className="h-8 text-xs">
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving} className="h-8 text-xs">
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ===========================================
// Tab Content Components
// ===========================================

interface TalkingPointsTabContentProps {
  talkingPointsAsset: IdeaAsset | undefined;
  isGeneratingTalkingPoints: boolean;
  handleGenerateTalkingPoints: (notes?: string) => Promise<void>;
  setRegenerateDialogOpen: (type: "talking_points" | "script" | null) => void;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

function TalkingPointsTabContent({
  talkingPointsAsset,
  isGeneratingTalkingPoints,
  handleGenerateTalkingPoints,
  setRegenerateDialogOpen,
}: TalkingPointsTabContentProps) {
  const content = talkingPointsAsset?.content_text;
  const assetId = talkingPointsAsset?.id;
  
  // Auto-save state
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [localContent, setLocalContent] = useState(content || "");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const savedIndicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Sync local content when external content changes (e.g., regeneration)
  useEffect(() => {
    if (content !== undefined && content !== null) {
      setLocalContent(content);
    }
  }, [content]);
  
  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (savedIndicatorTimeoutRef.current) clearTimeout(savedIndicatorTimeoutRef.current);
    };
  }, []);
  
  // Handle content change with debounced auto-save
  const handleContentChange = useCallback((newContent: string) => {
    setLocalContent(newContent);
    
    // Don't save if no asset ID or content hasn't actually changed
    if (!assetId || newContent === content) {
      return;
    }
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set saving status immediately to show user we're tracking changes
    setSaveStatus("saving");
    
    // Debounce the actual save
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const result = await updateAssetContent(assetId, newContent);
        if (result.success) {
          setSaveStatus("saved");
          // Clear "Saved" indicator after 2 seconds
          if (savedIndicatorTimeoutRef.current) {
            clearTimeout(savedIndicatorTimeoutRef.current);
          }
          savedIndicatorTimeoutRef.current = setTimeout(() => {
            setSaveStatus("idle");
          }, 2000);
        } else {
          setSaveStatus("error");
          toast.error(result.error || "Failed to save");
        }
      } catch (error) {
        setSaveStatus("error");
        toast.error("Failed to save changes");
        console.error("Save error:", error);
      }
    }, 1000); // 1 second debounce
  }, [assetId, content]);

  // Header with actions
  const header = (
    <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
      <div className="flex items-center gap-3">
        <h4 className="text-sm font-medium text-[var(--grey-800)]">Talking Points</h4>
        {/* Save status indicator */}
        {saveStatus === "saving" && (
          <span className="text-xs text-[var(--grey-400)] flex items-center gap-1">
            <Loader2 size={12} className="animate-spin" />
            Saving...
          </span>
        )}
        {saveStatus === "saved" && (
          <span className="text-xs text-[var(--grey-400)] flex items-center gap-1">
            <Check size={12} />
            Saved
          </span>
        )}
        {saveStatus === "error" && (
          <span className="text-xs text-[#f72736] flex items-center gap-1">
            Save failed
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {content && (
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await navigator.clipboard.writeText(localContent);
              toast.success("Copied to clipboard");
            }}
            className="h-7 px-2"
            title="Copy"
          >
            <Copy size={14} />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (content) {
              setRegenerateDialogOpen("talking_points");
            } else {
              handleGenerateTalkingPoints();
            }
          }}
          disabled={isGeneratingTalkingPoints}
          className="h-7 px-2 gap-1.5"
          title={content ? "Regenerate" : "Generate"}
        >
          {isGeneratingTalkingPoints ? (
            <Loader2 size={14} className="animate-spin" />
          ) : content ? (
            <RefreshCw size={14} />
          ) : (
            <Sparkles size={14} />
          )}
          <span className="text-xs">{content ? "Regenerate" : "Generate"}</span>
        </Button>
      </div>
    </div>
  );

  if (isGeneratingTalkingPoints && !content) {
    return (
      <>
        {header}
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--grey-50)] mb-4">
            <Loader2 className="h-6 w-6 text-[var(--grey-400)] animate-spin" />
          </div>
          <h3 className="text-sm font-medium text-[var(--grey-600)] mb-1">
            Generating Talking Points
          </h3>
          <p className="text-xs text-[var(--grey-400)] max-w-[200px]">
            Creating talking points based on your input...
          </p>
        </div>
      </>
    );
  }

  if (content) {
    return (
      <div className="flex flex-col h-full">
        {header}
        <div className="flex-1 min-h-0 relative">
          <TiptapEditor
            content={localContent}
            onChange={handleContentChange}
            placeholder="Start typing your talking points..."
            className="h-full"
          />
          {isGeneratingTalkingPoints && (
            <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center z-10">
              <Loader2 className="h-8 w-8 text-[var(--grey-400)] animate-spin mb-3" />
              <p className="text-sm text-[var(--grey-600)]">Generating talking points...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Empty state
  return (
    <>
      {header}
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--grey-50)] mb-4">
          <FileText className="h-6 w-6 text-[var(--grey-300)]" />
        </div>
        <h3 className="text-sm font-medium text-[var(--grey-600)] mb-1">
          No Talking Points Yet
        </h3>
        <p className="text-xs text-[var(--grey-400)] max-w-[200px] mb-4">
          Generate talking points based on this idea to get started.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleGenerateTalkingPoints()}
          disabled={isGeneratingTalkingPoints}
          className="gap-2"
        >
          {isGeneratingTalkingPoints ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Generate Talking Points
        </Button>
      </div>
    </>
  );
}

interface ScriptTabContentProps {
  scriptAsset: IdeaAsset | undefined;
  talkingPointsAsset: IdeaAsset | undefined;
  isGeneratingScript: boolean;
  isScriptUpdating: boolean;
  handleGenerateScript: (notes?: string) => Promise<void>;
  setRegenerateDialogOpen: (type: "talking_points" | "script" | null) => void;
  setActiveTab: (tab: "talking_points" | "script" | "storyboard" | "assets") => void;
}

function ScriptTabContent({
  scriptAsset,
  talkingPointsAsset,
  isGeneratingScript,
  isScriptUpdating,
  handleGenerateScript,
  setRegenerateDialogOpen,
  setActiveTab,
}: ScriptTabContentProps) {
  const content = scriptAsset?.content_text;
  const hasTalkingPoints = !!talkingPointsAsset?.content_text;

  // Header with actions
  const header = (
    <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
      <div className="flex items-center gap-3">
        <h4 className="text-sm font-medium text-[var(--grey-800)]">Script</h4>
        {content && (() => {
          const stats = getScriptStats(content);
          return (
            <span className="text-xs text-[var(--grey-400)]">
              {stats.wordCount.toLocaleString()} words · ~{stats.duration}
            </span>
          );
        })()}
      </div>
      <div className="flex items-center gap-2">
        {content && (
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await navigator.clipboard.writeText(content);
              toast.success("Copied to clipboard");
            }}
            className="h-7 px-2"
            title="Copy"
          >
            <Copy size={14} />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => content ? setRegenerateDialogOpen("script") : handleGenerateScript()}
          disabled={isGeneratingScript || !hasTalkingPoints}
          className="h-7 px-2 gap-1.5"
          title={!hasTalkingPoints ? "Generate talking points first" : content ? "Regenerate Script" : "Generate Script"}
        >
          {isGeneratingScript ? (
            <Loader2 size={14} className="animate-spin" />
          ) : content ? (
            <RefreshCw size={14} />
          ) : (
            <Sparkles size={14} />
          )}
          <span className="text-xs">{content ? "Regenerate" : "Generate"}</span>
        </Button>
      </div>
    </div>
  );

  if (isGeneratingScript && !content) {
    return (
      <>
        {header}
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--grey-50)] mb-4">
            <Loader2 className="h-6 w-6 text-[var(--grey-400)] animate-spin" />
          </div>
          <h3 className="text-sm font-medium text-[var(--grey-600)] mb-1">
            Generating Script
          </h3>
          <p className="text-xs text-[var(--grey-400)] max-w-[200px]">
            Converting your talking points into a script...
          </p>
        </div>
      </>
    );
  }

  if (content) {
    return (
      <>
        {header}
        <div className={cn(
          "flex-1 min-h-0 overflow-auto p-4 relative",
          isScriptUpdating && "script-updating"
        )}>
          <ScriptDisplay script={content} />
          {isScriptUpdating && (
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-[var(--cyan-600)]/5 to-transparent animate-shimmer" />
          )}
          {isGeneratingScript && (
            <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 text-[var(--grey-400)] animate-spin mb-3" />
              <p className="text-sm text-[var(--grey-600)]">Generating script...</p>
            </div>
          )}
        </div>
      </>
    );
  }

  // Empty state
  return (
    <>
      {header}
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--grey-50)] mb-4">
          <FileText className="h-6 w-6 text-[var(--grey-300)]" />
        </div>
        <h3 className="text-sm font-medium text-[var(--grey-600)] mb-1">
          No Script Yet
        </h3>
        <p className="text-xs text-[var(--grey-400)] max-w-[200px] mb-4">
          {hasTalkingPoints
            ? "Generate a script from your talking points."
            : "Generate talking points first, then create a script."}
        </p>
        {hasTalkingPoints ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleGenerateScript()}
            disabled={isGeneratingScript}
            className="gap-2"
          >
            {isGeneratingScript ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Generate Script
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveTab("talking_points")}
            className="gap-2"
          >
            <ListTodo className="h-4 w-4" />
            Create Talking Points First
          </Button>
        )}
      </div>
    </>
  );
}

interface AssetsTabContentProps {
  productionAssets: IdeaAsset[];
  selectedAsset: IdeaAsset | null;
  showAssetDetail: boolean;
  setShowAssetDetail: (show: boolean) => void;
  setSelectedAssetId: (id: string | null) => void;
  handleToggleAssetComplete: (assetId: string) => void;
  handleGenerateAssetImage: () => Promise<void>;
  handleGenerateAssetVideo: () => Promise<void>;
  handleGenerateAssets: () => Promise<void>;
  handleBatchGenerateImages: () => Promise<void>;
  handleBatchGenerateVideos: () => Promise<void>;
  isGeneratingAssetImage: boolean;
  isGeneratingAssetVideo: boolean;
  isGeneratingAssets: boolean;
  isBatchGeneratingImages: boolean;
  isBatchGeneratingVideos: boolean;
  hasScript: boolean;
  projectImages: ProjectImage[];
  idea: IdeaWithChannels;
  router: ReturnType<typeof useRouter>;
  assetsLikelyGenerating: boolean;
  templateOrientation: "vertical" | "horizontal" | null;
}

function AssetsTabContent({
  productionAssets,
  selectedAsset,
  showAssetDetail,
  setShowAssetDetail,
  setSelectedAssetId,
  handleToggleAssetComplete,
  handleGenerateAssetImage,
  handleGenerateAssetVideo,
  handleGenerateAssets,
  handleBatchGenerateImages,
  handleBatchGenerateVideos,
  isGeneratingAssetImage,
  isGeneratingAssetVideo,
  isGeneratingAssets,
  isBatchGeneratingImages,
  isBatchGeneratingVideos,
  hasScript,
  projectImages,
  idea,
  router,
  assetsLikelyGenerating,
  templateOrientation,
}: AssetsTabContentProps) {
  // Asset detail view
  if (showAssetDetail && selectedAsset) {
    return (
      <AssetDetailView
        asset={selectedAsset}
        onBack={() => {
          setShowAssetDetail(false);
          setSelectedAssetId(null);
        }}
        handleToggleAssetComplete={handleToggleAssetComplete}
        handleGenerateAssetImage={handleGenerateAssetImage}
        handleGenerateAssetVideo={handleGenerateAssetVideo}
        isGeneratingAssetImage={isGeneratingAssetImage}
        isGeneratingAssetVideo={isGeneratingAssetVideo}
        projectImages={projectImages}
        idea={idea}
        router={router}
      />
    );
  }

  // Header for the Assets tab
  const header = (
    <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
      <h4 className="text-sm font-medium text-[var(--grey-800)]">Assets</h4>
      <div className="flex items-center gap-2">
        {/* Batch generate images button - only show if there are assets */}
        {productionAssets.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBatchGenerateImages}
            disabled={isBatchGeneratingImages || isBatchGeneratingVideos}
            className="h-7 px-2 gap-1.5"
            title="Generate images for all assets that don't have one"
          >
            {isBatchGeneratingImages ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <ImageIcon size={14} />
            )}
            <span className="text-xs">Gen All Images</span>
          </Button>
        )}
        {/* Batch generate videos button - only show if there are assets */}
        {productionAssets.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBatchGenerateVideos}
            disabled={isBatchGeneratingVideos || isBatchGeneratingImages}
            className="h-7 px-2 gap-1.5"
            title="Generate videos for all b-roll assets that have images"
          >
            {isBatchGeneratingVideos ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Film size={14} />
            )}
            <span className="text-xs">Gen All Videos</span>
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleGenerateAssets}
          disabled={isGeneratingAssets || !hasScript}
          className="h-7 px-2 gap-1.5"
          title={!hasScript ? "Generate a script first" : productionAssets.length > 0 ? "Regenerate Storyboard" : "Generate Storyboard"}
        >
          {isGeneratingAssets ? (
            <Loader2 size={14} className="animate-spin" />
          ) : productionAssets.length > 0 ? (
            <RefreshCw size={14} />
          ) : (
            <Sparkles size={14} />
          )}
          <span className="text-xs">{productionAssets.length > 0 ? "Regen Storyboard" : "Generate"}</span>
        </Button>
      </div>
    </div>
  );

  // Grid view - empty state
  if (productionAssets.length === 0) {
    return (
      <>
        {header}
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          {assetsLikelyGenerating ? (
            <>
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--grey-50)] mb-4">
                <Loader2 className="h-6 w-6 text-[var(--grey-400)] animate-spin" />
              </div>
              <h3 className="text-sm font-medium text-[var(--grey-600)] mb-1">
                Generating Assets
              </h3>
              <p className="text-xs text-[var(--grey-400)] max-w-[200px]">
                Creating production assets...
              </p>
            </>
          ) : (
            <>
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--grey-50)] mb-4">
                <ImageIcon className="h-6 w-6 text-[var(--grey-300)]" />
              </div>
              <h3 className="text-sm font-medium text-[var(--grey-600)] mb-1">
                No Production Assets
              </h3>
              <p className="text-xs text-[var(--grey-400)] max-w-[200px]">
                {hasScript ? "Generate a storyboard to create assets." : "Assets will appear here once a script is generated."}
              </p>
              {hasScript && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateAssets}
                  disabled={isGeneratingAssets}
                  className="mt-4 gap-2"
                >
                  {isGeneratingAssets ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Generate Storyboard
                </Button>
              )}
            </>
          )}
        </div>
      </>
    );
  }

  // Determine if this is a vertical video based on template
  const isVertical = templateOrientation === "vertical";
  
  return (
    <>
      {header}
      <div className="flex-1 min-h-0 overflow-auto p-4">
        <div className={`grid gap-4 ${
          isVertical 
            ? "grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6" 
            : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
        }`}>
        {productionAssets.map((asset) => (
          <button
            key={asset.id}
            onClick={() => {
              setSelectedAssetId(asset.id);
              setShowAssetDetail(true);
            }}
            className="group relative rounded-lg border border-[var(--border)] bg-[var(--grey-0)] overflow-hidden text-left hover:border-[var(--grey-300)] transition-colors"
          >
            {/* Image or placeholder */}
            <div className={`${getAspectRatioClass(templateOrientation)} bg-[var(--grey-50)] relative`}>
              {asset.image_url ? (
                <Image
                  src={asset.image_url}
                  alt={asset.title}
                  fill
                  className={isVertical ? "object-contain" : "object-cover"}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  {asset.type === "a_roll" && <User className="h-8 w-8 text-[var(--grey-300)]" />}
                  {asset.type === "b_roll_footage" && <Film className="h-8 w-8 text-[var(--grey-300)]" />}
                  {asset.type === "b_roll_image" && <ImageIcon className="h-8 w-8 text-[var(--grey-300)]" />}
                  {asset.type === "b_roll_screen_recording" && <Monitor className="h-8 w-8 text-[var(--grey-300)]" />}
                  {asset.type === "thumbnail" && <ImageIcon className="h-8 w-8 text-[var(--grey-300)]" />}
                </div>
              )}
              
              {/* Completion indicator */}
              {asset.is_complete && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#00975a] flex items-center justify-center">
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}
              
              {/* AI indicator */}
              {asset.is_ai_generatable && (
                <div className="absolute top-2 left-2">
                  <Sparkles className="h-4 w-4 text-[var(--cyan-600)]" />
                </div>
              )}
            </div>
            
            {/* Info */}
            <div className="p-3">
              <p className="text-sm font-medium text-[var(--grey-800)] truncate">
                {asset.title}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-[var(--grey-400)]">
                  {ASSET_TYPE_LABELS[asset.type as AssetType]}
                </span>
              </div>
            </div>
          </button>
        ))}
        </div>
      </div>
    </>
  );
}

interface AssetDetailViewProps {
  asset: IdeaAsset;
  onBack: () => void;
  handleToggleAssetComplete: (assetId: string) => void;
  handleGenerateAssetImage: () => Promise<void>;
  handleGenerateAssetVideo: () => Promise<void>;
  isGeneratingAssetImage: boolean;
  isGeneratingAssetVideo: boolean;
  projectImages: ProjectImage[];
  idea: IdeaWithChannels;
  router: ReturnType<typeof useRouter>;
}

function AssetDetailView({
  asset,
  onBack,
  handleToggleAssetComplete,
  handleGenerateAssetImage,
  handleGenerateAssetVideo,
  isGeneratingAssetImage,
  isGeneratingAssetVideo,
  projectImages,
  idea,
  router,
}: AssetDetailViewProps) {
  return (
    <>
      {/* Header with back button */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="inline-flex items-center justify-center w-7 h-7 rounded-md text-[var(--grey-500)] hover:text-[var(--grey-800)] hover:bg-[var(--grey-50)] transition-colors"
            aria-label="Back to Assets"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h4 className="text-sm font-medium text-[var(--grey-800)]">
            {asset.title}
          </h4>
        </div>
        <div className="flex items-center gap-2">
          {/* Generate Image button */}
          {asset.is_ai_generatable && (asset.type === "b_roll_footage" || asset.type === "b_roll_image" || asset.type === "thumbnail") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGenerateAssetImage}
              disabled={isGeneratingAssetImage}
              className="h-7 px-2 gap-1.5"
              title={asset.image_url ? "Regenerate Image" : "Generate Image"}
            >
              {isGeneratingAssetImage ? (
                <Loader2 size={14} className="animate-spin" />
              ) : asset.image_url ? (
                <RefreshCw size={14} />
              ) : (
                <Sparkles size={14} />
              )}
              <span className="text-xs">{asset.image_url ? "Regen Image" : "Generate Image"}</span>
            </Button>
          )}
          
          {/* Generate Video button */}
          {asset.type === "b_roll_footage" && asset.is_ai_generatable && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGenerateAssetVideo}
              disabled={!asset.image_url || isGeneratingAssetVideo}
              className="h-7 px-2 gap-1.5"
              title={!asset.image_url ? "Generate image first" : asset.video_url ? "Regenerate Video" : "Generate Video"}
            >
              {isGeneratingAssetVideo ? (
                <Loader2 size={14} className="animate-spin" />
              ) : asset.video_url ? (
                <RefreshCw size={14} />
              ) : (
                <Film size={14} />
              )}
              <span className="text-xs">{asset.video_url ? "Regen Video" : "Generate Video"}</span>
            </Button>
          )}
          
          {/* Overflow menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="h-7 w-7">
                <MoreHorizontal size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* Complete/Incomplete toggle */}
              <DropdownMenuItem onClick={() => handleToggleAssetComplete(asset.id)}>
                <div className={cn(
                  "w-3.5 h-3.5 rounded border flex items-center justify-center mr-2",
                  asset.is_complete
                    ? "bg-[#00975a] border-[#00975a] text-white"
                    : "border-[var(--grey-400)]"
                )}>
                  {asset.is_complete && <Check className="h-2.5 w-2.5" />}
                </div>
                {asset.is_complete ? "Mark Incomplete" : "Mark Complete"}
              </DropdownMenuItem>
              
              {/* Copy instructions */}
              {asset.instructions && (
                <DropdownMenuItem
                  onClick={async () => {
                    await navigator.clipboard.writeText(asset.instructions || "");
                    toast.success("Copied to clipboard");
                  }}
                >
                  <Copy size={14} className="mr-2" />
                  Copy Instructions
                </DropdownMenuItem>
              )}
              
              {/* Download options */}
              {(asset.image_url || asset.video_url) && <DropdownMenuSeparator />}
              
              {asset.image_url && (
                <DropdownMenuItem
                  onClick={() => {
                    const link = document.createElement("a");
                    link.href = asset.image_url!;
                    link.download = `${asset.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.png`;
                    link.target = "_blank";
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                >
                  <Download size={14} className="mr-2" />
                  Download Image
                </DropdownMenuItem>
              )}
              
              {asset.video_url && (
                <DropdownMenuItem
                  onClick={() => {
                    const link = document.createElement("a");
                    link.href = asset.video_url!;
                    link.download = `${asset.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.mp4`;
                    link.target = "_blank";
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                >
                  <Download size={14} className="mr-2" />
                  Download Video
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content - Two column layout */}
      <div className="flex-1 min-h-0 flex">
        {/* Main area - Media Preview */}
        <div className="flex-1 min-w-0 overflow-hidden p-4 flex items-center justify-center bg-[var(--grey-50)]">
          {/* Generated Media Section */}
          {asset.is_ai_generatable && (asset.type === "b_roll_footage" || asset.type === "b_roll_image" || asset.type === "thumbnail") && (
            <div className="h-full w-full flex items-center justify-center">
              {/* Empty state - no image yet */}
              {!asset.image_url && !isGeneratingAssetImage && (
                <div className="w-full max-w-md rounded-lg border-2 border-dashed border-[var(--grey-200)] bg-white p-8 flex flex-col items-center justify-center">
                  {asset.type === "b_roll_footage" ? (
                    <Film className="h-8 w-8 text-[var(--grey-300)] mb-3" />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-[var(--grey-300)] mb-3" />
                  )}
                  <p className="text-sm text-[var(--grey-500)] mb-3">
                    {asset.type === "b_roll_footage" ? "No video generated yet" : "No image generated yet"}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateAssetImage}
                    className="gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    Generate Image
                  </Button>
                </div>
              )}
              
              {/* Loading state for image generation */}
              {isGeneratingAssetImage && !asset.image_url && (
                <div className="w-full max-w-md rounded-lg bg-[var(--grey-100)] p-8 flex flex-col items-center justify-center">
                  <Loader2 className="h-8 w-8 text-[var(--grey-400)] animate-spin mb-3" />
                  <p className="text-sm text-[var(--grey-600)]">Generating image...</p>
                </div>
              )}
              
              {/* Loading state for video generation */}
              {isGeneratingAssetVideo && !asset.video_url && asset.image_url && (
                <div className="relative h-full w-full flex items-center justify-center">
                  <img 
                    src={asset.image_url} 
                    alt={asset.title} 
                    className="max-h-full max-w-full object-contain rounded-lg opacity-50" 
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <Loader2 className="h-8 w-8 text-[var(--grey-600)] animate-spin mb-3" />
                    <p className="text-sm text-[var(--grey-700)]">Generating video...</p>
                  </div>
                </div>
              )}
              
              {/* Generated Media */}
              {asset.image_url && !isGeneratingAssetVideo && (
                <div className="relative h-full w-full flex items-center justify-center group">
                  {asset.type === "b_roll_footage" && asset.video_url ? (
                    <div className="relative max-h-full max-w-full">
                      <video 
                        src={asset.video_url}
                        poster={asset.image_url}
                        controls 
                        className="max-h-full max-w-full rounded-lg"
                        style={{ maxHeight: 'calc(100vh - 200px)' }}
                      />
                      <div className="absolute top-2 left-2 bg-black/60 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                        <Film className="h-3 w-3" />
                        Video
                      </div>
                      {isGeneratingAssetVideo && (
                        <div className="absolute inset-0 rounded-lg bg-white/80 flex flex-col items-center justify-center">
                          <Loader2 className="h-8 w-8 text-[var(--grey-400)] animate-spin mb-3" />
                          <p className="text-sm text-[var(--grey-600)]">Regenerating video...</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="relative max-h-full max-w-full">
                      <img 
                        src={asset.image_url} 
                        alt={asset.title} 
                        className="max-h-full max-w-full object-contain rounded-lg"
                        style={{ maxHeight: 'calc(100vh - 200px)' }}
                      />
                      {asset.type === "b_roll_footage" && (
                        <div className="absolute top-2 left-2 bg-black/40 text-white/80 px-2 py-1 rounded text-xs flex items-center gap-1">
                          <Film className="h-3 w-3" />
                          <span className="opacity-75">Video pending</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                        {asset.type === "b_roll_footage" && !asset.video_url ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleGenerateAssetVideo}
                            disabled={isGeneratingAssetVideo}
                            className="gap-2"
                          >
                            {isGeneratingAssetVideo ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Film className="h-4 w-4" />
                            )}
                            Generate Video
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleGenerateAssetImage}
                            disabled={isGeneratingAssetImage}
                            className="gap-2"
                          >
                            {isGeneratingAssetImage ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                            Regenerate
                          </Button>
                        )}
                      </div>
                      {isGeneratingAssetImage && (
                        <div className="absolute inset-0 rounded-lg bg-white/80 flex flex-col items-center justify-center">
                          <Loader2 className="h-8 w-8 text-[var(--grey-400)] animate-spin mb-3" />
                          <p className="text-sm text-[var(--grey-600)]">Regenerating image...</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Upload placeholder for non-AI-generatable assets */}
          {(!asset.is_ai_generatable || (asset.type !== "b_roll_footage" && asset.type !== "b_roll_image" && asset.type !== "thumbnail")) && (
            <div className="w-full max-w-md">
              <div className="border-2 border-dashed border-[var(--grey-200)] rounded-lg p-8 text-center bg-white">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--grey-50)] mb-4">
                  <Upload className="h-6 w-6 text-[var(--grey-300)]" />
                </div>
                <h3 className="text-sm font-medium text-[var(--grey-600)] mb-1">
                  Media Upload Coming Soon
                </h3>
                <p className="text-xs text-[var(--grey-400)] max-w-[200px] mx-auto">
                  You&apos;ll be able to upload {asset.type === "thumbnail" || asset.type === "b_roll_image" ? "images" : "video files"} here.
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Properties Sidebar */}
        <div className="w-[300px] border-l border-[var(--border)] overflow-auto bg-white">
          {/* Instructions section */}
          {asset.instructions && (
            <div className="p-4 border-b border-[var(--border)]">
              <h5 className="text-xs font-semibold text-[var(--grey-500)] uppercase tracking-wider mb-2">
                Instructions
              </h5>
              <div className="prose prose-sm max-w-none text-[var(--grey-700)]">
                <MarkdownDisplay content={asset.instructions} />
              </div>
            </div>
          )}
          
          {/* Reference Images section */}
          {(asset.type === "b_roll_footage" || asset.type === "b_roll_image") && (
            <div className="border-b border-[var(--border)]">
              <AssetReferenceImages
                referenceImages={asset.reference_images || []}
                projectImages={projectImages}
                assetId={asset.id}
                onLinkImage={async (refImageId, projectImageId) => {
                  const result = await linkReferenceImage(refImageId, projectImageId);
                  if (result.error) {
                    toast.error(result.error);
                  } else {
                    router.refresh();
                  }
                }}
                onUnlinkImage={async (refImageId) => {
                  const result = await unlinkReferenceImage(refImageId);
                  if (result.error) {
                    toast.error(result.error);
                  } else {
                    router.refresh();
                  }
                }}
                onUploadImage={async (refImageId, file) => {
                  const formData = new FormData();
                  formData.append("file", file);
                  const result = await uploadReferenceImage(refImageId, formData);
                  if (result.error) {
                    toast.error(result.error);
                  } else {
                    router.refresh();
                  }
                }}
                onDeleteImage={async (refImageId) => {
                  const result = await deleteReferenceImage(refImageId);
                  if (result.error) {
                    toast.error(result.error);
                  } else {
                    router.refresh();
                  }
                }}
                onAddImage={async (description, projectImageId) => {
                  const result = await addReferenceImage(asset.id, description, projectImageId);
                  if (result.error) {
                    toast.error(result.error);
                  } else {
                    router.refresh();
                  }
                }}
              />
            </div>
          )}
          
          {/* Empty state when no properties to show */}
          {!asset.instructions && asset.type !== "b_roll_footage" && asset.type !== "b_roll_image" && (
            <div className="p-4 text-center text-[var(--grey-400)] text-sm">
              No properties available
            </div>
          )}
        </div>
      </div>
    </>
  );
}

