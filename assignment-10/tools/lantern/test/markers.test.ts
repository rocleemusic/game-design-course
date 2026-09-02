import { describe, expect, it } from "vitest";
import {
  CLICK_SIDE,
  HANDLE_TOL,
  handleAt,
  hitTestRects,
  MIN_SIDE,
  moveRect,
  nudgeRect,
  rectFromClick,
  rectFromDrag,
  resizeByKey,
  resizeRect,
  toNormalized,
  validRect,
} from "../src/lib/markers";
import { parseRectShape, rectToCss } from "../src/lib/stage";

/**
 * L8 — marker geometry. Pure, so it tests deeply while MarkerLayer stays thin.
 *
 * The load-bearing rule: every rect produced here goes back through
 * parseRectShape, the SAME validator the read path uses. The drawing path and
 * the reading path can therefore never disagree about what is valid.
 */

describe("rectFromDrag", () => {
  it("builds a rect from two corners", () => {
    expect(rectFromDrag({ x: 0.2, y: 0.3 }, { x: 0.5, y: 0.6 })).toEqual({
      x: 0.2,
      y: 0.3,
      w: 0.3,
      h: 0.3,
    });
  });

  it("handles a drag up-and-left — half of all drags go backwards", () => {
    // Assuming from < to would give a negative width for every such drag.
    expect(rectFromDrag({ x: 0.5, y: 0.6 }, { x: 0.2, y: 0.3 })).toEqual({
      x: 0.2,
      y: 0.3,
      w: 0.3,
      h: 0.3,
    });
  });

  it("rejects a click, or a drag too small to be meant", () => {
    expect(rectFromDrag({ x: 0.4, y: 0.4 }, { x: 0.4, y: 0.4 })).toBeNull();
    expect(
      rectFromDrag({ x: 0.4, y: 0.4 }, { x: 0.4 + MIN_SIDE / 2, y: 0.4 + MIN_SIDE / 2 })
    ).toBeNull();
  });

  it("stays inside the image even when the drag leaves it", () => {
    const r = rectFromDrag({ x: 0.8, y: 0.8 }, { x: 1.6, y: 1.6 })!;
    expect(r.x + r.w).toBeLessThanOrEqual(1);
    expect(r.y + r.h).toBeLessThanOrEqual(1);
  });

  it("round-trips through the READ path's validator", () => {
    // The gate that keeps drawing and reading in agreement.
    const r = rectFromDrag({ x: 0.1, y: 0.1 }, { x: 0.4, y: 0.5 })!;
    expect(parseRectShape({ rect: r })).toEqual(r);
    expect(rectToCss(r).left).toBe("10.00%");
  });
});

describe("rectFromClick", () => {
  it("centres a rect of CLICK_SIDE on the point", () => {
    const r = rectFromClick({ x: 0.5, y: 0.5 })!;
    expect(r.w).toBeCloseTo(CLICK_SIDE);
    expect(r.h).toBeCloseTo(CLICK_SIDE);
    expect(r.x).toBeCloseTo(0.5 - CLICK_SIDE / 2);
    expect(r.y).toBeCloseTo(0.5 - CLICK_SIDE / 2);
  });

  it("clamps at each edge without shrinking below CLICK_SIDE", () => {
    for (const p of [
      { x: 0, y: 0.5 },
      { x: 1, y: 0.5 },
      { x: 0.5, y: 0 },
      { x: 0.5, y: 1 },
    ]) {
      const r = rectFromClick(p)!;
      expect(r.w).toBeCloseTo(CLICK_SIDE);
      expect(r.h).toBeCloseTo(CLICK_SIDE);
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.y).toBeGreaterThanOrEqual(0);
      expect(r.x + r.w).toBeLessThanOrEqual(1);
      expect(r.y + r.h).toBeLessThanOrEqual(1);
    }
  });

  it("clamps at each corner too, still keeping the full side", () => {
    for (const p of [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ]) {
      const r = rectFromClick(p)!;
      expect(r.w).toBeCloseTo(CLICK_SIDE);
      expect(r.h).toBeCloseTo(CLICK_SIDE);
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.y).toBeGreaterThanOrEqual(0);
      expect(r.x + r.w).toBeLessThanOrEqual(1);
      expect(r.y + r.h).toBeLessThanOrEqual(1);
    }
  });

  it("round-trips through the READ path's validator, at 4 decimals", () => {
    const r = rectFromClick({ x: 0.333333, y: 0.666666 })!;
    expect(parseRectShape({ rect: r })).toEqual(r);
    const decimals = (n: number) => String(n).split(".")[1]?.length ?? 0;
    expect(decimals(r.x)).toBeLessThanOrEqual(4);
    expect(decimals(r.y)).toBeLessThanOrEqual(4);
  });
});

