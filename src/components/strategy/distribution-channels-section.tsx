"use client";

import { useState, useCallback } from "react";
import { DistributionChannel, DISTRIBUTION_PLATFORMS } from "@/lib/types";
import {
  addDistributionChannel,
  updateDistributionChannel,
  deleteDistributionChannel,
} from "@/lib/actions/business";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Trash2, ChevronDown, Instagram, Youtube, Linkedin, Facebook, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

// Platform icons - Lucide for most, inline SVGs for platforms not in Lucide
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}

function SnapchatIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301a.603.603 0 0 1 .266-.067c.09 0 .18.018.27.046.57.15.749.554.749.81 0 .271-.18.615-.54.79-.466.225-1.14.39-1.665.45-.12.015-.21.09-.24.195a1.47 1.47 0 0 1-.045.165c-.03.075-.06.165-.06.255 0 .21.12.39.3.465 1.05.375 2.28 1.125 2.445 1.665.09.27.075.48-.03.66-.09.15-.24.27-.42.33-.3.12-.66.18-1.11.18-.36 0-.75-.03-1.17-.105-.36-.06-.645-.12-.87-.165a1.77 1.77 0 0 0-.405-.045c-.27 0-.525.09-.87.375-.72.57-1.44 1.59-2.595 1.59h-.045c-1.155 0-1.875-1.02-2.595-1.59-.33-.27-.585-.375-.87-.375a1.77 1.77 0 0 0-.405.045c-.225.045-.51.105-.87.165-.42.075-.81.105-1.17.105-.45 0-.81-.06-1.11-.18a.722.722 0 0 1-.42-.33c-.105-.18-.12-.39-.03-.66.165-.54 1.395-1.29 2.445-1.665.18-.075.3-.255.3-.465 0-.09-.03-.18-.06-.255a1.47 1.47 0 0 1-.045-.165c-.03-.105-.12-.18-.24-.195-.525-.06-1.2-.225-1.665-.45-.36-.175-.54-.52-.54-.79 0-.255.18-.66.75-.81a.61.61 0 0 1 .27-.046c.09 0 .18.022.27.067.36.18.72.285 1.02.3.21 0 .345-.045.405-.09a7.95 7.95 0 0 1-.033-.57c-.104-1.628-.23-3.654.3-4.847C7.86 1.07 11.216.793 12.206.793z"/>
    </svg>
  );
}

function PlatformIcon({ platform, className }: { platform: string; className?: string }) {
  const baseClass = cn("h-4 w-4", className);
  
  switch (platform) {
    case "tiktok":
      return <TikTokIcon className={cn(baseClass, "text-black")} />;
    case "instagram_reels":
      return <Instagram className={cn(baseClass, "text-pink-500")} />;
    case "youtube_shorts":
    case "youtube":
      return <Youtube className={cn(baseClass, "text-red-600")} />;
    case "snapchat_spotlight":
      return <SnapchatIcon className={cn(baseClass, "text-yellow-400")} />;
    case "linkedin":
      return <Linkedin className={cn(baseClass, "text-blue-700")} />;
    case "facebook":
      return <Facebook className={cn(baseClass, "text-blue-600")} />;
    case "x":
      return <XIcon className={cn(baseClass, "text-black")} />;
    default:
      return <Globe className={cn(baseClass, "text-[var(--grey-500)]")} />;
  }
}

