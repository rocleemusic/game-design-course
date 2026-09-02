import { parseRectShape, type Rect } from "./stage";

/**
 * Marker geometry (L8) — pure, DOM-free, and where the tests go.
 *
 * Every rect this module produces goes back through `parseRectShape`, the same
 * validator the READ path already uses, so the drawing path and the reading
 * path can never disagree about what counts as a valid region. A rect that
 * would not load is not a rect this module will hand back.
 *
 * Coordinates are normalized 0-1 against the image, never pixels: the stage
 * scales, and a pixel rect would drift the moment the pane resized.
 */

/** Below this a region is a mis-click, not a mark — about 1% of the image. */
export const MIN_SIDE = 0.01;

/** Clamp to the unit square, keeping the rect's size where it can. */
function clamp01(rect: Rect): Rect {
  const w = Math.min(Math.max(rect.w, MIN_SIDE), 1);
  const h = Math.min(Math.max(rect.h, MIN_SIDE), 1);
  return {
    x: Math.min(Math.max(rect.x, 0), 1 - w),
    y: Math.min(Math.max(rect.y, 0), 1 - h),
    w,
    h,
  };
}

/**
 * Run a candidate through the read path's own validator.
 * Returns null for anything the stage would refuse to render.
 */
export function validRect(rect: Rect): Rect | null {
  return parseRectShape({ rect });
}

/** Round to 4 decimals — a region file full of float noise is unreadable. */
function tidy(rect: Rect): Rect {
  const r = (n: number) => Math.round(n * 10_000) / 10_000;
  return { x: r(rect.x), y: r(rect.y), w: r(rect.w), h: r(rect.h) };
}

/**
 * A drag from one normalized point to another.
 * Dragging up or left is normal, so the corners are ordered rather than
 * assumed — otherwise half of all drags would produce a negative width.
 */
export function rectFromDrag(
  from: { x: number; y: number },
  to: { x: number; y: number }
): Rect | null {
  const x = Math.min(from.x, to.x);
  const y = Math.min(from.y, to.y);
  const w = Math.abs(to.x - from.x);
  const h = Math.abs(to.y - from.y);
  if (w < MIN_SIDE || h < MIN_SIDE) return null; // a click, not a drag
  return validRect(tidy(clamp01({ x, y, w, h })));
}

/** A click's default size — 6% of the image. Deliberate (Roc, on record): big
 * enough to grab and resize, small enough not to blanket the screen. */
export const CLICK_SIDE = 0.06;

/**
 * A click (not a drag) still has to place SOMETHING when a chip is selected —
 * a rect centred on the point, at CLICK_SIDE, run through the same
 * clamp/tidy/validate pipeline as every other rect this module produces.
 */
export function rectFromClick(
  p: { x: number; y: number },
  side = CLICK_SIDE
): Rect | null {
  return validRect(tidy(clamp01({ x: p.x - side / 2, y: p.y - side / 2, w: side, h: side })));
}

export type Nudge = "left" | "right" | "up" | "down";

/** Arrow keys move a marker; Shift moves it faster. Keyboard parity, not decoration. */
export function nudgeRect(rect: Rect, dir: Nudge, step = 0.005): Rect | null {
  const dx = dir === "left" ? -step : dir === "right" ? step : 0;
  const dy = dir === "up" ? -step : dir === "down" ? step : 0;
  return validRect(tidy(clamp01({ ...rect, x: rect.x + dx, y: rect.y + dy })));
}

export type Handle = "nw" | "ne" | "sw" | "se";

/**
 * Drag one corner. The opposite corner stays put, which is what makes a resize
 * feel like a resize rather than a move.
 */
export function resizeRect(rect: Rect, handle: Handle, to: { x: number; y: number }): Rect | null {
  const right = rect.x + rect.w;
  const bottom = rect.y + rect.h;
  const anchor = {
    nw: { x: right, y: bottom },
    ne: { x: rect.x, y: bottom },
    sw: { x: right, y: rect.y },
    se: { x: rect.x, y: rect.y },
  }[handle];
  return rectFromDrag(anchor, to);
}

/** Pointer position -> normalized point on the image. */
export function toNormalized(
  point: { clientX: number; clientY: number },
  box: { left: number; top: number; width: number; height: number }
): { x: number; y: number } {
  if (box.width <= 0 || box.height <= 0) return { x: 0, y: 0 };
  return {
    x: Math.min(Math.max((point.clientX - box.left) / box.width, 0), 1),
    y: Math.min(Math.max((point.clientY - box.top) / box.height, 0), 1),
  };
}

/** Translate a rect by (dx, dy), preserving its size — `clamp01` already
 * preserves size when clamping at an edge, so a drag that runs off the image
 * slides to a stop instead of shrinking. */
export function moveRect(rect: Rect, delta: { dx: number; dy: number }): Rect | null {
  return validRect(tidy(clamp01({ ...rect, x: rect.x + delta.dx, y: rect.y + delta.dy })));
}

/**
 * Which region a point hits, topmost-first.
 *
 * Iterated in reverse render order because later items draw on top and
 * should be the first thing a click can grab. The SELECTED id is checked
 * first regardless of order, so a selected region under another stays
 * grabbable — otherwise selecting a region and then dragging near an
 * overlap could silently re-target the one drawn on top of it.
 */
export function hitTestRects(
  items: { id: string; rect: Rect }[],
  p: { x: number; y: number },
  selectedId: string | null
): string | null {
  const inside = (rect: Rect) =>
    p.x >= rect.x && p.x <= rect.x + rect.w && p.y >= rect.y && p.y <= rect.y + rect.h;

  if (selectedId !== null) {
    const sel = items.find((it) => it.id === selectedId);
    if (sel && inside(sel.rect)) return sel.id;
  }

  for (let i = items.length - 1; i >= 0; i -= 1) {
    if (inside(items[i].rect)) return items[i].id;
  }
  return null;
}

/** How close (in normalized units) a point has to land to a corner to count
 * as grabbing its resize handle, rather than the body of the rect. */
export const HANDLE_TOL = 0.02;

/** Which corner handle, if any, a point is within tolerance of. */
export function handleAt(rect: Rect, p: { x: number; y: number }, tol = HANDLE_TOL): Handle | null {
  const corners: { handle: Handle; x: number; y: number }[] = [
    { handle: "nw", x: rect.x, y: rect.y },
    { handle: "ne", x: rect.x + rect.w, y: rect.y },
    { handle: "sw", x: rect.x, y: rect.y + rect.h },
    { handle: "se", x: rect.x + rect.w, y: rect.y + rect.h },
  ];
  for (const c of corners) {
    if (Math.abs(p.x - c.x) <= tol && Math.abs(p.y - c.y) <= tol) return c.handle;
  }
  return null;
}

/**
 * Keyboard resize: grows or shrinks w/h anchored at the NW corner. Right/down
 * grow, left/up shrink — the opposite of `nudgeRect`'s move semantics, so the
 * two keyboard modes stay unambiguous from the direction alone. Routed through
 * the same clamp/tidy/validate pipeline, and refuses rather than shrinking
 * a side below MIN_SIDE.
 */
export function resizeByKey(rect: Rect, dir: Nudge, step: number): Rect | null {
  const dw = dir === "right" ? step : dir === "left" ? -step : 0;
  const dh = dir === "down" ? step : dir === "up" ? -step : 0;
  const w = rect.w + dw;
  const h = rect.h + dh;
  if (w < MIN_SIDE || h < MIN_SIDE) return null;
  return validRect(tidy(clamp01({ ...rect, w, h })));
}
