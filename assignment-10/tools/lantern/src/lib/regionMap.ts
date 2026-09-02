import type { Graph } from "../types";
import type { Rect } from "./stage";

/**
 * Region geometry (L9) — pure, DOM-free, and where the tests go.
 *
 * Each run folder owns its geometry in one compact map, `<run-dir>/regions.json`:
 * `{ screens: { [screen_id]: { [region_id]: Rect } } }`. This replaces the
 * append-only region-edit journal (out/region-edits.json) — nothing downstream
 * ever replayed that log, so it only grew forever recording history nobody
 * read. Last write wins instead: Apply overwrites the one entry that matters.
 *
 * Region ids are only unique WITHIN a screen (two screens can each have their
 * own "r_board"), so every lookup and merge keys on the pair (screen_id,
 * region_id), never on region_id alone — that is the whole reason this is a
 * nested map instead of a flat one.
 */
export interface RegionMap {
  screens: Record<string, Record<string, Rect>>;
}

/**
 * Patch `graph.screens[].regions[].shape` with whatever this map knows for
 * that (screen_id, region_id) pair. Returns a NEW graph — callers (loadRun)
 * rely on the input graph staying untouched so it can still be compared
 * against or logged.
 *
 * Unknown screens/regions are ignored, not thrown on: the map is built from
 * whatever has been drawn so far, and a screen_spec commonly names more
 * regions than have geometry yet.
 */
export function overlayRegions(graph: Graph, map: RegionMap): Graph {
  return {
    ...graph,
    screens: graph.screens.map((screen) => {
      const screenRegions = map.screens[screen.screen_id];
      if (!screenRegions || !screen.regions) return screen;
      return {
        ...screen,
        regions: screen.regions.map((region) => {
          const rect = screenRegions[region.region_id];
          if (!rect) return region;
          return { ...region, shape: { rect } };
        }),
      };
    }),
  };
}

/**
 * Add, overwrite, or delete one (screen_id, region_id) entry.
 *
 * `rect: null` DELETES the key rather than storing a null placeholder — that
 * is how undo restores a region to "no shape recorded here": the overlay's
 * "unknown region -> leave alone" rule then falls through to whatever
 * graph.json already had (usually null, same as any never-drawn region).
 *
 * An emptied screen object is pruned too, so an untouched run folder's
 * regions.json stays `{ screens: {} }` rather than accumulating `{}` husks.
 *
 * Returns a NEW map — the input is never mutated, so a caller holding the old
 * map (e.g. mid-request) still sees the pre-merge state.
 */
export function mergeRegionEntry(
  map: RegionMap,
  screen_id: string,
  region_id: string,
  rect: Rect | null
): RegionMap {
  const nextScreens = { ...map.screens };
  const existing = nextScreens[screen_id] ?? {};
  if (rect === null) {
    if (!(region_id in existing)) return { screens: nextScreens };
    const { [region_id]: _removed, ...rest } = existing;
    void _removed;
    if (Object.keys(rest).length === 0) {
      delete nextScreens[screen_id];
    } else {
      nextScreens[screen_id] = rest;
    }
    return { screens: nextScreens };
  }
  nextScreens[screen_id] = { ...existing, [region_id]: rect };
  return { screens: nextScreens };
}

/** Read one (screen_id, region_id) entry, or null when unset. */
export function regionMapGet(map: RegionMap, screen_id: string, region_id: string): Rect | null {
  return map.screens[screen_id]?.[region_id] ?? null;
}

/**
 * The in-memory shape `pendingRegions` (App.tsx) actually needs — deliberately
 * NOT the same type as the on-disk/wire `RegionMap`.
 *
 * A pending edit can be a genuine PENDING DELETE (D1): undoing a placement
 * whose region was null in graph.json but already Applied to regions.json
 * must be able to say "on Apply, remove this key from disk" — and `RegionMap`
 * has no way to store that, because on disk a key is either a Rect or absent,
 * never a stored null. So the pending map's values are `Rect | null`, where
 * `null` is a TOMBSTONE ("delete this key on Apply") and an absent key means
 * "no pending edit at all, defer to whatever's already on disk". Those are
 * different things and `pendingRegionCount` must count the tombstone as
 * unapplied work, same as any other pending edit.
 */
export interface PendingRegionMap {
  screens: Record<string, Record<string, Rect | null>>;
}

/**
 * Read one (screen_id, region_id) pending entry. Returns `undefined` when
 * there is no pending edit at all — distinct from a tombstone (`null`, "this
 * will be deleted on Apply") or a placed rect. Callers that fold this into
 * "what should undo revert to" must not collapse the three cases with `??`.
 */
export function pendingRegionGet(
  map: PendingRegionMap,
  screen_id: string,
  region_id: string
): Rect | null | undefined {
  const screen = map.screens[screen_id];
  if (!screen || !(region_id in screen)) return undefined;
  return screen[region_id];
}

/**
 * Set one pending (screen_id, region_id) entry — to a Rect, or to the
 * tombstone `null`. Unlike `mergeRegionEntry`, this NEVER removes the key:
 * a tombstone has to survive in the map so Apply can see it and tell the
 * server to delete that key from regions.json. Returns a new map.
 */
export function setPendingRegionEntry(
  map: PendingRegionMap,
  screen_id: string,
  region_id: string,
  rect: Rect | null
): PendingRegionMap {
  const nextScreens = { ...map.screens };
  const existing = nextScreens[screen_id] ?? {};
  nextScreens[screen_id] = { ...existing, [region_id]: rect };
  return { screens: nextScreens };
}

/**
 * Remove one pending (screen_id, region_id) entry entirely — used when undo
 * rewinds a placement back to "there was never a pending edit here" (the
 * region was null in the graph AND nothing had reached disk for it yet, so
 * there is nothing to tombstone). An emptied screen object is pruned, same
 * rule as `mergeRegionEntry`.
 */
export function deletePendingRegionEntry(
  map: PendingRegionMap,
  screen_id: string,
  region_id: string
): PendingRegionMap {
  const nextScreens = { ...map.screens };
  const existing = nextScreens[screen_id];
  if (!existing || !(region_id in existing)) return { screens: nextScreens };
  const { [region_id]: _removed, ...rest } = existing;
  void _removed;
  if (Object.keys(rest).length === 0) {
    delete nextScreens[screen_id];
  } else {
    nextScreens[screen_id] = rest;
  }
  return { screens: nextScreens };
}