describe("nudgeRect", () => {
  const base = { x: 0.4, y: 0.4, w: 0.2, h: 0.2 };

  it("moves in each direction by the step", () => {
    expect(nudgeRect(base, "right", 0.01)!.x).toBeCloseTo(0.41);
    expect(nudgeRect(base, "left", 0.01)!.x).toBeCloseTo(0.39);
    expect(nudgeRect(base, "down", 0.01)!.y).toBeCloseTo(0.41);
    expect(nudgeRect(base, "up", 0.01)!.y).toBeCloseTo(0.39);
  });

  it("keeps its size when it hits an edge, rather than shrinking", () => {
    const atEdge = { x: 0, y: 0, w: 0.2, h: 0.2 };
    const r = nudgeRect(atEdge, "left", 0.05)!;
    expect(r.x).toBe(0);
    expect(r.w).toBe(0.2);
  });

  it("never leaves the image", () => {
    const r = nudgeRect({ x: 0.9, y: 0.9, w: 0.1, h: 0.1 }, "right", 0.5)!;
    expect(r.x + r.w).toBeLessThanOrEqual(1);
  });
});

describe("resizeRect", () => {
  const base = { x: 0.2, y: 0.2, w: 0.4, h: 0.4 };

  it("holds the opposite corner still — that is what makes it a resize", () => {
    const r = resizeRect(base, "se", { x: 0.8, y: 0.9 })!;
    expect(r.x).toBeCloseTo(0.2);
    expect(r.y).toBeCloseTo(0.2);
    expect(r.w).toBeCloseTo(0.6);
    expect(r.h).toBeCloseTo(0.7);
  });

  it("works from the north-west handle too", () => {
    const r = resizeRect(base, "nw", { x: 0.1, y: 0.1 })!;
    expect(r.x).toBeCloseTo(0.1);
    expect(r.y).toBeCloseTo(0.1);
    // the SE corner stayed at 0.6, 0.6
    expect(r.x + r.w).toBeCloseTo(0.6);
    expect(r.y + r.h).toBeCloseTo(0.6);
  });

  it("refuses a resize that collapses the rect", () => {
    expect(resizeRect(base, "se", { x: 0.2, y: 0.2 })).toBeNull();
  });
});

describe("toNormalized", () => {
  const box = { left: 100, top: 50, width: 400, height: 200 };

  it("maps a pointer onto 0-1 image space", () => {
    expect(toNormalized({ clientX: 300, clientY: 150 }, box)).toEqual({ x: 0.5, y: 0.5 });
  });

  it("clamps a pointer dragged off the image", () => {
    expect(toNormalized({ clientX: 0, clientY: 0 }, box)).toEqual({ x: 0, y: 0 });
    expect(toNormalized({ clientX: 9999, clientY: 9999 }, box)).toEqual({ x: 1, y: 1 });
  });

  it("survives a zero-sized box instead of dividing by zero", () => {
    expect(toNormalized({ clientX: 10, clientY: 10 }, { left: 0, top: 0, width: 0, height: 0 })).toEqual({
      x: 0,
      y: 0,
    });
  });
});

describe("moveRect", () => {
  const base = { x: 0.4, y: 0.4, w: 0.2, h: 0.2 };

  it("translates, preserving size", () => {
    const r = moveRect(base, { dx: 0.1, dy: -0.1 })!;
    expect(r.x).toBeCloseTo(0.5);
    expect(r.y).toBeCloseTo(0.3);
    expect(r.w).toBeCloseTo(0.2);
    expect(r.h).toBeCloseTo(0.2);
  });

  it("clamps at each edge, keeping size", () => {
    expect(moveRect(base, { dx: -1, dy: 0 })!).toEqual({ x: 0, y: 0.4, w: 0.2, h: 0.2 });
    expect(moveRect(base, { dx: 1, dy: 0 })!).toEqual({ x: 0.8, y: 0.4, w: 0.2, h: 0.2 });
    expect(moveRect(base, { dx: 0, dy: -1 })!).toEqual({ x: 0.4, y: 0, w: 0.2, h: 0.2 });
    expect(moveRect(base, { dx: 0, dy: 1 })!).toEqual({ x: 0.4, y: 0.8, w: 0.2, h: 0.2 });
  });

  it("clamps at each corner too, still keeping size", () => {
    expect(moveRect(base, { dx: -1, dy: -1 })!).toEqual({ x: 0, y: 0, w: 0.2, h: 0.2 });
    expect(moveRect(base, { dx: 1, dy: 1 })!).toEqual({ x: 0.8, y: 0.8, w: 0.2, h: 0.2 });
  });
});

