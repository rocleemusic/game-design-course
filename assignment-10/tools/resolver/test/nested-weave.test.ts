// The nesting proof: a sub-conversation that plays INSIDE one option.
//
// Ratified 2026-08-01, extending choice-node-schema.md v1, which refused branch
// structure inside an option. The refusal existed to keep QA's walk linear in
// choice count; nesting makes it multiplicative, so the cost is real and the
// tests below pin the shape that pays for it.
//
// These build on the fixture set rather than a hand-written ink string on
// purpose: the thing worth proving is that the EMITTER produces compiling ink
// from authored data, not that ink can nest.

import { test } from "node:test";
import assert from "node:assert/strict";
import { loadData } from "../src/data.ts";
import { buildGraph, MAX_NESTING } from "../src/graph.ts";
import { emitInk } from "../src/ink.ts";
import { compileInkFiles } from "./helpers/compile.ts";
import type { ResolverData, ChoiceNode, ContentLine } from "../src/types.ts";

/**
 * The fixture scene (SC-T2-01 / CH-T2-01) with a sub-conversation hung off its
 * first option: a 3-option node, a beat, a 2-option node, a closing beat.
 * The same shape SC-T4-02 uses in the live data.
 */
function withNesting(): ResolverData {
  const data = structuredClone(loadData()) as ResolverData;
  const scene = data.sceneGraph.scenes[0];
  const parent = scene.choice_nodes[0];
  const parentOption = parent.options[0].option_id;

  const lines: ContentLine[] = [
    { content_id: "L-SUB1-a-p", slot_type: "player_line", speaker_id: "player", text: "First sub option.", choice_id: "CH-SUB-1", option_id: "CH-SUB-1-a" },
    { content_id: "L-SUB1-a-r", slot_type: "dialogue", speaker_id: scene.soul, text: "Answer to the first.", choice_id: "CH-SUB-1", option_id: "CH-SUB-1-a" },
    { content_id: "L-SUB1-b-r", slot_type: "dialogue", speaker_id: scene.soul, text: "Answer to the second.", choice_id: "CH-SUB-1", option_id: "CH-SUB-1-b" },
    { content_id: "L-SUB1-c-r", slot_type: "dialogue", speaker_id: scene.soul, text: "Answer to the third.", choice_id: "CH-SUB-1", option_id: "CH-SUB-1-c" },
    { content_id: "L-SUB1-GB", slot_type: "dialogue", speaker_id: scene.soul, text: "The middle beat, after three paths converge.", choice_id: "CH-SUB-1" },
    { content_id: "L-SUB2-a-r", slot_type: "dialogue", speaker_id: scene.soul, text: "Answer inside the inner choice.", choice_id: "CH-SUB-2", option_id: "CH-SUB-2-a" },
    { content_id: "L-SUB2-b-r", slot_type: "dialogue", speaker_id: scene.soul, text: "The other inner answer.", choice_id: "CH-SUB-2", option_id: "CH-SUB-2-b" },
    { content_id: "L-SUB2-GB", slot_type: "dialogue", speaker_id: scene.soul, text: "The closing beat, where every path in the option lands.", choice_id: "CH-SUB-2" },
  ];
  scene.lines.push(...lines);

  const sub1: ChoiceNode = {
    choice_id: "CH-SUB-1",
    scene_id: scene.scene_id,
    parent_option: parentOption,
    gather_line: "L-SUB1-GB",
    availability_conditions: [],
    equal_weight_note: "Each costs something different.",
    no_accrual_note: "No counter keys off any pick.",
    options: [
      { option_id: "CH-SUB-1-a", verb_family: "Converse", player_verb: "witness", player_line: "L-SUB1-a-p", response_slots: ["L-SUB1-a-r"], state_actions: [], rejoin: "gather" },
      { option_id: "CH-SUB-1-b", verb_family: "Use", player_verb: "sit-with", surface_action: "take the second path", response_slots: ["L-SUB1-b-r"], state_actions: [], rejoin: "gather" },
      { option_id: "CH-SUB-1-c", verb_family: "Use", player_verb: "ease", surface_action: "take the third path", response_slots: ["L-SUB1-c-r"], state_actions: [], rejoin: "gather" },
    ],
  };
  const sub2: ChoiceNode = {
    choice_id: "CH-SUB-2",
    scene_id: scene.scene_id,
    parent_option: parentOption,
    gather_line: "L-SUB2-GB",
    availability_conditions: [],
    equal_weight_note: "Neither is the right read.",
    no_accrual_note: "No counter keys off either pick.",
    options: [
      { option_id: "CH-SUB-2-a", verb_family: "Use", player_verb: "ease", surface_action: "close it out", response_slots: ["L-SUB2-a-r"], state_actions: [], rejoin: "gather" },
      { option_id: "CH-SUB-2-b", verb_family: "Use", player_verb: "sit-with", surface_action: "leave it open", response_slots: ["L-SUB2-b-r"], state_actions: [], rejoin: "gather" },
    ],
  };
  scene.choice_nodes.push(sub1, sub2);
  return data;
}

