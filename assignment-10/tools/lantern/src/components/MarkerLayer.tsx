import { useRef, useState } from "react";
import type { Region } from "../types";
import { parseRectShape, rectToCss, type Rect } from "../lib/stage";
import {
  handleAt,
  hitTestRects,
  moveRect,
  nudgeRect,
  rectFromClick,
  rectFromDrag,
  resizeByKey,
  resizeRect,
  toNormalized,
  type Handle,
  type Nudge,
} from "../lib/markers";
import { PlacementDialog } from "./PlacementDialog";
import { formatPlaceNote, placementLabel, type Placement } from "../lib/placeNote";
import type { ContentEntry } from "../lib/bridge";

/**
 * Region authoring (L8) — draw the geometry for a region the spec already
 * declares.
 *
 * ACTIVE ONLY IN AN EXPLICIT MODE. A mis-click during playtest must never move
 * geometry, so the layer does not exist unless "Place markers" is on. That is
 * the whole reason it is a mode rather than a always-on drag target.
 *
 * SIGN-OFF #5 (Roc, 2026-07-30) sets the boundary this component must not
 * cross: it may fill in a region the screen already declares, and it may NOT
 * mint one for something unspecced. A new examinable is not just a rectangle —
 * it needs a clue tier and maybe a gate, and it changes what the screen means.
 *
 * D8 builds the escape hatch that boundary always pointed at. "Mark something
 * new" now has a real path, and it is a NOTE: arm the "＋ new placement" chip,
 * click a spot, describe what belongs there, and the body goes to the pipeline
 * through `onPlaceNote` (src/lib/placeNote.ts owns the format). It still does
 * NOT mint a region — `onCommit` is never called for a new placement, and the
 * absence of an add-region control here is still the sign-off, not an
 * omission. The two click meanings are mutually exclusive by construction:
 * arming clears the selected chip, and selecting a chip disarms.
 *
 * D8 FOLLOW-UP — a confirmed placement now LEAVES SOMETHING BEHIND: a dotted
 * marker on the image and a chip in the tray, so a marking pass has visible
 * feedback that it took. Those come in through `placements`, derived from the
 * run's notes (`pendingPlacements`), never from state in here — a reload must
 * not erase a pass. They are drawn as a third, unmistakably provisional kind
 * of thing, and they are inert: spans in the tray, pointer-events:none on the
 * image, no path to `onSelect` or `onCommit`. A proposal is not a region.
 *
 * GESTURE MACHINE (this pass) — one pointer-down starts exactly one of four
 * gestures (draw / move / resize / ghost-move), one pointer-up commits it
 * exactly once. Clicking inside an existing rect NEVER draws a new one — that
 * is Roc's decision on record; there is deliberately no modifier-key escape
 * hatch back to draw-inside-a-rect. Hit-test priority, in order: (1) arming
 * (unchanged), (2) a resize handle on the SELECTED region — handles beat body
 * because the corner overlap is thin, (3) `hitTestRects` over drawn regions
 * (also selects the hit region), (4) a ghost that carries `source` (a ghost
 * without one cannot be rewritten, so it stays inert), (5) miss: draw if a
 * chip is selected, the existing hint otherwise. A ghost-move NEVER reaches
 * `onCommit` — it goes through the new `onAdjustPlacement` prop instead, a
 * note back to the pipeline, not a region edit (sign-off #5 again: a pending
 * placement is a request, not a region, no matter how it got dragged).
 */

type Point = { x: number; y: number };

type Gesture =
  | { kind: "draw"; from: Point; to: Point }
  | { kind: "move"; regionId: string; orig: Rect; from: Point; to: Point }
  | { kind: "resize"; regionId: string; orig: Rect; handle: Handle; to: Point }
  | { kind: "ghost-move"; index: number; orig: Rect; from: Point; to: Point };

function moveDelta(from: Point, to: Point) {
  return { dx: to.x - from.x, dy: to.y - from.y };
}

/** True when two rects describe the same geometry — used to catch a
 * zero-delta move/resize/ghost-move so a plain selection click does not mint
 * a no-op commit (D2). */
