/**
 * Pane sizing — a versioned localStorage blob keyed by each Splitter's
 * storageKey. Splitters write pixel sizes directly to CSS custom properties
 * during a drag (never React state, or the React Flow canvases jank); this
 * module only persists the committed value and reads it back at startup.
 *
 * Pure and defensive: any parse failure or garbage value falls back to the
 * caller's default, mirroring SettingsDrawer's try/catch reader.
 */

const STORAGE_KEY = "lantern-panes-v1";

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/**
 * The ceiling when a pane has no ceiling worth naming — the container has not
 * been measured yet (pre-layout, or jsdom, where every rect is zero). Clamping
 * against it is a no-op, which is the honest answer: we don't know, so don't
 * fence the user in.
 */
export const UNBOUNDED = Number.POSITIVE_INFINITY;

/** the [min,max] span a keyboard step works against when max is UNBOUNDED */
const FALLBACK_RANGE = 400;

/**
 * A pane's ceiling: everything the container has, less what the rest of the
 * shell needs. This replaces the old hard-coded per-splitter maximum — a wide
 * monitor should let a pane get wide, and only the neighbours' floor stops it.
 */
export function dynamicMax(
  containerSize: number,
  reserve: number,
  min: number
): number {
  if (!Number.isFinite(containerSize) || containerSize <= 0) return UNBOUNDED;
  return Math.max(min, containerSize - reserve);
}

/**
 * Keyboard step: move `current` by `deltaPct` percent of the [min,max] range,
 * clamped back into bounds. Split out so the Splitter's arrow/Shift math is a
 * pure, unit-tested function rather than inline geometry. An UNBOUNDED max has
 * no range to take a percentage of, so the step falls back to a fixed span.
 */
export function stepValue(
  current: number,
  deltaPct: number,
  min: number,
  max: number
): number {
  const span = max - min;
  const range = Number.isFinite(span) ? span : FALLBACK_RANGE;
  return clamp(current + (deltaPct / 100) * range, min, max);
}

/** All stored pane sizes, garbage-tolerant. Only finite numbers survive. */
export function readPaneSizes(): Record<string, number> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

/** One stored size, or `fallback` when unset/garbage. */
export function paneSize(key: string, fallback: number): number {
  const v = readPaneSizes()[key];
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

/** Persist one pane size. Storage failure is non-fatal — the drag still held. */
export function writePaneSize(key: string, value: number): void {
  try {
    const all = readPaneSizes();
    all[key] = value;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // storage unavailable (private mode / quota) — in-session sizing is intact
  }
}
