import { test } from "node:test";
import assert from "node:assert/strict";
import { loadData } from "../src/data.ts";
import { buildGraph, DAY_START_WRITER, HOST_MIRROR_WRITER } from "../src/graph.ts";

const graph = buildGraph(loadData());

test("graph.json: screens carry every spec field plus ink_address", () => {
  // T1, T2, plus the minimal T7 stand-in (emitMain requires FESTIVAL_SCREEN_ID
  // in every graph — see the fixture entry's note).
  assert.equal(graph.screens.length, 3);
  const t1 = graph.screens.find((s) => s.screen_id === "T1")!;
  assert.equal(t1.ink_address, "t1");
  assert.equal(t1.location, "town");
  assert.equal(t1.npc_slots?.length, 3);
  const t2 = graph.screens.find((s) => s.screen_id === "T2")!;
  assert.equal(t2.item_slots?.[0].slot_id, "SL-T2-01");
});

test("graph.json: seams pass through as { from, to, name }", () => {
  assert.deepEqual(graph.seams, [{ from: "T1", to: "F1", name: "forest_path" }]);
});

test("graph.json: scenes inline lines and choice_nodes, with both ID and address forms", () => {
  assert.equal(graph.scenes.length, 1);
  const scene = graph.scenes[0];
  assert.equal(scene.scene_id, "SC-T2-01");
  assert.equal(scene.ink_address, "toby.sc_t2_01");
  assert.equal(scene.lines.length, 5);
  const node = scene.choice_nodes[0];
  assert.equal(node.choice_id, "CH-T2-01");
  assert.equal(node.ink_address, "ch_t2_01");
  assert.equal(node.gather_address, "g_ch_t2_01");
  assert.equal(node.options.length, 2);
});

test("graph.json: variables carry declarations with derived readers and writers", () => {
  const byName = new Map(graph.variables.map((v) => [v.name, v]));

  const tod = byName.get("TimeOfDay")!;
  assert.equal(tod.declaration, "LIST TimeOfDay = morning, afternoon, evening, night");
  assert.ok(tod.readers.includes("CH-T2-01"), "choice node reads TimeOfDay via time_of_day =");

  const present = byName.get("present_toby")!;
  assert.equal(present.declaration, 'VAR present_toby = "none"');
  assert.ok(present.readers.includes("CH-T2-01"), "npc_present(toby) makes the node a reader");
  assert.deepEqual(present.writers, [DAY_START_WRITER]);

  const bond = byName.get("bondLevel_toby")!;
  assert.ok(bond.writers.includes("CH-T2-01-a"), "bond_event option is a writer");
  assert.ok(bond.writers.includes(HOST_MIRROR_WRITER), "host mirrors bond in");

  assert.ok(byName.has("day"));
  assert.ok(byName.has("movesLeft"));
  assert.ok(byName.get("Satchel")!.declaration.includes("wool"), "bucket items join the Satchel LIST");
  assert.ok(byName.has("slot_sl_t2_01"), "item slot declares slot_<slot_id>");
  assert.ok(byName.has("KnownPhrases"));
});

test("buildGraph rejects a condition outside the predicate vocabulary", () => {
  const data = loadData();
  data.sceneGraph.scenes[0].choice_nodes[0].availability_conditions = ["mood = grumpy"];
  assert.throws(() => buildGraph(data), /Not a predicate/);
});
