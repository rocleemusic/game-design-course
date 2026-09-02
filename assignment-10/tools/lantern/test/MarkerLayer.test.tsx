import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MarkerLayer } from "../src/components/MarkerLayer";
import { pendingPlacements } from "../src/lib/placeNote";
import { MIN_SIDE } from "../src/lib/markers";
import type { Region } from "../src/types";

/**
 * L8 region authoring — MarkerLayer's own harness. jsdom never sizes an
 * element, so the marker surface's bounding box is 0x0 by default; every test
 * that cares about real coordinates stubs getBoundingClientRect first (the
 * same fix App.test.tsx uses for its Stage-pane drag).
 */

const regions: Region[] = [
  { region_id: "r_a", shape: null },
  { region_id: "r_b", shape: { rect: { x: 0.1, y: 0.1, w: 0.2, h: 0.2 } } },
];

/**
 * jsdom in this project has no PointerEvent constructor, so
 * @testing-library/dom's fireEvent.pointerDown/Move/Up silently fall back to
 * a bare Event and drop clientX/clientY/pointerId — the component never sees
 * a real point. A MouseEvent carries the coordinates jsdom DOES support;
 * pointerId is patched on afterwards since MarkerLayer only reads it to hand
 * back to setPointerCapture, which it calls through optional chaining.
 */
