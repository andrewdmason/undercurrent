"use client";

import { useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

const POLL_INTERVAL = 2000; // 2 seconds (faster than thumbnails since assets are quicker)

interface UsePollAssetsOptions {
  /** The idea ID to poll assets for */
  ideaId: string;
  /** Current number of assets */
  currentAssetCount: number;
  /** Called when new assets are detected */
  onUpdate: () => void;
  /** Whether polling is enabled */
  enabled?: boolean;
}

/**
 * Polls the database for asset updates on an idea.
 * Calls onUpdate when new assets are detected.
 */
export function usePollAssets({
  ideaId,
  currentAssetCount,
  onUpdate,
  enabled = true,
}: UsePollAssetsOptions) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastCountRef = useRef<number>(currentAssetCount);

  const checkForUpdates = useCallback(async () => {
    const supabase = createClient();
    
    // Count assets for this idea
    const { count } = await supabase
      .from("idea_assets")
      .select("id", { count: "exact", head: true })
      .eq("idea_id", ideaId);

    if (count !== null && count > lastCountRef.current) {
      // New assets have been generated
      lastCountRef.current = count;
      onUpdate();
    }
  }, [ideaId, onUpdate]);

  useEffect(() => {
    // Update ref when prop changes
    lastCountRef.current = currentAssetCount;
  }, [currentAssetCount]);

  useEffect(() => {
    // Don't poll if disabled
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Start polling
    intervalRef.current = setInterval(checkForUpdates, POLL_INTERVAL);

    // Also check immediately when enabled
    checkForUpdates();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, checkForUpdates]);
}