describe("hitTestRects", () => {
  const items = [
    { id: "a", rect: { x: 0, y: 0, w: 0.5, h: 0.5 } },
    { id: "b", rect: { x: 0.2, y: 0.2, w: 0.5, h: 0.5 } },
  ];

  it("picks the topmost (last-rendered) match", () => {
    expect(hitTestRects(items, { x: 0.3, y: 0.3 }, null)).toBe("b");
  });

  it("lets the selected id win a tie under the topmost", () => {
    expect(hitTestRects(items, { x: 0.3, y: 0.3 }, "a")).toBe("a");
  });

  it("ignores the selected id when the point does not land on it", () => {
    expect(hitTestRects(items, { x: 0.05, y: 0.05 }, "b")).toBe("a");
  });

  it("returns null on a miss", () => {
    expect(hitTestRects(items, { x: 0.9, y: 0.9 }, null)).toBeNull();
  });
});

describe("handleAt", () => {
  const rect = { x: 0.2, y: 0.2, w: 0.4, h: 0.4 };

  it("finds each corner within tolerance", () => {
    expect(handleAt(rect, { x: 0.2, y: 0.2 })).toBe("nw");
    expect(handleAt(rect, { x: 0.6, y: 0.2 })).toBe("ne");
    expect(handleAt(rect, { x: 0.2, y: 0.6 })).toBe("sw");
    expect(handleAt(rect, { x: 0.6, y: 0.6 })).toBe("se");
  });

  it("respects the tolerance", () => {
    expect(handleAt(rect, { x: 0.2 + HANDLE_TOL, y: 0.2 })).toBe("nw");
    expect(handleAt(rect, { x: 0.2 + HANDLE_TOL + 0.01, y: 0.2 })).toBeNull();
  });

  it("returns null off any corner", () => {
    expect(handleAt(rect, { x: 0.4, y: 0.4 })).toBeNull();
  });
});

describe("resizeByKey", () => {
  const base = { x: 0.4, y: 0.4, w: 0.2, h: 0.2 };

  it("grows right/down", () => {
    expect(resizeByKey(base, "right", 0.01)!.w).toBeCloseTo(0.21);
    expect(resizeByKey(base, "down", 0.01)!.h).toBeCloseTo(0.21);
  });

  it("shrinks left/up", () => {
    expect(resizeByKey(base, "left", 0.01)!.w).toBeCloseTo(0.19);
    expect(resizeByKey(base, "up", 0.01)!.h).toBeCloseTo(0.19);
  });

  it("stays anchored at the NW corner", () => {
    const r = resizeByKey(base, "right", 0.01)!;
    expect(r.x).toBeCloseTo(base.x);
    expect(r.y).toBeCloseTo(base.y);
  });

  it("refuses to shrink below MIN_SIDE", () => {
    const small = { x: 0.4, y: 0.4, w: MIN_SIDE, h: MIN_SIDE };
    expect(resizeByKey(small, "left", 0.005)).toBeNull();
    expect(resizeByKey(small, "up", 0.005)).toBeNull();
  });
});

describe("validRect", () => {
  it("refuses anything the stage would refuse to render", () => {
    expect(validRect({ x: -0.1, y: 0, w: 0.2, h: 0.2 })).toBeNull();
    expect(validRect({ x: 0.9, y: 0, w: 0.2, h: 0.2 })).toBeNull();
    expect(validRect({ x: 0, y: 0, w: 0, h: 0.2 })).toBeNull();
  });

  it("accepts a rect filling the whole image", () => {
    expect(validRect({ x: 0, y: 0, w: 1, h: 1 })).toEqual({ x: 0, y: 0, w: 1, h: 1 });
  });
});
