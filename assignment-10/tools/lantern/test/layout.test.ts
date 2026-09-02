import { describe, expect, it } from "vitest";
import {
  constellationLayout,
  levelLayout,
  levelRows,
  lockGateIds,
  treeLayout,
} from "../src/lib/levelLayout";
import { buildSceneModel, layoutSceneGraph } from "../src/lib/sceneGraph";
import type { Graph, Screen } from "../src/types";
import graphFixture from "../fixtures-review/graph.json";

const graph = graphFixture as unknown as Graph;

/** minimal screen — only the fields the layout reads carry meaning */
function screen(
  id: string,
  location: Screen["location"],
  connects: string[],
  status = "reachable"
): Screen {
  return {
    screen_id: id,
    location,
    name: id,
    status,
    gates: [],
    connects_to: connects,
    ink_address: id,
  };
}

function graphOf(screens: Screen[]): Graph {
  return { screens, scenes: [], seams: [], variables: [] } as unknown as Graph;
}

/** distance between two placed nodes */
function gap(nodes: ReturnType<typeof constellationLayout>, a: string, b: string) {
  const pa = nodes.find((n) => n.id === a)!.position;
  const pb = nodes.find((n) => n.id === b)!.position;
  return Math.hypot(pa.x - pb.x, pa.y - pb.y);
}

describe("levelLayout (spatial, no flow axis)", () => {
  const { nodes, edges } = levelLayout(graph);

  it("places every town screen left of every forest screen", () => {
    const townX = nodes.filter((n) => n.screen.location === "town").map((n) => n.position.x);
    const forestX = nodes
      .filter((n) => n.screen.location === "forest")
      .map((n) => n.position.x);
    expect(Math.max(...townX)).toBeLessThan(Math.min(...forestX));
  });

  it("carries the seam name on the T1–F1 edge and dedupes connections", () => {
    const seam = edges.find((e) => e.seamName);
    expect(seam?.seamName).toBe("forest_path");
    const t1t2 = edges.filter(
      (e) => [e.source, e.target].sort().join("-") === "T1-T2"
    );
    expect(t1t2).toHaveLength(1);
  });
});

