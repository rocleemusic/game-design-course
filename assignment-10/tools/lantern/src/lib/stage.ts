import type { Day, Graph, Scene, Screen } from "../types";

/**
 * Mode B stage model — pure, DOM-free, unit tested.
 *
 * Regions ALWAYS come from the screen_spec via graph.json; manifest.json
 * carries image paths only ({ screen_id: "images/t1.png" }). A region's shape
 * may be null (the real-data screen specs ship null placeholders until screen
 * images exist) — a null shape can't draw as a hotspot, so its interaction
 * renders in the text-button list instead. No image at all -> the whole
 * screen renders as the same interactions in a stacked text-button list.
 * The tool never blocks on art.
 */

/** Normalized screen_spec rect: 0-1 coordinates relative to the image. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Parse a screen_spec region shape. Only `{ rect: {x,y,w,h} }` with finite
 *  normalized values draws; anything else (null, malformed, out of range)
 *  returns null and the interaction falls back to a text button. */
export function parseRectShape(shape: unknown): Rect | null {
  if (typeof shape !== "object" || shape === null) return null;
  const rect = (shape as { rect?: unknown }).rect;
  if (typeof rect !== "object" || rect === null) return null;
  const { x, y, w, h } = rect as Record<string, unknown>;
  const nums = [x, y, w, h];
  if (!nums.every((n) => typeof n === "number" && Number.isFinite(n))) return null;
  const r = { x: x as number, y: y as number, w: w as number, h: h as number };
  if (r.x < 0 || r.y < 0 || r.w <= 0 || r.h <= 0) return null;
  if (r.x + r.w > 1 || r.y + r.h > 1) return null;
  return r;
}

/** Normalized rect -> pixel box on a rendered image of imgW x imgH. */
export function rectToPixels(
  rect: Rect,
  imgW: number,
  imgH: number
): { left: number; top: number; width: number; height: number } {
  return {
    left: Math.round(rect.x * imgW),
    top: Math.round(rect.y * imgH),
    width: Math.round(rect.w * imgW),
    height: Math.round(rect.h * imgH),
  };
}

/** Normalized rect -> CSS percentage box (positions inside the image wrap
 *  without measuring it; the same mapping as rectToPixels, in % units). */
export function rectToCss(rect: Rect): {
  left: string;
  top: string;
  width: string;
  height: string;
} {
  const pct = (n: number) => `${(n * 100).toFixed(2)}%`;
  return {
    left: pct(rect.x),
    top: pct(rect.y),
    width: pct(rect.w),
    height: pct(rect.h),
  };
}

/* ---- the render-path decision ---- */

export type StagePath = "image" | "fallback";

/**
 * Image path only when manifest.json names an image for this screen AND the
 * image actually loaded (imageOk starts true and flips false on the img error
 * event). Everything else is the text-button fallback — the primary path
 * while region shapes are null and art doesn't exist yet.
 */
export function decideStagePath(
  manifestPath: string | null | undefined,
  imageOk: boolean
): StagePath {
  return manifestPath && imageOk ? "image" : "fallback";
}

/* ---- per-screen stage model ---- */

export interface StageItem {
  slot_id: string;
  region_id: string;
  rect: Rect | null;
  /** what day.json rolled for this slot ("empty" when nothing) */
  item: string;
  /** clickable: the day rolled a real item and it hasn't been picked yet */
  rolled: boolean;
  picked: boolean;
}

/** Join the screen's item_slots with day.json's item_rolls. */
export function stageItems(
  screen: Screen,
  day: Day | null,
  pickedSlots: ReadonlySet<string>
): StageItem[] {
  const regions = new Map(
    (screen.regions ?? []).map((r) => [r.region_id, parseRectShape(r.shape)])
  );
  return (screen.item_slots ?? []).map((slot) => {
    const roll = day?.item_rolls.find((r) => r.slot_id === slot.slot_id);
    const item = roll?.item ?? "empty";
    const picked = pickedSlots.has(slot.slot_id);
    return {
      slot_id: slot.slot_id,
      region_id: slot.region,
      rect: regions.get(slot.region) ?? null,
      item,
      rolled: item !== "empty" && !picked,
      picked,
    };
  });
}

export interface StageExaminable {
  id: string;
  region_id: string;
  rect: Rect | null;
  /** ChoosePathString address of the examinable stitch */
  address: string;
}

