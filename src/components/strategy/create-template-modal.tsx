"use client";

import { useState, useEffect, useRef } from "react";
import { Video, Link, Loader2, CheckCircle, AlertCircle, Zap, ExternalLink, Camera } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DistributionChannel, 
  ProjectTemplateWithChannels, 
  TemplateOrientation, 
  TemplateProductionRequirements,
  platformSupportsOrientation,
  getMinTargetDuration,
  DistributionPlatform,
} from "@/lib/types";
import { analyzeVideoStyle, getVideoPreview } from "@/lib/actions/video-analysis";
import { addTemplate, updateTemplate } from "@/lib/actions/templates";
import { PlatformIcon, getPlatformLabel } from "./platform-icon";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface CreateTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  channels: DistributionChannel[];
  onTemplateCreated: (template: ProjectTemplateWithChannels) => void;
  onTemplateUpdated?: (template: ProjectTemplateWithChannels) => void;
  editingTemplate?: ProjectTemplateWithChannels | null;
}

type Step = "youtube" | "analyzing" | "manual" | "review";

const ANALYSIS_STAGES = [
  { message: "Fetching video from YouTube...", duration: 3000 },
  { message: "Analyzing camera work and framing...", duration: 8000 },
  { message: "Identifying editing patterns...", duration: 10000 },
  { message: "Extracting production style...", duration: 12000 },
  { message: "Generating template details...", duration: 30000 },
];