describe("constellationLayout", () => {
  // the real out-calib town: T1 is the hub, T4/T5/T8 sit one hop further out
  const town = graphOf([
    screen("T1", "town", ["T2", "T3"], "start"),
    screen("T2", "town", ["T4"]),
    screen("T3", "town", ["T5", "T8"]),
    screen("T4", "town", []),
    screen("T5", "town", []),
    screen("T8", "town", []),
    screen("T6", "town", ["T1"]),
    screen("T7", "town", ["T1"]),
  ]);

  it("centres a cluster on its entrance — the screen you arrive through", () => {
    // F5 is the best-connected forest screen, but F1 is the one town reaches
    const world = graphOf([
      screen("T1", "town", ["T2", "F1"], "start"),
      screen("T2", "town", []),
      screen("F1", "forest", ["T1", "F3"]),
      screen("F3", "forest", ["F5"]),
      screen("F5", "forest", ["F6", "F7", "F8"]),
      screen("F6", "forest", []),
      screen("F7", "forest", []),
      screen("F8", "forest", []),
    ]);
    const nodes = constellationLayout(world);
    // Rings measured from F1 climb one gap at a time: F3 is one hop out, F5
    // two, F6 three. Centred on F5 instead, F3 would sit 308 from F1, not 380.
    expect(Math.round(gap(nodes, "F1", "F3"))).toBe(380);
    expect(Math.round(gap(nodes, "F1", "F5"))).toBe(688);
    expect(Math.round(gap(nodes, "F1", "F6"))).toBe(996);
    expect(nodes.find((n) => n.id === "F1")!.position.y).toBe(0);
  });

  it("reads an entrance from either side of the seam", () => {
    // only town records the crossing; forest still knows F1 is its way in
    const oneSided = graphOf([
      screen("T1", "town", ["F1"], "start"),
      screen("F1", "forest", ["F3"]),
      screen("F3", "forest", ["F5"]),
      screen("F5", "forest", ["F6", "F7"]),
      screen("F6", "forest", []),
      screen("F7", "forest", []),
    ]);
    const nodes = constellationLayout(oneSided);
    expect(Math.round(gap(nodes, "F1", "F3"))).toBe(380); // one ring out
    expect(nodes.find((n) => n.id === "F1")!.position.y).toBe(0);
  });

  it("falls back to the best-connected screen when nothing enters the cluster", () => {
    const nodes = constellationLayout(town); // town-only graph, no seams
    expect(nodes.find((n) => n.id === "T1")!.position).toEqual({ x: 0, y: 0 });
  });

  it("places one ring at one radius — distance means hops, not order", () => {
    const nodes = constellationLayout(town);
    // T2, T3, T6, T7 are all one hop from T1
    const r = ["T2", "T3", "T6", "T7"].map((id) => Math.round(gap(nodes, "T1", id)));
    expect(new Set(r).size).toBe(1);
    // T4, T5, T8 are two hops, and sit strictly further out
    const outer = ["T4", "T5", "T8"].map((id) => Math.round(gap(nodes, "T1", id)));
    expect(new Set(outer).size).toBe(1);
    expect(outer[0]).toBeGreaterThan(r[0]);
  });

  it("never overlaps two cards, however crowded the ring", () => {
    // twelve screens all one hop from the hub: the ring must widen to fit them
    const spokes = Array.from({ length: 12 }, (_, i) => `S${i}`);
    const wide = graphOf([
      screen("HUB", "town", spokes, "start"),
      ...spokes.map((s) => screen(s, "town", [])),
    ]);
    const nodes = constellationLayout(wide);
    for (let i = 0; i < spokes.length; i++) {
      for (let j = i + 1; j < spokes.length; j++) {
        expect(gap(nodes, spokes[i], spokes[j])).toBeGreaterThanOrEqual(260);
      }
    }
  });

  it("keeps clusters clear of each other", () => {
    const both = graphOf([
      screen("T1", "town", ["T2", "F1"], "start"),
      screen("T2", "town", []),
      screen("F1", "forest", ["F2", "F3"]),
      screen("F2", "forest", []),
      screen("F3", "forest", []),
    ]);
    const nodes = constellationLayout(both);
    const townX = nodes.filter((n) => n.screen.location === "town").map((n) => n.position.x);
    const forestX = nodes
      .filter((n) => n.screen.location === "forest")
      .map((n) => n.position.x);
    expect(Math.max(...townX)).toBeLessThan(Math.min(...forestX));
  });

  it("still places a screen the hub cannot reach", () => {
    const island = graphOf([
      screen("T1", "town", ["T2"], "start"),
      screen("T2", "town", []),
      screen("T9", "town", []), // connected to nothing
    ]);
    const nodes = constellationLayout(island);
    expect(nodes).toHaveLength(3);
    // parked beyond the last real ring, not stacked on the hub
    expect(gap(nodes, "T1", "T9")).toBeGreaterThan(gap(nodes, "T1", "T2"));
  });

  it("breaks a degree tie towards the start screen", () => {
    const tied = graphOf([
      screen("A", "town", ["B"]),
      screen("B", "town", [], "start"),
    ]);
    // both have degree 1; the start screen takes the centre
    expect(constellationLayout(tied).find((n) => n.id === "B")!.position).toEqual({
      x: 0,
      y: 0,
    });
  });

  it("is deterministic — same graph in, same positions out", () => {
    expect(constellationLayout(town)).toEqual(constellationLayout(town));
  });
});

