// The per-path prose proof: a node reached by a divert reads differently from
// the same node reached from the previous gather (ChoiceNode.path_variants).
//
// The defect this closes was live in SC-T2-09: Toby's closing beat had both
// entries authored — "All done. Anything I can get you" on the normal path,
// "Let's see, what's next..." when the player had just named the shelf and he
// changed the subject — but only the normal one was wired to a printed slot,
// so half the authored prose never played.
//
// Like nested-weave.test.ts, these drive the fixture set through the EMITTER
// rather than a hand-written ink string: the thing worth proving is that
// authored data produces the right two readings, not that ink can branch text.

import { test } from "node:test";
import assert from "node:assert/strict";
import { loadData } from "../src/data.ts";
import { buildGraph } from "../src/graph.ts";
import { emitInk } from "../src/ink.ts";
import { compileInkFiles } from "./helpers/compile.ts";
import type { ResolverData, ChoiceNode, ContentLine } from "../src/types.ts";

/**
 * The fixture scene plus a second node (CH-VAR) carrying per-path prose, and a
 * diverting option on the first node that jumps straight to it. Two ways in,
 * one node: fall through CH-T2-01's gather, or take its option b's divert.
 */
function withPathVariants(): ResolverData {
  const data = structuredClone(loadData()) as ResolverData;
  const scene = data.sceneGraph.scenes[0];

  const lines: ContentLine[] = [
    { content_id: "L-VAR-s-norm", slot_type: "dialogue", speaker_id: scene.soul, text: "Set-up on the normal path.", choice_id: "CH-VAR" },
    { content_id: "L-VAR-s-div", slot_type: "dialogue", speaker_id: scene.soul, text: "Set-up after the divert.", choice_id: "CH-VAR" },
    { content_id: "L-VAR-a-r-norm", slot_type: "dialogue", speaker_id: scene.soul, text: "Answer on the normal path.", choice_id: "CH-VAR", option_id: "CH-VAR-a" },
    { content_id: "L-VAR-a-r-div", slot_type: "dialogue", speaker_id: scene.soul, text: "Answer after the divert.", choice_id: "CH-VAR", option_id: "CH-VAR-a" },
    { content_id: "L-VAR-b-p-norm", slot_type: "player_line", speaker_id: "player", text: "Asked on the normal path.", choice_id: "CH-VAR", option_id: "CH-VAR-b" },
    { content_id: "L-VAR-b-p-div", slot_type: "player_line", speaker_id: "player", text: "Asked after the divert.", choice_id: "CH-VAR", option_id: "CH-VAR-b" },
    { content_id: "L-VAR-b-r", slot_type: "dialogue", speaker_id: scene.soul, text: "The same answer either way.", choice_id: "CH-VAR", option_id: "CH-VAR-b" },
  ];
  scene.lines.push(...lines);

  const node: ChoiceNode = {
    choice_id: "CH-VAR",
    scene_id: scene.scene_id,
    availability_conditions: [],
    equal_weight_note: "Each costs the beat; neither ranks above the other.",
    no_accrual_note: "No counter keys off either option.",
    path_variants: {
      "L-VAR-s-norm": "L-VAR-s-div",
      "L-VAR-a-r-norm": "L-VAR-a-r-div",
      "L-VAR-b-p-norm": "L-VAR-b-p-div",
    },
    options: [
      { option_id: "CH-VAR-a", verb_family: "Use", player_verb: "sit-with", surface_action: "lets it stand", response_slots: ["L-VAR-a-r-norm"], state_actions: [], rejoin: "gather" },
      { option_id: "CH-VAR-b", verb_family: "Converse", player_verb: "witness", player_line: "L-VAR-b-p-norm", response_slots: ["L-VAR-b-r"], state_actions: [], rejoin: "gather" },
    ],
  };
  scene.choice_nodes.push(node);

  // Option b of the fixture node now leaves the scene's linear run and jumps
  // to CH-VAR — the second door into the same beat.
  const first = scene.choice_nodes[0];
  first.options[1].rejoin = "divert";
  first.options[1].divert_to = "CH-VAR";
  return data;
}

/** Enter the fixture scene and play up to its first choice point. */
function open() {
  const { story, errors } = compileInkFiles(emitInk(buildGraph(withPathVariants())));
  assert.deepEqual(errors, [], `compile errors:\n${errors.join("\n")}`);
  story!.Continue();
  story!.variablesState.$("present_toby", "T2");
  story!.ChoosePathString("toby.sc_t2_01");
  const seen = drain(story!);
  return { story: story!, seen };
}

/** Continue to the next stop, collecting text and every tag that came with it. */
function drain(story: { canContinue: boolean; Continue(): string | null; currentTags: string[] | null }) {
  let text = "";
  const tags: string[] = [];
  while (story.canContinue) {
    text += story.Continue() ?? "";
    tags.push(...(story.currentTags ?? []));
  }
  return { text, tags };
}

