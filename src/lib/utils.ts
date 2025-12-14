import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { IdeaStatus, AssetType, ASSET_STAGE_MAP } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Calculate idea status from timestamps and asset completion states
 * 
 * Status priority:
 * 1. canceled_at set → "canceled"
 * 2. reject_reason set (and not accepted) → "rejected"
 * 3. published_at set → "published"
 * 4. accepted_at not set → "new"
 * 5. No assets yet → "preproduction" (waiting for assets to generate)
 * 6. Has incomplete preproduction assets → "preproduction"
 * 7. Has incomplete production assets → "production"
 * 8. Otherwise → "postproduction"
 * 
 * Note: Ideas skip stages that have no assets (e.g., if no production assets exist,
 * status goes from preproduction directly to postproduction)
 */
export function calculateIdeaStatus(
  idea: {
    accepted_at: string | null;
    published_at: string | null;
    canceled_at: string | null;
    reject_reason: string | null;
  },
  assets: { type: AssetType; is_complete: boolean }[]
): IdeaStatus {
  // Priority 1: Canceled overrides everything
  if (idea.canceled_at) {
    return "canceled";
  }

  // Priority 2: Rejected (only if not yet accepted into production)
  if (idea.reject_reason && !idea.accepted_at) {
    return "rejected";
  }

  // Priority 3: Published
  if (idea.published_at) {
    return "published";
  }

  // Priority 4: Not yet accepted
  if (!idea.accepted_at) {
    return "new";
  }

  // If no assets exist yet, idea is in preproduction (waiting for assets to be generated)
  if (assets.length === 0) {
    return "preproduction";
  }

  // Group assets by stage and check completion
  const assetsByStage = {
    preproduction: assets.filter(a => ASSET_STAGE_MAP[a.type] === "preproduction"),
    production: assets.filter(a => ASSET_STAGE_MAP[a.type] === "production"),
    postproduction: assets.filter(a => ASSET_STAGE_MAP[a.type] === "postproduction"),
  };

  // Check stages in order - only count stages that have assets
  // Priority 5: Incomplete preproduction assets
  if (assetsByStage.preproduction.length > 0 && 
      assetsByStage.preproduction.some(a => !a.is_complete)) {
    return "preproduction";
  }

  // Priority 6: Incomplete production assets
  if (assetsByStage.production.length > 0 && 
      assetsByStage.production.some(a => !a.is_complete)) {
    return "production";
  }

  // Priority 7: Default to postproduction (ready to edit, or all done but not published)
  return "postproduction";
}

/**
 * Converts a string to a URL-friendly slug
 * e.g., "Acme Inc." → "acme-inc"
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .replace(/^-|-$/g, ""); // Trim hyphens from start/end
}

/**
 * Generates a unique slug by appending a number suffix if needed
 * @param baseName - The project name to generate slug from
 * @param existingSlugs - Array of existing slugs to check against
 * @param excludeSlug - Optional slug to exclude from collision check (for updates)
 */
/**
 * Normalizes a URL by adding https:// if no protocol is specified
 * e.g., "example.com" → "https://example.com"
 *       "www.example.com" → "https://www.example.com"
 *       "http://example.com" → "http://example.com" (unchanged)
 */
export function normalizeUrl(url: string): string {
  if (!url) return url;

  const trimmed = url.trim();
  if (!trimmed) return trimmed;

  // If it already has a protocol, return as-is
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  // Add https:// prefix
  return `https://${trimmed}`;
}

export function generateUniqueSlug(
  baseName: string,
  existingSlugs: string[],
  excludeSlug?: string
): string {
  const baseSlug = generateSlug(baseName);
  
  // Filter out the excluded slug (used when updating a project)
  const slugsToCheck = excludeSlug 
    ? existingSlugs.filter(s => s !== excludeSlug)
    : existingSlugs;
  
  if (!slugsToCheck.includes(baseSlug)) {
    return baseSlug;
  }

  // Find a unique suffix
  let counter = 2;
  let uniqueSlug = `${baseSlug}-${counter}`;
  while (slugsToCheck.includes(uniqueSlug)) {
    counter++;
    uniqueSlug = `${baseSlug}-${counter}`;
  }
  
  return uniqueSlug;
}

/**
 * Generate a URL-friendly slug for a distribution channel
 * For standard platforms: uses the platform value (e.g., "tiktok", "instagram_reels")
 * For custom channels: slugifies the custom label
 */
export function getChannelSlug(channel: { platform: string; custom_label: string | null }): string {
  if (channel.platform === "custom" && channel.custom_label) {
    // Slugify custom label: lowercase, replace spaces with hyphens, remove special chars
    return channel.custom_label
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
  }
  // For standard platforms, use the platform value directly (already URL-friendly)
  return channel.platform;
}