function rectEqual(a: Rect, b: Rect): boolean {
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}

/** Corner position for a resize handle, in the same 0-1 space as the rect. */
function handlePoint(rect: Rect, handle: Handle): Point {
  return {
    x: handle === "nw" || handle === "sw" ? rect.x : rect.x + rect.w,
    y: handle === "nw" || handle === "ne" ? rect.y : rect.y + rect.h,
  };
}

function handleCss(rect: Rect, handle: Handle): { left: string; top: string } {
  const p = handlePoint(rect, handle);
  return { left: `${(p.x * 100).toFixed(2)}%`, top: `${(p.y * 100).toFixed(2)}%` };
}

const HANDLES: Handle[] = ["nw", "ne", "sw", "se"];

export interface MarkerLayerProps {
  regions: Region[];
  /** the region being drawn; null means nothing is selected to draw */
  selected: string | null;
  onSelect: (regionId: string | null) => void;
  /** commit geometry for one declared region */
  onCommit: (regionId: string, oldShape: unknown, rect: Rect) => void;
  /** D8 — the screen these placements are on; required for the note body */
  screenId?: string;
  /** D8 — generated content index; feeds the dialog's item / key-item picker */
  contentIndex?: ContentEntry[] | null;
  /** D8 — cast ids, from `soulNames(graph)` in the caller */
  npcIds?: string[];
  /**
   * D8 — a formatted placement note, addressed to the pipeline. Absent means
   * the new-placement path is unavailable and the chip does not render.
   * This is NOT a region write and must never become one.
   */
  onPlaceNote?: (body: string) => void;
  /**
   * D8 follow-up — outstanding placement REQUESTS on this screen, derived from
   * the run's notes by `pendingPlacements` (never held in local state, so they
   * survive a reload). They are drawn and labelled, and that is all: they are
   * not regions, they are not selectable, and no code path reaches `onCommit`
   * from one. See sign-off #5 in the header.
   */
  placements?: Placement[];
  /**
   * Gesture-machine pass — dragging a ghost that carries `source` rewrites
   * that placement's rect. NEVER `onCommit`: a pending placement is a note to
   * the pipeline, not a region, no matter how its rect changed. A ghost
   * without `source` cannot be rewritten and stays inert to the drag surface.
   */
  onAdjustPlacement?: (placement: Placement, newRect: Rect) => void;
}

