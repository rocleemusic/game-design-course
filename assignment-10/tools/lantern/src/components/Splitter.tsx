import {
  useCallback,
  useLayoutEffect,
  useRef,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
} from "react";
import {
  UNBOUNDED,
  clamp,
  dynamicMax,
  paneSize,
  stepValue,
  writePaneSize,
} from "../lib/panes";

/**
 * A resize gutter that owns ONE CSS custom property on its grid parent.
 *
 * The load-bearing rule: a drag writes the property (and aria-valuenow)
 * straight to the DOM — never React state. Both graph panes are React Flow
 * canvases; a state update per pointermove would re-render them and jank the
 * drag. So the numeric size lives in a ref, and one `apply()` reflects it to
 * the target's style and to this separator's aria-valuenow. Nothing here
 * re-renders during a drag.
 *
 * The var is seeded once in a layout effect (before paint) and never bound in
 * JSX `style=` — a re-render would otherwise clobber an in-flight drag.
 *
 * The ceiling is measured, not declared: `min` is a small floor so a pane can
 * never vanish by accident, and the maximum is whatever the container has left
 * after `reserve` px for its neighbours. Pass `max` only where a fixed wall is
 * genuinely wanted.
 */
export interface SplitterProps {
  orientation: "vertical" | "horizontal";
  /** the CSS custom property this gutter drives, e.g. "--side-w" */
  cssVar: string;
  /** localStorage key for the persisted size */
  storageKey: string;
  /** small floor — enough that the pane stays grabbable */
  min: number;
  /** fixed ceiling; omit to measure one from the container each time */
  max?: number;
  /** px the rest of the shell keeps when the ceiling is measured */
  reserve?: number;
  /** starting size when nothing is persisted */
  defaultSize: number;
  /** the sized track sits on the FAR side of the gutter (e.g. --side-w) */
  invert?: boolean;
  /** accessible name, e.g. "Resize context panel" */
  label: string;
  /** id of the region this separator resizes (aria-controls) */
  controls?: string;
  /** element carrying the CSS var; defaults to the separator's grid parent */
  targetRef?: RefObject<HTMLElement | null>;
}

/** default px kept for the rest of the shell when a ceiling is measured */
const DEFAULT_RESERVE = 400;

export function Splitter(props: SplitterProps) {
  const { orientation, cssVar, storageKey, min, max, defaultSize, invert } = props;
  const reserve = props.reserve ?? DEFAULT_RESERVE;

  const ref = useRef<HTMLDivElement>(null);
  const valueRef = useRef<number>(defaultSize);
  const restoreRef = useRef<number>(defaultSize);
  const draggingRef = useRef(false);

  const target = useCallback((): HTMLElement | null => {
    return props.targetRef?.current ?? ref.current?.parentElement ?? null;
  }, [props.targetRef]);

  /**
   * The ceiling right now. A declared `max` wins; otherwise measure the
   * container and leave `reserve` for the neighbours. Measured fresh on every
   * apply so a window resize needs no listener.
   */
  const ceiling = useCallback((): number => {
    if (max !== undefined) return max;
    const el = target();
    if (!el) return UNBOUNDED;
    const rect = el.getBoundingClientRect();
    const size = orientation === "vertical" ? rect.width : rect.height;
    return dynamicMax(size, reserve, min);
  }, [max, target, orientation, reserve, min]);

  /** reflect one size to the DOM: the grid var + this separator's aria-valuenow */
  const apply = useCallback(
    (next: number) => {
      const hi = ceiling();
      const clamped = clamp(next, min, hi);
      valueRef.current = clamped;
      target()?.style.setProperty(cssVar, `${clamped}px`);
      ref.current?.setAttribute("aria-valuenow", String(Math.round(clamped)));
      if (Number.isFinite(hi)) {
        ref.current?.setAttribute("aria-valuemax", String(Math.round(hi)));
      }
    },
    [cssVar, min, ceiling, target]
  );

  // Seed the var once, before paint, from storage (or the default). Runs on
  // mount only; a drag/keyboard change persists and this never re-fires.
  useLayoutEffect(() => {
    apply(paneSize(storageKey, defaultSize));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = useCallback(() => {
    writePaneSize(storageKey, valueRef.current);
  }, [storageKey]);

  const onPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      const el = target();
      if (!el) return;
      draggingRef.current = true;
      // pointer capture routes move/up to us even over the React Flow canvases,
      // which would otherwise swallow the events.
      ref.current?.setPointerCapture?.(e.pointerId);
    },
    [target]
  );

  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      const el = target();
      if (!el) return;
      const rect = el.getBoundingClientRect();
      let next: number;
      if (orientation === "vertical") {
        next = invert ? rect.right - e.clientX : e.clientX - rect.left;
      } else {
        next = invert ? rect.bottom - e.clientY : e.clientY - rect.top;
      }
      apply(next);
    },
    [orientation, invert, apply, target]
  );

  const endDrag = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      ref.current?.releasePointerCapture?.(e.pointerId);
      persist();
    },
    [persist]
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const grow = orientation === "vertical" ? "ArrowRight" : "ArrowUp";
      const shrink = orientation === "vertical" ? "ArrowLeft" : "ArrowDown";
      const cur = valueRef.current;
      const hi = ceiling();
      let next: number | null = null;
      if (e.key === grow) next = stepValue(cur, e.shiftKey ? 10 : 2, min, hi);
      else if (e.key === shrink) next = stepValue(cur, e.shiftKey ? -10 : -2, min, hi);
      else if (e.key === "Home") next = min;
      // End goes to the ceiling; with no measured ceiling, one full step out
      else if (e.key === "End") next = Number.isFinite(hi) ? hi : stepValue(cur, 100, min, hi);
      else if (e.key === "Enter") {
        // collapse to min, or restore the pre-collapse size
        if (cur > min) {
          restoreRef.current = cur;
          next = min;
        } else {
          next = clamp(restoreRef.current, min, hi);
        }
      }
      if (next === null) return;
      e.preventDefault();
      apply(next);
      persist();
    },
    [orientation, min, ceiling, apply, persist]
  );

  return (
    <div
      ref={ref}
      className={`splitter splitter-${orientation}`}
      role="separator"
      tabIndex={0}
      aria-orientation={orientation}
      aria-label={props.label}
      aria-controls={props.controls}
      aria-valuemin={min}
      // a measured ceiling arrives with the first apply(), before paint
      aria-valuemax={max}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={onKeyDown}
    />
  );
}
