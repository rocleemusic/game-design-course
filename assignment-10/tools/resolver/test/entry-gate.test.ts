// A scene's entry_gate gates ENTERING the conversation, which the schema had no
// way to say before. Without it every conversation of a thread was offered at
// once, in any order — four `toby-the-shelf` entries on T2, and eleven "Talk to
// Ilsa" entries once T4 was authored.
//
// Entry and content are different jobs, per the thread docs: "Entry gate is the
// previous conversation in this thread completing. Nothing else. Completion
// gates the sequence; knowledge gates the content." So the gate normally carries
// one played() term and the knowledge flags stay on the nodes inside.

import { test } from "node:test";
import assert from "node:assert/strict";
import { buildGraph } from "../src/graph.ts";
import { emitInk } from "../src/ink.ts";
import { findUnsatisfiable, ENTRY_GATE } from "../src/conditions.ts";
import { compileInkFiles } from "./helpers/compile.ts";
import type { ResolverData, Scene } from "../src/types.ts";

/** One conversation with a single ungated node, so entry is the only variable. */
function conversation(sceneId: string, tail: string, entry_gate?: string[]): Scene {
  return {
    scene_id: sceneId,
    soul: "toby",
    screen_id: "T2",
    entry_gate,
    lines: [
      { content_id: `L-${tail}-p`, slot_type: "player_line", speaker_id: "player", text: `player line ${tail}`, choice_id: `CH-${tail}`, option_id: `CH-${tail}-a` },
      { content_id: `L-${tail}-r`, slot_type: "dialogue", speaker_id: "toby", text: `response ${tail}`, choice_id: `CH-${tail}`, option_id: `CH-${tail}-a` },
      { content_id: `L-${tail}-r2`, slot_type: "dialogue", speaker_id: "toby", text: `other response ${tail}`, choice_id: `CH-${tail}`, option_id: `CH-${tail}-b` },
    ],
    choice_nodes: [
      {
        choice_id: `CH-${tail}`,
        scene_id: sceneId,
        availability_conditions: [],
        equal_weight_note: "neither option is the correct read",
        no_accrual_note: "no counter keys off either option",
        options: [
          { option_id: `CH-${tail}-a`, player_line: `L-${tail}-p`, response_slots: [`L-${tail}-r`], state_actions: [], rejoin: "gather" },
          { option_id: `CH-${tail}-b`, surface_action: "wait", response_slots: [`L-${tail}-r2`], state_actions: [], rejoin: "gather" },
        ],
      },
    ],
  };
}

function dataWith(scenes: Scene[]): ResolverData {
  return {
    screens: [
      { screen_id: "T2", location: "town", name: "Market", status: "start", connects_to: [] },
      // emitMain requires FESTIVAL_SCREEN_ID in every graph (home_hub_final
      // diverts to it) — same minimal stand-in as gate-fallback.test.ts.
      { screen_id: "T7", location: "town", name: "Festival Grounds", status: "reachable", connects_to: [] },
    ],
    seams: [],
    roleWorkplace: [],
    sceneGraph: { souls: [{ soul_id: "toby", name: "Toby" }], scenes },
  };
}

// C1 opens freely; C2 waits on C1 having played.
const sequential = dataWith([
  conversation("SC-T2-91", "T2-91"),
  conversation("SC-T2-92", "T2-92", ["played(SC-T2-91)"]),
]);

test("entry_gate survives buildGraph's scene whitelist", () => {
  // The literal in graph.ts names its fields rather than spreading, so a new
  // Scene field that is not added there vanishes with no type error and no
  // warning. That is the failure this asserts against.
  const graph = buildGraph(sequential);
  const c2 = graph.scenes.find((s) => s.scene_id === "SC-T2-92")!;
  assert.deepEqual(c2.entry_gate, ["played(SC-T2-91)"], "entry_gate reached graph.json");
});

test("the hub guards entry on the gate, and an ungated conversation stays ungated", () => {
  const files = emitInk(buildGraph(sequential));
  const t2 = files.get("world/t2.ink")!;
  const lines = t2.split("\n").filter((l) => l.includes("#scene:"));

  const c1 = lines.find((l) => l.includes("SC-T2-91"))!;
  const c2 = lines.find((l) => l.includes("SC-T2-92"))!;

  // A knot name evaluates to its own read count in ink, so played() needs no
  // extra state — the guard reads the scene's address directly.
  assert.match(c2, /toby\.sc_t2_91 > 0/, "C2 waits on C1 having been played");
  assert.doesNotMatch(c1, /> 0/, "C1 carries no entry gate");
});

test("MUST COMPILE, and the gated conversation is not offered until the first one plays", async () => {
  const files = emitInk(buildGraph(sequential));
  const { story, errors, warnings } = compileInkFiles(files);
  assert.deepEqual(errors, [], `compile errors:\n${errors.join("\n")}`);
  assert.deepEqual(warnings, [], `compile warnings:\n${warnings.join("\n")}`);

  story.ContinueMaximally();
  story.variablesState.$("present_toby", "T2");
  story.ChoosePathString("t2.hub");
  story.ContinueMaximally();

  const offered: string[] = story.currentChoices.map((c: { text: string }) => c.text);
  const talk = offered.filter((t: string) => /Talk to Toby/.test(t));
  assert.equal(talk.length, 1, `only the ungated conversation is offered, got: ${JSON.stringify(talk)}`);
  assert.match(talk[0], /SC-T2-91/, "and it is the one with no entry gate");
});

test("a conversation gated on having played itself is caught, not shipped", () => {
  const problems = findUnsatisfiable(
    dataWith([conversation("SC-T2-93", "T2-93", ["played(SC-T2-93)"])]).sceneGraph,
  );
  const self = problems.find((p) => p.scene_id === "SC-T2-93" && p.choice_id === ENTRY_GATE);
  assert.ok(self, "a self-gate is unsatisfiable");
  assert.match(self.reason, /itself/);
  assert.equal(problems.length, 1, "reported once, not also as a one-scene ring");
});

test("two entry gates waiting on each other are caught — neither scene looks wrong alone", () => {
  const problems = findUnsatisfiable(
    dataWith([
      conversation("SC-T2-94", "T2-94", ["played(SC-T2-95)"]),
      conversation("SC-T2-95", "T2-95", ["played(SC-T2-94)"]),
    ]).sceneGraph,
  );
  const ring = problems.filter((p) => /ring/.test(p.reason));
  assert.equal(ring.length, 1, `the pair is reported once, got: ${JSON.stringify(ring)}`);
});

test("played() naming a scene outside the graph fails the build", () => {
  // An archived or renamed scene leaves a gate that can never be true, and a
  // silently-false gate is how content goes quietly unreachable.
  assert.throws(
    () => buildGraph(dataWith([conversation("SC-T2-96", "T2-96", ["played(SC-T2-NOPE)"])])),
    /does not name a scene in this graph/,
  );
});

test("the shipped content's entry gates are satisfiable", async () => {
  const { loadData } = await import("../src/data.ts");
  const data = loadData("data");
  const entryProblems = findUnsatisfiable(data.sceneGraph).filter((p) => p.choice_id === ENTRY_GATE);
  assert.deepEqual(entryProblems, [], `entry-gate problems in real data:\n${JSON.stringify(entryProblems, null, 2)}`);
});
