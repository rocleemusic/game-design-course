import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { StagePane, type StageActions } from "../src/components/StagePane";
import { SATCHEL_CAPACITY, type PlayView } from "../src/lib/play";
import type { Day, Graph } from "../src/types";
import { normalizeGraph } from "../src/lib/normalizeGraph";
import graphFixture from "../fixtures/graph.json";
import dayFixture from "../fixtures/day.json";

const graph: Graph = normalizeGraph(graphFixture);
const day = dayFixture as unknown as Day;

function makeView(over: Partial<PlayView> = {}): PlayView {
  return {
    lines: [],
    choices: [],
    canContinue: true,
    ended: false,
    errors: [],
    pos: {
      currentScreen: "T2",
      currentLine: null,
      currentChoice: null,
      visited: new Set<string>(),
    },
    timeline: [],
    satchel: [],
    satchelCapacity: 6,
    satchelSlots: new Array(SATCHEL_CAPACITY).fill(null),
    arms: [],
    armsCapacity: 2,
    banked: [],
    notebook: [],
    pickedSlots: [],
    timeBlock: "morning",
    day: 1,
    year: 1,
    movesLeft: 3,
    threadMoves: {},
    threadMoveLog: [],
    bondBands: {},
    ...over,
  };
}

function makeActions(): StageActions {
  return {
    onExit: vi.fn(),
    onConverse: vi.fn(),
    onExamine: vi.fn(),
    onPickup: vi.fn(),
    onAdvanceTime: vi.fn(),
    onPackTriage: vi.fn(),
  };
}

function renderStage(opts: {
  manifest?: Record<string, string> | null;
  view?: PlayView | null;
}) {
  const act = makeActions();
  const utils = render(
    <StagePane
      graph={graph}
      day={day}
      manifest={opts.manifest ?? null}
      dir="fixtures"
      view={opts.view === undefined ? makeView() : opts.view}
      act={act}
    />
  );
  return { act, ...utils };
}

