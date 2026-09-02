// regions.ts — per-run-folder geometry overlay.
//
// Geometry never lives in the global data/screen-specs.json. Each run folder
// owns a compact regions.json map (screen_id -> region_id -> rect) that is
// applied to the INPUT specs before buildGraph runs. Last write wins because
// there is only ever one entry per (screen_id, region_id) key — no journal,
// no replay, no conflict detection. Those were artefacts of the old
// regionEdits.ts patch flow and are deliberately gone.

import type { Region, ScreenSpec } from "./types.ts";

type Rect = { x: number; y: number; w: number; h: number };

export interface RegionMap {
  screens: Record<string, Record<string, Rect>>;
}

/**
 * The same validity rule the tool's read path uses. Moved over from
 * regionEdits.ts:44-54 verbatim — still needed to validate map entries.
 */
export function parseRect(shape: unknown): Rect | null {
  if (typeof shape !== "object" || shape === null) return null;
  const rect = (shape as { rect?: unknown }).rect;
  if (typeof rect !== "object" || rect === null) return null;
  const { x, y, w, h } = rect as Record<string, unknown>;
  if (![x, y, w, h].every((n) => typeof n === "number" && Number.isFinite(n))) return null;
  const r = { x: x as number, y: y as number, w: w as number, h: h as number };
  if (r.x < 0 || r.y < 0 || r.w <= 0 || r.h <= 0) return null;
  if (r.x + r.w > 1 || r.y + r.h > 1) return null;
  return r;
}

function findRegion(screens: ScreenSpec[], screenId: string, regionId: string): Region | undefined {
  const screen = screens.find((s) => s.screen_id === screenId);
  return (screen?.regions ?? []).find((r) => r.region_id === regionId);
}

/**
 * Apply a region map to screen specs IN PLACE. Keys on screen_id AND
 * region_id, since region ids are only unique within a screen. Every entry is
 * independent — an unknown screen, an unknown region, or an invalid rect
 * produces an orphan for that entry only; every other entry still applies.
 */
export function applyRegionMap(
  screens: ScreenSpec[],
  map: RegionMap,
): { applied: number; orphans: string[] } {
  let applied = 0;
  const orphans: string[] = [];

  for (const [screenId, regions] of Object.entries(map.screens ?? {})) {
    for (const [regionId, shape] of Object.entries(regions ?? {})) {
      const region = findRegion(screens, screenId, regionId);
      if (!region) {
        orphans.push(`no region ${regionId} on screen ${screenId}`);
        continue;
      }
      const rect = parseRect({ rect: shape });
      if (rect === null) {
        orphans.push(`invalid rect for ${screenId}/${regionId}`);
        continue;
      }
      region.shape = { rect };
      applied += 1;
    }
  }

  return { applied, orphans };
}
