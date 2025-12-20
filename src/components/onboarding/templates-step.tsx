"use client";

import { useState, useEffect, useCallback } from "react";
import { useOnboarding } from "./onboarding-context";
import { getScoredSampleVideos, createTemplatesFromSamples } from "@/lib/actions/sample-videos";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, Loader2, Check, X, SkipForward, RefreshCw, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScoredSampleVideo, ProjectTemplateWithChannels } from "@/lib/types";
import { YouTubeEmbed } from "@/components/ui/youtube-embed";
import { CreateTemplateModal } from "@/components/strategy/create-template-modal";

type FlowState =
  | "loading" // Fetching and scoring videos
  | "discovery" // Showing videos one at a time
  | "no-more" // User said no to 5 videos without saying yes
  | "creating" // Creating templates from selections
  | "manual" // Fallback to manual entry (no videos matched)
  | "done"; // Templates created, moving on

export function TemplatesStep() {
  const { project, templates, channels, setTemplates, addTemplate, goNext, goBack } = useOnboarding();

  // Flow state
  const [flowState, setFlowState] = useState<FlowState>("loading");

  // Video discovery state
  const [availableVideos, setAvailableVideos] = useState<ScoredSampleVideo[]>([]);
  const [shownVideoIds, setShownVideoIds] = useState<Set<string>>(new Set());
  const [likedVideoIds, setLikedVideoIds] = useState<Set<string>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [consecutiveNos, setConsecutiveNos] = useState(0);

  // Manual mode state
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Configuration
  const MIN_VIDEOS_TO_SHOW = 5;
  const MAX_NOS_BEFORE_PROMPT = 5;

  // Load videos on mount
  useEffect(() => {
    async function loadVideos() {
      try {
        const videos = await getScoredSampleVideos(project.id);

        if (videos.length === 0) {
          // No videos match - go to manual mode
          setFlowState("manual");
          return;
        }

        setAvailableVideos(videos);
        setFlowState("discovery");
      } catch (error) {
        console.error("Failed to load sample videos:", error);
        setFlowState("manual");
      }
    }

    loadVideos();
  }, [project.id]);

  // Get current video
  const currentVideo = availableVideos[currentIndex];

  // Check if we should stop showing videos
  const shouldStopShowing = useCallback(() => {
    const videosShown = shownVideoIds.size;
    const hasLikedAtLeastOne = likedVideoIds.size > 0;

    // Stop if: shown enough videos AND has at least one like
    if (videosShown >= MIN_VIDEOS_TO_SHOW && hasLikedAtLeastOne) {
      return true;
    }

    // Stop if: no more videos to show
    if (currentIndex >= availableVideos.length) {
      return true;
    }

    return false;
  }, [shownVideoIds.size, likedVideoIds.size, currentIndex, availableVideos.length]);

  // Handle like
  const handleLike = async () => {
    if (!currentVideo) return;

    const newLiked = new Set(likedVideoIds);
    newLiked.add(currentVideo.id);
    setLikedVideoIds(newLiked);

    const newShown = new Set(shownVideoIds);
    newShown.add(currentVideo.id);
    setShownVideoIds(newShown);

    setConsecutiveNos(0);

    // Check if we should stop
    if (newShown.size >= MIN_VIDEOS_TO_SHOW && newLiked.size > 0) {
      // Done showing videos - create templates
      await createTemplates(Array.from(newLiked));
    } else {
      // Show next video
      setCurrentIndex((i) => i + 1);
    }
  };

  // Handle skip/no
  const handleSkip = () => {
    if (!currentVideo) return;

    const newShown = new Set(shownVideoIds);
    newShown.add(currentVideo.id);
    setShownVideoIds(newShown);

    const newConsecutiveNos = consecutiveNos + 1;
    setConsecutiveNos(newConsecutiveNos);

    // Check if user has said no to MAX_NOS_BEFORE_PROMPT without any yes
    if (newConsecutiveNos >= MAX_NOS_BEFORE_PROMPT && likedVideoIds.size === 0) {
      setFlowState("no-more");
      return;
    }

    // Check if no more videos
    if (currentIndex + 1 >= availableVideos.length) {
      if (likedVideoIds.size > 0) {
        // Create templates from what they liked
        createTemplates(Array.from(likedVideoIds));
      } else {
        setFlowState("no-more");
      }
      return;
    }

    // Show next video
    setCurrentIndex((i) => i + 1);
  };

  // Create templates from liked videos
  const createTemplates = async (videoIds: string[]) => {
    setFlowState("creating");

    try {
      const result = await createTemplatesFromSamples(project.id, videoIds);

      if (result.success) {
        // Add templates to context
        for (const template of result.templates) {
          addTemplate(template);
        }
        setFlowState("done");

        // Auto-advance after a brief moment
        setTimeout(() => {
          goNext();
        }, 1500);
      } else {
        console.error("Failed to create templates:", result.error);
        setFlowState("manual");
      }
    } catch (error) {
      console.error("Failed to create templates:", error);
      setFlowState("manual");
    }
  };

  // Show more videos
  const handleShowMore = () => {
    setConsecutiveNos(0);
    setFlowState("discovery");
  };

  // Skip to manual entry
  const handleSkipToManual = () => {
    setFlowState("manual");
  };

  // Handle manual template creation
  const handleTemplateCreated = (template: ProjectTemplateWithChannels) => {
    addTemplate(template);
    setIsModalOpen(false);
  };

  // Progress indicator
  const videosShown = shownVideoIds.size;
  const videosLiked = likedVideoIds.size;

  // === RENDER STATES ===

  // Loading state
  if (flowState === "loading") {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-500">
        <div className="relative mb-6">
          <div className="h-16 w-16 rounded-full bg-violet-100 flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-violet-600 animate-spin" />
          </div>
        </div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">
          Finding videos that match your setup...
        </h2>
        <p className="text-slate-500">
          We&apos;re selecting styles based on your characters and channels.
        </p>
      </div>
    );
  }

  // Creating templates state
  if (flowState === "creating") {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-500">
        <div className="relative mb-6">
          <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-green-600 animate-spin" />
          </div>
        </div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">
          Creating your templates...
        </h2>
        <p className="text-slate-500">
          Setting up {videosLiked} template{videosLiked !== 1 ? "s" : ""} based on your selections.
        </p>
      </div>
    );
  }

  // Done state (brief success message)
  if (flowState === "done") {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-500">
        <div className="relative mb-6">
          <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
            <Check className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">
          Templates created!
        </h2>
        <p className="text-slate-500">
          {templates.length} template{templates.length !== 1 ? "s" : ""} ready to go.
        </p>
      </div>
    );
  }

  // No more videos / all skipped state
  if (flowState === "no-more") {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="text-center py-12">
          <div className="mx-auto mb-6 h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center">
            <RefreshCw className="h-8 w-8 text-slate-400" />
          </div>
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">
            None of these feel right?
          </h2>
          <p className="text-slate-500 mb-8">
            No problem! You can see more examples or skip ahead.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {currentIndex < availableVideos.length && (
              <Button onClick={handleShowMore} className="h-11 px-6">
                Show me more
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleSkipToManual}
              className="h-11 px-6"
            >
              Add templates manually
            </Button>
            <Button variant="ghost" onClick={goNext} className="h-11 px-6">
              Skip for now
              <SkipForward className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Manual entry mode
  if (flowState === "manual") {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight">
            What video styles do you like?
          </h1>
          <p className="text-lg text-slate-500">
            Tell us about the types of videos you want to make. We&apos;ll use these as templates when suggesting ideas.
          </p>
        </div>

        {/* Template list */}
        <div className="space-y-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200"
            >
              <div className="flex-1 min-w-0">
                <span className="text-base font-medium text-slate-800">{template.name}</span>
                {template.description && (
                  <p className="text-sm text-slate-400 mt-0.5 line-clamp-1">{template.description}</p>
                )}
              </div>
            </div>
          ))}

          <Button
            variant="outline"
            onClick={() => setIsModalOpen(true)}
            className="h-11 w-full border-dashed"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add a video style
          </Button>

          {templates.length === 0 && (
            <div className="text-center py-4 text-slate-400 text-sm">
              Examples: &quot;Talking head to camera&quot;, &quot;Screen recording with voiceover&quot;, &quot;Quick cuts with music&quot;
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4">
          <Button variant="outline" onClick={goBack} className="h-11">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button onClick={goNext} className="h-11 px-6">
            {templates.length > 0 ? (
              <>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            ) : (
              <>
                Skip for now
                <SkipForward className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>

        <CreateTemplateModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          projectId={project.id}
          channels={channels}
          onTemplateCreated={handleTemplateCreated}
          onTemplateUpdated={() => {}}
          editingTemplate={null}
        />
      </div>
    );
  }

  // === MAIN DISCOVERY VIEW ===
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">
          Could you make a video like this?
        </h1>
        <div className="flex items-center justify-between">
          <p className="text-slate-500">
            Pick styles that fit your setup. We&apos;ll structure your ideas around them.
          </p>
          <div className="text-sm text-slate-400">
            {videosLiked > 0 && (
              <span className="text-green-600 font-medium">{videosLiked} chosen</span>
            )}
            {videosLiked > 0 && " · "}
            Video {videosShown + 1}
          </div>
        </div>
      </div>

      {/* Video card */}
      {currentVideo && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          {/* Video embed */}
          <div className={cn(
            "w-full mx-auto",
            currentVideo.orientation === "vertical" ? "max-w-sm" : "max-w-full"
          )}>
            <YouTubeEmbed
              videoId={currentVideo.youtube_id}
              orientation={currentVideo.orientation}
              autoplay={true}
              muted={true}
              loop={true}
            />
          </div>

          {/* Video info */}
          <div className="p-5 space-y-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                {currentVideo.name}
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                {currentVideo.description}
              </p>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              <span className={cn(
                "px-2 py-1 rounded-full text-xs font-medium",
                currentVideo.orientation === "vertical"
                  ? "bg-violet-100 text-violet-700"
                  : "bg-blue-100 text-blue-700"
              )}>
                {currentVideo.orientation === "vertical" ? "Vertical / Short" : "Horizontal / Long"}
              </span>
              {currentVideo.presenter_type === "on_camera" && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                  On camera
                </span>
              )}
              {currentVideo.presenter_type === "voiceover_only" && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                  Voiceover
                </span>
              )}
              {currentVideo.presenter_type === "none" && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                  No presenter
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center border-t border-slate-100">
            <button
              onClick={handleSkip}
              className="flex-1 flex items-center justify-center gap-2 py-4 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors border-r border-slate-100"
            >
              <X className="h-5 w-5" />
              <span className="font-medium">Skip</span>
            </button>
            <button
              onClick={handleLike}
              className="flex-1 flex items-center justify-center gap-2 py-4 text-green-600 hover:bg-green-50 hover:text-green-700 transition-colors"
            >
              <Check className="h-5 w-5" />
              <span className="font-medium">I&apos;d make this</span>
            </button>
          </div>
        </div>
      )}

      {/* Bottom actions */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" onClick={goBack} className="h-10">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Button
          variant="ghost"
          onClick={handleSkipToManual}
          className="h-10 text-slate-400"
        >
          Add manually instead
        </Button>
      </div>
    </div>
  );
}