describe("treeLayout", () => {
  // the real out-calib shape: two clusters joined at the T1–F1 seam
  const world = graphOf([
    screen("T1", "town", ["T2", "T3", "F1"], "start"),
    screen("T2", "town", ["T4"]),
    screen("T3", "town", ["T5"]),
    screen("T4", "town", []),
    screen("T5", "town", []),
    screen("F1", "forest", ["F2"]),
    screen("F2", "forest", []),
  ]);
  const at = (nodes: ReturnType<typeof treeLayout>, id: string) =>
    nodes.find((n) => n.id === id)!.position;

  it("ranks x by hops from the start screen, seams included", () => {
    const n = treeLayout(world);
    expect(at(n, "T1").x).toBe(0);
    // one hop: T2, T3 and F1 — the seam is just another edge here
    expect(at(n, "T2").x).toBe(at(n, "T3").x);
    expect(at(n, "F1").x).toBe(at(n, "T2").x);
    expect(at(n, "T1").x).toBeLessThan(at(n, "T2").x);
    // two hops
    expect(at(n, "T4").x).toBeGreaterThan(at(n, "T2").x);
    expect(at(n, "F2").x).toBe(at(n, "T4").x);
  });

  it("centres a parent on its children", () => {
    const n = treeLayout(world);
    const kids = [at(n, "T2").y, at(n, "T3").y, at(n, "F1").y];
    expect(at(n, "T1").y).toBeCloseTo((Math.min(...kids) + Math.max(...kids)) / 2, 0);
    // a single child sits level with its parent
    expect(at(n, "T2").y).toBe(at(n, "T4").y);
  });

  it("gives every leaf its own row", () => {
    const n = treeLayout(world);
    const leafYs = ["T4", "T5", "F2"].map((id) => at(n, id).y);
    expect(new Set(leafYs).size).toBe(3);
  });

  it("roots a second tree when part of the run is unreachable", () => {
    const split = graphOf([
      screen("T1", "town", ["T2"], "start"),
      screen("T2", "town", []),
      screen("X1", "town", ["X2"]),
      screen("X2", "town", []),
    ]);
    const n = treeLayout(split);
    expect(n).toHaveLength(4);
    expect(at(n, "X1").x).toBe(0); // its own root
    expect(at(n, "X1").y).toBeGreaterThan(at(n, "T1").y); // below the first tree
  });

  it("falls back to the best-connected screen when no start is marked", () => {
    const noStart = graphOf([
      screen("A", "town", []),
      screen("B", "town", ["A", "C"]),
      screen("C", "town", []),
    ]);
    expect(at(treeLayout(noStart), "B").x).toBe(0);
  });

  it("lays out an empty run without throwing", () => {
    expect(treeLayout(graphOf([]))).toEqual([]);
  });

  it("is picked by levelLayout's mode, and differs from constellation", () => {
    const tree = levelLayout(world, "tree").nodes;
    const stars = levelLayout(world, "constellation").nodes;
    expect(levelLayout(world).nodes).toEqual(stars); // constellation is the default
    expect(tree).not.toEqual(stars);
    // both place every screen exactly once, and share one set of edges
    expect(tree.map((n) => n.id).sort()).toEqual(stars.map((n) => n.id).sort());
    expect(levelLayout(world, "tree").edges).toEqual(
      levelLayout(world, "constellation").edges
    );
  });
});