describe("StagePane", () => {
  it("with no manifest, renders the stacked text-button fallback", () => {
    const { act, container } = renderStage({ manifest: null });
    expect(container.querySelector(".stage-img")).toBeNull();
    // same interactions as buttons: item slot, examinable, presence, exit
    fireEvent.click(screen.getByText("Pick up wool (SL-T2-01)"));
    expect(act.onPickup).toHaveBeenCalledWith("SL-T2-01", "wool");
    fireEvent.click(screen.getByText("Examine bread_stall"));
    expect(act.onExamine).toHaveBeenCalledWith("t2.bread_stall");
    fireEvent.click(screen.getByText("Converse"));
    expect(act.onConverse).toHaveBeenCalledWith("SC-T2-01");
    fireEvent.click(screen.getByText(/Go to Town Square/));
    expect(act.onExit).toHaveBeenCalledWith("T1");
    expect(screen.getByLabelText("satchel").textContent).toContain("empty");
  });

  it("with a manifest image, renders hotspots from the graph regions", () => {
    const { act, container } = renderStage({ manifest: { T2: "images/t2.png" } });
    const img = container.querySelector(".stage-img") as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.getAttribute("src")).toContain("images%2Ft2.png");
    // r_crates (item slot) and r_stall (examinable) both have rects
    const itemHotspot = container.querySelector(".hotspot-item") as HTMLElement;
    expect(itemHotspot).toBeTruthy();
    // jsdom normalizes "60.00%" to "60%" when storing the style
    expect(itemHotspot.style.left).toBe("60%");
    expect(itemHotspot.style.top).toBe("60%");
    fireEvent.click(itemHotspot);
    expect(act.onPickup).toHaveBeenCalledWith("SL-T2-01", "wool");
    const examHotspot = container.querySelector(".hotspot-exam") as HTMLElement;
    expect(examHotspot).toBeTruthy();
    fireEvent.click(examHotspot);
    expect(act.onExamine).toHaveBeenCalledWith("t2.bread_stall");
    // rect-backed interactions are hotspots, not duplicated list buttons
    expect(screen.queryByText("Examine bread_stall")).toBeNull();
  });

  it("falls back to the text-button list when the image fails to load", () => {
    const { container } = renderStage({ manifest: { T2: "images/t2.png" } });
    const img = container.querySelector(".stage-img")!;
    fireEvent.error(img);
    expect(container.querySelector(".stage-img")).toBeNull();
    expect(screen.getByText("Pick up wool (SL-T2-01)")).toBeTruthy();
  });

  // Bug 4: brokenImages was keyed by image PATH, so when several screens shared
  // one placeholder a single failure broke all of them at once.
  it("one screen's broken image does not break another sharing the same file", () => {
    // T1 and T2 both point at the same placeholder
    const shared = { T1: "images/placeholder.png", T2: "images/placeholder.png" };

    const { container, rerender } = render(
      <StagePane
        graph={graph}
        day={day}
        manifest={shared}
        dir="fixtures"
        view={makeView({ pos: { ...makeView().pos, currentScreen: "T2" } })}
        act={makeActions()}
      />
    );

    // break it on T2
    fireEvent.error(container.querySelector(".stage-img")!);
    expect(container.querySelector(".stage-img")).toBeNull();

    // walk to T1, which shares the file — it must still try to render
    rerender(
      <StagePane
        graph={graph}
        day={day}
        manifest={shared}
        dir="fixtures"
        view={makeView({ pos: { ...makeView().pos, currentScreen: "T1" } })}
        act={makeActions()}
      />
    );
    expect(container.querySelector(".stage-img")).toBeTruthy();
  });

  it("says why play is unavailable instead of rendering dead buttons", () => {
    renderStage({ manifest: null, view: null });
    expect(screen.getByText(/story\.json/)).toBeTruthy();
    expect(screen.getByText(/resolver build --emit-story/)).toBeTruthy();
  });

  it("shows a picked slot as emptied and the chip in the satchel strip", () => {
    renderStage({
      manifest: null,
      view: makeView({ satchel: ["wool"], pickedSlots: ["SL-T2-01"] }),
    });
    const slotBtn = screen.getByText("SL-T2-01 — picked") as HTMLButtonElement;
    expect(slotBtn.disabled).toBe(true);
    expect(screen.getByLabelText("satchel").textContent).toContain("wool");
  });

  // D6: capacity + pack-triage
  it("shows the satchel's fill against its capacity, no pack-triage button when not full", () => {
    renderStage({
      manifest: null,
      view: makeView({ satchel: ["wool"], satchelCapacity: 6 }),
    });
    expect(screen.getByLabelText("satchel").textContent).toContain("1/6");
    expect(screen.queryByLabelText(/pack-triage/)).toBeNull();
  });

  it("flags the satchel full and offers pack-triage once it is at capacity", () => {
    const { act } = renderStage({
      manifest: null,
      view: makeView({
        satchel: ["a", "b", "c", "d", "e", "f"],
        satchelCapacity: 6,
      }),
    });
    expect(screen.getByLabelText("satchel").textContent).toContain("full");
    const triage = screen.getByLabelText(/pack-triage/);
    fireEvent.click(triage);
    expect(act.onPackTriage).toHaveBeenCalled();
  });

  it("renders arms-carry chips and still offers pack-triage when arms is held even if satchel is not full", () => {
    renderStage({
      manifest: null,
      view: makeView({ satchel: ["wool"], arms: ["ribbon"], armsCapacity: 2 }),
    });
    expect(screen.getByLabelText("arms-carry").textContent).toContain("1/2");
    expect(screen.getByText("ribbon")).toBeTruthy();
    expect(screen.getByLabelText(/pack-triage/)).toBeTruthy();
  });

  it("marks a conversed-today soul with a check", () => {
    renderStage({
      manifest: null,
      view: makeView({
        pos: {
          currentScreen: "T2",
          currentLine: null,
          currentChoice: null,
          visited: new Set(["GB-CH-T2-01-GATHER"]),
        },
      }),
    });
    expect(screen.getByTitle("conversed today")).toBeTruthy();
  });

  it("filters presence by the current time block", () => {
    renderStage({ manifest: null, view: makeView({ timeBlock: "evening" }) });
    // T2 evening fill is mara (no scene); toby is elsewhere. Rendered by
    // display name (graph.souls[].name), not the raw soul_id.
    expect(screen.getByText("Mara")).toBeTruthy();
    expect(screen.queryByText("Toby")).toBeNull();
    expect(screen.getByText("no scene here")).toBeTruthy();
  });

  // L9 — the Apply pill is separate from the Place-markers mode toggle: it
  // must announce unapplied work whether or not the mode is on, and the mode
  // toggle itself must stay a pure setPlacing flip (no flush, no rebuild, no
  // warning) — a decision on record.
  it("renders no Apply pill when nothing is pending", () => {
    renderStage({ manifest: { T2: "images/t2.png" } });
    expect(screen.queryByRole("button", { name: /pending/ })).toBeNull();
  });

  it("shows the Apply pill once count > 0, even outside Place-markers mode", () => {
    const onApplyRegions = vi.fn();
    render(
      <StagePane
        graph={graph}
        day={day}
        manifest={{ T2: "images/t2.png" }}
        dir="fixtures"
        view={makeView()}
        act={makeActions()}
        pendingRegionCount={2}
        onApplyRegions={onApplyRegions}
      />
    );
    // never clicked "Place markers" — the pill is visible regardless
    const btn = screen.getByRole("button", { name: /2 placements pending/ });
    expect(btn).toBeTruthy();
    fireEvent.click(btn);
    expect(onApplyRegions).toHaveBeenCalledTimes(1);
  });

  it("singular vs plural in the Apply pill's label", () => {
    const { rerender } = render(
      <StagePane
        graph={graph}
        day={day}
        manifest={{ T2: "images/t2.png" }}
        dir="fixtures"
        view={makeView()}
        act={makeActions()}
        pendingRegionCount={1}
        onApplyRegions={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: /1 placement pending/ })).toBeTruthy();
    expect(screen.queryByText(/1 placements/)).toBeNull();

    rerender(
      <StagePane
        graph={graph}
        day={day}
        manifest={{ T2: "images/t2.png" }}
        dir="fixtures"
        view={makeView()}
        act={makeActions()}
        pendingRegionCount={3}
        onApplyRegions={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: /3 placements pending/ })).toBeTruthy();
  });

  it("the Place-markers toggle stays a pure mode flip regardless of pending count", () => {
    const onApplyRegions = vi.fn();
    render(
      <StagePane
        graph={graph}
        day={day}
        manifest={{ T2: "images/t2.png" }}
        dir="fixtures"
        view={makeView()}
        act={makeActions()}
        onRegionShape={vi.fn()}
        pendingRegionCount={1}
        onApplyRegions={onApplyRegions}
      />
    );
    const toggle = screen.getByRole("button", { name: "Place markers" });
    fireEvent.click(toggle);
    expect(onApplyRegions).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Done placing" })).toBeTruthy();
    // the Apply pill is still there, untouched by the mode switch
    expect(screen.getByRole("button", { name: /1 placement pending/ })).toBeTruthy();
  });

  it("before any screen, offers enter buttons for every screen", () => {
    const { act } = renderStage({
      manifest: null,
      view: makeView({
        pos: { currentScreen: null, currentLine: null, currentChoice: null, visited: new Set() },
      }),
    });
    fireEvent.click(screen.getByText("Enter Market Row"));
    expect(act.onExit).toHaveBeenCalledWith("T2");
  });
});

