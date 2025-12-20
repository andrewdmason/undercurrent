"use client";

import { useState, useEffect, useRef } from "react";
import { useOnboarding } from "./onboarding-context";
import { addDistributionChannel, deleteDistributionChannel } from "@/lib/actions/project";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, ArrowLeft, Loader2, SkipForward, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { DISTRIBUTION_PLATFORMS } from "@/lib/types";
import { PlatformIcon } from "@/components/strategy/platform-icon";

interface ChannelRanking {
  platform: string;
  priority: "high" | "medium" | "low";
  reason: string;
}

interface ChannelInput {
  url: string;
  interested: boolean;
}

export function ChannelsStep() {
  const { project, channels, setChannels, goNext, goBack } = useOnboarding();
  const [rankings, setRankings] = useState<ChannelRanking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [channelInputs, setChannelInputs] = useState<Record<string, ChannelInput>>({});
  const hasStartedFetch = useRef(false);

  // Initialize channelInputs from existing channels
  useEffect(() => {
    const initial: Record<string, ChannelInput> = {};
    for (const channel of channels) {
      initial[channel.platform] = {
        url: channel.url || "",
        interested: true,
      };
    }
    setChannelInputs(initial);
  }, []);

  // Auto-fetch rankings on mount
  useEffect(() => {
    if (!hasStartedFetch.current) {
      hasStartedFetch.current = true;
      fetchRankings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchRankings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/onboarding/rank-channels/${project.id}`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to get channel rankings");
      }

      const data = await response.json();
      if (data.rankings) {
        setRankings(data.rankings);
      }
    } catch (error) {
      console.error("Failed to fetch rankings:", error);
      // Fallback to default order if ranking fails
      const defaultOrder = DISTRIBUTION_PLATFORMS
        .filter((p) => p.value !== "custom")
        .map((p, i) => ({ 
          platform: p.value, 
          priority: (i < 3 ? "high" : i < 6 ? "medium" : "low") as "high" | "medium" | "low",
          reason: "A great platform for video content." 
        }));
      setRankings(defaultOrder);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (platform: string, field: "url" | "interested", value: string | boolean) => {
    setChannelInputs((prev) => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        url: prev[platform]?.url || "",
        interested: prev[platform]?.interested || false,
        [field]: value,
      },
    }));
  };

  const toggleInterested = (platform: string) => {
    const current = channelInputs[platform]?.interested || false;
    handleInputChange(platform, "interested", !current);
  };

  const handleContinue = async () => {
    setIsSaving(true);

    try {
      // Find channels to add and remove
      const existingPlatforms = new Set(channels.map((c) => c.platform));
      const selectedPlatforms = new Set(
        Object.entries(channelInputs)
          .filter(([, input]) => input.interested || input.url.trim())
          .map(([platform]) => platform)
      );

      // Remove channels that are no longer selected
      for (const channel of channels) {
        if (!selectedPlatforms.has(channel.platform)) {
          await deleteDistributionChannel(channel.id);
        }
      }

      // Add or update channels
      const newChannels = [];
      for (const [platform, input] of Object.entries(channelInputs)) {
        if (input.interested || input.url.trim()) {
          if (!existingPlatforms.has(platform)) {
            // Add new channel
            const result = await addDistributionChannel(project.id, {
              platform,
              url: input.url.trim() || null,
            });
            if (result.success && result.channel) {
              newChannels.push(result.channel);
            } else {
              console.error("Failed to add channel:", platform, result);
            }
          } else {
            // Keep existing channel (could update URL here if needed)
            const existing = channels.find((c) => c.platform === platform);
            if (existing) {
              newChannels.push(existing);
            }
          }
        }
      }

      // Update channels state
      setChannels(newChannels);
      
      // Only advance on success
      goNext();
    } catch (error) {
      console.error("Failed to save channels:", error);
      // Don't advance - user needs to retry
    } finally {
      setIsSaving(false);
    }
  };

  const getPlatformLabel = (platformValue: string) => {
    return DISTRIBUTION_PLATFORMS.find((p) => p.value === platformValue)?.label || platformValue;
  };

  const selectedCount = Object.values(channelInputs).filter(
    (input) => input.interested || input.url.trim()
  ).length;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="space-y-3">
        <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight">
          Select where you&apos;ll publish
        </h1>
        <p className="text-lg text-slate-500">
          We&apos;ve ranked channels based on your business. Add your profile URLs for the ones you use.
        </p>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
          <span>Analyzing the best channels for you...</span>
        </div>
      )}

      {/* Ranked channel list */}
      {!isLoading && rankings.length > 0 && (
        <div className="space-y-3">
          {rankings.map((ranking, index) => {
            const input = channelInputs[ranking.platform] || { url: "", interested: false };
            const isSelected = input.interested || input.url.trim();

            return (
              <div
                key={ranking.platform}
                className={cn(
                  "rounded-xl border-2 p-4 transition-all duration-200",
                  isSelected
                    ? "border-violet-500 bg-violet-50/50"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                )}
              >
                {/* Clickable header area */}
                <button
                  onClick={() => toggleInterested(ranking.platform)}
                  className="flex items-start gap-4 w-full text-left"
                >
                  {/* Rank number */}
                  <div
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-medium transition-colors",
                      isSelected
                        ? "bg-violet-600 text-white"
                        : "bg-slate-100 text-slate-500"
                    )}
                  >
                    {isSelected ? <Check className="h-4 w-4" /> : index + 1}
                  </div>

                  {/* Platform info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <PlatformIcon platform={ranking.platform} className="h-6 w-6 shrink-0" />
                      <span className={cn(
                        "font-medium",
                        isSelected ? "text-violet-900" : "text-slate-900"
                      )}>
                        {getPlatformLabel(ranking.platform)}
                      </span>
                      <span className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded-full",
                        ranking.priority === "high" && "bg-green-100 text-green-700",
                        ranking.priority === "medium" && "bg-amber-100 text-amber-700",
                        ranking.priority === "low" && "bg-slate-100 text-slate-500"
                      )}>
                        {ranking.priority === "high" && "Recommended"}
                        {ranking.priority === "medium" && "Worth trying"}
                        {ranking.priority === "low" && "Optional"}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">
                      {ranking.reason}
                    </p>
                  </div>
                </button>

                {/* URL input - only shown when selected */}
                {isSelected && (
                  <div className="mt-3 ml-11">
                    <Input
                      type="url"
                      placeholder="Profile URL (optional)"
                      value={input.url}
                      onChange={(e) => handleInputChange(ranking.platform, "url", e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-9"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Selected count */}
      {!isLoading && selectedCount > 0 && (
        <p className="text-sm text-slate-500">
          {selectedCount} channel{selectedCount === 1 ? "" : "s"} selected
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4">
        <Button variant="outline" onClick={goBack} className="h-11">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={handleContinue}
          disabled={isLoading || isSaving}
          className="h-11 px-6"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : selectedCount > 0 ? (
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
    </div>
  );
}

