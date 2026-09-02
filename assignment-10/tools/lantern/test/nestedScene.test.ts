// A sub-conversation nested inside one option must draw as living inside that
// option — not as a beat that follows the whole node's gather.
//
// The distinction is the entire point of the 2026-08-01 nesting ratification:
// the shape it replaced WAS "sibling nodes after the gather, gated by a flag",
// and a canvas that draws both the same way cannot tell Roc which one he has.

import { describe, expect, it } from "vitest";
import { buildSceneModel } from "../src/lib/sceneGraph";
import type { ChoiceNode, Line, Scene } from "../src/types";

function line(id: string, choice?: string, option?: string): Line {
  return {
    content_id: id,
    slot_type: option ? "dialogue" : "dialogue",
    speaker_id: "ilsa",
    text: `text for ${id}`,
    ...(choice ? { choice_id: choice } : {}),
    ...(option ? { option_id: option } : {}),
  } as Line;
}

function node(
  id: string,
  optionIds: string[],
  extra: Partial<ChoiceNode> = {}
): ChoiceNode {
  return {
    choice_id: id,
    scene_id: "SC-X-01",
    availability_conditions: [],
    equal_weight_note: "note",
    no_accrual_note: "note",
    options: optionIds.map((o) => ({
      option_id: o,
      surface_action: `do ${o}`,
      response_slots: [`L-${o}-r`],
      state_actions: [],
      rejoin: "gather" as const,
    })),
    ...extra,
  } as ChoiceNode;
}

/** PARENT with options a/b; b carries a 3-option node then a 2-option node. */
function nestedScene(): Scene {
  return {
    scene_id: "SC-X-01",
    soul: "ilsa",
    screen_id: "X",
    ink_address: "ilsa.sc_x_01",
    lines: [
      line("L-SETUP", "PARENT"),
      line("L-PARENT-a-r", "PARENT", "PARENT-a"),
      line("L-PARENT-b-r", "PARENT", "PARENT-b"),
      line("L-SUB1-a-r", "SUB1", "SUB1-a"),
      line("L-SUB1-b-r", "SUB1", "SUB1-b"),
      line("L-SUB1-c-r", "SUB1", "SUB1-c"),
      line("L-SUB1-GB", "SUB1"),
      line("L-SUB2-a-r", "SUB2", "SUB2-a"),
      line("L-SUB2-b-r", "SUB2", "SUB2-b"),
      line("L-SUB2-GB", "SUB2"),
    ],
    choice_nodes: [
      node("PARENT", ["PARENT-a", "PARENT-b"]),
      node("SUB1", ["SUB1-a", "SUB1-b", "SUB1-c"], {
        parent_option: "PARENT-b",
        gather_line: "L-SUB1-GB",
      }),
      node("SUB2", ["SUB2-a", "SUB2-b"], {
        parent_option: "PARENT-b",
        gather_line: "L-SUB2-GB",
      }),
    ],
  } as unknown as Scene;
}

describe("a nested sub-conversation on the scene canvas", () => {
  const model = buildSceneModel(nestedScene());
  const from = (id: string) => model.edges.filter((e) => e.source === id).map((e) => e.target);
  const into = (id: string) => model.edges.filter((e) => e.target === id).map((e) => e.source);

  it("hangs off the carrying option's response, not off the parent gather", () => {
    expect(from("L-PARENT-b-r")).toContain("SUB1");
    expect(from("g_PARENT")).not.toContain("SUB1");
  });

  it("never reaches the sibling option", () => {
    expect(from("L-PARENT-a-r")).toEqual(["g_PARENT"]);
  });

  it("chains sub-nodes through each other, in authored order", () => {
    expect(from("g_SUB1")).toContain("SUB2");
  });

  it("converges, and only then falls through to the parent gather", () => {
    expect(from("g_SUB2")).toEqual(["g_PARENT"]);
    // every path through the 3-option node lands on the same gather
    for (const opt of ["SUB1-a", "SUB1-b", "SUB1-c"]) {
      expect(from(`L-${opt}-r`)).toEqual(["g_SUB1"]);
    }
    expect(into("g_PARENT").sort()).toEqual(["L-PARENT-a-r", "g_SUB2"].sort());
  });

  it("draws each nested node exactly once", () => {
    const ids = model.nodes.map((n) => n.id);
    expect(ids.filter((i) => i === "SUB1")).toHaveLength(1);
    expect(ids.filter((i) => i === "SUB2")).toHaveLength(1);
  });

  it("keeps a gather_line out of the scene's narration spine", () => {
    // it belongs AT the gather; in the spine it would read before every choice
    const lineNodes = model.nodes.filter((n) => n.kind === "line").map((n) => n.id);
    expect(lineNodes).not.toContain("L-SUB1-GB");
    expect(lineNodes).not.toContain("L-SUB2-GB");
    expect(lineNodes).toContain("L-SETUP");
  });

  it("leaves an unnested scene's topology exactly as it was", () => {
    const flat = nestedScene();
    flat.choice_nodes = [flat.choice_nodes[0]];
    flat.lines = flat.lines.slice(0, 3);
    const m = buildSceneModel(flat);
    expect(m.edges.filter((e) => e.target === "g_PARENT").map((e) => e.source).sort()).toEqual([
      "L-PARENT-a-r",
      "L-PARENT-b-r",
    ]);
  });
});
