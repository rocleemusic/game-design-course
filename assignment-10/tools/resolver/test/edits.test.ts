import { test } from "node:test";
import assert from "node:assert/strict";
import { loadData } from "../src/data.ts";
import { buildGraph } from "../src/graph.ts";
import { applyEdits } from "../src/edits.ts";
import type { Edit } from "../src/types.ts";

const LINE_ID = "L-SC-T2-01-01";
const ORIGINAL = "Placeholder: Toby is behind on the feast trays.";

function freshGraph() {
  return buildGraph(loadData());
}

function edit(partial: Partial<Edit>): Edit {
  return {
    target: LINE_ID,
    old_text: ORIGINAL,
    new_text: "He is behind on the trays.",
    timestamp: "2026-07-29T10:00:00Z",
    ...partial,
  };
}

test("rule: a matching patch applies (content_id target)", () => {
  const graph = freshGraph();
  const report = applyEdits(graph, [edit({})]);
  assert.equal(report.applied.length, 1);
  assert.equal(report.rejected.length, 0);
  assert.equal(report.orphans.length, 0);
  const line = graph.scenes[0].lines.find((l) => l.content_id === LINE_ID)!;
  assert.equal(line.text, "He is behind on the trays.");
});

test("rule 1: old_text mismatch -> rejected and surfaced, never forced", () => {
  const graph = freshGraph();
  const report = applyEdits(graph, [edit({ old_text: "some stale text" })]);
  assert.equal(report.applied.length, 0);
  assert.equal(report.rejected.length, 1);
  assert.match(report.rejected[0].reason, /old_text/);
  assert.equal(report.rejected[0].current_text, ORIGINAL);
  const line = graph.scenes[0].lines.find((l) => l.content_id === LINE_ID)!;
  assert.equal(line.text, ORIGINAL, "text untouched on rejection");
});

test("rule 2: missing target -> orphan report", () => {
  const graph = freshGraph();
  const report = applyEdits(graph, [edit({ target: "L-GONE-99" })]);
  assert.equal(report.applied.length, 0);
  assert.equal(report.orphans.length, 1);
  assert.match(report.orphans[0].reason, /no longer exists/);
});

test("rule 3: two patches to one target apply in timestamp order, later wins", () => {
  const graph = freshGraph();
  // Deliberately out of order in the array; timestamps decide.
  const later = edit({
    old_text: "First rewrite.",
    new_text: "Second rewrite.",
    timestamp: "2026-07-29T12:00:00Z",
  });
  const earlier = edit({
    old_text: ORIGINAL,
    new_text: "First rewrite.",
    timestamp: "2026-07-29T09:00:00Z",
  });
  const report = applyEdits(graph, [later, earlier]);
  assert.equal(report.applied.length, 2);
  const line = graph.scenes[0].lines.find((l) => l.content_id === LINE_ID)!;
  assert.equal(line.text, "Second rewrite.");
});

test('"<choice_id>.<field>" targets patch choice-node fields', () => {
  const graph = freshGraph();
  const node = graph.scenes[0].choice_nodes[0];
  const report = applyEdits(graph, [
    edit({
      target: "CH-T2-01.equal_weight_note",
      old_text: node.equal_weight_note,
      new_text: "Neither road is sanctioned.",
    }),
  ]);
  assert.equal(report.applied.length, 1);
  assert.equal(node.equal_weight_note, "Neither road is sanctioned.");
});

test('"<option_id>.<field>" targets patch option fields (surface_action)', () => {
  const graph = freshGraph();
  const report = applyEdits(graph, [
    edit({
      target: "CH-T2-01-b.surface_action",
      old_text: "leave the bread",
      new_text: "leave the loaves",
    }),
  ]);
  assert.equal(report.applied.length, 1);
  const opt = graph.scenes[0].choice_nodes[0].options.find((o) => o.option_id === "CH-T2-01-b")!;
  assert.equal(opt.surface_action, "leave the loaves");
});
