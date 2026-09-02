import { describe, expect, it } from "vitest";
import type {
  Approvals,
  ChoiceNode,
  Day,
  EditPatch,
  Graph,
  Scene,
  Screen,
} from "../src/types";
import { computeHealth } from "../src/lib/health";

function screen(id: string, over: Partial<Screen> = {}): Screen {
  return {
    screen_id: id,
    location: "town",
    name: id,
    status: "start",
    gates: [],
    connects_to: [],
    ink_address: id,
    ...over,
  };
}

function graph(over: Partial<Graph> = {}): Graph {
  return { screens: [], seams: [], scenes: [], variables: [], ...over };
}

describe("computeHealth — reachability", () => {
  it("floods undirected over connects_to from start screens", () => {
    const g = graph({
      screens: [
        screen("T1", { status: "start", connects_to: ["T2", "F1"] }),
        screen("T2", { status: "reachable(g)", connects_to: ["T1"] }),
        screen("F1", { status: "locked(g)", connects_to: ["T1"] }), // gated but connected
        screen("X9", { status: "locked(g)", connects_to: [] }), // island
      ],
    });
    const h = computeHealth(g, null, {}, []);
    expect(h.reachable.sort()).toEqual(["F1", "T1", "T2"]);
    expect(h.unreachable).toEqual(["X9"]);
  });
});

describe("computeHealth — errors", () => {
  it("flags a dangling divert", () => {
    const ch: ChoiceNode = {
      choice_id: "CH-1",
      scene_id: "SC-1",
      availability_conditions: [],
      equal_weight_note: "n",
      no_accrual_note: "n",
      options: [
        {
          option_id: "OPT-1",
          verb_family: "ease",
          player_verb: "ease",
          response_slots: [],
          state_actions: [],
          rejoin: "divert",
          divert_to: "SC-NOWHERE",
        },
      ],
    };
    const scene: Scene = {
      scene_id: "SC-1",
      soul: "Toby",
      screen_id: "T2",
      ink_address: "SC-1",
      lines: [],
      choice_nodes: [ch],
    };
    const g = graph({ screens: [screen("T2")], scenes: [scene] });
    const h = computeHealth(g, { T2: "images/t2.jpg" }, {}, []);
    expect(h.errors.some((e) => e.includes("dangling divert"))).toBe(true);
  });

  it("does not flag a divert that targets a real choice_id (resolver field-name boundary)", () => {
    // Regression for the divert_to/divert_target field-name mismatch: the resolver's
    // graph.json (resolver/src/types.ts:141) emits `divert_to` pointing at the target
    // node's choice_id. If lantern reads the wrong field this always shows dangling.
    const target: ChoiceNode = {
      choice_id: "CH-TARGET",
      scene_id: "SC-1",
      availability_conditions: [],
      equal_weight_note: "n",
      no_accrual_note: "n",
      options: [],
    };
    const ch: ChoiceNode = {
      choice_id: "CH-1",
      scene_id: "SC-1",
      availability_conditions: [],
      equal_weight_note: "n",
      no_accrual_note: "n",
      options: [
        {
          option_id: "OPT-1",
          verb_family: "ease",
          player_verb: "ease",
          response_slots: [],
          state_actions: [],
          rejoin: "divert",
          divert_to: "CH-TARGET",
        },
      ],
    };
    const scene: Scene = {
      scene_id: "SC-1",
      soul: "Toby",
      screen_id: "T2",
      ink_address: "SC-1",
      lines: [],
      choice_nodes: [ch, target],
    };
    const g = graph({ screens: [screen("T2")], scenes: [scene] });
    const h = computeHealth(g, { T2: "images/t2.jpg" }, {}, []);
    expect(h.errors.some((e) => e.includes("dangling divert"))).toBe(false);
  });

  it("flags a missing region ref on an examinable", () => {
    const g = graph({
      screens: [
        screen("T1", {
          examinables: [{ id: "ex_board", clue_tier: "1", region: "r_board" }],
          regions: [{ region_id: "r_other", shape: { rect: {} } }],
        }),
      ],
    });
    const h = computeHealth(g, { T1: "x" }, {}, []);
    expect(h.errors.some((e) => e.includes("missing region r_board"))).toBe(true);
  });

  it("flags an orphaned edit but accepts a resolvable <id>.<field> target", () => {
    const scene: Scene = {
      scene_id: "SC-1",
      soul: "Toby",
      screen_id: "T2",
      ink_address: "SC-1",
      lines: [
        { content_id: "L-SC-1-01", slot_type: "dialogue", speaker_id: "Toby", text: "hi" },
      ],
      choice_nodes: [],
    };
    const g = graph({ screens: [screen("T2")], scenes: [scene] });
    const edits: EditPatch[] = [
      { target: "L-SC-1-01", old_text: "hi", new_text: "hey", timestamp: "2026-01-01" },
      { target: "T2.vibe", old_text: "a", new_text: "b", timestamp: "2026-01-01" },
      { target: "GHOST-99", old_text: "x", new_text: "y", timestamp: "2026-01-01" },
    ];
    const h = computeHealth(g, { T2: "x" }, {}, edits);
    const orphans = h.errors.filter((e) => e.startsWith("orphaned edit"));
    expect(orphans).toEqual(["orphaned edit: GHOST-99"]);
  });
});

