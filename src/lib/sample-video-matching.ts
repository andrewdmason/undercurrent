/**
 * Sample Video Matching Logic
 *
 * Scores sample videos based on how well they match a user's capabilities
 * (characters and distribution channels).
 */

import {
  SampleVideo,
  ScoredSampleVideo,
  ProjectCharacter,
  DistributionChannel,
  CameraComfort,
  Equipment,
  OnCameraInterviewData,
  TemplateOrientation,
} from "@/lib/types";

// Context needed to score videos
export interface UserMatchingContext {
  characters: ProjectCharacter[];
  channels: DistributionChannel[];
}

// Equipment hierarchy (higher index = more capable)
const EQUIPMENT_LEVELS: Equipment[] = [
  "smartphone",
  "webcam",
  "dedicated_camera",
  "full_production",
];

// Camera comfort hierarchy (higher index = more comfortable)
const COMFORT_LEVELS: CameraComfort[] = ["new", "comfortable", "natural"];

// Map platforms to their typical orientations
const PLATFORM_ORIENTATIONS: Record<string, TemplateOrientation> = {
  tiktok: "vertical",
  instagram_reels: "vertical",
  youtube_shorts: "vertical",
  snapchat_spotlight: "vertical",
  youtube: "horizontal",
  linkedin: "horizontal",
  facebook: "horizontal",
  x: "vertical", // X supports both but vertical is more common
};

/**
 * Get the orientations the user can publish to based on their channels
 */
function getUserOrientations(channels: DistributionChannel[]): Set<TemplateOrientation> {
  const orientations = new Set<TemplateOrientation>();
  for (const channel of channels) {
    const orientation = PLATFORM_ORIENTATIONS[channel.platform];
    if (orientation) {
      orientations.add(orientation);
    }
  }
  return orientations;
}

/**
 * Check if user has any human (non-AI) characters
 */
function hasHumanCharacter(characters: ProjectCharacter[]): boolean {
  return characters.some((c) => !c.is_ai_generated);
}

/**
 * Check if user has any on-camera (non-voiceover-only) human characters
 */
function hasOnCameraHumanCharacter(characters: ProjectCharacter[]): boolean {
  return characters.some((c) => !c.is_ai_generated && !c.is_voiceover_only);
}

/**
 * Get the best equipment level across all human characters
 */
function getBestEquipmentLevel(characters: ProjectCharacter[]): number {
  let bestLevel = -1;

  for (const character of characters) {
    if (character.is_ai_generated) continue;

    const interviewData = character.interview_data as OnCameraInterviewData | null;
    if (!interviewData?.equipment) continue;

    for (const equip of interviewData.equipment) {
      const level = EQUIPMENT_LEVELS.indexOf(equip);
      if (level > bestLevel) {
        bestLevel = level;
      }
    }
  }

  return bestLevel;
}

/**
 * Get the best camera comfort level across all on-camera human characters
 */
function getBestCameraComfort(characters: ProjectCharacter[]): number {
  let bestLevel = -1;

  for (const character of characters) {
    if (character.is_ai_generated || character.is_voiceover_only) continue;

    const interviewData = character.interview_data as OnCameraInterviewData | null;
    if (!interviewData?.cameraComfort) continue;

    const level = COMFORT_LEVELS.indexOf(interviewData.cameraComfort);
    if (level > bestLevel) {
      bestLevel = level;
    }
  }

  return bestLevel;
}

/**
 * Get all filming locations available across human characters
 */
function getAllLocations(characters: ProjectCharacter[]): Set<string> {
  const locations = new Set<string>();

  for (const character of characters) {
    if (character.is_ai_generated) continue;

    const interviewData = character.interview_data as OnCameraInterviewData | null;
    if (!interviewData?.locations) continue;

    for (const location of interviewData.locations) {
      locations.add(location);
    }
  }

  return locations;
}

/**
 * Get all movement capabilities across human on-camera characters
 */
function getAllMovementCapabilities(characters: ProjectCharacter[]): Set<string> {
  const movements = new Set<string>();

  for (const character of characters) {
    if (character.is_ai_generated || character.is_voiceover_only) continue;

    const interviewData = character.interview_data as OnCameraInterviewData | null;
    if (!interviewData?.movement) continue;

    for (const movement of interviewData.movement) {
      movements.add(movement);
    }
  }

  return movements;
}

