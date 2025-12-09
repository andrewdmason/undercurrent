import { Instagram, Youtube, Linkedin, Facebook, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { DISTRIBUTION_PLATFORMS } from "@/lib/types";

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

export function PlatformIcon({ platform, className }: { platform: string; className?: string }) {
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

export function getPlatformLabel(platform: string, customLabel?: string | null): string {
  if (platform === "custom" && customLabel) {
    return customLabel;
  }
  const platformInfo = DISTRIBUTION_PLATFORMS.find((p) => p.value === platform);
  return platformInfo?.label || platform;
}

