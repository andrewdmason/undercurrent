import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { IdeaAsset, ASSET_STAGE_MAP } from "@/lib/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ideaId: string }> }
) {
  const { ideaId } = await params;
  const supabase = await createClient();

  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch assets for the idea
  const { data: assets, error } = await supabase
    .from("idea_assets")
    .select("*")
    .eq("idea_id", ideaId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching assets:", error);
    return NextResponse.json({ error: "Failed to fetch assets" }, { status: 500 });
  }

  const typedAssets = assets as IdeaAsset[];

  // Calculate totals - only pending assets count toward remaining
  const totalMinutes = typedAssets.reduce(
    (sum, asset) => sum + (asset.time_estimate_minutes || 0),
    0
  );
  const remainingMinutes = typedAssets
    .filter(asset => asset.status !== "ready")
    .reduce((sum, asset) => sum + (asset.time_estimate_minutes || 0), 0);

  // Group assets by stage for UI
  const assetsByStage = {
    preproduction: typedAssets.filter(a => ASSET_STAGE_MAP[a.type] === "preproduction"),
    production: typedAssets.filter(a => ASSET_STAGE_MAP[a.type] === "production"),
    postproduction: typedAssets.filter(a => ASSET_STAGE_MAP[a.type] === "postproduction"),
  };

  return NextResponse.json({
    assets: typedAssets,
    assetsByStage,
    totalMinutes,
    remainingMinutes,
  });
}
