/**
 * Small persisted view preferences — which layout each pane's Level view uses,
 * and which rail groups you collapsed.
 *
 * These are VIEW state, not document state: nothing here belongs in an undo
 * stack, and none of it rides the run payload. Same garbage-tolerant shape as
 * `panes.ts` and `folders.ts` — any parse failure falls back to the default,
 * because a desk tool with a corrupt pref should still open.
 */

import type { LevelLayoutMode } from "./levelLayout";
import { isLevelLayoutMode } from "./levelLayout";

const STORAGE_KEY = "lantern-prefs-v1";

export interface Prefs {
  /** level layout keyed by host id ("col-centre" / "col-right") */
  levelMode: Record<string, LevelLayoutMode>;
  /** host ids whose Dialogue scene-picker strip is folded away */
  sceneListClosed: string[];
  /** screen ids whose rail group is collapsed */
  collapsed: string[];
}

const EMPTY: Prefs = { levelMode: {}, sceneListClosed: [], collapsed: [] };

/** Toggle one id in a collapsed list. Pure — the storage wrapper calls it. */
export function withCollapsed(list: readonly string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export function readPrefs(): Prefs {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return EMPTY;
    const p = parsed as Partial<Record<keyof Prefs, unknown>>;

    const levelMode: Record<string, LevelLayoutMode> = {};
    if (p.levelMode && typeof p.levelMode === "object") {
      for (const [host, mode] of Object.entries(
        p.levelMode as Record<string, unknown>
      )) {
        if (isLevelLayoutMode(mode)) levelMode[host] = mode;
      }
    }

    const ids = (v: unknown) =>
      Array.isArray(v)
        ? v.filter((x): x is string => typeof x === "string" && x !== "")
        : [];

    return {
      levelMode,
      sceneListClosed: ids(p.sceneListClosed),
      collapsed: ids(p.collapsed),
    };
  } catch {
    return EMPTY;
  }
}

/** Merge one patch into the stored prefs. Storage failure is non-fatal. */
function patch(next: Partial<Prefs>): void {
  try {
    const merged = { ...readPrefs(), ...next };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // storage unavailable (private mode / quota) — the session keeps its state
  }
}

export function writeLevelMode(hostId: string, mode: LevelLayoutMode): void {
  patch({ levelMode: { ...readPrefs().levelMode, [hostId]: mode } });
}

export function writeCollapsed(ids: readonly string[]): void {
  patch({ collapsed: [...ids] });
}

/** One host's stored layout, or `fallback` when unset. */
export function levelModeFor(
  hostId: string,
  fallback: LevelLayoutMode
): LevelLayoutMode {
  return readPrefs().levelMode[hostId] ?? fallback;
}

/** Open is the default — only a host you explicitly folded is remembered. */
export function sceneListOpenFor(hostId: string): boolean {
  return !readPrefs().sceneListClosed.includes(hostId);
}

export function writeSceneListOpen(hostId: string, open: boolean): void {
  const closed = readPrefs().sceneListClosed;
  patch({
    sceneListClosed: open
      ? closed.filter((h) => h !== hostId)
      : withCollapsed(closed.filter((h) => h !== hostId), hostId),
  });
}