/**
 * Check if user's equipment meets the video's requirements
 */
function meetsEquipmentRequirement(
  userBestLevel: number,
  videoEquipment: Equipment[]
): boolean {
  if (videoEquipment.length === 0) return true; // No requirement

  // User meets requirement if they have equipment >= any of the video's requirements
  for (const equip of videoEquipment) {
    const requiredLevel = EQUIPMENT_LEVELS.indexOf(equip);
    if (userBestLevel >= requiredLevel) {
      return true;
    }
  }

  return false;
}

/**
 * Score a sample video based on user context
 *
 * Returns -1 if the video should be filtered out (hard filter)
 * Otherwise returns a score where higher = better match
 */
export function scoreSampleVideo(
  video: SampleVideo,
  context: UserMatchingContext
): number {
  const { characters, channels } = context;

  // === HARD FILTERS (return -1 to exclude) ===

  // If video requires human presenter but user only has AI characters
  if (video.requires_human && !hasHumanCharacter(characters)) {
    return -1;
  }

  // If video requires on-camera presenter but user has no on-camera human characters
  if (
    video.presenter_type === "on_camera" &&
    video.requires_human &&
    !hasOnCameraHumanCharacter(characters)
  ) {
    return -1;
  }

  // === SOFT SCORING ===
  let score = 100;

  // Orientation match (heavy weight - 40 points)
  const userOrientations = getUserOrientations(channels);
  if (!userOrientations.has(video.orientation)) {
    score -= 40;
  }

  // Only apply capability checks for videos that require humans
  if (video.requires_human && video.presenter_type === "on_camera") {
    // Equipment compatibility (20 points)
    const userEquipmentLevel = getBestEquipmentLevel(characters);
    if (
      userEquipmentLevel >= 0 &&
      !meetsEquipmentRequirement(userEquipmentLevel, video.equipment)
    ) {
      score -= 20;
    }

    // Camera comfort level (15 points)
    if (video.camera_comfort) {
      const userComfortLevel = getBestCameraComfort(characters);
      const requiredComfortLevel = COMFORT_LEVELS.indexOf(video.camera_comfort);

      if (userComfortLevel >= 0 && userComfortLevel < requiredComfortLevel) {
        score -= 15;
      }
    }

    // Location overlap (bonus up to 10 points)
    if (video.locations.length > 0) {
      const userLocations = getAllLocations(characters);
      let locationMatches = 0;
      for (const location of video.locations) {
        if (userLocations.has(location)) {
          locationMatches++;
        }
      }
      if (locationMatches > 0) {
        score += Math.min(locationMatches * 3, 10);
      } else {
        score -= 5;
      }
    }

    // Movement capability overlap (bonus up to 5 points)
    if (video.movement.length > 0) {
      const userMovements = getAllMovementCapabilities(characters);
      let movementMatches = 0;
      for (const movement of video.movement) {
        if (userMovements.has(movement)) {
          movementMatches++;
        }
      }
      if (movementMatches > 0) {
        score += Math.min(movementMatches * 2, 5);
      }
    }
  }

  return score;
}

/**
 * Score and sort sample videos for a user
 *
 * @param videos - All available sample videos
 * @param context - User's characters and channels
 * @returns Scored videos, sorted by score descending, with filtered videos removed
 */
export function getScoredVideos(
  videos: SampleVideo[],
  context: UserMatchingContext
): ScoredSampleVideo[] {
  const scoredVideos: ScoredSampleVideo[] = [];

  for (const video of videos) {
    const score = scoreSampleVideo(video, context);

    // Skip videos that were hard-filtered
    if (score < 0) continue;

    scoredVideos.push({
      ...video,
      score,
    });
  }

  // Sort by score descending
  scoredVideos.sort((a, b) => b.score - a.score);

  return scoredVideos;
}

/**
 * Get the top N videos with some randomization among similar scores
 *
 * Takes the top matches but shuffles within score tiers to add variety
 */
export function getTopVideosWithVariety(
  scoredVideos: ScoredSampleVideo[],
  count: number
): ScoredSampleVideo[] {
  if (scoredVideos.length <= count) {
    return [...scoredVideos];
  }

  // Take more than we need to allow for variety
  const pool = scoredVideos.slice(0, Math.min(count * 2, scoredVideos.length));

  // Shuffle the pool
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Take the requested count
  return shuffled.slice(0, count);
}