describe("computeHealth — warnings (aggregated)", () => {
  it("aggregates null shapes, missing images, and pending review", () => {
    const g = graph({
      screens: [
        screen("T1", {
          regions: [
            { region_id: "a", shape: null },
            { region_id: "b", shape: null },
          ],
        }),
        screen("T2"),
      ],
    });
    // manifest covers only T1 -> T2 missing an image; approvals empty -> all pending
    const approvals: Approvals = {};
    const h = computeHealth(g, { T1: "images/t1.jpg" }, approvals, []);
    expect(h.warnings.some((w) => w.includes("2 regions with no shape"))).toBe(true);
    expect(h.warnings.some((w) => w.includes("1 screen without an image"))).toBe(true);
    expect(h.warnings.some((w) => w.includes("pending review"))).toBe(true);
  });

  it("is quiet when everything is complete", () => {
    const g = graph({ screens: [screen("T1")] });
    const approvals: Approvals = {
      T1: { status: "approved", timestamp: "2026-01-01" },
    };
    const day = {
      seed: 1,
      day: 1,
      slot_fill: [{ screen_id: "T1", time_block: "morning", soul: "toby" }],
      item_rolls: [],
      live_leads: [],
      aliveness_band: "quiet",
    } as unknown as Day;
    const h = computeHealth(g, { T1: "images/t1.jpg" }, approvals, [], day);
    expect(h.warnings).toEqual([]);
    expect(h.errors).toEqual([]);
  });

  // A run folder built with `resolver build` alone has no day.json, and the
  // result reads as a broken tool rather than an incomplete folder: nobody
  // stands anywhere and every npc_present() gate fails, so scenes open with no
  // options. Both symptoms were reported as bugs before this warning existed.
  it("warns when the run has no day.json, and names the command that makes one", () => {
    const g = graph({ screens: [screen("T1")] });
    const h = computeHealth(g, { T1: "images/t1.jpg" }, {}, [], null);
    const w = h.warnings.find((x) => x.includes("no day.json"));
    expect(w).toBeTruthy();
    expect(w).toMatch(/npc_present\(\) gates cannot pass/);
    expect(w).toMatch(/resolve-day/);
  });

  it("warns when day.json places nobody", () => {
    const g = graph({ screens: [screen("T1")] });
    const empty = {
      seed: 1,
      day: 1,
      slot_fill: [],
      item_rolls: [],
      live_leads: [],
      aliveness_band: "quiet",
    } as unknown as Day;
    const h = computeHealth(g, { T1: "images/t1.jpg" }, {}, [], empty);
    expect(h.warnings.some((x) => x.includes("places nobody"))).toBe(true);
  });
});

// W2 — HEALTH surfaces unreachable CONTENT, not just unreachable screens.
// The screen flood says nothing about whether a scene can ever open, and a
// scene gated past the end of a life is invisible in every other view.
describe("health: unreachable content", () => {
  const scene = (id: string, conditions: string[]) => ({
    scene_id: id,
    soul: "toby",
    screen_id: "T1",
    ink_address: `toby.${id}`,
    lines: [],
    choice_nodes: [
      {
        choice_id: `CH-${id}`,
        scene_id: id,
        availability_conditions: conditions,
        equal_weight_note: "n",
        no_accrual_note: "n",
        options: [],
      },
    ],
  });

  const graphWith = (scenes: ReturnType<typeof scene>[]) => ({
    screens: [
      {
        screen_id: "T1",
        location: "town" as const,
        name: "Square",
        status: "start",
        gates: [],
        connects_to: [],
        ink_address: "t1",
      },
    ],
    seams: [],
    scenes,
    variables: [],
    day_loop: { moves_per_day: 3, days_per_life: 5 },
  });

  it("names a scene whose day floor is past the end of a life", () => {
    const h = computeHealth(graphWith([scene("SC-LATE", ["day >= 9"])]), null, {}, []);
    expect(h.errors.some((e) => e.includes("SC-LATE") && e.includes("never open"))).toBe(true);
  });

  it("does not flag a scene that opens inside the life", () => {
    const h = computeHealth(graphWith([scene("SC-OK", ["day >= 4"])]), null, {}, []);
    expect(h.errors.some((e) => e.includes("SC-OK"))).toBe(false);
  });

  it("warns when a band-gated scene covers only some bands", () => {
    const h = computeHealth(
      graphWith([
        {
          ...scene("SC-PARTIAL", ["bond_band(toby) = low"]),
          choice_nodes: [
            { ...scene("SC-PARTIAL", ["bond_band(toby) = low"]).choice_nodes[0], choice_id: "A" },
            { ...scene("SC-PARTIAL", ["bond_band(toby) = mid"]).choice_nodes[0], choice_id: "B" },
          ],
        },
      ]),
      null,
      {},
      []
    );
    expect(h.warnings.some((w) => w.includes("SC-PARTIAL") && w.includes("falls through"))).toBe(true);
  });

  it("stays quiet when all three bands are covered", () => {
    const nodes = ["low", "mid", "high"].map((b, i) => ({
      ...scene("SC-FULL", [`bond_band(toby) = ${b}`]).choice_nodes[0],
      choice_id: `N${i}`,
    }));
    const h = computeHealth(
      graphWith([{ ...scene("SC-FULL", []), choice_nodes: nodes }]),
      null,
      {},
      []
    );
    expect(h.warnings.some((w) => w.includes("SC-FULL"))).toBe(false);
  });
});
