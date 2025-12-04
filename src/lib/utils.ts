import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
 * @param baseName - The business name to generate slug from
 * @param existingSlugs - Array of existing slugs to check against
 * @param excludeSlug - Optional slug to exclude from collision check (for updates)
 */
export function generateUniqueSlug(
  baseName: string,
  existingSlugs: string[],
  excludeSlug?: string
): string {
  const baseSlug = generateSlug(baseName);
  
  // Filter out the excluded slug (used when updating a business)
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