export function MarkerLayer(props: MarkerLayerProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [gesture, setGesture] = useState<Gesture | null>(null);
  /* D8 #4: the two gates below (no region selected, drag under MIN_SIDE) used
   * to fail silently — the click was simply eaten. This is the visible
   * feedback the sign-off asks for; it never mints a region, only explains
   * why the geometry that already exists did not move. */
  const [hint, setHint] = useState<string | null>(null);
  /* D8: armed = the next click means "something new goes here", not "move the
   * selected region". Mutually exclusive with a selected chip on purpose —
   * one click cannot be allowed to mean two things. */
  const [armed, setArmed] = useState(false);
  const [pending, setPending] = useState<{ x: number; y: number } | null>(null);

  const canPlace = Boolean(props.onPlaceNote && props.screenId);
  const selected = props.regions.find((r) => r.region_id === props.selected) ?? null;
  /* Derived, not just stored: if a chip gets selected from outside this
   * component, armed collapses to false rather than leaving both live. */
  const arming = canPlace && armed && selected === null;
  const placements = props.placements ?? [];

  const pointAt = (e: { clientX: number; clientY: number }) => {
    const box = boxRef.current?.getBoundingClientRect();
    if (!box) return { x: 0, y: 0 };
    return toNormalized(e, box);
  };

  const commitDraw = (rect: Rect | null) => {
    if (!rect || !selected) return;
    props.onCommit(selected.region_id, selected.shape ?? null, rect);
  };

  /** The live rect for a region mid-gesture, or null when this gesture does
   * not touch that region — callers fall back to the region's static shape. */
  const liveRectFor = (regionId: string): Rect | null => {
    if (!gesture) return null;
    if (gesture.kind === "move" && gesture.regionId === regionId) {
      return moveRect(gesture.orig, moveDelta(gesture.from, gesture.to));
    }
    if (gesture.kind === "resize" && gesture.regionId === regionId) {
      return resizeRect(gesture.orig, gesture.handle, gesture.to);
    }
    return null;
  };

  const drawPreview = gesture?.kind === "draw" ? rectFromDrag(gesture.from, gesture.to) : null;
  const selectedRect = selected
    ? (liveRectFor(selected.region_id) ?? parseRectShape(selected.shape))
    : null;

  /** Topmost-first ghost hit, restricted to ghosts that carry `source` — one
   * without it cannot be written back to a note, so it stays un-grabbable. */
  const ghostHit = (p: Point): number => {
    for (let i = placements.length - 1; i >= 0; i -= 1) {
      const pl = placements[i];
      if (!pl.source) continue;
      const r = pl.rect;
      if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return i;
    }
    return -1;
  };

  return (
    <div className="marker-layer" ref={boxRef} data-testid="marker-layer">
      {/* D8 #4: the visible half of the two silent gates above. */}
      {hint && (
        <p className="marker-hint" role="status">
          {hint}
        </p>
      )}

      {/* Existing geometry, so you can see what is already placed. Live rects
          apply while that same region is being moved or resized, so the
          outline tracks the pointer instead of the last-committed shape. */}
      {props.regions.map((region) => {
        const rect = liveRectFor(region.region_id) ?? parseRectShape(region.shape);
        if (!rect) return null;
        const active = region.region_id === props.selected;
        return (
          <div
            key={region.region_id}
            className={`marker${active ? " marker-active" : ""}`}
            style={rectToCss(rect)}
            title={region.region_id}
          />
        );
      })}

      {/* Outstanding placement requests are NOT drawn here. StageImage draws
          them, so they survive leaving Place-markers mode — a proposal is a
          property of the screen, not of the mode that authored it. This layer
          still owns their chips, because the chip tray is where you read what
          is on the screen while you work. */}

      {drawPreview && <div className="marker marker-preview" style={rectToCss(drawPreview)} />}

      {/* Corner handles for the SELECTED region only — resize target beats
          the body hit-test because the overlap is thin. */}
      {selectedRect &&
        HANDLES.map((h) => (
          <div
            key={h}
            className={`marker-handle marker-handle-${h}`}
            style={handleCss(selectedRect, h)}
          />
        ))}

      {/* The drag surface. Pointer capture, so a drag that leaves the image
          still finishes here rather than being lost to another element. */}
      <div
        className="marker-surface"
        role="application"
        aria-label={
          arming
            ? "Click where the new placement goes"
            : selected
              ? `Draw region ${selected.region_id}`
              : "Select a region to draw"
        }
        tabIndex={0}
        onPointerDown={(e) => {
          const p = pointAt(e);

          if (arming) {
            setHint(null);
            (e.target as Element).setPointerCapture?.(e.pointerId);
            setGesture({ kind: "draw", from: p, to: p });
            return;
          }

          // 2. a resize handle on the SELECTED region beats everything below.
          if (selected) {
            const rect = parseRectShape(selected.shape);
            if (rect) {
              const handle = handleAt(rect, p);
              if (handle) {
                setHint(null);
                (e.target as Element).setPointerCapture?.(e.pointerId);
                setGesture({ kind: "resize", regionId: selected.region_id, orig: rect, handle, to: p });
                return;
              }
            }
          }

          // 3. drawn regions — clicking inside one NEVER starts a draw.
          const items = props.regions
            .map((r) => ({ id: r.region_id, rect: parseRectShape(r.shape) }))
            .filter((it): it is { id: string; rect: Rect } => it.rect !== null);
          const hitId = hitTestRects(items, p, props.selected);
          if (hitId) {
            const hitRect = items.find((it) => it.id === hitId)!.rect;
            setHint(null);
            (e.target as Element).setPointerCapture?.(e.pointerId);
            props.onSelect(hitId);
            setGesture({ kind: "move", regionId: hitId, orig: hitRect, from: p, to: p });
            return;
          }

          // 4. a ghost that carries `source` — the only kind that can be
          // rewritten, so the only kind the drag surface will grab.
          const gi = ghostHit(p);
          if (gi !== -1) {
            setHint(null);
            (e.target as Element).setPointerCapture?.(e.pointerId);
            setGesture({ kind: "ghost-move", index: gi, orig: placements[gi].rect, from: p, to: p });
            return;
          }

          // 5. a clean miss.
          if (!selected) {
            setHint("Select a region chip below first, then drag over the image.");
            return;
          }
          setHint(null);
          (e.target as Element).setPointerCapture?.(e.pointerId);
          setGesture({ kind: "draw", from: p, to: p });
        }}
        onPointerMove={(e) => {
          if (!gesture) return;
          const p = pointAt(e);
          // Only `to` moves — the preview is rendered locally from `orig`,
          // and `onCommit`/`onAdjustPlacement` never fire here. One completed
          // gesture is exactly one commit; a per-move commit would flood the
          // undo history.
          setGesture({ ...gesture, to: p });
        }}
        onPointerUp={() => {
          if (!gesture) return;

          if (gesture.kind === "draw") {
            if (arming) {
              // D8: a new placement captures the POINT and opens the dialog.
              // It never commits geometry — the rect is synthesized for the
              // note body only, and the pipeline decides what it means.
              setPending(gesture.to);
              setGesture(null);
              return;
            }
            const rect = rectFromDrag(gesture.from, gesture.to);
            if (!rect) {
              // A click, not a drag. With a chip selected this is now a valid
              // way to place a default-sized rect — the old "that was a
              // click" hint only made sense back when a click did nothing.
              commitDraw(rectFromClick(gesture.to));
              setGesture(null);
              return;
            }
            commitDraw(rect);
            setHint(null);
            setGesture(null);
            return;
          }

          if (gesture.kind === "move") {
            const rect = moveRect(gesture.orig, moveDelta(gesture.from, gesture.to));
            // A zero-delta move is exactly a selection click landing inside a
            // body — the pointer-down above already selected the region, so
            // this is not a gesture that changed anything. Committing it
            // anyway would mint a `place r_x` undo step and nothing else
            // (D2): the click "worked" but the user only meant to select.
            if (rect && !rectEqual(rect, gesture.orig)) {
              const region = props.regions.find((r) => r.region_id === gesture.regionId);
              props.onCommit(gesture.regionId, region?.shape ?? null, rect);
            }
            setGesture(null);
            return;
          }

          if (gesture.kind === "resize") {
            // resizeRect delegates to rectFromDrag(anchor, to), which orders
            // min/max — so dragging a corner PAST the opposite (anchor)
            // corner does not refuse, it INVERTS: the rect flips to the far
            // side of the anchor and keeps going, same as a normal resize.
            // The only refusal is a result under MIN_SIDE — the drag lands
            // close enough to the anchor that neither side of it can be
            // trusted as a real rect — and that is the null case handled
            // below; it commits NOTHING.
            const rect = resizeRect(gesture.orig, gesture.handle, gesture.to);
            // Same zero-delta guard as `move`: a resize handle grabbed and
            // released without moving is not a resize (D2).
            if (rect && !rectEqual(rect, gesture.orig)) {
              const region = props.regions.find((r) => r.region_id === gesture.regionId);
              props.onCommit(gesture.regionId, region?.shape ?? null, rect);
            }
            setGesture(null);
            return;
          }

          // ghost-move: a NOTE rewrite, never a region — sign-off #5.
          const rect = moveRect(gesture.orig, moveDelta(gesture.from, gesture.to));
          // Same zero-delta guard: a ghost grabbed and released in place did
          // not move, so there is nothing to write back to the note (D2).
          if (rect && !rectEqual(rect, gesture.orig) && props.onAdjustPlacement) {
            const placement = placements[gesture.index];
            if (placement) props.onAdjustPlacement(placement, rect);
          }
          setGesture(null);
        }}
        onKeyDown={(e) => {
          // Keyboard parity: geometry that can only be drawn with a mouse is
          // geometry half the acceptance script cannot reach.
          if (!selected) return;
          const rect = parseRectShape(selected.shape);
          if (!rect) return;
          const dirs: Record<string, Nudge> = {
            ArrowLeft: "left",
            ArrowRight: "right",
            ArrowUp: "up",
            ArrowDown: "down",
          };
          const dir = dirs[e.key];
          if (!dir) return;
          e.preventDefault();
          const step = e.shiftKey ? 0.02 : 0.005;
          if (e.altKey) {
            // Alt+Arrow resizes; Shift still means "faster" on both modes.
            // Alt rather than another modifier because Shift is already
            // spoken for on nudge.
            const next = resizeByKey(rect, dir, step);
            if (next) props.onCommit(selected.region_id, selected.shape ?? null, next);
            return;
          }
          const next = nudgeRect(rect, dir, step);
          if (next) props.onCommit(selected.region_id, selected.shape ?? null, next);
        }}
      />

      {/* D8: the placement dialog. Rendered inside the layer so Escape and
          focus stay in the marker context; cancel leaves no trace at all. */}
      {pending && canPlace && (
        <PlacementDialog
          point={pending}
          screenId={props.screenId!}
          contentIndex={props.contentIndex ?? null}
          npcIds={props.npcIds ?? []}
          onCancel={() => setPending(null)}
          onConfirm={(placement) => {
            // A NOTE, never a region edit. onCommit is not reachable from here
            // and must not become reachable — see sign-off #5 above.
            props.onPlaceNote!(formatPlaceNote(placement));
            setPending(null);
            // Stay armed: a marking pass is many placements, not one.
          }}
        />
      )}

      {/* The chips name regions the spec declares. There is still no "add
          region" here — the one control that is not a region is the new
          placement toggle, and what it produces is a note. */}
      <div className="marker-picker">
        {canPlace && (
          <button
            type="button"
            className={`marker-chip place-chip${arming ? " active" : ""}`}
            aria-pressed={arming}
            title="Click a spot to describe something new — writes a note, never a region edit"
            onClick={() => {
              setHint(null);
              const next = !arming;
              setArmed(next);
              // Arming clears the region selection: one click cannot mean both
              // "move that region" and "something new goes here".
              if (next) props.onSelect(null);
            }}
          >
            ＋ new placement
          </button>
        )}
        {props.regions.length === 0 ? (
          <span className="marker-empty">this screen declares no regions</span>
        ) : (
          props.regions.map((r) => (
            <button
              key={r.region_id}
              className={`marker-chip${r.region_id === props.selected ? " active" : ""}`}
              aria-pressed={r.region_id === props.selected}
              onClick={() => {
                setHint(null);
                // Selecting a region disarms the new-placement mode — the two
                // click meanings are mutually exclusive.
                setArmed(false);
                setPending(null);
                props.onSelect(r.region_id === props.selected ? null : r.region_id);
              }}
            >
              {r.region_id}
              {parseRectShape(r.shape) ? "" : " ·"}
            </button>
          ))
        )}
        {/* Pending placements are chips too — that is the "it took" feedback —
            but they are SPANS, not buttons, and deliberately so. A pending
            placement has no region_id any consumer knows — it is a NOTE
            addressed to the pipeline (see placeNote.ts), not a declared
            region, so there is no region_id to commit it against even if it
            were selectable. The un-committable guarantee here is structural,
            not a disabled flag: there is no handler to reach — dragging one
            goes through `onAdjustPlacement`, never `onCommit`. */}
        {placements.map((p, i) => (
          <span
            key={`place-chip-${i}-${p.id ?? "general"}`}
            className="marker-chip pending-chip"
            data-testid="pending-chip"
            title={`proposed ${p.kind} — written as a note for the pipeline; not a region on this screen`}
          >
            ◌ {placementLabel(p)}
          </span>
        ))}
      </div>
    </div>
  );
}
