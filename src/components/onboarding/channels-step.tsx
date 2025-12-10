"use client";

import { useState } from "react";
import { useOnboarding } from "./onboarding-context";
import { addDistributionChannel, deleteDistributionChannel } from "@/lib/actions/project";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, Plus, Trash2, SkipForward, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { DISTRIBUTION_PLATFORMS, DistributionChannel } from "@/lib/types";
import { PlatformIcon } from "@/components/strategy/platform-icon";

export function ChannelsStep() {
  const { project, channels, setChannels, addChannel, goNext, goBack } = useOnboarding();
  const [isAdding, setIsAdding] = useState(false);

  const handleTogglePlatform = async (platformValue: string) => {
    const existingChannel = channels.find((c) => c.platform === platformValue);

    if (existingChannel) {
      // Remove it
      await deleteDistributionChannel(existingChannel.id);
      setChannels(channels.filter((c) => c.id !== existingChannel.id));
    } else {
      // Add it
      const result = await addDistributionChannel(project.id, {
        platform: platformValue,
      });
      if (result.success && result.channel) {
        addChannel(result.channel);
      }
    }
  };

  // Common platforms to show as quick toggles
  const quickPlatforms = DISTRIBUTION_PLATFORMS.filter(
    (p) => !["custom"].includes(p.value)
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="space-y-3">
        <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight">
          Where do you publish videos?
        </h1>
        <p className="text-lg text-slate-500">
          Select your distribution channels. Ideas will be tailored to each platform&apos;s format.
        </p>
      </div>

      {/* Platform grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {quickPlatforms.map((platform) => {
          const isSelected = channels.some((c) => c.platform === platform.value);
          return (
            <button
              key={platform.value}
              onClick={() => handleTogglePlatform(platform.value)}
              className={cn(
                "relative flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all duration-200",
                isSelected
                  ? "border-violet-500 bg-violet-50"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <Check className="h-4 w-4 text-violet-600" />
                </div>
              )}
              <PlatformIcon platform={platform.value} className="h-8 w-8" />
              <span
                className={cn(
                  "text-sm font-medium",
                  isSelected ? "text-violet-700" : "text-slate-700"
                )}
              >
                {platform.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected count */}
      {channels.length > 0 && (
        <p className="text-sm text-slate-500">
          {channels.length} channel{channels.length === 1 ? "" : "s"} selected
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4">
        <Button variant="outline" onClick={goBack} className="h-11">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={goNext} className="h-11 px-6">
          {channels.length > 0 ? (
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