function pointerEvent(type: string, init: { clientX: number; clientY: number }) {
  const ev = new MouseEvent(type, {
    clientX: init.clientX,
    clientY: init.clientY,
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperty(ev, "pointerId", { value: 1 });
  return ev;
}

function stubBox() {
  vi.spyOn(HTMLDivElement.prototype, "getBoundingClientRect").mockReturnValue({
    left: 0,
    top: 0,
    width: 1000,
    height: 1000,
    right: 1000,
    bottom: 1000,
  } as DOMRect);
}

describe("MarkerLayer", () => {
  it("shows the no-chip hint and does not commit when nothing is selected", () => {
    stubBox();
    const onCommit = vi.fn();
    render(
      <MarkerLayer regions={regions} selected={null} onSelect={() => {}} onCommit={onCommit} />
    );
    const surface = screen.getByRole("application", { name: "Select a region to draw" });
    fireEvent(surface, pointerEvent("pointerdown", { clientX: 500, clientY: 500 }));
    fireEvent(surface, pointerEvent("pointerup", { clientX: 500, clientY: 500 }));
    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toMatch(/Select a region chip/);
  });

  it("a click at one point, with a chip selected, commits the synthesized click rect", () => {
    stubBox();
    const onCommit = vi.fn();
    render(
      <MarkerLayer regions={regions} selected="r_a" onSelect={() => {}} onCommit={onCommit} />
    );
    const surface = screen.getByRole("application", { name: "Draw region r_a" });
    fireEvent(surface, pointerEvent("pointerdown", { clientX: 500, clientY: 500 }));
    fireEvent(surface, pointerEvent("pointerup", { clientX: 500, clientY: 500 }));

    expect(onCommit).toHaveBeenCalledTimes(1);
    const [regionId, oldShape, rect] = onCommit.mock.calls[0];
    expect(regionId).toBe("r_a");
    expect(oldShape).toBeNull();
    // centred on the click point (0.5, 0.5), at CLICK_SIDE
    expect(rect.x + rect.w / 2).toBeCloseTo(0.5);
    expect(rect.y + rect.h / 2).toBeCloseTo(0.5);
    // and the stale "that was a click" hint no longer fires with a chip selected
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("a real drag at or above MIN_SIDE, on empty canvas, still commits the drag rect", () => {
    stubBox();
    const onCommit = vi.fn();
    render(
      <MarkerLayer regions={regions} selected="r_b" onSelect={() => {}} onCommit={onCommit} />
    );
    const surface = screen.getByRole("application", { name: "Draw region r_b" });
    // Gesture-machine pass: r_b already has a rect at 0.1-0.3, and dragging
    // INSIDE an existing rect is now a move (never a draw) — so this drag
    // starts well clear of every drawn region's body and handles.
    const start = { clientX: 600, clientY: 600 };
    const far = { clientX: 600 + MIN_SIDE * 2000, clientY: 600 + MIN_SIDE * 2000 };
    fireEvent(surface, pointerEvent("pointerdown", start));
    fireEvent(surface, pointerEvent("pointermove", far));
    fireEvent(surface, pointerEvent("pointerup", far));

    expect(onCommit).toHaveBeenCalledTimes(1);
    const [regionId, oldShape, rect] = onCommit.mock.calls[0];
    expect(regionId).toBe("r_b");
    expect(oldShape).toEqual({ rect: { x: 0.1, y: 0.1, w: 0.2, h: 0.2 } });
    expect(rect.x).toBeCloseTo(0.6);
    expect(rect.y).toBeCloseTo(0.6);
    expect(rect.w).toBeCloseTo(MIN_SIDE * 2);
    expect(rect.h).toBeCloseTo(MIN_SIDE * 2);
  });
});

describe("MarkerLayer gesture machine", () => {
  it("down inside a rect, move, up commits a translated rect exactly once — never a draw", () => {
    stubBox();
    const onCommit = vi.fn();
    const onSelect = vi.fn();
    render(
      <MarkerLayer regions={regions} selected="r_b" onSelect={onSelect} onCommit={onCommit} />
    );
    const surface = screen.getByRole("application", { name: "Draw region r_b" });
    // r_b is {x:0.1,y:0.1,w:0.2,h:0.2} -> body point well away from corners
    fireEvent(surface, pointerEvent("pointerdown", { clientX: 200, clientY: 200 }));
    fireEvent(surface, pointerEvent("pointermove", { clientX: 250, clientY: 220 }));
    fireEvent(surface, pointerEvent("pointerup", { clientX: 250, clientY: 220 }));

    expect(onSelect).toHaveBeenCalledWith("r_b");
    expect(onCommit).toHaveBeenCalledTimes(1);
    const [regionId, oldShape, rect] = onCommit.mock.calls[0];
    expect(regionId).toBe("r_b");
    expect(oldShape).toEqual({ rect: { x: 0.1, y: 0.1, w: 0.2, h: 0.2 } });
    // moved by (0.05, 0.02), size preserved
    expect(rect.x).toBeCloseTo(0.15);
    expect(rect.y).toBeCloseTo(0.12);
    expect(rect.w).toBeCloseTo(0.2);
    expect(rect.h).toBeCloseTo(0.2);
  });

  it("a move sequence emits zero intermediate commits", () => {
    stubBox();
    const onCommit = vi.fn();
    render(
      <MarkerLayer regions={regions} selected="r_b" onSelect={() => {}} onCommit={onCommit} />
    );
    const surface = screen.getByRole("application", { name: "Draw region r_b" });
    fireEvent(surface, pointerEvent("pointerdown", { clientX: 200, clientY: 200 }));
    fireEvent(surface, pointerEvent("pointermove", { clientX: 210, clientY: 200 }));
    fireEvent(surface, pointerEvent("pointermove", { clientX: 220, clientY: 200 }));
    fireEvent(surface, pointerEvent("pointermove", { clientX: 230, clientY: 200 }));
    expect(onCommit).not.toHaveBeenCalled();
    fireEvent(surface, pointerEvent("pointerup", { clientX: 230, clientY: 200 }));
    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it("down on a corner handle resizes, anchored on the opposite corner", () => {
    stubBox();
    const onCommit = vi.fn();
    render(
      <MarkerLayer regions={regions} selected="r_b" onSelect={() => {}} onCommit={onCommit} />
    );
    const surface = screen.getByRole("application", { name: "Draw region r_b" });
    // r_b's se corner is at (0.3, 0.3) -> (300, 300) in the 1000x1000 stub box
    fireEvent(surface, pointerEvent("pointerdown", { clientX: 300, clientY: 300 }));
    fireEvent(surface, pointerEvent("pointermove", { clientX: 400, clientY: 400 }));
    fireEvent(surface, pointerEvent("pointerup", { clientX: 400, clientY: 400 }));

    expect(onCommit).toHaveBeenCalledTimes(1);
    const [regionId, , rect] = onCommit.mock.calls[0];
    expect(regionId).toBe("r_b");
    // nw corner (0.1, 0.1) stays put, se corner moves to (0.4, 0.4)
    expect(rect.x).toBeCloseTo(0.1);
    expect(rect.y).toBeCloseTo(0.1);
    expect(rect.w).toBeCloseTo(0.3);
    expect(rect.h).toBeCloseTo(0.3);
  });

  it("dragging a corner past the far edge commits nothing", () => {
    stubBox();
    const onCommit = vi.fn();
    render(
      <MarkerLayer regions={regions} selected="r_b" onSelect={() => {}} onCommit={onCommit} />
    );
    const surface = screen.getByRole("application", { name: "Draw region r_b" });
    // se handle at (300,300), the opposite (nw) anchor is (100,100) — drag
    // back to within MIN_SIDE of that anchor so the resulting side underflows
    // MIN_SIDE and resizeRect refuses rather than inverting.
    fireEvent(surface, pointerEvent("pointerdown", { clientX: 300, clientY: 300 }));
    fireEvent(surface, pointerEvent("pointermove", { clientX: 105, clientY: 105 }));
    fireEvent(surface, pointerEvent("pointerup", { clientX: 105, clientY: 105 }));

    expect(onCommit).not.toHaveBeenCalled();
  });

  it("selected region wins an overlap tie against a region drawn on top", () => {
    stubBox();
    const overlapping: Region[] = [
      { region_id: "r_bottom", shape: { rect: { x: 0.1, y: 0.1, w: 0.3, h: 0.3 } } },
      { region_id: "r_top", shape: { rect: { x: 0.1, y: 0.1, w: 0.3, h: 0.3 } } },
    ];
    const onCommit = vi.fn();
    const onSelect = vi.fn();
    render(
      <MarkerLayer
        regions={overlapping}
        selected="r_bottom"
        onSelect={onSelect}
        onCommit={onCommit}
      />
    );
    const surface = screen.getByRole("application", { name: "Draw region r_bottom" });
    // A point well inside the overlap but away from r_bottom's handles.
    // No movement between down and up — a plain selection click. D2: this
    // must select the tie-break winner but commit nothing, since a
    // zero-delta move is not a move.
    fireEvent(surface, pointerEvent("pointerdown", { clientX: 250, clientY: 250 }));
    fireEvent(surface, pointerEvent("pointerup", { clientX: 250, clientY: 250 }));

    expect(onSelect).toHaveBeenCalledWith("r_bottom");
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("selected region wins an overlap tie, and a real drag moves that same region", () => {
    stubBox();
    const overlapping: Region[] = [
      { region_id: "r_bottom", shape: { rect: { x: 0.1, y: 0.1, w: 0.3, h: 0.3 } } },
      { region_id: "r_top", shape: { rect: { x: 0.1, y: 0.1, w: 0.3, h: 0.3 } } },
    ];
    const onCommit = vi.fn();
    const onSelect = vi.fn();
    render(
      <MarkerLayer
        regions={overlapping}
        selected="r_bottom"
        onSelect={onSelect}
        onCommit={onCommit}
      />
    );
    const surface = screen.getByRole("application", { name: "Draw region r_bottom" });
    // Same overlap point, but this time with real movement — proves the
    // tie-break winner (r_bottom) is also the region that actually moves.
    fireEvent(surface, pointerEvent("pointerdown", { clientX: 250, clientY: 250 }));
    fireEvent(surface, pointerEvent("pointermove", { clientX: 280, clientY: 260 }));
    fireEvent(surface, pointerEvent("pointerup", { clientX: 280, clientY: 260 }));

    expect(onSelect).toHaveBeenCalledWith("r_bottom");
    expect(onCommit).toHaveBeenCalledTimes(1);
    const [regionId, , rect] = onCommit.mock.calls[0];
    expect(regionId).toBe("r_bottom");
    expect(rect.x).toBeCloseTo(0.13);
    expect(rect.y).toBeCloseTo(0.11);
  });

  it("D2: a zero-delta click inside a rect selects it and commits nothing", () => {
    stubBox();
    const onCommit = vi.fn();
    const onSelect = vi.fn();
    render(
      <MarkerLayer regions={regions} selected="r_b" onSelect={onSelect} onCommit={onCommit} />
    );
    const surface = screen.getByRole("application", { name: "Draw region r_b" });
    // r_b is {x:0.1,y:0.1,w:0.2,h:0.2} -> a body point, no movement at all.
    fireEvent(surface, pointerEvent("pointerdown", { clientX: 200, clientY: 200 }));
    fireEvent(surface, pointerEvent("pointerup", { clientX: 200, clientY: 200 }));

    expect(onSelect).toHaveBeenCalledWith("r_b");
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("Alt+Arrow resizes; plain Arrow still nudges", () => {
    stubBox();
    const onCommit = vi.fn();
    render(
      <MarkerLayer regions={regions} selected="r_b" onSelect={() => {}} onCommit={onCommit} />
    );
    const surface = screen.getByRole("application", { name: "Draw region r_b" });

    fireEvent.keyDown(surface, { key: "ArrowRight", altKey: true });
    expect(onCommit).toHaveBeenCalledTimes(1);
    const [, , resized] = onCommit.mock.calls[0];
    // resizeByKey grows w, anchored NW; x/y unchanged, w grows by the step
    expect(resized.x).toBeCloseTo(0.1);
    expect(resized.y).toBeCloseTo(0.1);
    expect(resized.w).toBeCloseTo(0.205);
    expect(resized.h).toBeCloseTo(0.2);

    onCommit.mockClear();
    fireEvent.keyDown(surface, { key: "ArrowRight" });
    expect(onCommit).toHaveBeenCalledTimes(1);
    const [, , nudged] = onCommit.mock.calls[0];
    // nudgeRect translates, size preserved
    expect(nudged.x).toBeCloseTo(0.105);
    expect(nudged.w).toBeCloseTo(0.2);
  });

  it("a ghost hit calls onAdjustPlacement and never onCommit", () => {
    stubBox();
    const onCommit = vi.fn();
    const onAdjustPlacement = vi.fn();
    const ghostPlacement = {
      id: "item_ash",
      kind: "item" as const,
      screen: "sq_bench",
      rect: { x: 0.6, y: 0.6, w: 0.1, h: 0.1 },
      prose: "",
      source: { target: "sq_bench", timestamp: "t1", body: "@place\nkind: item\nscreen: sq_bench\nrect: 0.6000 0.6000 0.1000 0.1000" },
    };
    render(
      <MarkerLayer
        regions={regions}
        selected={null}
        onSelect={() => {}}
        onCommit={onCommit}
        placements={[ghostPlacement]}
        onAdjustPlacement={onAdjustPlacement}
      />
    );
    const surface = screen.getByRole("application", { name: "Select a region to draw" });
    fireEvent(surface, pointerEvent("pointerdown", { clientX: 650, clientY: 650 }));
    fireEvent(surface, pointerEvent("pointermove", { clientX: 700, clientY: 650 }));
    fireEvent(surface, pointerEvent("pointerup", { clientX: 700, clientY: 650 }));

    expect(onAdjustPlacement).toHaveBeenCalledTimes(1);
    const [placement, newRect] = onAdjustPlacement.mock.calls[0];
    expect(placement).toBe(ghostPlacement);
    expect(newRect.x).toBeCloseTo(0.65);
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("a ghost without `source` is inert and does not start a gesture", () => {
    stubBox();
    const onCommit = vi.fn();
    const onAdjustPlacement = vi.fn();
    const inertGhost = {
      id: null,
      kind: "general" as const,
      screen: "sq_bench",
      rect: { x: 0.6, y: 0.6, w: 0.1, h: 0.1 },
      prose: "",
    };
    render(
      <MarkerLayer
        regions={regions}
        selected={null}
        onSelect={() => {}}
        onCommit={onCommit}
        placements={[inertGhost]}
        onAdjustPlacement={onAdjustPlacement}
      />
    );
    const surface = screen.getByRole("application", { name: "Select a region to draw" });
    fireEvent(surface, pointerEvent("pointerdown", { clientX: 650, clientY: 650 }));
    fireEvent(surface, pointerEvent("pointerup", { clientX: 650, clientY: 650 }));

    expect(onAdjustPlacement).not.toHaveBeenCalled();
    expect(onCommit).not.toHaveBeenCalled();
    // the miss falls through to the existing "select a chip" hint
    expect(screen.getByRole("status").textContent).toMatch(/Select a region chip/);
  });
});

/**
 * D8 follow-up — a confirmed placement has to leave visible feedback: a marker
 * on the image AND a chip in the tray. The wiring under test is that the
 * feedback comes from the NOTE, not from state inside the layer, so this
 * harness mirrors the real caller: confirm writes a note body, and the
 * placements prop is derived back out of the notes by `pendingPlacements`.
 */
function PlacingHarness(props: { onCommit: (...a: unknown[]) => void }) {
  const [notes, setNotes] = useState<{ body: string; resolved: boolean }[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <MarkerLayer
      regions={regions}
      selected={selected}
      onSelect={setSelected}
      onCommit={props.onCommit}
      screenId="sq_bench"
      contentIndex={null}
      npcIds={[]}
      onPlaceNote={(body) => setNotes((n) => [...n, { body, resolved: false }])}
      placements={pendingPlacements(notes, "sq_bench")}
    />
  );
}

/** Arm the chip, click a spot, and confirm the dialog as a general placement. */
function makePlacement() {
  fireEvent.click(screen.getByRole("button", { name: /new placement/ }));
  const surface = screen.getByRole("application", {
    name: "Click where the new placement goes",
  });
  fireEvent(surface, pointerEvent("pointerdown", { clientX: 400, clientY: 600 }));
  fireEvent(surface, pointerEvent("pointerup", { clientX: 400, clientY: 600 }));
  fireEvent.click(screen.getByRole("button", { name: "Add placement note" }));
}

describe("MarkerLayer pending placements", () => {
  it("a confirmed placement renders a chip", () => {
    stubBox();
    const onCommit = vi.fn();
    render(<PlacingHarness onCommit={onCommit} />);

    expect(screen.queryAllByTestId("pending-chip")).toHaveLength(0);
    makePlacement();

    const chips = screen.getAllByTestId("pending-chip");
    expect(chips).toHaveLength(1);
    // a general placement has no id, and says so rather than showing a blank
    expect(chips[0].textContent).toContain("(general)");
    // The MARKER is StageImage's job, not this layer's — a proposal has to
    // outlive Place-markers mode, and this layer does not. Covered in
    // StagePane.test.tsx; asserted absent here so the two cannot both draw it.
    expect(screen.queryAllByTestId("pending-marker")).toHaveLength(0);
    // the mode stays armed so a marking pass keeps going
    expect(
      screen.getByRole("button", { name: /new placement/ }).getAttribute("aria-pressed")
    ).toBe("true");
  });

  it("a pending chip is not a region: interacting with it never commits geometry", () => {
    stubBox();
    const onCommit = vi.fn();
    render(<PlacingHarness onCommit={onCommit} />);
    makePlacement();

    const chip = screen.getAllByTestId("pending-chip")[0];
    // not a button at all — there is no handler to reach, by construction
    expect(chip.tagName).toBe("SPAN");
    expect(screen.queryByRole("button", { name: /\(general\)/ })).toBeNull();

    // click it, then drag across the image the way you would to draw a region
    fireEvent.click(chip);
    fireEvent.keyDown(chip, { key: "Enter" });
    const surface = screen.getByRole("application");
    fireEvent(surface, pointerEvent("pointerdown", { clientX: 100, clientY: 100 }));
    fireEvent(surface, pointerEvent("pointermove", { clientX: 600, clientY: 600 }));
    fireEvent(surface, pointerEvent("pointerup", { clientX: 600, clientY: 600 }));
    fireEvent.keyDown(surface, { key: "ArrowLeft" });

    expect(onCommit).not.toHaveBeenCalled();
  });

});