describe("levelRows (the list mode)", () => {
  it("clusters by the location's first appearance, then sorts by id", () => {
    const townFirst = graphOf([
      screen("T3", "town", []),
      screen("F2", "forest", []),
      screen("F1", "forest", ["F2"]),
      screen("T1", "town", ["T3"], "start"),
    ]);
    expect(levelRows(townFirst).map((r) => r.id)).toEqual(["T1", "T3", "F1", "F2"]);

    // same screens, forest seen first — the clusters swap, ids still sort
    const forestFirst = graphOf([
      screen("F2", "forest", []),
      screen("T3", "town", []),
      screen("F1", "forest", ["F2"]),
      screen("T1", "town", ["T3"], "start"),
    ]);
    expect(levelRows(forestFirst).map((r) => r.id)).toEqual(["F1", "F2", "T1", "T3"]);
  });

  it("reads the gate off a locked screen's status", () => {
    const locked: Screen = {
      ...screen("F1", "forest", [], "locked(G-F1-fernpath)"),
      gates: [{ gate_id: "G-F1-fernpath", archetype: "Knowledge" }],
    };
    const [row] = levelRows(graphOf([locked]));
    expect(row.locked).toBe(true);
    expect(row.gate).toBe("Knowledge · G-F1-fernpath");
  });

  it("falls back to the bare gate id when the gate is not declared", () => {
    // F6/F7/F8 cascade off F5's gate, so the key is not restated on the screen
    const [row] = levelRows(graphOf([screen("F7", "forest", [], "locked(G-F7-cave)")]));
    expect(row.gate).toBe("G-F7-cave");
  });

  it("shows the id alone when a gate has no archetype yet", () => {
    // Defensive: no shipped screen has a null archetype since the five verb
    // intros were typed Demo and T7's access lock was removed (ruled
    // 2026-07-30), but a fresh transcription can still land here.
    const noArchetype: Screen = {
      ...screen("T9", "town", [], "locked(G-T9-draft)"),
      gates: [{ gate_id: "G-T9-draft" } as Screen["gates"][number]],
    };
    expect(levelRows(graphOf([noArchetype]))[0].gate).toBe("G-T9-draft");
  });

  it("labels both keys of a two-key lock, resolved or not", () => {
    // F7 The Cave is the real case: locked(a, b) is a conjunction, both keys
    // required (schema C1, ruled 2026-07-30). The cascade key belongs to F5,
    // so it stays a bare id while F7's own light key resolves to its archetype.
    const twoKey: Screen = {
      ...screen("F7", "forest", [], "locked(G-F5-cascade, G-F7-light)"),
      gates: [{ gate_id: "G-F7-light", archetype: "Knowledge" }],
    };
    const [row] = levelRows(graphOf([twoKey]));
    expect(row.locked).toBe(true);
    expect(row.gate).toBe("G-F5-cascade + Knowledge · G-F7-light");
  });

  it("lockGateIds: splits a conjunction, and returns nothing for an open screen", () => {
    expect(lockGateIds("locked(G-F5-cascade, G-F7-light)")).toEqual([
      "G-F5-cascade",
      "G-F7-light",
    ]);
    expect(lockGateIds("locked(G-T5-trust)")).toEqual(["G-T5-trust"]);
    // "not locked" and "no keys" are the same answer, so callers need no branch
    expect(lockGateIds("start")).toEqual([]);
    expect(lockGateIds("reachable(G-T8-cipher)")).toEqual([]);
  });

  it("marks an unlocked screen as such and keeps its neighbours", () => {
    const [row] = levelRows(graphOf([screen("T1", "town", ["T2", "T3"], "start")]));
    expect(row.locked).toBe(false);
    expect(row.gate).toBeNull();
    expect(row.neighbours).toEqual(["T2", "T3"]);
  });

  it("covers screens the scene rail never shows", () => {
    // the rail lists only screens holding dialogue; the list holds all 16
    expect(levelRows(graph)).toHaveLength(graph.screens.length);
  });
});

