// W2, the static half: contradictions decidable without playing anything.
// The walker proves reachability by walking; this catches the cheap cases at
// build time so a gate that can never open never ships.

import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { dayWindow, findPartialBandCoverage, findUnsatisfiable } from "../src/conditions.ts";
import { loadData, PACKAGE_ROOT } from "../src/data.ts";
import type { SceneGraph } from "../src/types.ts";

const node = (choice_id: string, conditions: string[]) => ({
  choice_id,
  scene_id: "SC-X",
  availability_conditions: conditions,
  equal_weight_note: "n",
  no_accrual_note: "n",
  options: [],
});

const graph = (conditions: string[][]): SceneGraph => ({
  souls: [{ soul_id: "toby" }],
  scenes: [
    {
      scene_id: "SC-X",
      soul: "toby",
      screen_id: "T1",
      lines: [],
      choice_nodes: conditions.map((c, i) => node(`CH-X-${i + 1}`, c)),
    },
  ],
});

test("dayWindow: a bare floor never closes — catch-up is the default", () => {
  assert.deepEqual(dayWindow(["day >= 4"]), [4, Infinity]);
  assert.deepEqual(dayWindow([]), [1, Infinity]);
});

test("dayWindow: reads every comparator the predicate compiler accepts", () => {
  assert.deepEqual(dayWindow(["day > 3"]), [4, Infinity]);
  assert.deepEqual(dayWindow(["day <= 3"]), [1, 3]);
  assert.deepEqual(dayWindow(["day < 3"]), [1, 2]);
  assert.deepEqual(dayWindow(["day == 4"]), [4, 4]);
  assert.deepEqual(dayWindow(["day >= 2", "day <= 3"]), [2, 3]);
});

test("an empty day window is caught", () => {
  const problems = findUnsatisfiable(graph([["day >= 4", "day <= 2"]]));
  assert.equal(problems.length, 1);
  assert.match(problems[0].reason, /window is empty/);
});

test("a beat gated past the end of a life is caught", () => {
  const problems = findUnsatisfiable(graph([["day >= 9"]]), 5);
  assert.equal(problems.length, 1);
  assert.match(problems[0].reason, /only 5 days/);
});

test("two bands for one soul on one beat can never both hold", () => {
  const problems = findUnsatisfiable(
    graph([["bond_band(toby) = low", "bond_band(toby) = high"]]),
  );
  assert.equal(problems.length, 1);
  assert.match(problems[0].reason, /both high and low/);
});

test("different souls' bands on one beat are legal", () => {
  assert.deepEqual(
    findUnsatisfiable(graph([["bond_band(toby) = low", "bond_band(ilsa) = high"]])),
    [],
  );
});

test("ordinary gates are not flagged — no false alarms on legal content", () => {
  assert.deepEqual(
    findUnsatisfiable(graph([["knows(saw_apron)", "npc_present(toby)", "day >= 2"]])),
    [],
  );
});

test("partial band coverage is reported: a run in the missing band falls through", () => {
  const partial = findPartialBandCoverage(
    graph([["bond_band(toby) = low"], ["bond_band(toby) = mid"]]),
  );
  assert.equal(partial.length, 1);
  assert.match(partial[0].reason, /low, mid/);
});

test("full coverage is silent, and a scene with no bands is silent", () => {
  assert.deepEqual(
    findPartialBandCoverage(
      graph([["bond_band(toby) = low"], ["bond_band(toby) = mid"], ["bond_band(toby) = high"]]),
    ),
    [],
  );
  assert.deepEqual(findPartialBandCoverage(graph([["day >= 2"]])), []);
});

test("THE SHIPPED CONTENT IS CLEAN — no unsatisfiable gate, no partial band", () => {
  const data = loadData(join(PACKAGE_ROOT, "data"), []);
  assert.deepEqual(findUnsatisfiable(data.sceneGraph, 5), []);
  assert.deepEqual(findPartialBandCoverage(data.sceneGraph), []);
});
