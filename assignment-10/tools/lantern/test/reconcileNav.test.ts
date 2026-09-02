import { describe, expect, it, vi } from "vitest";
import type { Graph, Scene } from "../src/types";
import { makeDebounce, reconcileNav, shouldAutoReload } from "../src/lib/reconcileNav";
import { notesAsMarkdown, type Note } from "../src/lib/bridge";

/**
 * L7 — live reload.
 *
 * THE CARRIED INVARIANT these tests protect: a reload is not a user action.
 * Re-reading the same run must leave selection where it was. Two bugs of this
 * shape were already fixed by hand; with SSE they would fire on every save.
 */

const scene = (id: string, screen: string): Scene => ({
  scene_id: id,
  soul: "toby",
  screen_id: screen,
  ink_address: `toby.${id}`,
  lines: [{ content_id: `L-${id}`, slot_type: "dialogue", speaker_id: "toby", text: "x" }],
  choice_nodes: [
    {
      choice_id: `CH-${id}`,
      scene_id: id,
      availability_conditions: [],
      equal_weight_note: "n",
      no_accrual_note: "n",
      options: [
        {
          option_id: `CH-${id}-a`,
          verb_family: "Converse",
          player_verb: "witness",
          surface_action: "do",
          response_slots: [],
          state_actions: [],
          rejoin: "gather",
        },
      ],
    },
  ],
});

const graph = (scenes: Scene[], screens: string[]): Graph => ({
  screens: screens.map((id) => ({
    screen_id: id,
    location: "town",
    name: id,
    status: "start",
    gates: [],
    connects_to: [],
    ink_address: id.toLowerCase(),
  })),
  seams: [],
  scenes,
  variables: [],
});

describe("reconcileNav", () => {
  const g = graph([scene("SC-A", "T1")], ["T1", "T2"]);

  it("keeps a selection that still exists — the whole point", () => {
    const r = reconcileNav(g, { screenId: "T1", sceneId: "SC-A", selectedNodeId: "CH-SC-A" });
    expect(r.next).toEqual({ screenId: "T1", sceneId: "SC-A", selectedNodeId: "CH-SC-A" });
    expect(r.unchanged).toBe(true);
    expect(r.lost).toEqual([]);
  });

  it("clears a screen that is gone, and says so", () => {
    const r = reconcileNav(g, { screenId: "T9", sceneId: null, selectedNodeId: null });
    expect(r.next.screenId).toBeNull();
    expect(r.lost[0]).toMatch(/T9/);
  });

  it("clears a scene that is gone", () => {
    const r = reconcileNav(g, { screenId: "T1", sceneId: "SC-GONE", selectedNodeId: null });
    expect(r.next.sceneId).toBeNull();
    expect(r.lost[0]).toMatch(/SC-GONE/);
  });

  it("FOLLOWS a scene that moved screens instead of clearing it", () => {
    // The thing you were looking at still exists; it is just somewhere else.
    // Clearing would lose your place for no reason.
    const moved = graph([scene("SC-A", "T2")], ["T1", "T2"]);
    const r = reconcileNav(moved, { screenId: "T1", sceneId: "SC-A", selectedNodeId: null });
    expect(r.next.screenId).toBe("T2");
    expect(r.next.sceneId).toBe("SC-A");
    expect(r.lost).toEqual([]);
  });

  it("clears a node selection that no longer resolves", () => {
    const r = reconcileNav(g, { screenId: "T1", sceneId: "SC-A", selectedNodeId: "CH-GONE-a" });
    expect(r.next.selectedNodeId).toBeNull();
    expect(r.lost[0]).toMatch(/CH-GONE-a/);
  });

  it("resolves options and lines, not just choice nodes", () => {
    for (const id of ["CH-SC-A-a", "L-SC-A", "SC-A", "T1"]) {
      const r = reconcileNav(g, { screenId: null, sceneId: null, selectedNodeId: id });
      expect(r.next.selectedNodeId).toBe(id);
    }
  });

  it("reports unchanged so a caller can skip the state update entirely", () => {
    const r = reconcileNav(g, { screenId: null, sceneId: null, selectedNodeId: null });
    expect(r.unchanged).toBe(true);
  });
});

describe("shouldAutoReload", () => {
  it("holds a reload while a text field is open", () => {
    // Applying one under someone's cursor eats what they are typing. That is
    // the difference between helpful and infuriating.
    expect(shouldAutoReload({ editing: true })).toBe(false);
  });

  it("applies silently otherwise — a reload nobody asked for needs no click", () => {
    expect(shouldAutoReload({ editing: false })).toBe(true);
  });
});

describe("makeDebounce", () => {
  it("collapses a burst of writes into one call", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const d = makeDebounce(150);
    // `resolver build` rewrites graph.json, story.json and the day files in
    // quick succession; the middle of that burst is a half-written folder.
    d.call(fn);
    d.call(fn);
    d.call(fn);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(150);
    expect(fn).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("fires again for a later, separate burst", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const d = makeDebounce(150);
    d.call(fn);
    vi.advanceTimersByTime(150);
    d.call(fn);
    vi.advanceTimersByTime(150);
    expect(fn).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});

describe("notesAsMarkdown", () => {
  const note = (target: string, kind: Note["kind"], body: string): Note => ({
    target,
    kind,
    body,
    resolved: false,
    timestamp: "2026-07-31T00:00:00.000Z",
  });

  it("is empty for no notes, so nothing useless lands on the clipboard", () => {
    expect(notesAsMarkdown([])).toBe("");
  });

  it("groups by target, because the pipeline works node by node", () => {
    const md = notesAsMarkdown([
      note("CH-T2-04", "structure", "not enough branches here"),
      note("SC-T4-02", "question", "does Bram ever arrive?"),
      note("CH-T2-04", "todo", "check the gather"),
    ]);
    expect(md.indexOf("## CH-T2-04")).toBeLessThan(md.indexOf("## SC-T4-02"));
    expect(md).toContain("**structure**: not enough branches here");
    expect(md).toContain("**todo**: check the gather");
  });

  it("marks a resolved note so a stale one is not re-actioned", () => {
    const md = notesAsMarkdown([{ ...note("X", "structure", "done"), resolved: true }]);
    expect(md).toContain("_(resolved)_");
  });

  // D4: target is now `string | null` — a note need not be about anything
  // in particular, and grouping must not drop it or throw on the null key.
  it("groups a no-target note under (general) instead of dropping it", () => {
    const md = notesAsMarkdown([
      { ...note("CH-T2-04", "structure", "targeted"), target: null },
      note("SC-T4-02", "question", "targeted too"),
    ]);
    expect(md).toContain("## (general)");
    expect(md).toContain("**structure**: targeted");
  });
});