interface DistributionChannelsSectionProps {
  businessId: string;
  channels: DistributionChannel[];
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function DistributionChannelsSection({
  businessId,
  channels: initialChannels,
}: DistributionChannelsSectionProps) {
  const [channels, setChannels] = useState<DistributionChannel[]>(initialChannels);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAddChannel = async (data: {
    platform: string;
    custom_label?: string;
    goal_count?: number;
    goal_cadence?: "weekly" | "monthly";
    notes?: string;
  }) => {
    const result = await addDistributionChannel(businessId, data);
    if (result.success && result.channel) {
      setChannels([...channels, result.channel]);
    }
    setIsAdding(false);
  };

  const handleUpdateChannel = async (
    channelId: string,
    data: Partial<DistributionChannel>
  ) => {
    await updateDistributionChannel(channelId, data);
    setChannels(
      channels.map((c) => (c.id === channelId ? { ...c, ...data } : c))
    );
  };

  const handleDeleteChannel = async (channelId: string) => {
    await deleteDistributionChannel(channelId);
    setChannels(channels.filter((c) => c.id !== channelId));
  };

  // Get platforms that haven't been added yet (except custom which can be added multiple times)
  const availablePlatforms = DISTRIBUTION_PLATFORMS.filter(
    (p) =>
      p.value === "custom" ||
      !channels.some((c) => c.platform === p.value)
  );

  return (
    <div className="rounded-lg border border-[var(--border)] bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-[var(--grey-800)]">
            Distribution Channels
          </h2>
          <p className="text-xs text-[var(--grey-400)] mt-0.5">
            Where you publish your video content
          </p>
        </div>
        {!isAdding && availablePlatforms.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAdding(true)}
            className="h-8 text-xs"
          >
            <Plus size={14} className="mr-1" />
            Add Channel
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {channels.map((channel) => (
          <ChannelCard
            key={channel.id}
            channel={channel}
            isEditing={editingId === channel.id}
            onEdit={() => setEditingId(channel.id)}
            onCancelEdit={() => setEditingId(null)}
            onUpdate={(data) => handleUpdateChannel(channel.id, data)}
            onDelete={() => handleDeleteChannel(channel.id)}
          />
        ))}

        {isAdding && (
          <NewChannelForm
            availablePlatforms={availablePlatforms}
            onSave={handleAddChannel}
            onCancel={() => setIsAdding(false)}
          />
        )}

        {channels.length === 0 && !isAdding && (
          <div className="text-center py-8 text-[var(--grey-400)] text-sm">
            No channels added yet. Add where you distribute your video content.
          </div>
        )}
      </div>
    </div>
  );
}

// Platform icons/colors for visual differentiation
function getPlatformLabel(platform: string, customLabel?: string | null): string {
  if (platform === "custom" && customLabel) {
    return customLabel;
  }
  return DISTRIBUTION_PLATFORMS.find((p) => p.value === platform)?.label || platform;
}

interface ChannelCardProps {
  channel: DistributionChannel;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (data: Partial<DistributionChannel>) => void;
  onDelete: () => void;
}

function ChannelCard({
  channel,
  isEditing,
  onEdit,
  onCancelEdit,
  onUpdate,
  onDelete,
}: ChannelCardProps) {
  const [goalCount, setGoalCount] = useState(channel.goal_count?.toString() || "");
  const [goalCadence, setGoalCadence] = useState<"weekly" | "monthly" | null>(
    channel.goal_cadence
  );
  const [notes, setNotes] = useState(channel.notes || "");
  const [customLabel, setCustomLabel] = useState(channel.custom_label || "");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const saveChanges = useCallback(
    async (data: Partial<DistributionChannel>) => {
      setSaveStatus("saving");
      const result = await updateDistributionChannel(channel.id, data);
      if (result.error) {
        setSaveStatus("error");
        setTimeout(() => setSaveStatus("idle"), 3000);
      } else {
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      }
    },
    [channel.id]
  );

  const handleGoalBlur = () => {
    const count = goalCount ? parseInt(goalCount, 10) : null;
    if (count !== channel.goal_count || goalCadence !== channel.goal_cadence) {
      onUpdate({ goal_count: count, goal_cadence: goalCadence });
      saveChanges({ goal_count: count, goal_cadence: goalCadence });
    }
  };

  const handleNotesBlur = () => {
    if (notes !== channel.notes) {
      onUpdate({ notes: notes || null });
      saveChanges({ notes: notes || null });
    }
  };

  const handleCustomLabelBlur = () => {
    if (customLabel !== channel.custom_label) {
      onUpdate({ custom_label: customLabel || null });
      saveChanges({ custom_label: customLabel || null });
    }
  };

  if (isEditing) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--grey-50)] p-4">
        <div className="space-y-4">
          {/* Header with platform icon */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-[var(--grey-800)]">
                <PlatformIcon platform={channel.platform} className="h-5 w-5" />
                <span className="text-sm font-medium">
                  {getPlatformLabel(channel.platform, channel.custom_label)}
                </span>
              </div>
              <SaveStatusIndicator status={saveStatus} />
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancelEdit}
                className="h-7 text-xs"
              >
                Done
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="h-7 w-7 p-0 text-[var(--grey-400)] hover:text-[#f72736]"
              >
                <Trash2 size={14} />
              </Button>
            </div>
          </div>

          {/* Custom label input (only for custom platform) */}
          {channel.platform === "custom" && (
            <div>
              <label className="text-xs text-[var(--grey-600)] mb-1.5 block">
                Channel Name
              </label>
              <Input
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                onBlur={handleCustomLabelBlur}
                placeholder="e.g., Company Blog, Newsletter"
                className="h-8 rounded-lg bg-white border-[var(--border)] focus-visible:ring-2 focus-visible:ring-[#007bc2]"
              />
            </div>
          )}

          {/* Production goal */}
          <div>
            <label className="text-xs text-[var(--grey-600)] mb-1.5 block">
              Production Goal
            </label>
            <div className="flex gap-2">
              <Input
                type="text"
                inputMode="numeric"
                value={goalCount}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setGoalCount(val);
                }}
                onBlur={handleGoalBlur}
                placeholder="0"
                className="h-8 w-20 rounded-lg bg-white border-[var(--border)] focus-visible:ring-2 focus-visible:ring-[#007bc2]"
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-8 w-[120px] justify-between rounded-lg bg-white border-[var(--border)] text-sm font-normal px-3"
                  >
                    {goalCadence === "weekly" ? "per week" : goalCadence === "monthly" ? "per month" : "Select..."}
                    <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[120px]">
                  <DropdownMenuRadioGroup
                    value={goalCadence || ""}
                    onValueChange={(value) => {
                      const cadence = value as "weekly" | "monthly" | "";
                      setGoalCadence(cadence || null);
                      const count = goalCount ? parseInt(goalCount, 10) : null;
                      onUpdate({ goal_count: count, goal_cadence: cadence || null });
                      saveChanges({ goal_count: count, goal_cadence: cadence || null });
                    }}
                  >
                    <DropdownMenuRadioItem value="weekly">per week</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="monthly">per month</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-[var(--grey-600)] mb-1.5 block">
              Strategy Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleNotesBlur}
              placeholder="e.g., Cross-post from TikTok, focus on educational content..."
              rows={2}
              className={cn(
                "w-full rounded-lg bg-white border border-[var(--border)] px-3 py-2",
                "text-sm text-[var(--grey-800)] placeholder:text-[var(--grey-400)]",
                "focus:outline-none focus:ring-2 focus:ring-[#007bc2]",
                "resize-none"
              )}
            />
          </div>
        </div>
      </div>
    );
  }

  // Collapsed view
  const platformLabel = getPlatformLabel(channel.platform, channel.custom_label);
  
  return (
    <div
      className="rounded-lg border border-[var(--border)] bg-[var(--grey-50)] p-4 group cursor-pointer hover:border-[var(--grey-200)] transition-colors"
      onClick={onEdit}
    >
      <div className="flex items-center gap-3">
        {/* Platform icon */}
        <div className="flex-shrink-0 text-[var(--grey-600)]">
          <PlatformIcon platform={channel.platform} className="h-5 w-5" />
        </div>

        {/* Platform name and goal */}
        <div className="flex-1 min-w-0">
          {channel.goal_count && channel.goal_cadence ? (
            <span className="text-sm font-medium text-[var(--grey-800)]">
              {platformLabel}: {channel.goal_count} / {channel.goal_cadence === "weekly" ? "week" : "month"}
            </span>
          ) : (
            <span className="text-sm font-medium text-[var(--grey-800)]">
              {platformLabel}
              <span className="text-[var(--grey-400)] font-normal"> · No goal set</span>
            </span>
          )}
          {channel.notes && (
            <p className="text-xs text-[var(--grey-400)] mt-0.5">
              {channel.notes}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="h-7 w-7 p-0 text-[var(--grey-400)] hover:text-[#f72736]"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}

interface NewChannelFormProps {
  availablePlatforms: Array<{ value: string; label: string }>;
  onSave: (data: {
    platform: string;
    custom_label?: string;
    goal_count?: number;
    goal_cadence?: "weekly" | "monthly";
    notes?: string;
  }) => void;
  onCancel: () => void;
}

function NewChannelForm({ availablePlatforms, onSave, onCancel }: NewChannelFormProps) {
  const [platform, setPlatform] = useState<string>("");
  const [customLabel, setCustomLabel] = useState("");
  const [goalCount, setGoalCount] = useState("");
  const [goalCadence, setGoalCadence] = useState<"weekly" | "monthly">("weekly");
  const [notes, setNotes] = useState("");

  const handleSubmit = () => {
    if (!platform) return;
    if (platform === "custom" && !customLabel.trim()) return;

    onSave({
      platform,
      custom_label: platform === "custom" ? customLabel.trim() : undefined,
      goal_count: goalCount ? parseInt(goalCount, 10) : undefined,
      goal_cadence: goalCadence,
      notes: notes.trim() || undefined,
    });
  };

  const canSubmit = platform && (platform !== "custom" || customLabel.trim());

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--grey-50)] p-4">
      <div className="space-y-4">
        {/* Platform and Production Goal - same row */}
        <div className="flex gap-4">
          {/* Platform selector */}
          <div className="flex-1">
            <label className="text-xs text-[var(--grey-600)] mb-1.5 block">
              Platform
            </label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-8 w-full justify-between rounded-lg bg-white border-[var(--border)] text-sm font-normal"
                >
                  <span className="flex items-center gap-2">
                    {platform && <PlatformIcon platform={platform} className="h-4 w-4" />}
                    {platform ? availablePlatforms.find(p => p.value === platform)?.label || platform : "Select a platform..."}
                  </span>
                  <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
                <DropdownMenuRadioGroup value={platform} onValueChange={setPlatform}>
                  {availablePlatforms.map((p) => (
                    <DropdownMenuRadioItem key={p.value} value={p.value} className="flex items-center gap-2">
                      <PlatformIcon platform={p.value} className="h-4 w-4" />
                      {p.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Production goal */}
          <div>
            <label className="text-xs text-[var(--grey-600)] mb-1.5 block">
              Production Goal
            </label>
            <div className="flex gap-2">
              <Input
                type="text"
                inputMode="numeric"
                value={goalCount}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setGoalCount(val);
                }}
                placeholder="0"
                className="h-8 w-16 rounded-lg bg-white border-[var(--border)] focus-visible:ring-2 focus-visible:ring-[#007bc2]"
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-8 w-[120px] justify-between rounded-lg bg-white border-[var(--border)] text-sm font-normal px-3"
                  >
                    {goalCadence === "weekly" ? "per week" : "per month"}
                    <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[120px]">
                  <DropdownMenuRadioGroup
                    value={goalCadence}
                    onValueChange={(value) => setGoalCadence(value as "weekly" | "monthly")}
                  >
                    <DropdownMenuRadioItem value="weekly">per week</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="monthly">per month</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Custom label (only when custom is selected) */}
        {platform === "custom" && (
          <div>
            <label className="text-xs text-[var(--grey-600)] mb-1.5 block">
              Channel Name
            </label>
            <Input
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              placeholder="e.g., Company Blog, Newsletter"
              className="h-8 rounded-lg bg-white border-[var(--border)] focus-visible:ring-2 focus-visible:ring-[#007bc2]"
            />
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="text-xs text-[var(--grey-600)] mb-1.5 block">
            Strategy Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g., Cross-post from TikTok, focus on educational content..."
            rows={2}
            className={cn(
              "w-full rounded-lg bg-white border border-[var(--border)] px-3 py-2",
              "text-sm text-[var(--grey-800)] placeholder:text-[var(--grey-400)]",
              "focus:outline-none focus:ring-2 focus:ring-[#007bc2]",
              "resize-none"
            )}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="h-7 text-xs"
          >
            Add Channel
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-7 text-xs"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;

  return (
    <span
      className={cn(
        "text-xs transition-opacity",
        status === "saving" && "text-[var(--grey-400)]",
        status === "saved" && "text-[#00975a]",
        status === "error" && "text-[#f72736]"
      )}
    >
      {status === "saving" && "Saving..."}
      {status === "saved" && "Saved"}
      {status === "error" && "Error saving"}
    </span>
  );
}