// Format duration for display (converts seconds to readable format)
function formatDurationForDisplay(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

export function CreateTemplateModal({
  open,
  onOpenChange,
  projectId,
  channels,
  onTemplateCreated,
  onTemplateUpdated,
  editingTemplate,
}: CreateTemplateModalProps) {
  const isEditing = !!editingTemplate;
  const [step, setStep] = useState<Step>(isEditing ? "manual" : "youtube");
  const [videoUrl, setVideoUrl] = useState("");
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [analysisStage, setAnalysisStage] = useState(0);
  const [quickAnalysis, setQuickAnalysis] = useState(false);
  const analysisAbortedRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [sourceVideoUrl, setSourceVideoUrl] = useState<string | null>(null);
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>([]);
  const [orientation, setOrientation] = useState<TemplateOrientation>("vertical");
  const [targetDurationSeconds, setTargetDurationSeconds] = useState<number | null>(null);
  const [productionRequirements, setProductionRequirements] = useState<TemplateProductionRequirements | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Populate form when editing, or clear when creating new
  useEffect(() => {
    if (editingTemplate && open) {
      setStep("manual");
      setName(editingTemplate.name);
      setDescription(editingTemplate.description || "");
      setImageUrl(editingTemplate.image_url);
      setSourceVideoUrl(editingTemplate.source_video_url);
      setSelectedChannelIds(editingTemplate.channels.map((c) => c.id));
      setOrientation(editingTemplate.orientation);
      setTargetDurationSeconds(editingTemplate.target_duration_seconds);
      setProductionRequirements(editingTemplate.production_requirements);
    } else if (!editingTemplate && open) {
      // Clear all fields when opening for a new template
      setStep("youtube");
      setName("");
      setDescription("");
      setImageUrl(null);
      setSourceVideoUrl(null);
      setSelectedChannelIds([]);
      setOrientation("vertical");
      setTargetDurationSeconds(null);
      setProductionRequirements(null);
      setVideoUrl("");
      setAnalyzeError(null);
    }
  }, [editingTemplate, open]);

  // Cycle through analysis stages
  useEffect(() => {
    if (step !== "analyzing") return;
    
    let timeoutId: NodeJS.Timeout;
    const advanceStage = () => {
      setAnalysisStage((current) => {
        const next = current + 1;
        if (next < ANALYSIS_STAGES.length) {
          timeoutId = setTimeout(advanceStage, ANALYSIS_STAGES[next].duration);
        }
        return Math.min(next, ANALYSIS_STAGES.length - 1);
      });
    };
    
    timeoutId = setTimeout(advanceStage, ANALYSIS_STAGES[0].duration);
    return () => clearTimeout(timeoutId);
  }, [step]);

  const resetForm = () => {
    setStep(editingTemplate ? "manual" : "youtube");
    setVideoUrl("");
    setAnalyzeError(null);
    setAnalysisStage(0);
    setQuickAnalysis(false);
    analysisAbortedRef.current = false;
    if (!editingTemplate) {
      setName("");
      setDescription("");
      setImageUrl(null);
      setSourceVideoUrl(null);
      setSelectedChannelIds([]);
      setOrientation("vertical");
      setTargetDurationSeconds(null);
      setProductionRequirements(null);
    }
    setIsSaving(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      analysisAbortedRef.current = true;
      resetForm();
    }
    onOpenChange(newOpen);
  };

  const handleAnalyzeVideo = async () => {
    if (!videoUrl.trim()) return;

    setAnalyzeError(null);
    setAnalysisStage(0);
    analysisAbortedRef.current = false;

    // First, quickly validate and get thumbnail
    const preview = await getVideoPreview(videoUrl.trim());
    if (!preview.success) {
      setAnalyzeError(preview.error);
      return;
    }

    // Show the analyzing step with thumbnail
    setImageUrl(preview.thumbnailUrl);
    setSourceVideoUrl(preview.normalizedUrl);
    setStep("analyzing");

    // Now run the full analysis (pass true for full video when quick mode is OFF)
    const result = await analyzeVideoStyle(videoUrl.trim(), !quickAnalysis);

    // Check if user cancelled
    if (analysisAbortedRef.current) return;

    if (result.success) {
      setName(result.analysis.name);
      setDescription(result.analysis.description);
      setProductionRequirements(result.analysis.productionRequirements);
      
      // Map suggested platforms to channel IDs
      const suggestedIds = channels
        .filter((c) => result.analysis.suggestedPlatforms.includes(c.platform))
        .map((c) => c.id);
      setSelectedChannelIds(suggestedIds);
      
      setStep("review");
    } else {
      setAnalyzeError(result.error);
      setStep("youtube");
      // Clean up stale data from failed analysis
      setImageUrl(null);
      setSourceVideoUrl(null);
      setAnalysisStage(0);
    }
  };

  const handleCancelAnalysis = () => {
    analysisAbortedRef.current = true;
    setStep("youtube");
    setImageUrl(null);
    setSourceVideoUrl(null);
    setAnalysisStage(0);
  };

  const handleChannelToggle = (channelId: string) => {
    setSelectedChannelIds((prev) => {
      const newSelection = prev.includes(channelId)
        ? prev.filter((id) => id !== channelId)
        : [...prev, channelId];
      
      // Auto-update target duration based on newly selected channels
      const selectedChannels = channels.filter((c) => newSelection.includes(c.id));
      const platforms = selectedChannels.map((c) => c.platform as DistributionPlatform);
      const suggestedDuration = getMinTargetDuration(platforms);
      setTargetDurationSeconds(suggestedDuration);
      
      return newSelection;
    });
  };

  const handleOrientationChange = (newOrientation: TemplateOrientation) => {
    setOrientation(newOrientation);
    
    // Filter out channels that don't support the new orientation
    const compatibleChannelIds = selectedChannelIds.filter((id) => {
      const channel = channels.find((c) => c.id === id);
      if (!channel) return false;
      return platformSupportsOrientation(channel.platform as DistributionPlatform, newOrientation);
    });
    
    if (compatibleChannelIds.length !== selectedChannelIds.length) {
      setSelectedChannelIds(compatibleChannelIds);
      
      // Recalculate target duration
      const selectedChannels = channels.filter((c) => compatibleChannelIds.includes(c.id));
      const platforms = selectedChannels.map((c) => c.platform as DistributionPlatform);
      setTargetDurationSeconds(getMinTargetDuration(platforms));
    }
  };

  // Get channels compatible with current orientation
  const compatibleChannels = channels.filter((channel) => 
    platformSupportsOrientation(channel.platform as DistributionPlatform, orientation)
  );

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setAnalyzeError("Please select an image file");
      return;
    }

    // Convert to data URL for preview (in production, you'd upload to storage)
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    setIsSaving(true);

    if (isEditing && editingTemplate) {
      // Update existing template
      const result = await updateTemplate(editingTemplate.id, {
        name: name.trim(),
        description: description.trim() || null,
        source_video_url: sourceVideoUrl,
        image_url: imageUrl,
        channelIds: selectedChannelIds,
        orientation,
        target_duration_seconds: targetDurationSeconds,
        production_requirements: productionRequirements,
      });

      if (result.success) {
        onTemplateUpdated?.(result.template);
        handleOpenChange(false);
      } else {
        setAnalyzeError(result.error);
      }
    } else {
      // Create new template
      const result = await addTemplate(projectId, {
        name: name.trim(),
        description: description.trim() || null,
        source_video_url: sourceVideoUrl,
        image_url: imageUrl,
        channelIds: selectedChannelIds,
        orientation,
        target_duration_seconds: targetDurationSeconds,
        production_requirements: productionRequirements,
      });

      if (result.success) {
        onTemplateCreated(result.template);
        handleOpenChange(false);
      } else {
        setAnalyzeError(result.error);
      }
    }

    setIsSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        {step !== "analyzing" && (
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex items-center justify-center size-8 rounded-lg bg-[var(--grey-100)]">
                <Video className="size-4 text-[var(--grey-600)]" />
              </div>
              {step === "youtube" && "Add Template"}
              {step === "manual" && (isEditing ? "Edit Template" : "Add Template")}
              {step === "review" && "Review Template"}
            </DialogTitle>
            <DialogDescription className="text-left">
              {step === "youtube" && "Templates define how your videos look and feel. Paste a YouTube video as an example and we'll extract its production style."}
              {step === "manual" && (isEditing ? "Update your video production style." : "Define your video production style.")}
              {step === "review" && "Review and edit the extracted style before saving."}
            </DialogDescription>
          </DialogHeader>
        )}

        {/* Step: Analyzing Video */}
        {step === "analyzing" && (
          <div className="py-6 space-y-6">
            {/* Thumbnail with overlay */}
            <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-[var(--grey-900)]">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="Video thumbnail"
                  className="w-full h-full object-cover opacity-60"
                />
              ) : (
                <div className="w-full h-full bg-[var(--grey-200)]" />
              )}
              
              {/* Animated overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {/* Pulsing ring animation */}
                <div className="relative mb-4">
                  <div className="absolute inset-0 rounded-full bg-white/20 animate-ping" style={{ animationDuration: '2s' }} />
                  <div className="relative flex items-center justify-center size-16 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                    <Loader2 className="size-8 text-white animate-spin" />
                  </div>
                </div>
                
                {/* Status message */}
                <p className="text-white text-sm font-medium text-center px-4 animate-pulse">
                  {ANALYSIS_STAGES[analysisStage].message}
                </p>
              </div>
            </div>

            {/* Progress dots */}
            <div className="flex justify-center gap-1.5">
              {ANALYSIS_STAGES.map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    "size-2 rounded-full transition-all duration-300",
                    index <= analysisStage
                      ? "bg-[var(--grey-800)]"
                      : "bg-[var(--grey-200)]"
                  )}
                />
              ))}
            </div>

            {/* Cancel button */}
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={handleCancelAnalysis}
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Step: YouTube URL Input */}
        {step === "youtube" && (
          <div className="py-4 space-y-4">
            <div>
              <label className="text-xs font-medium text-[var(--grey-600)] mb-1.5 block">
                YouTube Video URL
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Link className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--grey-400)]" />
                  <Input
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && videoUrl.trim()) {
                        handleAnalyzeVideo();
                      }
                    }}
                    placeholder="https://youtube.com/watch?v=..."
                    className="pl-10 h-10"
                    autoFocus
                  />
                </div>
                {/* Quick analysis toggle */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setQuickAnalysis(!quickAnalysis)}
                      className={cn(
                        "flex items-center justify-center size-10 rounded-md transition-colors shrink-0",
                        quickAnalysis
                          ? "bg-amber-100 text-amber-600"
                          : "text-[var(--grey-400)] hover:text-[var(--grey-600)] hover:bg-[var(--grey-50)]"
                      )}
                    >
                      <Zap className="size-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Enable to only analyze the first 60s (faster)
                  </TooltipContent>
                </Tooltip>
              </div>
              {analyzeError && (
                <div className="flex items-center gap-2 mt-2 text-xs text-[#f72736]">
                  <AlertCircle className="size-3.5" />
                  {analyzeError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setStep("manual")}
              >
                Skip
              </Button>
              <Button
                onClick={handleAnalyzeVideo}
                disabled={!videoUrl.trim()}
              >
                Analyze Video
              </Button>
            </div>
          </div>
        )}

        {/* Step: Manual Entry */}
        {step === "manual" && (
          <div className="py-4 space-y-4">
            {/* Thumbnail Preview (when editing) */}
            {isEditing && (
              <div 
                className="relative w-full aspect-video rounded-lg overflow-hidden bg-[var(--grey-100)] group cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Video thumbnail"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Video className="h-12 w-12 text-[var(--grey-300)]" />
                  </div>
                )}
                {/* Hover overlay */}
                <div className={cn(
                  "absolute inset-0 flex items-center justify-center transition-opacity",
                  imageUrl 
                    ? "bg-black/50 opacity-0 group-hover:opacity-100" 
                    : "bg-[var(--grey-100)]"
                )}>
                  <div className={cn(
                    "flex flex-col items-center gap-2",
                    imageUrl ? "text-white" : "text-[var(--grey-400)]"
                  )}>
                    <Camera className="size-8" />
                    <span className="text-sm font-medium">
                      {imageUrl ? "Replace Image" : "Add Image"}
                    </span>
                  </div>
                </div>
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            )}

            <TemplateForm
              name={name}
              setName={setName}
              description={description}
              setDescription={setDescription}
              selectedChannelIds={selectedChannelIds}
              channels={compatibleChannels}
              onChannelToggle={handleChannelToggle}
              orientation={orientation}
              onOrientationChange={handleOrientationChange}
              targetDurationSeconds={targetDurationSeconds}
              onTargetDurationChange={setTargetDurationSeconds}
              sourceVideoUrl={isEditing ? sourceVideoUrl : null}
            />

            <ProductionRequirementsEditor
              requirements={productionRequirements}
              onChange={setProductionRequirements}
            />

            <div className="flex justify-end gap-2">
              {!isEditing && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep("youtube");
                    setName("");
                    setDescription("");
                    setSelectedChannelIds([]);
                    setProductionRequirements(null);
                  }}
                >
                  Back
                </Button>
              )}
              <Button
                onClick={handleSave}
                disabled={!name.trim() || isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving...
                  </>
                ) : isEditing ? (
                  "Save Template"
                ) : (
                  "Create Template"
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step: Review Analyzed Content */}
        {step === "review" && (
          <div className="py-4 space-y-4">
            {/* Success indicator */}
            <div className="flex items-center gap-2 text-[#00975a] text-sm">
              <CheckCircle className="size-4" />
              Video analyzed successfully
            </div>

            {/* Thumbnail Preview */}
            {imageUrl && (
              <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-[var(--grey-100)]">
                <img
                  src={imageUrl}
                  alt="Video thumbnail"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <TemplateForm
              name={name}
              setName={setName}
              description={description}
              setDescription={setDescription}
              selectedChannelIds={selectedChannelIds}
              channels={compatibleChannels}
              onChannelToggle={handleChannelToggle}
              orientation={orientation}
              onOrientationChange={handleOrientationChange}
              targetDurationSeconds={targetDurationSeconds}
              onTargetDurationChange={setTargetDurationSeconds}
            />

            <ProductionRequirementsEditor
              requirements={productionRequirements}
              onChange={setProductionRequirements}
            />

            {analyzeError && (
              <div className="flex items-center gap-2 text-xs text-[#f72736]">
                <AlertCircle className="size-3.5" />
                {analyzeError}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setStep("youtube");
                  setName("");
                  setDescription("");
                  setImageUrl(null);
                  setSourceVideoUrl(null);
                  setSelectedChannelIds([]);
                  setProductionRequirements(null);
                }}
                disabled={isSaving}
              >
                Start Over
              </Button>
              <Button
                onClick={handleSave}
                disabled={!name.trim() || isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Template"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface TemplateFormProps {
  name: string;
  setName: (name: string) => void;
  description: string;
  setDescription: (description: string) => void;
  selectedChannelIds: string[];
  channels: DistributionChannel[];
  onChannelToggle: (channelId: string) => void;
  orientation: TemplateOrientation;
  onOrientationChange: (orientation: TemplateOrientation) => void;
  targetDurationSeconds: number | null;
  onTargetDurationChange: (seconds: number | null) => void;
  sourceVideoUrl?: string | null;
}

function TemplateForm({
  name,
  setName,
  description,
  setDescription,
  selectedChannelIds,
  channels,
  onChannelToggle,
  orientation,
  onOrientationChange,
  targetDurationSeconds,
  onTargetDurationChange,
  sourceVideoUrl,
}: TemplateFormProps) {
  // Local state for duration input - allows free typing without auto-formatting
  const [durationInput, setDurationInput] = useState(() => 
    targetDurationSeconds ? formatDurationForDisplay(targetDurationSeconds) : ""
  );

  // Sync local state when parent value changes (e.g., from channel selection)
  useEffect(() => {
    setDurationInput(targetDurationSeconds ? formatDurationForDisplay(targetDurationSeconds) : "");
  }, [targetDurationSeconds]);

  // Parse duration input (handles formats like "60", "1:30", "90s", "1m 30s", "5m")
  const parseDurationInput = (input: string): number | null => {
    if (!input.trim()) return null;
    
    // Handle "Xm Ys" or "Xm" or "Ys" format first (before pure numbers)
    const minsMatch = input.match(/(\d+)\s*m/i);
    const secsMatch = input.match(/(\d+)\s*s/i);
    if (minsMatch || secsMatch) {
      const mins = minsMatch ? parseInt(minsMatch[1], 10) : 0;
      const secs = secsMatch ? parseInt(secsMatch[1], 10) : 0;
      return mins * 60 + secs;
    }
    
    // Handle "X:Y" format (minutes:seconds)
    const colonMatch = input.match(/^(\d+):(\d+)$/);
    if (colonMatch) {
      return parseInt(colonMatch[1], 10) * 60 + parseInt(colonMatch[2], 10);
    }
    
    // Handle pure numbers (assume seconds)
    if (/^\d+$/.test(input.trim())) {
      return parseInt(input.trim(), 10);
    }
    
    return null;
  };

  return (
    <>
      {/* Name input */}
      <div>
        <label className="text-xs font-medium text-[var(--grey-600)] mb-1.5 block">
          Template Name
        </label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Talking Head with B-Roll"
          className="h-9 bg-white"
        />
      </div>

      {/* Description */}
      <div>
        <label className="text-xs font-medium text-[var(--grey-600)] mb-1.5 block">
          Style Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the production style, camera setup, editing pace, visual elements..."
          rows={6}
          className={cn(
            "w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2",
            "text-sm text-[var(--grey-800)] placeholder:text-[var(--grey-400)]",
            "focus:outline-none focus:ring-2 focus:ring-[#007bc2]",
            "resize-y min-h-[160px] max-h-[400px]"
          )}
        />
      </div>

      {/* Orientation Picker */}
      <div>
        <label className="text-xs font-medium text-[var(--grey-600)] mb-1.5 block">
          Video Orientation
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onOrientationChange("vertical")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border",
              orientation === "vertical"
                ? "bg-[var(--grey-800)] text-white border-[var(--grey-800)]"
                : "bg-white text-[var(--grey-600)] border-[var(--border)] hover:border-[var(--grey-300)]"
            )}
          >
            <svg 
              width="12" 
              height="16" 
              viewBox="0 0 12 16" 
              fill="none" 
              className={cn(
                orientation === "vertical" ? "text-white" : "text-[var(--grey-400)]"
              )}
            >
              <rect 
                x="1" 
                y="1" 
                width="10" 
                height="14" 
                rx="1.5" 
                stroke="currentColor" 
                strokeWidth="1.5"
                fill="none"
              />
            </svg>
            Vertical (9:16)
          </button>
          <button
            type="button"
            onClick={() => onOrientationChange("horizontal")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border",
              orientation === "horizontal"
                ? "bg-[var(--grey-800)] text-white border-[var(--grey-800)]"
                : "bg-white text-[var(--grey-600)] border-[var(--border)] hover:border-[var(--grey-300)]"
            )}
          >
            <svg 
              width="16" 
              height="12" 
              viewBox="0 0 16 12" 
              fill="none" 
              className={cn(
                orientation === "horizontal" ? "text-white" : "text-[var(--grey-400)]"
              )}
            >
              <rect 
                x="1" 
                y="1" 
                width="14" 
                height="10" 
                rx="1.5" 
                stroke="currentColor" 
                strokeWidth="1.5"
                fill="none"
              />
            </svg>
            Horizontal (16:9)
          </button>
        </div>
      </div>

      {/* Channel Selection */}
      {channels.length > 0 && (
        <div>
          <label className="text-xs font-medium text-[var(--grey-600)] mb-1.5 block">
            Publish to:
          </label>
          <div className="flex flex-wrap gap-2">
            {channels.map((channel) => {
              const isSelected = selectedChannelIds.includes(channel.id);
              return (
                <button
                  key={channel.id}
                  type="button"
                  onClick={() => onChannelToggle(channel.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                    isSelected
                      ? "bg-[var(--grey-800)] text-white"
                      : "bg-[var(--grey-50)] border border-[var(--border)] text-[var(--grey-600)] hover:border-[var(--grey-300)]"
                  )}
                >
                  <PlatformIcon platform={channel.platform} className={cn("h-3.5 w-3.5", isSelected && "!text-white")} />
                  {getPlatformLabel(channel.platform, channel.custom_label)}
                </button>
              );
            })}
          </div>
          {channels.length === 0 && (
            <p className="text-xs text-[var(--grey-400)]">
              No channels available for {orientation} videos. Add channels in the Channels tab.
            </p>
          )}
        </div>
      )}

      {/* Target Duration */}
      <div>
        <label className="text-xs font-medium text-[var(--grey-600)] mb-1.5 block">
          Target Duration
          <span className="font-normal text-[var(--grey-400)] ml-1">(optional)</span>
        </label>
        <Input
          value={durationInput}
          onChange={(e) => setDurationInput(e.target.value)}
          onBlur={() => {
            // Parse and sync to parent on blur
            const parsed = parseDurationInput(durationInput);
            onTargetDurationChange(parsed);
            // Format the display value
            setDurationInput(parsed ? formatDurationForDisplay(parsed) : "");
          }}
          placeholder="e.g., 60s, 3m, 1:30"
          className="h-9 bg-white w-32"
        />
      </div>

      {/* Source Video Link */}
      {sourceVideoUrl && (
        <div>
          <label className="text-xs font-medium text-[var(--grey-600)] mb-1.5 block">
            Source Video
          </label>
          <a
            href={sourceVideoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-[#1a5eff] hover:underline"
          >
            <ExternalLink size={12} />
            View original video
          </a>
        </div>
      )}
    </>
  );
}

// Helper labels for production requirements
const PRESENTER_TYPE_LABELS: Record<string, string> = {
  on_camera: "On Camera",
  voiceover_only: "Voiceover Only",
  none: "No Presenter",
};

const CAMERA_COMFORT_LABELS: Record<string, string> = {
  new: "Beginner-friendly",
  comfortable: "Some confidence",
  natural: "High confidence",
};

const SCRIPT_STYLE_LABELS: Record<string, string> = {
  word_for_word: "Scripted",
  bullet_points: "Bullet points",
  improviser: "Improvised",
};

const LOCATION_LABELS: Record<string, string> = {
  home: "Home",
  workplace: "Workplace",
  on_location: "On location",
  studio: "Studio",
};

const EQUIPMENT_LABELS: Record<string, string> = {
  smartphone: "Smartphone",
  webcam: "Webcam",
  dedicated_camera: "Dedicated camera",
  full_production: "Full production",
};

const MOVEMENT_LABELS: Record<string, string> = {
  seated: "Seated/stationary",
  walk_and_talk: "Walk-and-talk",
  action_shots: "Action shots",
  on_the_go: "On-the-go",
};

interface ProductionRequirementsEditorProps {
  requirements: TemplateProductionRequirements | null;
  onChange: (requirements: TemplateProductionRequirements | null) => void;
}

function ProductionRequirementsEditor({
  requirements,
  onChange,
}: ProductionRequirementsEditorProps) {
  if (!requirements) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--grey-200)] p-4 text-center">
        <p className="text-sm text-[var(--grey-500)]">
          No production requirements extracted. Create from video analysis or add manually.
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2"
          onClick={() =>
            onChange({
              presenterType: "on_camera",
              cameraComfort: null,
              scriptStyles: [],
              locations: [],
              equipment: [],
              movement: [],
            })
          }
        >
          Add Requirements
        </Button>
      </div>
    );
  }

  const updateField = <K extends keyof TemplateProductionRequirements>(
    field: K,
    value: TemplateProductionRequirements[K]
  ) => {
    onChange({ ...requirements, [field]: value });
  };

  const toggleArrayItem = <T extends string>(
    field: keyof TemplateProductionRequirements,
    item: T
  ) => {
    const current = (requirements[field] as T[]) || [];
    const newValue = current.includes(item)
      ? current.filter((i) => i !== item)
      : [...current, item];
    updateField(field, newValue as TemplateProductionRequirements[typeof field]);
  };

  return (
    <div className="space-y-4 rounded-lg border border-[var(--grey-200)] bg-[var(--grey-50)] p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-[var(--grey-700)]">
          Production Requirements
        </h4>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-[var(--grey-500)]"
          onClick={() => onChange(null)}
        >
          Remove
        </Button>
      </div>

      {/* Presenter Type */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-[var(--grey-600)]">
          Presenter Type
        </label>
        <div className="flex flex-wrap gap-2">
          {(["on_camera", "voiceover_only", "none"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => updateField("presenterType", type)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                requirements.presenterType === type
                  ? "bg-[var(--grey-800)] text-white"
                  : "bg-white border border-[var(--grey-200)] text-[var(--grey-600)] hover:border-[var(--grey-300)]"
              )}
            >
              {PRESENTER_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      {/* Camera Comfort - only for on_camera */}
      {requirements.presenterType === "on_camera" && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[var(--grey-600)]">
            Camera Comfort Level Required
          </label>
          <div className="flex flex-wrap gap-2">
            {(["new", "comfortable", "natural"] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() =>
                  updateField(
                    "cameraComfort",
                    requirements.cameraComfort === level ? null : level
                  )
                }
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                  requirements.cameraComfort === level
                    ? "bg-[var(--grey-800)] text-white"
                    : "bg-white border border-[var(--grey-200)] text-[var(--grey-600)] hover:border-[var(--grey-300)]"
                )}
              >
                {CAMERA_COMFORT_LABELS[level]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Script Styles */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-[var(--grey-600)]">
          Compatible Script Styles
        </label>
        <div className="flex flex-wrap gap-2">
          {(["word_for_word", "bullet_points", "improviser"] as const).map(
            (style) => (
              <button
                key={style}
                type="button"
                onClick={() => toggleArrayItem("scriptStyles", style)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                  requirements.scriptStyles.includes(style)
                    ? "bg-[var(--grey-800)] text-white"
                    : "bg-white border border-[var(--grey-200)] text-[var(--grey-600)] hover:border-[var(--grey-300)]"
                )}
              >
                {SCRIPT_STYLE_LABELS[style]}
              </button>
            )
          )}
        </div>
      </div>

      {/* Locations */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-[var(--grey-600)]">
          Suitable Locations
        </label>
        <div className="flex flex-wrap gap-2">
          {(["home", "workplace", "on_location", "studio"] as const).map(
            (location) => (
              <button
                key={location}
                type="button"
                onClick={() => toggleArrayItem("locations", location)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                  requirements.locations.includes(location)
                    ? "bg-[var(--grey-800)] text-white"
                    : "bg-white border border-[var(--grey-200)] text-[var(--grey-600)] hover:border-[var(--grey-300)]"
                )}
              >
                {LOCATION_LABELS[location]}
              </button>
            )
          )}
        </div>
      </div>

      {/* Equipment */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-[var(--grey-600)]">
          Minimum Equipment
        </label>
        <div className="flex flex-wrap gap-2">
          {(
            ["smartphone", "webcam", "dedicated_camera", "full_production"] as const
          ).map((equipment) => (
            <button
              key={equipment}
              type="button"
              onClick={() => toggleArrayItem("equipment", equipment)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                requirements.equipment.includes(equipment)
                  ? "bg-[var(--grey-800)] text-white"
                  : "bg-white border border-[var(--grey-200)] text-[var(--grey-600)] hover:border-[var(--grey-300)]"
              )}
            >
              {EQUIPMENT_LABELS[equipment]}
            </button>
          ))}
        </div>
      </div>

      {/* Movement */}
      {requirements.presenterType === "on_camera" && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[var(--grey-600)]">
            Movement Style
          </label>
          <div className="flex flex-wrap gap-2">
            {(
              ["seated", "walk_and_talk", "action_shots", "on_the_go"] as const
            ).map((movement) => (
              <button
                key={movement}
                type="button"
                onClick={() => toggleArrayItem("movement", movement)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                  requirements.movement.includes(movement)
                    ? "bg-[var(--grey-800)] text-white"
                    : "bg-white border border-[var(--grey-200)] text-[var(--grey-600)] hover:border-[var(--grey-300)]"
                )}
              >
                {MOVEMENT_LABELS[movement]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

