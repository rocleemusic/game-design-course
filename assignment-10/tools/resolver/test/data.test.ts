import { test } from "node:test";
import assert from "node:assert/strict";
import { copyFileSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadData, FIXTURES_DIR } from "../src/data.ts";

// The layout-pass roster writes depth: "deep" | "texture"; the loader reads it
// as the internal deep flag (with a warning) so the guarantee floor can see it.
test('souls[] depth "deep"/"texture" normalizes to the deep flag, with a warning', () => {
  const dir = mkdtempSync(join(tmpdir(), "resolver-data-"));
  for (const f of ["screen-specs.json", "seams.json", "role-workplace.json"]) {
    copyFileSync(join(FIXTURES_DIR, f), join(dir, f));
  }
  const sceneGraph = JSON.parse(
    readFileSync(join(FIXTURES_DIR, "scene-graph.json"), "utf8"),
  );
  sceneGraph.souls = [
    { soul_id: "toby", name: "Toby", depth: "deep" },
    { soul_id: "nell", name: "Nell", depth: "texture" },
  ];
  writeFileSync(join(dir, "scene-graph.json"), JSON.stringify(sceneGraph));

  const warnings: string[] = [];
  const data = loadData(dir, warnings);
  const toby = data.sceneGraph.souls.find((s) => s.soul_id === "toby")!;
  const nell = data.sceneGraph.souls.find((s) => s.soul_id === "nell")!;
  assert.equal(toby.deep, true, "depth deep reads as deep=true");
  assert.equal(nell.deep, false, "depth texture reads as deep=false");
  assert.ok(
    warnings.some((w) => w.includes('soul "toby" uses depth "deep"')),
    "normalization is reported as a warning",
  );
});

// GP-80 / guardrails.md check 8: slot_type is a closed enum
// (dialogue | action | object | player_line). A mistyped value (e.g. the old
// "narration") must fail loudly instead of passing through silently.
test("scene line with a slot_type outside the guardrail enum throws", () => {
  const dir = mkdtempSync(join(tmpdir(), "resolver-data-"));
  for (const f of ["screen-specs.json", "seams.json", "role-workplace.json"]) {
    copyFileSync(join(FIXTURES_DIR, f), join(dir, f));
  }
  const sceneGraph = JSON.parse(
    readFileSync(join(FIXTURES_DIR, "scene-graph.json"), "utf8"),
  );
  sceneGraph.scenes[0].lines = [
    { content_id: "L-bad", slot_type: "narration", speaker_id: "toby", text: "hi" },
  ];
  writeFileSync(join(dir, "scene-graph.json"), JSON.stringify(sceneGraph));

  assert.throws(
    () => loadData(dir, []),
    /slot_type "narration"/,
    "a mistyped slot_type is rejected rather than passing through silently",
  );
});

test("scene lines with each guardrail-valid slot_type load without error", () => {
  const dir = mkdtempSync(join(tmpdir(), "resolver-data-"));
  for (const f of ["screen-specs.json", "seams.json", "role-workplace.json"]) {
    copyFileSync(join(FIXTURES_DIR, f), join(dir, f));
  }
  const sceneGraph = JSON.parse(
    readFileSync(join(FIXTURES_DIR, "scene-graph.json"), "utf8"),
  );
  sceneGraph.scenes[0].lines = [
    { content_id: "L-d", slot_type: "dialogue", speaker_id: "toby", text: "hi" },
    { content_id: "L-a", slot_type: "action", speaker_id: "toby", text: "waves" },
    { content_id: "L-o", slot_type: "object", speaker_id: "toby", text: "a lantern" },
    { content_id: "L-p", slot_type: "player_line", speaker_id: "player", text: "hey" },
  ];
  writeFileSync(join(dir, "scene-graph.json"), JSON.stringify(sceneGraph));

  assert.doesNotThrow(() => loadData(dir, []));
});
