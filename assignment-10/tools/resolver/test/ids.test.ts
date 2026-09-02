import { test } from "node:test";
import assert from "node:assert/strict";
import { inkAddress, sceneInkAddress, gatherAddress, mintIds } from "../src/ids.ts";
import type { SceneGraph } from "../src/types.ts";

test("ink-address rule: T1 -> t1", () => {
  assert.equal(inkAddress("T1"), "t1");
});

test("ink-address rule: CH-T2-04 -> ch_t2_04", () => {
  assert.equal(inkAddress("CH-T2-04"), "ch_t2_04");
});

test("ink-address rule: scene address is <soul>.<scene> — toby.sc_t2_04", () => {
  assert.equal(sceneInkAddress("toby", "SC-T2-04"), "toby.sc_t2_04");
});

test("ink-address rule: gather label takes g_ prefix — g_ch_t2_04", () => {
  assert.equal(gatherAddress("CH-T2-04"), "g_ch_t2_04");
});

test("ink-address rule: every non-alphanumeric becomes _", () => {
  assert.equal(inkAddress("G-T1-showask"), "g_t1_showask");
  assert.equal(inkAddress("SL T2.01"), "sl_t2_01");
});

test("mintIds fills missing ids deterministically and keeps existing ones", () => {
  const graph: SceneGraph = {
    souls: [{ soul_id: "toby" }],
    scenes: [
      {
        scene_id: "",
        soul: "toby",
        screen_id: "T2",
        lines: [
          { content_id: "", slot_type: "dialogue", speaker_id: "toby", text: "x" },
          { content_id: "KEEP-ME", slot_type: "dialogue", speaker_id: "toby", text: "y" },
        ],
        choice_nodes: [
          {
            choice_id: "",
            scene_id: "",
            availability_conditions: [],
            equal_weight_note: "n",
            no_accrual_note: "n",
            options: [
              { option_id: "", response_slots: [], state_actions: [] },
              { option_id: "", response_slots: [], state_actions: [] },
            ],
          },
        ],
      },
    ],
  };
  const minted = mintIds(graph);
  const scene = minted.scenes[0];
  assert.equal(scene.scene_id, "SC-T2-01");
  assert.equal(scene.lines[0].content_id, "L-SC-T2-01-01");
  assert.equal(scene.lines[1].content_id, "KEEP-ME");
  const node = scene.choice_nodes[0];
  assert.equal(node.choice_id, "CH-T2-01");
  assert.equal(node.scene_id, "SC-T2-01");
  assert.deepEqual(
    node.options.map((o) => o.option_id),
    ["CH-T2-01-a", "CH-T2-01-b"],
  );
  // input untouched
  assert.equal(graph.scenes[0].scene_id, "");
  // deterministic
  assert.deepEqual(mintIds(graph), minted);
});