test("a sub-node emits inside its option at the next weave level", () => {
  const files = emitInk(buildGraph(withNesting()));
  const toby = files.get("souls/toby.ink")!;
  assert.match(toby, /^\s*\*\* .*#opt:CH-SUB-1-a/m, "sub options are ** not *");
  assert.match(toby, /^\s*-- \(g_ch_sub_1\)/m, "the middle gather is -- not -");
  // The parent's own gather stays at depth 1.
  assert.match(toby, /^- \(g_ch_t2_01\)/m);
});

test("the LAST sub-node gathers at the parent OPTION's label", () => {
  const graph = buildGraph(withNesting());
  const scene = graph.scenes.find((s) => s.scene_id === "SC-T2-01")!;
  const parentOption = scene.choice_nodes[0].options[0].option_id;
  const sub2 = scene.choice_nodes.find((n) => n.choice_id === "CH-SUB-2")!;
  const sub1 = scene.choice_nodes.find((n) => n.choice_id === "CH-SUB-1")!;

  assert.equal(sub2.gather_address, `g_${parentOption.toLowerCase().replace(/[^a-z0-9]/g, "_")}`);
  assert.equal(sub1.gather_address, "g_ch_sub_1", "an intermediate sub-node keeps its own label");

  const files = emitInk(graph);
  assert.match(files.get("souls/toby.ink")!, new RegExp(`-- \\(${sub2.gather_address}\\)`));
});

test("a sub-node is emitted once — inside the option, never also at scene level", () => {
  const files = emitInk(buildGraph(withNesting()));
  const toby = files.get("souls/toby.ink")!;
  const occurrences = toby.split("#opt:CH-SUB-1-a").length - 1;
  assert.equal(occurrences, 1, "the nested beat appears exactly once");
});

test("gather_line is what puts text at a gather; without one the gather carries #placeholder", () => {
  const files = emitInk(buildGraph(withNesting()));
  const toby = files.get("souls/toby.ink")!;
  assert.match(toby, /-- \(g_ch_sub_1\) The middle beat, after three paths converge\./);
  // A node WITHOUT a gather_line keeps its placeholder prose but rides a
  // `#placeholder:1` tag the host suppresses at the VN box (DialogueFeed) —
  // the project-wide keep-prose-tag-suppress strategy. Making the emit
  // tag-only instead shortens the walker's continue-run and shifts which week
  // the reachability search settles on (walk.test.ts), so the prose stays and
  // only the tag hides it. The hole is still reported to authors by
  // `findUnauthoredGathers`. See `emitChoiceNode`.
  assert.match(toby, /^- \(g_ch_t2_01\) Placeholder: the scene continues\. #id:GB-CH-T2-01-GATHER #placeholder:1$/m);
});

test("a gather_line is not mistaken for the node's set-up line", () => {
  const files = emitInk(buildGraph(withNesting()));
  const toby = files.get("souls/toby.ink")!;
  const beat = "The middle beat, after three paths converge.";
  assert.equal(toby.split(beat).length - 1, 1, "the beat prints once, at the gather");
});

test("parent_option must name an option that exists in the scene", () => {
  const data = withNesting();
  data.sceneGraph.scenes[0].choice_nodes.at(-1)!.parent_option = "CH-NOPE-z";
  assert.throws(() => buildGraph(data), /not an option in this scene/);
});

test("a second level is allowed, and emits at *** / ---", () => {
  const data = withNesting();
  // point sub-2 at an option belonging to sub-1, which is itself nested
  data.sceneGraph.scenes[0].choice_nodes.at(-1)!.parent_option = "CH-SUB-1-a";
  const files = emitInk(buildGraph(data));
  const toby = files.get("souls/toby.ink")!;
  assert.match(toby, /^\s*\*\*\* .*#opt:CH-SUB-2-a/m);
  // at depth 2 the last sub-node gathers at ITS option's label, same rule
  assert.match(toby, /^\s*--- \(g_ch_sub_1_a\)/m);
  const { errors, warnings } = compileInkFiles(files);
  assert.deepEqual(errors, [], `compile errors:\n${errors.join("\n")}`);
  assert.deepEqual(warnings, [], `compile warnings:\n${warnings.join("\n")}`);
});

test(`nesting past ${MAX_NESTING} levels is refused`, () => {
  const data = withNesting();
  const scene = data.sceneGraph.scenes[0];
  scene.choice_nodes.at(-1)!.parent_option = "CH-SUB-1-a"; // level 2
  scene.lines.push(
    { content_id: "L-SUB3-a-r", slot_type: "dialogue", speaker_id: scene.soul, text: "Third level.", choice_id: "CH-SUB-3", option_id: "CH-SUB-3-a" },
    { content_id: "L-SUB3-b-r", slot_type: "dialogue", speaker_id: scene.soul, text: "Third level, other.", choice_id: "CH-SUB-3", option_id: "CH-SUB-3-b" },
  );
  scene.choice_nodes.push({
    choice_id: "CH-SUB-3",
    scene_id: scene.scene_id,
    parent_option: "CH-SUB-2-a", // which now sits at level 2 -> this is level 3
    availability_conditions: [],
    equal_weight_note: "note",
    no_accrual_note: "note",
    options: [
      { option_id: "CH-SUB-3-a", surface_action: "deeper", response_slots: ["L-SUB3-a-r"], state_actions: [], rejoin: "gather" },
      { option_id: "CH-SUB-3-b", surface_action: "deeper still", response_slots: ["L-SUB3-b-r"], state_actions: [], rejoin: "gather" },
    ],
  });
  assert.throws(() => buildGraph(data), /nests 3 levels deep; the limit is 2/);
});

test("a parent_option cycle is reported, not looped on", () => {
  const data = withNesting();
  const scene = data.sceneGraph.scenes[0];
  // sub-1 inside sub-2's option, sub-2 inside sub-1's option
  scene.choice_nodes.find((n) => n.choice_id === "CH-SUB-1")!.parent_option = "CH-SUB-2-a";
  scene.choice_nodes.find((n) => n.choice_id === "CH-SUB-2")!.parent_option = "CH-SUB-1-a";
  assert.throws(() => buildGraph(data), /cycle|levels deep/);
});

test("an option cannot both divert and carry a sub-conversation", () => {
  const data = withNesting();
  const parent = data.sceneGraph.scenes[0].choice_nodes[0];
  parent.options[0].rejoin = "divert";
  parent.options[0].divert_to = "CH-T2-01";
  assert.throws(() => emitInk(buildGraph(data)), /could never play/);
});

test("MUST COMPILE: the nested weave compiles with zero errors and zero warnings", () => {
  const files = emitInk(buildGraph(withNesting()));
  const { story, errors, warnings } = compileInkFiles(files);
  assert.deepEqual(errors, [], `compile errors:\n${errors.join("\n")}`);
  assert.deepEqual(warnings, [], `compile warnings:\n${warnings.join("\n")}`);
  assert.ok(story);
});

test("PLAY-PROOF: the sub-conversation only plays inside its own option, and every path converges", () => {
  const { story } = compileInkFiles(emitInk(buildGraph(withNesting())));
  assert.ok(story);
  story!.Continue();
  story!.variablesState.$("present_toby", "T2");
  story!.ChoosePathString("toby.sc_t2_01");
  while (story!.canContinue) story!.Continue();

  // The OTHER option must not see the sub-conversation at all: that is the
  // whole difference between nesting and the gated-siblings shape it replaced.
  assert.equal(story!.currentChoices.length, 2);
  story!.ChooseChoiceIndex(1);
  let other = "";
  while (story!.canContinue) other += story!.Continue();
  assert.doesNotMatch(other, /middle beat/, "option b never enters the sub-conversation");

  // Walk the nested option, taking each of the three sub-options in turn.
  for (const pick of [0, 1, 2]) {
    const { story: s } = compileInkFiles(emitInk(buildGraph(withNesting())));
    s!.Continue();
    s!.variablesState.$("present_toby", "T2");
    s!.ChoosePathString("toby.sc_t2_01");
    while (s!.canContinue) s!.Continue();
    s!.ChooseChoiceIndex(0);
    let text = "";
    while (s!.canContinue) text += s!.Continue();

    assert.equal(s!.currentChoices.length, 3, `sub-choice offers 3 options (pick ${pick})`);
    s!.ChooseChoiceIndex(pick);
    while (s!.canContinue) text += s!.Continue();
    assert.match(text, /middle beat/, `path ${pick} reaches the middle gather`);

    assert.equal(s!.currentChoices.length, 2, `the inner choice offers 2 options (pick ${pick})`);
    s!.ChooseChoiceIndex(pick % 2);
    while (s!.canContinue) text += s!.Continue();
    assert.match(text, /closing beat/, `path ${pick} converges at the option's gather`);
    // Falling through to the PARENT gather is asserted by what happens after
    // it, not by anything it says: the parent node has no `gather_line`, and an
    // unauthored gather has printed nothing since 2026-09-01. The scene's
    // completion flag is set immediately past that gather, so it is true only
    // on a path that actually got there.
    assert.equal(
      s!.variablesState.$("completed_sc_t2_01"),
      true,
      `path ${pick} falls through to the parent gather and out of the scene`,
    );
  }
});