describe("buildSceneModel (topology only, no layout)", () => {
  const scene = graph.scenes[0];
  const model = buildSceneModel(scene);
  const byId = new Map(model.nodes.map((n) => [n.id, n]));

  it("builds spine -> choice -> options -> responses -> gather", () => {
    const ids = model.nodes.map((n) => n.id);
    expect(ids).toContain("CL-T2-01-01");
    expect(ids).toContain("CH-T2-04");
    expect(ids).toContain("CH-T2-04-a");
    expect(ids).toContain("CH-T2-04-b");
    expect(ids).toContain("g_CH-T2-04");

    const spineEdge = model.edges.find(
      (e) => e.source === "CL-T2-01-02" && e.target === "CH-T2-04"
    );
    expect(spineEdge).toBeTruthy();
    expect(
      model.edges.find((e) => e.source === "CH-T2-04-a" && e.target === "CL-T2-01-04")
    ).toBeTruthy();
    expect(
      model.edges.find((e) => e.source === "CL-T2-01-04" && e.target === "g_CH-T2-04")
    ).toBeTruthy();
  });

  it("carries no position or size — those are layout's job, from measured input", () => {
    const choice = byId.get("CH-T2-04")! as unknown as Record<string, unknown>;
    expect(choice.position).toBeUndefined();
    expect(choice.width).toBeUndefined();
    expect(choice.height).toBeUndefined();
  });

  it("renders availability_conditions as gate chips on the choice node", () => {
    const choice = byId.get("CH-T2-04")!;
    const gates = choice.data.chips ?? [];
    // the fixture choice guards on npc_present + time_of_day
    expect(gates.every((c) => c.startsWith("gate: "))).toBe(true);
    expect(gates.length).toBe(scene.choice_nodes[0].availability_conditions.length);
  });

  /**
   * A choice card renders one bottom handle per option, so the edge to each
   * option has to name that option's handle. Without sourceHandle all N edges
   * leave the same point and the fan-out is unreadable.
   */
  it("names the option's own source handle on each choice -> option edge", () => {
    const options = scene.choice_nodes[0].options.map((o) => o.option_id);
    for (const optionId of options) {
      const edge = model.edges.find(
        (e) => e.source === "CH-T2-04" && e.target === optionId
      )!;
      expect(edge, `no edge to ${optionId}`).toBeTruthy();
      expect(edge.sourceHandle).toBe(optionId);
    }
  });

  it("leaves sourceHandle off every edge that is not a choice's option", () => {
    // the spine, the responses, the rejoins and the bypass all use the card's
    // default handle — naming one would attach them to an option's pin
    for (const e of model.edges) {
      if (e.source === "CH-T2-04" && !e.bypass) continue;
      expect(e.sourceHandle, `${e.id} should not name a handle`).toBeUndefined();
    }
  });

  it("adds a bypass edge from a gated choice to its gather (the fall-through)", () => {
    // the fixture choice is gated, so its beat can be skipped when the gate fails
    const bypass = model.edges.find((e) => e.bypass);
    expect(bypass).toBeTruthy();
    expect(bypass!.source).toBe("CH-T2-04");
    expect(bypass!.target).toBe("g_CH-T2-04");
  });

  it("puts the spoken option's player_line text on the option node", () => {
    const a = byId.get("CH-T2-04-a")!;
    expect(a.data.playerLineText).toBe("Let me carry the trays at least.");
    expect(a.data.playerLineTarget).toBe("CL-T2-01-03");
  });
});

describe("layoutSceneGraph (sizes are an input, direction is a knob)", () => {
  const model = buildSceneModel(graph.scenes[0]);
  // Uniform synthetic sizes: honest input, not a character-count guess.
  const W = 260;
  const H = 100;
  const sizes = new Map(model.nodes.map((n) => [n.id, { width: W, height: H }]));

  const posMap = (dir: "TB" | "LR") => {
    const { nodes } = layoutSceneGraph(model.nodes, model.edges, sizes, { direction: dir });
    return new Map(nodes.map((n) => [n.id, n.position]));
  };

  it("TB: the choice sits above its options; options share a row", () => {
    const p = posMap("TB");
    const choice = p.get("CH-T2-04")!;
    const a = p.get("CH-T2-04-a")!;
    const b = p.get("CH-T2-04-b")!;
    expect(choice.y).toBeLessThan(a.y); // flow descends
    expect(a.y).toBe(b.y); // siblings share a rank
    expect(a.x).not.toBe(b.x); // fanned across the row
  });

  it("TB: sibling options do not overlap horizontally", () => {
    const p = posMap("TB");
    const a = p.get("CH-T2-04-a")!;
    const b = p.get("CH-T2-04-b")!;
    expect(Math.abs(a.x - b.x)).toBeGreaterThanOrEqual(W);
  });

  it("LR still works: depth advances rightward, options stack in a column", () => {
    const p = posMap("LR");
    const choice = p.get("CH-T2-04")!;
    const a = p.get("CH-T2-04-a")!;
    const b = p.get("CH-T2-04-b")!;
    expect(a.x).toBeGreaterThan(choice.x); // flow advances right
    expect(a.x).toBe(b.x); // siblings share a rank
    expect(Math.abs(a.y - b.y)).toBeGreaterThanOrEqual(H); // no vertical overlap
  });
});
