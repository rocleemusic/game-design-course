import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App from "../src/App";
import graphFixture from "../fixtures-review/graph.json";
import dayFixture from "../fixtures-review/day.json";
// Play-capable fixtures (separate from fixtures-review/, which never carries
// a compiled story). The Stage pane's marker layer only renders once a play
// session has actually entered a screen, so the region-commit test below
// needs a real inkjs story to get there.
import playGraphFixture from "../fixtures/graph.json";
import playDayFixture from "../fixtures/day.json";
import playStoryFixture from "../fixtures/story.json";

describe("App smoke", () => {
  beforeEach(() => {
    window.localStorage.clear();
    // A stand-in for the two record files, replaying the server's real rules:
    // approvals merge by key and "pending" DELETES rather than storing. Without
    // this, every write 404s, and a command whose write failed is (correctly)
    // never recorded — so undo would have nothing to act on.
    const approvals: Record<string, unknown> = {};
    const edits: unknown[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        const u = String(url);
        if (u.startsWith("/__bridge/run")) {
          return new Response(
            JSON.stringify({
              dir: "fixtures",
              graph: graphFixture,
              day: dayFixture,
              story: null,
              approvals,
              edits,
            }),
            { status: 200 }
          );
        }
        if (u.startsWith("/__bridge/approve")) {
          const b = JSON.parse(String(init!.body));
          if (b.status === "pending") delete approvals[b.artifact_id];
          else {
            approvals[b.artifact_id] = {
              status: b.status,
              timestamp: "t",
              ...(b.note ? { note: b.note } : {}),
            };
          }
          return new Response(JSON.stringify({ approvals }), { status: 200 });
        }
        if (u.startsWith("/__bridge/edit")) {
          const b = JSON.parse(String(init!.body));
          edits.push({ ...b, timestamp: new Date(2026, 0, 1).toISOString() });
          return new Response(JSON.stringify({ edits }), { status: 200 });
        }
        return new Response(JSON.stringify({ error: "nope" }), { status: 404 });
      })
    );
  });

  /** the tab strip belonging to one host */
  function strip(pane: "centre pane" | "right pane") {
    return screen.getByRole("tablist", { name: `${pane} views` });
  }
  /** click a view tab inside one host */
  function pick(pane: "centre pane" | "right pane", label: string) {
    fireEvent.click(within(strip(pane)).getByRole("tab", { name: label }));
  }

  /**
   * jsdom in this project has no PointerEvent constructor, so
   * fireEvent.pointerDown/Move/Up silently drop clientX/clientY/pointerId —
   * the marker layer never sees a real point. A MouseEvent carries the
   * coordinates jsdom DOES support; pointerId is patched on afterwards since
   * MarkerLayer only reads it to hand back to setPointerCapture (called
   * through optional chaining, so a missing value is harmless).
   */
  function pointerEvent(type: string, clientX: number, clientY: number) {
    const ev = new MouseEvent(type, { clientX, clientY, bubbles: true, cancelable: true });
    Object.defineProperty(ev, "pointerId", { value: 1 });
    return ev;
  }

  it("loads the fixture run and shows the level screens", async () => {
    render(<App />);
    // the right pane opens on Level, so the screen names are on the canvas
    await waitFor(() => {
      expect(screen.getAllByText("Town Square").length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText("Bakery Lane").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Fern Hollow").length).toBeGreaterThan(0);
    // locked screen carries its gate badge (archetype + key)
    expect(screen.getByText(/LOCK · Knowledge · G-F1-fernpath/)).toBeTruthy();
  });

  it("gives each pane its own tab strip, both listing every view", async () => {
    render(<App />);
    await waitFor(() => expect(strip("centre pane")).toBeTruthy());
    for (const pane of ["centre pane", "right pane"] as const) {
      const labels = within(strip(pane))
        .getAllByRole("tab")
        .map((t) => t.textContent);
      expect(labels).toEqual([
        "Dialogue",
        "Level",
        "Week",
        "Stage",
        "Play",
        "Sweep",
        "Flags",
        "Variables",
        "Notes",
        "Assets",
        "Cast",
        "Notebook",
        "Festival",
      ]);
    }
  });

  it("defaults to Dialogue in the centre and Level on the right", async () => {
    render(<App />);
    await waitFor(() => expect(strip("centre pane")).toBeTruthy());
    const selected = (pane: "centre pane" | "right pane") =>
      within(strip(pane))
        .getAllByRole("tab")
        .find((t) => t.getAttribute("aria-selected") === "true")?.textContent;
    expect(selected("centre pane")).toBe("Dialogue");
    expect(selected("right pane")).toBe("Level");
  });

  it("switches one pane's view without touching the other", async () => {
    render(<App />);
    await waitFor(() => expect(strip("centre pane")).toBeTruthy());
    // Variables is not on screen until a pane shows it
    expect(screen.queryByText("thread_giver_receive")).toBeNull();
    pick("right pane", "Variables");
    expect(screen.getByText("thread_giver_receive")).toBeTruthy();
    // the centre is still Dialogue
    expect(
      within(strip("centre pane"))
        .getAllByRole("tab")
        .find((t) => t.getAttribute("aria-selected") === "true")?.textContent
    ).toBe("Dialogue");
    // and Sweep can take the centre at the same time
    pick("centre pane", "Sweep");
    expect(screen.getByText(/unreviewed or flagged/)).toBeTruthy();
    expect(screen.getByText("thread_giver_receive")).toBeTruthy();
  });

  it("hides and restores the right pane, dropping its splitter with it", async () => {
    render(<App />);
    await waitFor(() => expect(strip("centre pane")).toBeTruthy());
    // two separators: the navigator gutter and the right-pane gutter
    expect(screen.getAllByRole("separator").length).toBe(2);

    fireEvent.click(screen.getByRole("button", { name: "Hide the right pane" }));
    expect(screen.queryByRole("tablist", { name: "right pane views" })).toBeNull();
    expect(screen.getAllByRole("separator").length).toBe(1);

    fireEvent.click(screen.getByRole("button", { name: /Show right pane/ }));
    expect(strip("right pane")).toBeTruthy();
    expect(screen.getAllByRole("separator").length).toBe(2);
  });

  // Mode follows what is on screen. The header's keyboard note is the readout:
  // "j jumps" only means anything while a story is being played.
  // Reads the masthead's mode indicator. This used to probe for the literal
  // text "j jumps" in the header note — a proxy for play mode that broke the
  // moment the shortcut hint moved into a tooltip. The indicator is the real
  // thing the proxy stood for. D3: the pip is now also the exit-play button
  // ("playing · exit ✕"), so this matches the leading word rather than the
  // old exact "playing" string.
  const inPlayMode = () =>
    screen.queryByText((content) => content.startsWith("playing")) !== null;

  it("enters play mode when a play surface becomes visible, in either pane", async () => {
    render(<App />);
    await waitFor(() => expect(strip("centre pane")).toBeTruthy());
    expect(inPlayMode()).toBe(false);

    pick("right pane", "Play");
    expect(inPlayMode()).toBe(true);

    pick("right pane", "Level");
    expect(inPlayMode()).toBe(false);

    // the centre counts the same way, and Stage is a play surface too
    pick("centre pane", "Stage");
    expect(inPlayMode()).toBe(true);
  });

  it("leaves play mode when the pane holding the play view is hidden", async () => {
    render(<App />);
    await waitFor(() => expect(strip("centre pane")).toBeTruthy());
    pick("right pane", "Stage");
    expect(inPlayMode()).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Hide the right pane" }));
    expect(inPlayMode()).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: /Show right pane/ }));
    expect(inPlayMode()).toBe(true);
  });

  // D3: mode used to have no explicit exit — only a hidden pane or loading a
  // different run folder ever left play mode. The pip is now a clickable
  // button that snaps every play pane back to a review view.
  it("has an explicit, clickable exit from play mode (D3)", async () => {
    render(<App />);
    await waitFor(() => expect(strip("centre pane")).toBeTruthy());
    pick("right pane", "Play");
    expect(inPlayMode()).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: /playing.*exit/i }));
    expect(inPlayMode()).toBe(false);
    // the play pane itself is gone — swapped back to the right pane's review
    // default (Level) rather than left showing a stale Play tab
    const selected = within(strip("right pane")).getByRole("tab", { selected: true });
    expect(selected.textContent).toBe("Level");
  });

  it("shows Stage and Play as separate full-pane views, not one stack", async () => {
    render(<App />);
    await waitFor(() => expect(strip("centre pane")).toBeTruthy());
    pick("centre pane", "Stage");
    expect(screen.getByLabelText("stage")).toBeTruthy();
    expect(screen.queryByLabelText("play pane")).toBeNull();

    pick("centre pane", "Play");
    expect(screen.getByLabelText("play pane")).toBeTruthy();
    expect(screen.queryByLabelText("stage")).toBeNull();

    // both at once only when the user puts one in each pane
    pick("right pane", "Stage");
    expect(screen.getByLabelText("play pane")).toBeTruthy();
    expect(screen.getByLabelText("stage")).toBeTruthy();
  });

  /** the layout switch inside whichever pane currently shows Level */
  function layoutSwitch(pane: "centre pane" | "right pane") {
    const host = screen.getByRole("region", { name: pane });
    return within(host).getByRole("radiogroup", { name: "level layout" });
  }
  function pickLayout(pane: "centre pane" | "right pane", label: string) {
    fireEvent.click(within(layoutSwitch(pane)).getByRole("radio", { name: label }));
  }
  function activeLayout(pane: "centre pane" | "right pane") {
    return within(layoutSwitch(pane))
      .getAllByRole("radio")
      .find((r) => r.getAttribute("aria-checked") === "true")?.textContent;
  }

  it("offers the three level layouts, defaulting to constellation", async () => {
    render(<App />);
    await waitFor(() => expect(strip("right pane")).toBeTruthy());
    expect(
      within(layoutSwitch("right pane"))
        .getAllByRole("radio")
        .map((r) => r.textContent)
    ).toEqual(["Constellation", "Tree", "List"]);
    expect(activeLayout("right pane")).toBe("Constellation");
  });

  it("keeps each pane's level layout to itself", async () => {
    render(<App />);
    await waitFor(() => expect(strip("centre pane")).toBeTruthy());
    pick("centre pane", "Level");
    expect(activeLayout("centre pane")).toBe("Constellation");

    pickLayout("right pane", "Tree");
    expect(activeLayout("right pane")).toBe("Tree");
    // the centre pane is untouched — panes are self-contained
    expect(activeLayout("centre pane")).toBe("Constellation");
  });

  it("remembers each pane's layout across a reload", async () => {
    const first = render(<App />);
    await waitFor(() => expect(strip("right pane")).toBeTruthy());
    pickLayout("right pane", "List");
    first.unmount();

    render(<App />);
    await waitFor(() => expect(strip("right pane")).toBeTruthy());
    expect(activeLayout("right pane")).toBe("List");
  });

  it("list mode shows every screen, including ones with no scenes", async () => {
    render(<App />);
    await waitFor(() => expect(strip("right pane")).toBeTruthy());
    pickLayout("right pane", "List");
    const rows = document.querySelectorAll(".level-table tbody tr");
    expect(rows.length).toBe(graphFixture.screens.length);
    // the locked forest screen carries its gate in the row
    expect(screen.getByText(/LOCK · Knowledge · G-F1-fernpath/)).toBeTruthy();
    // and a row opens its screen
    fireEvent.click(screen.getByRole("button", { name: "open Bakery Lane" }));
    await waitFor(() => {
      expect(document.querySelector('[data-artifact-id="SC-T2-01"]')).toBeTruthy();
    });
  });

  it("folds the dialogue scene picker to one line, per pane, and remembers it", async () => {
    // open a screen so the picker has scene cards in it
    const first = render(<App />);
    await waitFor(() => {
      expect(screen.getAllByText("Bakery Lane").length).toBeGreaterThan(0);
    });
    fireEvent.click(document.querySelector(".rail-scene")!);
    await waitFor(() => expect(document.querySelector(".scene-list")).toBeTruthy());
    // the cards are the tall part — a scene card per scene on the screen
    expect(document.querySelectorAll(".scene-list .node-card").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Collapse the scene picker" }));
    expect(document.querySelector(".scene-list-folded")).toBeTruthy();
    expect(document.querySelectorAll(".scene-list .node-card")).toHaveLength(0);
    // folded still says which scene is open, and how big it is
    expect(document.querySelector(".scene-list-folded .hint")?.textContent).toMatch(
      /SC-T2-01 · toby · \d+ lines · \d+ choice/
    );

    // the right pane's own Dialogue view is unaffected
    pick("right pane", "Dialogue");
    const rightPane = screen.getByRole("region", { name: "right pane" });
    expect(
      within(rightPane).getByRole("button", { name: "Collapse the scene picker" })
    ).toBeTruthy();

    first.unmount();
    render(<App />);
    await waitFor(() => {
      expect(screen.getAllByText("Bakery Lane").length).toBeGreaterThan(0);
    });
    fireEvent.click(document.querySelector(".rail-scene")!);
    await waitFor(() => expect(document.querySelector(".scene-list")).toBeTruthy());
    expect(
      screen.getByRole("button", { name: "Expand the scene picker" })
    ).toBeTruthy();
  });

  it("collapses a rail group and remembers it across a reload", async () => {
    const first = render(<App />);
    await waitFor(() => {
      expect(screen.getAllByText("Bakery Lane").length).toBeGreaterThan(0);
    });
    expect(document.querySelector(".rail-scene")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /^Collapse Bakery Lane/ }));
    expect(document.querySelector(".rail-scene")).toBeNull();
    first.unmount();

    render(<App />);
    await waitFor(() => {
      expect(screen.getAllByText("Bakery Lane").length).toBeGreaterThan(0);
    });
    expect(screen.getByRole("button", { name: /^Expand Bakery Lane/ })).toBeTruthy();
    expect(document.querySelector(".rail-scene")).toBeNull();
  });

  it("keeps the navigator fixed: scene rail plus health, no view tabs", async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getAllByText("Bakery Lane").length).toBeGreaterThan(0);
    });
    const nav = screen.getByRole("navigation", { name: "navigator" });
    expect(within(nav).getByLabelText("scene presence")).toBeTruthy();
    expect(within(nav).getByLabelText("graph health")).toBeTruthy();
    expect(within(nav).queryAllByRole("tab")).toHaveLength(0);
    expect(screen.getByText("Reachable")).toBeTruthy();
    expect(screen.getByText("Unreachable")).toBeTruthy();
  });

  it("lists scenes in the rail and badges the level map, and a rail click opens the tree", async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getAllByText("Bakery Lane").length).toBeGreaterThan(0);
    });
    // rail lists T2's scene id (fixtures-review has SC-T2-01 on T2)
    const railScene = document.querySelector(".rail-scene");
    expect(railScene?.textContent).toContain("SC-T2-01");
    // map badge: T2 has one scene
    expect(screen.getAllByText(/1 scene/).length).toBeGreaterThan(0);
    // clicking the rail scene opens that scene's tree
    fireEvent.click(railScene!);
    await waitFor(() => {
      expect(document.querySelector('[data-artifact-id="SC-T2-01"]')).toBeTruthy();
    });
  });

  it("remembers a loaded folder and offers it in the recent dropdown", async () => {
    render(<App />);
    await waitFor(() => expect(strip("centre pane")).toBeTruthy());
    const menu = screen.getByLabelText("recent run folders") as HTMLSelectElement;
    expect([...menu.options].map((o) => o.value)).toEqual(["fixtures"]);
    expect(menu.value).toBe("fixtures");
  });

  it("reopens the last folder on startup instead of the built-in default", async () => {
    window.localStorage.setItem(
      "lantern-folders-v1",
      JSON.stringify(["../resolver/out-calib", "fixtures"])
    );
    render(<App />);
    await waitFor(() => expect(strip("centre pane")).toBeTruthy());
    const urls = (fetch as unknown as { mock: { calls: [string][] } }).mock.calls.map(
      (c) => c[0]
    );
    expect(urls[0]).toContain(`dir=${encodeURIComponent("../resolver/out-calib")}`);
    expect(urls.some((u) => u.includes("dir=fixtures"))).toBe(false);
    // the input reflects what was actually opened
    expect((screen.getByLabelText("run folder") as HTMLInputElement).value).toBe(
      "../resolver/out-calib"
    );
  });

  it("switching folders in the dropdown loads that folder", async () => {
    window.localStorage.setItem(
      "lantern-folders-v1",
      JSON.stringify(["fixtures", "../resolver/out-calib"])
    );
    render(<App />);
    await waitFor(() => expect(strip("centre pane")).toBeTruthy());
    fireEvent.change(screen.getByLabelText("recent run folders"), {
      target: { value: "../resolver/out-calib" },
    });
    await waitFor(() => {
      const urls = (fetch as unknown as { mock: { calls: [string][] } }).mock.calls.map(
        (c) => c[0]
      );
      expect(
        urls.some((u) => u.includes(encodeURIComponent("../resolver/out-calib")))
      ).toBe(true);
    });
  });

  it("no longer offers the mock play states toggle", async () => {
    render(<App />);
    await waitFor(() => expect(strip("centre pane")).toBeTruthy());
    expect(screen.queryByText(/Mock play states/)).toBeNull();
  });

  it("double-click on a screen card opens its scenes", async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getAllByText("Bakery Lane").length).toBeGreaterThan(0);
    });
    const card = document.querySelector('[data-artifact-id="T2"]')!;
    fireEvent.doubleClick(card);
    // T2's one scene shows up in the scene list
    await waitFor(() => {
      expect(document.querySelector('[data-artifact-id="SC-T2-01"]')).toBeTruthy();
    });
  });

  // Bug 6: writes used to target `dirInput`, the live text box, so typing a
  // path without pressing Load sent every approval somewhere that was never
  // opened. Writes must follow the folder that actually loaded.
  it("approving writes to the loaded folder, not whatever is typed in the box", async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getAllByText("Bakery Lane").length).toBeGreaterThan(0);
    });

    // type a different folder but never press Load
    fireEvent.change(screen.getByLabelText("run folder"), {
      target: { value: "somewhere/else" },
    });

    const card = document.querySelector('[data-artifact-id="T2"]')!;
    fireEvent.click(within(card as HTMLElement).getByLabelText("approve T2"));

    await waitFor(() => {
      const calls = (fetch as unknown as { mock: { calls: [string, RequestInit?][] } })
        .mock.calls;
      const approve = calls.find(([u]) => String(u).startsWith("/__bridge/approve"));
      expect(approve).toBeTruthy();
      expect(JSON.parse(String(approve![1]!.body)).dir).toBe("fixtures");
    });

    // and the header says where writes actually land
    expect(screen.getByText(/writes fixtures\/out\//)).toBeTruthy();
  });

  // Bug 2: `window.prompt(...) ?? undefined` turned Cancel into "flag with no
  // note", which is the likely root of "flagging one flags all of them".
  it("cancelling the flag prompt writes nothing", async () => {
    vi.stubGlobal("prompt", vi.fn(() => null));
    render(<App />);
    await waitFor(() => {
      expect(screen.getAllByText("Bakery Lane").length).toBeGreaterThan(0);
    });
    const card = document.querySelector('[data-artifact-id="T2"]')!;
    fireEvent.click(within(card as HTMLElement).getByLabelText("flag T2"));

    const calls = (fetch as unknown as { mock: { calls: [string][] } }).mock.calls;
    expect(calls.some(([u]) => String(u).startsWith("/__bridge/approve"))).toBe(false);
  });

  it("confirming the flag prompt sends the note", async () => {
    vi.stubGlobal("prompt", vi.fn(() => "needs another option"));
    render(<App />);
    await waitFor(() => {
      expect(screen.getAllByText("Bakery Lane").length).toBeGreaterThan(0);
    });
    const card = document.querySelector('[data-artifact-id="T2"]')!;
    fireEvent.click(within(card as HTMLElement).getByLabelText("flag T2"));

    await waitFor(() => {
      const calls = (fetch as unknown as { mock: { calls: [string, RequestInit?][] } })
        .mock.calls;
      const approve = calls.find(([u]) => String(u).startsWith("/__bridge/approve"));
      expect(JSON.parse(String(approve![1]!.body))).toMatchObject({
        artifact_id: "T2",
        status: "flagged",
        note: "needs another option",
      });
    });
  });

  it("an empty note flags without one, rather than storing a blank", async () => {
    vi.stubGlobal("prompt", vi.fn(() => "   "));
    render(<App />);
    await waitFor(() => {
      expect(screen.getAllByText("Bakery Lane").length).toBeGreaterThan(0);
    });
    const card = document.querySelector('[data-artifact-id="T2"]')!;
    fireEvent.click(within(card as HTMLElement).getByLabelText("flag T2"));

    await waitFor(() => {
      const calls = (fetch as unknown as { mock: { calls: [string, RequestInit?][] } })
        .mock.calls;
      const approve = calls.find(([u]) => String(u).startsWith("/__bridge/approve"));
      expect(JSON.parse(String(approve![1]!.body)).note).toBeUndefined();
    });
  });

  // L2 gate: Ctrl+Z works on approve, and the write that goes out is the real
  // inverse — a "pending" write, which the server turns into a deletion.
  it("Ctrl+Z after an approve issues the inverse write", async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getAllByText("Bakery Lane").length).toBeGreaterThan(0);
    });

    const card = document.querySelector('[data-artifact-id="T2"]')!;
    fireEvent.click(within(card as HTMLElement).getByLabelText("approve T2"));

    const approveCalls = () =>
      (fetch as unknown as { mock: { calls: [string, RequestInit?][] } }).mock.calls
        .filter(([u]) => String(u).startsWith("/__bridge/approve"))
        .map(([, init]) => JSON.parse(String(init!.body)));

    await waitFor(() => expect(approveCalls()).toHaveLength(1));
    expect(approveCalls()[0]).toMatchObject({ artifact_id: "T2", status: "approved" });

    // the control reports what it would undo
    await waitFor(() => expect(screen.getByLabelText("undo approve T2")).toBeTruthy());

    fireEvent.keyDown(document, { key: "z", ctrlKey: true });
    await waitFor(() => expect(approveCalls()).toHaveLength(2));
    expect(approveCalls()[1]).toMatchObject({ artifact_id: "T2", status: "pending" });

    // and redo puts it back
    fireEvent.keyDown(document, { key: "z", ctrlKey: true, shiftKey: true });
    await waitFor(() => expect(approveCalls()).toHaveLength(3));
    expect(approveCalls()[2]).toMatchObject({ artifact_id: "T2", status: "approved" });
  });

  it("undo is disabled until something has been done", async () => {
    render(<App />);
    await waitFor(() => expect(strip("centre pane")).toBeTruthy());
    expect((screen.getByLabelText("undo") as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByLabelText("redo") as HTMLButtonElement).disabled).toBe(true);
  });

  it("Ctrl+Z inside a text field is left to the textarea", async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getAllByText("Bakery Lane").length).toBeGreaterThan(0);
    });
    const card = document.querySelector('[data-artifact-id="T2"]')!;
    fireEvent.click(within(card as HTMLElement).getByLabelText("approve T2"));
    await waitFor(() => expect(screen.getByLabelText("undo approve T2")).toBeTruthy());

    const box = screen.getByLabelText("run folder");
    fireEvent.keyDown(box, { key: "z", ctrlKey: true });

    // still one write — the app's undo did not fire
    const approves = (
      fetch as unknown as { mock: { calls: [string][] } }
    ).mock.calls.filter(([u]) => String(u).startsWith("/__bridge/approve"));
    expect(approves).toHaveLength(1);
  });

  // Item 1: commitRegionShape is NOT a network call — it only accumulates
  // into `pendingRegions` and patches `run.graph` optimistically; nothing
  // reaches disk until Apply. Without the optimistic patch, the committed
  // rect would not show up until the next full reload. This pins that
  // in-memory update keeping the marker (and the chip's dot) in sync with
  // the placement that just happened.
  it("committing a region shape renders the marker and clears the chip's dot", async () => {
    const graph = structuredClone(playGraphFixture) as typeof playGraphFixture;
    // Start r_board unshaped so the "chip loses its dot" half of the
    // assertion means something — the fixture ships it already shaped.
    (graph.screens[0].regions as { region_id: string; shape: unknown }[])[1].shape = null;
    const approvals: Record<string, unknown> = {};
    const edits: unknown[] = [];
    let regions: { screens: Record<string, Record<string, unknown>> } = { screens: {} };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        const u = String(url);
        if (u.startsWith("/__bridge/run")) {
          return new Response(
            JSON.stringify({
              dir: "fixtures",
              graph,
              day: playDayFixture,
              // the real compiled fixture story — needed to actually enter a
              // screen; the marker layer only exists during play (StagePane's
              // "Mode B" gate), so the plain fixtures-review/ run (no story)
              // can never reach it.
              story: JSON.stringify(playStoryFixture),
              // an image on T1 so the Stage pane takes the marker-bearing
              // image path rather than the text-button fallback
              manifest: { T1: "images/t1.png" },
              approvals,
              edits,
              regions,
            }),
            { status: 200 }
          );
        }
        if (u.startsWith("/__bridge/regions")) {
          const b = JSON.parse(String(init!.body)) as {
            entries: { screen_id: string; region_id: string; rect: unknown }[];
          };
          const nextScreens = { ...regions.screens };
          for (const e of b.entries) {
            nextScreens[e.screen_id] = { ...nextScreens[e.screen_id], [e.region_id]: e.rect };
          }
          regions = { screens: nextScreens };
          return new Response(JSON.stringify({ regions }), { status: 200 });
        }
        return new Response(JSON.stringify({ error: "nope" }), { status: 404 });
      })
    );

    // jsdom never sizes anything, so the marker surface's bounding box is
    // 0x0 by default — toNormalized would flatten every drag to the same
    // point. Give it a real box so a genuine drag produces a real rect.
    const box = { left: 0, top: 0, width: 1000, height: 500, right: 1000, bottom: 500 };
    vi.spyOn(HTMLDivElement.prototype, "getBoundingClientRect").mockReturnValue(
      box as DOMRect
    );

    render(<App />);
    await waitFor(() => {
      expect(screen.getAllByText("Town Square").length).toBeGreaterThan(0);
    });

    // enter play (day 1's manual start pick lands on screen_hub) and step
    // onto T1, the only way the Stage pane's image/marker path is reachable
    pick("centre pane", "Play");
    await waitFor(() => expect(screen.getByText(/Begin at Town Square/)).toBeTruthy());
    fireEvent.click(screen.getByText(/Begin at Town Square/));

    // now switch that pane over to Stage — the live play session (currentScreen
    // = T1) carries over, since Stage reads the same shared play view
    pick("centre pane", "Stage");
    await waitFor(() => expect(screen.getByLabelText("stage")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Place markers" }));
    fireEvent.click(screen.getByRole("button", { name: "r_board ·" }));

    const surface = screen.getByRole("application", { name: "Draw region r_board" });
    fireEvent(surface, pointerEvent("pointerdown", 100, 100));
    fireEvent(surface, pointerEvent("pointermove", 300, 200));
    fireEvent(surface, pointerEvent("pointerup", 300, 200));

    // the marker renders at the drawn rect right away — an in-memory,
    // optimistic patch, not a round trip...
    await waitFor(() => {
      const marker = document.querySelector(".marker[title='r_board']") as HTMLElement | null;
      expect(marker).toBeTruthy();
      // jsdom's CSSOM re-serializes the percentages (e.g. "10.00%" -> "10%"),
      // so this checks the underlying value rather than rectToCss's string.
      expect(marker!.style.left).toBe("10%");
      expect(marker!.style.top).toBe("20%");
      expect(marker!.style.width).toBe("20%");
      expect(marker!.style.height).toBe("20%");
    });
    // ...and the chip no longer shows the unshaped dot
    expect(screen.queryByRole("button", { name: "r_board ·" })).toBeNull();
    expect(screen.getByRole("button", { name: "r_board" })).toBeTruthy();

    // ...and, per L9's design, placing never posts to the bridge — only
    // Apply does.
    const regionsCalls = () =>
      (fetch as unknown as { mock: { calls: [string, RequestInit?][] } }).mock.calls.filter(
        ([u]) => String(u).startsWith("/__bridge/regions")
      );
    expect(regionsCalls()).toHaveLength(0);

    // the Apply pill announces exactly one pending placement
    const applyBtn = () => screen.getByRole("button", { name: /1 placement pending/ });
    expect(applyBtn()).toBeTruthy();

    // Ctrl+Z reverts both the pending count and the rendered geometry
    fireEvent.keyDown(document, { key: "z", ctrlKey: true });
    await waitFor(() => expect(screen.getByLabelText("redo place r_board")).toBeTruthy());
    expect(document.querySelector(".marker[title='r_board']")).toBeNull();
    expect(screen.getByRole("button", { name: "r_board ·" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /placement.*pending/ })).toBeNull();

    // redo restores both
    fireEvent.keyDown(document, { key: "z", ctrlKey: true, shiftKey: true });
    await waitFor(() => {
      const marker = document.querySelector(".marker[title='r_board']") as HTMLElement | null;
      expect(marker).toBeTruthy();
      expect(marker!.style.left).toBe("10%");
    });
    expect(applyBtn()).toBeTruthy();

    // Apply fires exactly one postRegions call and clears the count
    fireEvent.click(applyBtn());
    await waitFor(() => expect(regionsCalls()).toHaveLength(1));
    expect(JSON.parse(String(regionsCalls()[0][1]!.body))).toMatchObject({
      dir: "fixtures",
      entries: [{ screen_id: "T1", region_id: "r_board", rect: { x: 0.1, y: 0.2, w: 0.2, h: 0.2 } }],
    });
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /placement.*pending/ })).toBeNull();
    });
  });

  // D1: place -> Apply (rect reaches disk + run.regions) -> Ctrl+Z. Before
  // the fix, undo called mergeRegionEntry(pendingRegions, ..., null), which
  // DELETES a key that isn't in pendingRegions (a silent no-op) instead of
  // tombstoning it — so the pending count stayed 0, there was nothing left
  // to Apply, and the rect stayed on disk forever even though the UI showed
  // it gone. This pins the whole round trip: place, Apply, undo (must
  // register a pending delete), Apply again (must actually send it and
  // remove the key from both the postRegions call and the resulting map).
  it("place -> Apply -> undo -> Apply removes the entry from disk (D1)", async () => {
    const graph = structuredClone(playGraphFixture) as typeof playGraphFixture;
    (graph.screens[0].regions as { region_id: string; shape: unknown }[])[1].shape = null;
    const approvals: Record<string, unknown> = {};
    const edits: unknown[] = [];
    let regions: { screens: Record<string, Record<string, unknown>> } = { screens: {} };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        const u = String(url);
        if (u.startsWith("/__bridge/run")) {
          return new Response(
            JSON.stringify({
              dir: "fixtures",
              graph,
              day: playDayFixture,
              story: JSON.stringify(playStoryFixture),
              manifest: { T1: "images/t1.png" },
              approvals,
              edits,
              regions,
            }),
            { status: 200 }
          );
        }
        if (u.startsWith("/__bridge/regions")) {
          const b = JSON.parse(String(init!.body)) as {
            entries: { screen_id: string; region_id: string; rect: unknown }[];
          };
          const nextScreens = { ...regions.screens };
          for (const e of b.entries) {
            if (e.rect === null) {
              const { [e.region_id]: _removed, ...rest } = nextScreens[e.screen_id] ?? {};
              void _removed;
              if (Object.keys(rest).length === 0) delete nextScreens[e.screen_id];
              else nextScreens[e.screen_id] = rest;
            } else {
              nextScreens[e.screen_id] = { ...nextScreens[e.screen_id], [e.region_id]: e.rect };
            }
          }
          regions = { screens: nextScreens };
          return new Response(JSON.stringify({ regions }), { status: 200 });
        }
        return new Response(JSON.stringify({ error: "nope" }), { status: 404 });
      })
    );

    const box = { left: 0, top: 0, width: 1000, height: 500, right: 1000, bottom: 500 };
    vi.spyOn(HTMLDivElement.prototype, "getBoundingClientRect").mockReturnValue(box as DOMRect);

    render(<App />);
    await waitFor(() => {
      expect(screen.getAllByText("Town Square").length).toBeGreaterThan(0);
    });

    pick("centre pane", "Play");
    await waitFor(() => expect(screen.getByText(/Begin at Town Square/)).toBeTruthy());
    fireEvent.click(screen.getByText(/Begin at Town Square/));

    pick("centre pane", "Stage");
    await waitFor(() => expect(screen.getByLabelText("stage")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Place markers" }));
    fireEvent.click(screen.getByRole("button", { name: "r_board ·" }));

    const surface = screen.getByRole("application", { name: "Draw region r_board" });
    fireEvent(surface, pointerEvent("pointerdown", 100, 100));
    fireEvent(surface, pointerEvent("pointermove", 300, 200));
    fireEvent(surface, pointerEvent("pointerup", 300, 200));

    const regionsCalls = () =>
      (fetch as unknown as { mock: { calls: [string, RequestInit?][] } }).mock.calls.filter(
        ([u]) => String(u).startsWith("/__bridge/regions")
      );

    // place -> Apply: the rect lands on disk and in run.regions.
    const applyBtn = () => screen.getByRole("button", { name: /placement.*pending/ });
    fireEvent.click(applyBtn());
    await waitFor(() => expect(regionsCalls()).toHaveLength(1));
    expect(regions.screens.T1?.r_board).toEqual({ x: 0.1, y: 0.2, w: 0.2, h: 0.2 });
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /placement.*pending/ })).toBeNull();
    });

    // Ctrl+Z: must register a PENDING DELETE (tombstone), not a no-op —
    // the Apply pill has to come back showing unapplied work.
    fireEvent.keyDown(document, { key: "z", ctrlKey: true });
    await waitFor(() => expect(applyBtn()).toBeTruthy());
    expect(document.querySelector(".marker[title='r_board']")).toBeNull();

    // Apply again: the tombstone must actually reach postRegions as
    // `rect: null`, and the server's delete branch must remove the key —
    // from BOTH the request body and the resulting map.
    fireEvent.click(applyBtn());
    await waitFor(() => expect(regionsCalls()).toHaveLength(2));
    expect(JSON.parse(String(regionsCalls()[1][1]!.body))).toMatchObject({
      dir: "fixtures",
      entries: [{ screen_id: "T1", region_id: "r_board", rect: null }],
    });
    expect(regions.screens.T1).toBeUndefined();
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /placement.*pending/ })).toBeNull();
    });
  });

  it("a failed Apply keeps the pending placement rather than losing it", async () => {
    const graph = structuredClone(playGraphFixture) as typeof playGraphFixture;
    (graph.screens[0].regions as { region_id: string; shape: unknown }[])[1].shape = null;
    const approvals: Record<string, unknown> = {};
    const edits: unknown[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const u = String(url);
        if (u.startsWith("/__bridge/run")) {
          return new Response(
            JSON.stringify({
              dir: "fixtures",
              graph,
              day: playDayFixture,
              story: JSON.stringify(playStoryFixture),
              manifest: { T1: "images/t1.png" },
              approvals,
              edits,
              regions: { screens: {} },
            }),
            { status: 200 }
          );
        }
        if (u.startsWith("/__bridge/regions")) {
          return new Response(JSON.stringify({ error: "boom" }), { status: 500 });
        }
        return new Response(JSON.stringify({ error: "nope" }), { status: 404 });
      })
    );

    vi.spyOn(HTMLDivElement.prototype, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 1000,
      height: 500,
      right: 1000,
      bottom: 500,
    } as DOMRect);

    render(<App />);
    await waitFor(() => {
      expect(screen.getAllByText("Town Square").length).toBeGreaterThan(0);
    });
    pick("centre pane", "Play");
    await waitFor(() => expect(screen.getByText(/Begin at Town Square/)).toBeTruthy());
    fireEvent.click(screen.getByText(/Begin at Town Square/));
    pick("centre pane", "Stage");
    await waitFor(() => expect(screen.getByLabelText("stage")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Place markers" }));
    fireEvent.click(screen.getByRole("button", { name: "r_board ·" }));
    const surface = screen.getByRole("application", { name: "Draw region r_board" });
    fireEvent(surface, pointerEvent("pointerdown", 100, 100));
    fireEvent(surface, pointerEvent("pointermove", 300, 200));
    fireEvent(surface, pointerEvent("pointerup", 300, 200));

    const applyBtn = screen.getByRole("button", { name: /1 placement pending/ });
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(screen.getByText(/Bridge error/)).toBeTruthy();
    });
    // the pending count survives the failure — nothing is lost
    expect(screen.getByRole("button", { name: /1 placement pending/ })).toBeTruthy();
  });

  // U7 — dragging a pending placement's ghost rewrites its note in place
  // (postNoteUpdate), never a region commit (postRegions). The rect line
  // changes; the prose and id line must come back byte-identical.
  it("dragging a ghost placement posts exactly one note-update, never a region write, and undoes cleanly", async () => {
    const graph = structuredClone(playGraphFixture) as typeof playGraphFixture;
    const originalBody =
      "@place\nid: item_ash\nkind: item\nscreen: T1\nrect: 0.1000 0.2000 0.2000 0.2000\n\nash near the forge end";
    let notes: {
      target: string | null;
      kind: string;
      body: string;
      resolved: boolean;
      timestamp: string;
    }[] = [{ target: "T1", kind: "structure", body: originalBody, resolved: false, timestamp: "t1" }];
    const approvals: Record<string, unknown> = {};
    const edits: unknown[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        const u = String(url);
        if (u.startsWith("/__bridge/run")) {
          return new Response(
            JSON.stringify({
              dir: "fixtures",
              graph,
              day: playDayFixture,
              story: JSON.stringify(playStoryFixture),
              manifest: { T1: "images/t1.png" },
              approvals,
              edits,
              notes,
              regions: { screens: {} },
            }),
            { status: 200 }
          );
        }
        if (u.startsWith("/__bridge/note-update")) {
          const b = JSON.parse(String(init!.body)) as {
            target: string | null;
            timestamp: string;
            body: string;
          };
          notes = notes.map((n) =>
            n.target === b.target && n.timestamp === b.timestamp ? { ...n, body: b.body } : n
          );
          return new Response(JSON.stringify({ notes }), { status: 200 });
        }
        return new Response(JSON.stringify({ error: "nope" }), { status: 404 });
      })
    );

    vi.spyOn(HTMLDivElement.prototype, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 1000,
      height: 500,
      right: 1000,
      bottom: 500,
    } as DOMRect);

    render(<App />);
    await waitFor(() => {
      expect(screen.getAllByText("Town Square").length).toBeGreaterThan(0);
    });
    pick("centre pane", "Play");
    await waitFor(() => expect(screen.getByText(/Begin at Town Square/)).toBeTruthy());
    fireEvent.click(screen.getByText(/Begin at Town Square/));
    pick("centre pane", "Stage");
    await waitFor(() => expect(screen.getByLabelText("stage")).toBeTruthy());

    // the ghost is drawn regardless of mode, but only the marker-layer's drag
    // surface (Place markers on) can grab it.
    await waitFor(() => {
      expect(screen.getByTestId("pending-marker")).toBeTruthy();
    });
    fireEvent.click(screen.getByRole("button", { name: "Place markers" }));

    const surface = screen.getByRole("application", { name: "Select a region to draw" });
    // the ghost's rect is 0.1-0.3 x, 0.2-0.4 y in a 1000x500 box: 100-300, 100-200
    fireEvent(surface, pointerEvent("pointerdown", 150, 150));
    fireEvent(surface, pointerEvent("pointermove", 350, 250));
    fireEvent(surface, pointerEvent("pointerup", 350, 250));

    const noteUpdateCalls = () =>
      (fetch as unknown as { mock: { calls: [string, RequestInit?][] } }).mock.calls.filter(
        ([u]) => String(u).startsWith("/__bridge/note-update")
      );
    const regionsCalls = () =>
      (fetch as unknown as { mock: { calls: [string, RequestInit?][] } }).mock.calls.filter(
        ([u]) => String(u).startsWith("/__bridge/regions")
      );

    await waitFor(() => expect(noteUpdateCalls()).toHaveLength(1));
    const postedBody = JSON.parse(String(noteUpdateCalls()[0][1]!.body)).body as string;
    expect(postedBody).not.toBe(originalBody);
    expect(postedBody).toContain("id: item_ash");
    expect(postedBody).toContain("ash near the forge end");
    expect(postedBody).not.toContain("rect: 0.1000 0.2000 0.2000 0.2000");
    expect(regionsCalls()).toHaveLength(0);

    // Ctrl+Z fires a second note-update, restoring the ORIGINAL body exactly.
    fireEvent.keyDown(document, { key: "z", ctrlKey: true });
    await waitFor(() => expect(noteUpdateCalls()).toHaveLength(2));
    const undoneBody = JSON.parse(String(noteUpdateCalls()[1][1]!.body)).body as string;
    expect(undoneBody).toBe(originalBody);
    expect(regionsCalls()).toHaveLength(0);
  });

  it("with no run loaded, an approve writes nothing at all", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ error: "nope" }), { status: 404 }))
    );
    render(<App />);
    await waitFor(() => expect(screen.getByText(/no run loaded/)).toBeTruthy());
    const calls = (fetch as unknown as { mock: { calls: [string][] } }).mock.calls;
    expect(calls.some(([u]) => String(u).startsWith("/__bridge/approve"))).toBe(false);
  });
});