test("a node entered normally prints its -norm prose", () => {
  const { story } = open();
  story.ChooseChoiceIndex(0); // option a: rejoins the gather, falls through to CH-VAR
  const first = drain(story);

  assert.match(first.text, /Set-up on the normal path/);
  assert.doesNotMatch(first.text, /after the divert/);
  assert.ok(first.tags.includes("id:L-VAR-s-norm"), "the #id tag names the line that printed");
  assert.ok(!first.tags.includes("id:L-VAR-s-div"));

  // The option label is the normal-path player line.
  assert.equal(story.currentChoices.length, 2);
  assert.match(story.currentChoices[1].text, /Asked on the normal path/);

  story.ChooseChoiceIndex(0); // CH-VAR option a
  const second = drain(story);
  assert.match(second.text, /Answer on the normal path/);
  assert.doesNotMatch(second.text, /Answer after the divert/);
  assert.ok(second.tags.includes("id:L-VAR-a-r-norm"));
});

test("the same node entered by a divert prints its -div prose", () => {
  const { story } = open();
  story.ChooseChoiceIndex(1); // option b: diverts to CH-VAR
  const first = drain(story);

  assert.match(first.text, /Set-up after the divert/);
  assert.doesNotMatch(first.text, /Set-up on the normal path/);
  assert.ok(first.tags.includes("id:L-VAR-s-div"), "the #id tag names the line that printed");
  assert.ok(!first.tags.includes("id:L-VAR-s-norm"));

  // Still TWO options — a variant swaps the text inside a choice, it never
  // adds a choice on the divert path.
  assert.equal(story.currentChoices.length, 2);
  assert.match(story.currentChoices[1].text, /Asked after the divert/);

  story.ChooseChoiceIndex(0); // CH-VAR option a
  const second = drain(story);
  assert.match(second.text, /Answer after the divert/);
  assert.doesNotMatch(second.text, /Answer on the normal path/);
  assert.ok(second.tags.includes("id:L-VAR-a-r-div"));
});

test("a variant player line reports the id of the line the player actually said", () => {
  // The tag rides the chosen option's output line (inkjs resolves a dynamic
  // choice's tags when the choice is taken), so QA's #id stream still names
  // one real content_id per path.
  for (const [pick, id] of [
    [0, "id:L-VAR-b-p-norm"],
    [1, "id:L-VAR-b-p-div"],
  ] as const) {
    const { story } = open();
    story.ChooseChoiceIndex(pick);
    drain(story);
    story.ChooseChoiceIndex(1); // CH-VAR option b — the variant player line
    const said = drain(story);
    assert.ok(said.tags.includes(id), `${id} on pick ${pick}, got ${said.tags.join(" ")}`);
  }
});

test("the divert-path flag is cleared at the node's gather", () => {
  const { story } = open();
  story.ChooseChoiceIndex(1); // in by the divert
  drain(story);
  story.ChooseChoiceIndex(0);
  drain(story);
  assert.equal(
    story.variablesState.$("enteredByDivert"),
    false,
    "a divert-path entry must not leak into any later beat",
  );
});

test("a node with no variants is emitted exactly as before", () => {
  const plain = emitInk(buildGraph(loadData())).get("souls/toby.ink")!;
  assert.doesNotMatch(plain, /enteredByDivert/, "no flag traffic where nothing varies");
});

test("MUST COMPILE: per-path prose compiles with zero errors and zero warnings", () => {
  const files = emitInk(buildGraph(withPathVariants()));
  const { story, errors, warnings } = compileInkFiles(files);
  assert.deepEqual(errors, [], `compile errors:\n${errors.join("\n")}`);
  assert.deepEqual(warnings, [], `compile warnings:\n${warnings.join("\n")}`);
  assert.ok(story);
});

// The live SC-T2-09 pin was retired 2026-08-30: the dialogue rebuild replaced
// every old scene, and SC-T2-09 (Toby's closing beat, the original defect this
// suite closed) no longer exists. No scene in the rebuilt content uses
// path_variants at all yet, so there is no live scene to re-point this at — the
// path_variants FEATURE stays fully proven by the six synthetic tests above,
// which drive `withPathVariants()` through the emitter and compiler. This guard
// stands in for the retired pin: the day authored content adopts path_variants
// again, it fails so a real live pin gets wired back in.
test("no authored scene uses path_variants yet — the feature is proven synthetically above", () => {
  const graph = buildGraph(loadData("data", []));
  const live = graph.scenes.flatMap((s) =>
    s.choice_nodes
      .filter((n) => n.path_variants && Object.keys(n.path_variants).length > 0)
      .map((n) => `${s.scene_id}/${n.choice_id}`),
  );
  assert.deepEqual(
    live,
    [],
    "an authored scene now carries path_variants — add a live emit/compile pin for it, " +
      "the way the retired SC-T2-09 test did",
  );
});
