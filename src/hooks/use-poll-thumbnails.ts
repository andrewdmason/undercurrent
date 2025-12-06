"use client";

import { useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

const POLL_INTERVAL = 3000; // 3 seconds

interface UsePollThumbnailsOptions {
  /** IDs of ideas that are missing thumbnails */
  pendingIdeaIds: string[];
  /** Called when new thumbnails are detected */
  onUpdate: () => void;
  /** Whether polling is enabled */
  enabled?: boolean;
}

/**
 * Polls the database for thumbnail updates on ideas that are missing images.
 * Calls onUpdate when new thumbnails are detected.
 */
export function usePollThumbnails({
  pendingIdeaIds,
  onUpdate,
  enabled = true,
}: UsePollThumbnailsOptions) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousPendingRef = useRef<Set<string>>(new Set());

  const checkForUpdates = useCallback(async () => {
    if (pendingIdeaIds.length === 0) return;

    const supabase = createClient();
    
    // Check which ideas now have images
    const { data: ideas } = await supabase
      .from("ideas")
      .select("id, image_url")
      .in("id", pendingIdeaIds);

    if (!ideas) return;

    // Find ideas that now have images
    const nowHaveImages = ideas.filter((idea) => idea.image_url !== null);
    
    if (nowHaveImages.length > 0) {
      // Some thumbnails have been generated
      onUpdate();
    }
  }, [pendingIdeaIds, onUpdate]);

  useEffect(() => {
    // Don't poll if disabled or no pending ideas
    if (!enabled || pendingIdeaIds.length === 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Start polling
    intervalRef.current = setInterval(checkForUpdates, POLL_INTERVAL);

    // Also check immediately when pending ideas change
    const currentPending = new Set(pendingIdeaIds);
    const previousPending = previousPendingRef.current;
    
    // Check if there are new pending ideas (not just fewer)
    const hasNewPending = pendingIdeaIds.some((id) => !previousPending.has(id));
    if (hasNewPending) {
      checkForUpdates();
    }
    
    previousPendingRef.current = currentPending;

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, pendingIdeaIds, checkForUpdates]);
}