/**
 * D8 — the new-placement path. Sign-off #5's boundary is the assertion that
 * matters here: confirming a placement writes a NOTE and must NOT call the
 * region-commit callback. A test that only checked the note body would pass
 * with the sign-off broken.
 */
describe("StagePane — new placement", () => {
  /** jsdom has no PointerEvent constructor, so fireEvent.pointerDown drops
   *  clientX/clientY silently; a MouseEvent carries them. Same fix as
   *  MarkerLayer.test.tsx. */
  function pointerEvent(type: string, init: { clientX: number; clientY: number }) {
    const ev = new MouseEvent(type, { ...init, bubbles: true, cancelable: true });
    Object.defineProperty(ev, "pointerId", { value: 1 });
    return ev;
  }

  function renderPlacing() {
    vi.spyOn(HTMLDivElement.prototype, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 1000,
      height: 1000,
      right: 1000,
      bottom: 1000,
    } as DOMRect);
    const onRegionShape = vi.fn();
    const onPlaceNote = vi.fn();
    render(
      <StagePane
        graph={graph}
        day={day}
        manifest={{ T2: "images/t2.png" }}
        dir="fixtures"
        view={makeView()}
        act={makeActions()}
        onRegionShape={onRegionShape}
        onPlaceNote={onPlaceNote}
        contentIndex={[
          {
            id: "item_ash",
            kind: "item",
            label: "ash",
            category: "component",
            source_locations: ["Square"],
          },
        ]}
      />
    );
    fireEvent.click(screen.getByText("Place markers"));
    return { onRegionShape, onPlaceNote };
  }

  it("a placement note draws a ghost on the image without entering Place-markers mode", () => {
    // The regression this pins: ghosts used to live in MarkerLayer, which only
    // exists while placing — so a confirmed placement vanished the moment you
    // clicked "Done placing", while a declared region stayed put. Reviewing the
    // proposals is the whole point, so they belong to the image, not the mode.
    render(
      <StagePane
        graph={graph}
        day={day}
        manifest={{ T2: "images/t2.png" }}
        dir="fixtures"
        view={makeView()}
        act={makeActions()}
        notes={[
          {
            target: "T2",
            kind: "structure",
            body: "@place\nid: item_ash\nkind: item\nscreen: T2\nrect: 0.2000 0.3000 0.0600 0.0600\n\non the stall",
            resolved: false,
            timestamp: "2026-08-05T00:00:00.000Z",
          },
        ]}
      />
    );

    // no "Place markers" click anywhere above
    const ghosts = screen.getAllByTestId("pending-marker");
    expect(ghosts).toHaveLength(1);
    expect(ghosts[0].className).toContain("place-ghost");
    expect(ghosts[0].getAttribute("title")).toMatch(/proposed/);
    expect(ghosts[0].textContent).toContain("item_ash");
    // inert by construction: a proposal has no region_id and no stitch behind
    // it, so there is nothing to click
    expect(ghosts[0].tagName).toBe("DIV");
    expect(ghosts[0].querySelector("button")).toBeNull();
  });

  it("a resolved placement note draws no ghost — the layer is a worklist", () => {
    render(
      <StagePane
        graph={graph}
        day={day}
        manifest={{ T2: "images/t2.png" }}
        dir="fixtures"
        view={makeView()}
        act={makeActions()}
        notes={[
          {
            target: "T2",
            kind: "structure",
            body: "@place\nid: item_ash\nkind: item\nscreen: T2\nrect: 0.2000 0.3000 0.0600 0.0600",
            resolved: true,
            timestamp: "2026-08-05T00:00:00.000Z",
          },
        ]}
      />
    );
    expect(screen.queryAllByTestId("pending-marker")).toHaveLength(0);
  });

  it("arm → click → confirm General writes a placement note and never a region edit", () => {
    const { onRegionShape, onPlaceNote } = renderPlacing();

    fireEvent.click(screen.getByText("＋ new placement"));
    const surface = screen.getByRole("application", {
      name: "Click where the new placement goes",
    });
    fireEvent(surface, pointerEvent("pointerdown", { clientX: 500, clientY: 400 }));
    fireEvent(surface, pointerEvent("pointerup", { clientX: 500, clientY: 400 }));

    // the dialog opened, defaulting to the fast path
    const dialog = screen.getByRole("dialog", { name: "new placement" });
    expect(dialog).toBeTruthy();
    fireEvent.click(screen.getByText("Add placement note"));

    expect(onRegionShape).not.toHaveBeenCalled();
    expect(onPlaceNote).toHaveBeenCalledTimes(1);
    const body: string = onPlaceNote.mock.calls[0][0];
    const lines = body.split("\n");
    expect(lines[0]).toBe("@place");
    expect(lines).toContain("kind: general");
    expect(lines).toContain("screen: T2");
    expect(body).toMatch(/^rect: [\d.]{6} [\d.]{6} [\d.]{6} [\d.]{6}$/m);
    // general carries no id at all — not `id: null`, not an empty value
    expect(body).not.toContain("id:");
  });

  it("arming clears a selected region chip, and picking a chip disarms", () => {
    renderPlacing();

    fireEvent.click(screen.getByText(/^r_crates/));
    expect(screen.getByRole("application", { name: /Draw region r_crates/ })).toBeTruthy();

    fireEvent.click(screen.getByText("＋ new placement"));
    expect(
      screen.getByRole("application", { name: "Click where the new placement goes" })
    ).toBeTruthy();

    fireEvent.click(screen.getByText(/^r_crates/));
    expect(screen.getByRole("application", { name: /Draw region r_crates/ })).toBeTruthy();
  });

  it("cancel leaves no trace — no note, no region edit", () => {
    const { onRegionShape, onPlaceNote } = renderPlacing();
    fireEvent.click(screen.getByText("＋ new placement"));
    const surface = screen.getByRole("application", {
      name: "Click where the new placement goes",
    });
    fireEvent(surface, pointerEvent("pointerdown", { clientX: 500, clientY: 400 }));
    fireEvent(surface, pointerEvent("pointerup", { clientX: 500, clientY: 400 }));
    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByRole("dialog", { name: "new placement" })).toBeNull();
    expect(onPlaceNote).not.toHaveBeenCalled();
    expect(onRegionShape).not.toHaveBeenCalled();
  });
});