export function stageExaminables(screen: Screen): StageExaminable[] {
  const regions = new Map(
    (screen.regions ?? []).map((r) => [r.region_id, parseRectShape(r.shape)])
  );
  return (screen.examinables ?? []).map((ex) => ({
    id: ex.id,
    region_id: ex.region,
    rect: regions.get(ex.region) ?? null,
    address: `${screen.ink_address}.${ex.id}`,
  }));
}

/* ---- presence ---- */

/** day.json slot_fill rows for one screen + time_block (pure filter). */
export function filterPresence(
  day: Day | null,
  screenId: string,
  timeBlock: string
): { screen_id: string; time_block: string; soul: string }[] {
  return (day?.slot_fill ?? []).filter(
    (f) => f.screen_id === screenId && f.time_block === timeBlock
  );
}

/**
 * The id whose appearance in the visited trace means "this scene completed":
 * the last choice node's gather line (`GB-<choice_id>-GATHER` — every scene
 * rejoins at the gather), or the last line's content_id for choiceless scenes.
 */
export function sceneCompletionId(scene: Scene): string | null {
  const lastChoice = scene.choice_nodes.at(-1);
  if (lastChoice) return `GB-${lastChoice.choice_id}-GATHER`;
  return scene.lines.at(-1)?.content_id ?? null;
}

export interface StagePresence {
  soul: string;
  /** the soul's scene on this screen, when the graph has one */
  scene_id: string | null;
  /** conversed today: the scene's completion marker is in the visited trace */
  conversed: boolean;
}

export function stagePresence(
  graph: Graph,
  day: Day | null,
  screenId: string,
  timeBlock: string,
  visited: ReadonlySet<string>
): StagePresence[] {
  return filterPresence(day, screenId, timeBlock).map((fill) => {
    const scene = graph.scenes.find(
      (sc) => sc.screen_id === screenId && sc.soul === fill.soul
    );
    const doneId = scene ? sceneCompletionId(scene) : null;
    return {
      soul: fill.soul,
      scene_id: scene?.scene_id ?? null,
      conversed: doneId !== null && visited.has(doneId),
    };
  });
}

/* ---- exits ---- */

export interface StageExit {
  to: string;
  /** target screen's display name (falls back to the id) */
  name: string;
  /** seam name when this connection crosses a seam */
  seam?: string;
  /** false when the target screen isn't in this graph (no ink to jump to) */
  resolvable: boolean;
}

export function stageExits(graph: Graph, screen: Screen): StageExit[] {
  const seams = new Map(
    graph.seams.map((s) => [`${s.from}->${s.to}`, s.name])
  );
  return screen.connects_to.map((to) => {
    const target = graph.screens.find((s) => s.screen_id === to);
    const seam =
      seams.get(`${screen.screen_id}->${to}`) ?? seams.get(`${to}->${screen.screen_id}`);
    return {
      to,
      name: target?.name ?? to,
      seam,
      resolvable: target !== undefined,
    };
  });
}

/* ---- time (stub) ---- */

// GDD naming (03-core-loop.md, 06-world-and-progression.md), matching the
// resolver's LIST TimeOfDay (ink.ts/graph.ts): "morning -> afternoon ->
// evening" are the ordinary playable blocks. "night" is NOT one of them — it
// is festival night, the final sequence (RULED 2026-08-01;
// plans/2026-08-01-festival-night-transition-plan.md), reached only by the
// player's choice from the life's last home_hub_final, never by this clock.
// Renamed from ink's original "midday" alongside the resolver's own rename,
// so this manual advance-time control (a dev/debug override, separate from
// the real move-budget clock in ink.ts's emitMoveTo/advance_time) never sets
// TimeOfDay to a string the compiled story's LIST doesn't recognise.
export const TIME_BLOCKS = ["morning", "afternoon", "evening"] as const;

/**
 * Advance stub: cycles morning -> afternoon -> evening -> morning, except on
 * the life's last day, where evening's exhaustion is festival night — the
 * final sequence, not a normal block, so it does not cycle back. `day`
 * defaults to 1 (any ordinary day) so existing callers that only track the
 * block still work.
 *
 * This function only computes which block comes next — play.ts's
 * `advanceTime()` is what forces the actual jump to the Festival Grounds
 * when this returns "night", so the shortcut lands in the same state the
 * real home_hub_final choice would.
 */
export function nextTimeBlock(block: string, day = 1): string {
  if (block === "night") return "night"; // terminal — never advances further
  if (block === "evening") return day >= 5 ? "night" : "morning";
  const i = TIME_BLOCKS.indexOf(block as (typeof TIME_BLOCKS)[number]);
  if (i === -1) return "morning";
  return TIME_BLOCKS[(i + 1) % TIME_BLOCKS.length];
}
