// A gated choice node guards every option with the same availability condition.
// When the gate is false the choice point has no available option, and plain
// ink would stop there — the scene could not reach its gather and would
// dead-end. The emitter adds a fallback choice (`* -> gather`) that fires only
// when no normal option is available, so a failed gate skips the beat instead
// of blocking the scene from ending.

import { test } from "node:test";
import assert from "node:assert/strict";
import { buildGraph } from "../src/graph.ts";
import { emitInk } from "../src/ink.ts";
import { compileInkFiles } from "./helpers/compile.ts";
import type { ResolverData } from "../src/types.ts";

const data: ResolverData = {
  screens: [
    { screen_id: "T2", location: "town", name: "Market", status: "start", connects_to: [] },
    // emitMain requires FESTIVAL_SCREEN_ID in every graph (home_hub_final
    // diverts to it) — a minimal stand-in, same as fixtures/screen-specs.json.
    { screen_id: "T7", location: "town", name: "Festival Grounds", status: "reachable", connects_to: [] },
  ],
  seams: [],
  roleWorkplace: [],
  sceneGraph: {
    souls: [{ soul_id: "toby", name: "Toby" }],
    scenes: [
      {
        scene_id: "SC-T2-99",
        soul: "toby",
        screen_id: "T2",
        lines: [
          { content_id: "L-a-p", slot_type: "player_line", speaker_id: "player", text: "gated player line", choice_id: "CH-T2-99", option_id: "CH-T2-99-a" },
          { content_id: "L-a-r", slot_type: "dialogue", speaker_id: "toby", text: "gated response A", choice_id: "CH-T2-99", option_id: "CH-T2-99-a" },
          { content_id: "L-b-r", slot_type: "dialogue", speaker_id: "toby", text: "gated response B", choice_id: "CH-T2-99", option_id: "CH-T2-99-b" },
          // The gather's own beat. Authored rather than left blank because it
          // is the only thing the fallback prints — an unauthored gather emits
          // a bare label with no text (2026-09-01; it used to emit a
          // "the scene continues" placeholder INTO the game), so without this
          // there is nothing to read to prove the fallback landed.
          { content_id: "L-gather", slot_type: "dialogue", speaker_id: "toby", text: "the scene continues", choice_id: "CH-T2-99" },
        ],
        choice_nodes: [
          {
            choice_id: "CH-T2-99",
            scene_id: "SC-T2-99",
            // knows(secret) is never set, so the gate is always false here.
            availability_conditions: ["knows(secret)"],
            gather_line: "L-gather",
            equal_weight_note: "neither option is the correct read",
            no_accrual_note: "no counter keys off either option",
            options: [
              { option_id: "CH-T2-99-a", player_line: "L-a-p", response_slots: ["L-a-r"], state_actions: [], rejoin: "gather" },
              { option_id: "CH-T2-99-b", surface_action: "do the deed", response_slots: ["L-b-r"], state_actions: [], rejoin: "gather" },
            ],
          },
        ],
      },
    ],
  },
};

const graph = buildGraph(data);
const files = emitInk(graph);

test("a gated choice node emits a fallback divert to its gather", () => {
  const toby = files.get("souls/toby.ink")!;
  assert.match(toby, /\*\s*->\s*g_ch_t2_99/, "gated node has a fallback to the gather");
});

test("a non-gated node emits no fallback (its options are always available)", () => {
  // Rebuild the same scene without the gate; the fallback must not appear.
  const openData: ResolverData = structuredClone(data);
  openData.sceneGraph.scenes[0].choice_nodes[0].availability_conditions = [];
  const open = emitInk(buildGraph(openData)).get("souls/toby.ink")!;
  assert.doesNotMatch(open, /\*\s*->\s*g_ch_t2_99/);
});

test("MUST COMPILE, and a failed gate skips the beat instead of dead-ending", () => {
  const { story, errors } = compileInkFiles(files);
  assert.deepEqual(errors, [], `compile errors:\n${errors.join("\n")}`);
  assert.ok(story);
  story!.ChoosePathString("toby.sc_t2_99");
  let text = "";
  while (story!.canContinue) text += story!.Continue();
  // Gate false: the gated options are hidden and the fallback auto-skips.
  assert.match(text, /the scene continues/, "flow reached the gather via the fallback");
  // The scene then returns to its screen hub (W1b) rather than hitting DONE,
  // so there ARE choices here now — the screen's. What must never appear is a
  // gated option, which is the thing this test has always been about. Asserting
  // "zero choices" used to stand in for that, and would now only be re-pinning
  // the old dead-end.
  const offered = story!.currentChoices.map((c: { text: string }) => c.text);
  assert.ok(
    !offered.some((t: string) => /gated player line|do the deed/.test(t)),
    `a failed gate must not offer its options; got ${JSON.stringify(offered)}`,
  );
  assert.ok(
    offered.some((t: string) => /End the day/.test(t)),
    `flow landed on the screen hub; got ${JSON.stringify(offered)}`,
  );
});
