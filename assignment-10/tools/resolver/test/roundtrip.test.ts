// The Lantern <-> resolver round trip, end to end (milestone 3 acceptance:
// "edit, regenerate, the edit survives").
//
// Drives the real CLI in a temp dir:
//   1. build graph + ink from fixture data
//   2. drop a Lantern-shaped edits.json into the run folder's out/
//      (the exact shape Lantern's bridge appends: { target, old_text,
//       new_text, timestamp } — see lantern/vite.config.ts POST /edit)
//   3. REGENERATE from source data + the edits (build --edits)
//   4. prove: the regenerated graph and ink carry the edited text, the
//      regenerated ink still compiles and plays the edited line, a stale
//      edit (old_text mismatch after a source change) is rejected and
//      surfaced, and an orphan (target deleted upstream) lands in the
//      orphan report.

import { after, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PACKAGE_ROOT } from "../src/data.ts";
import type { EditReport, SceneGraph } from "../src/types.ts";
import { compileInkFiles } from "./helpers/compile.ts";
import type { InkFiles } from "../src/ink.ts";

const CLI = join(PACKAGE_ROOT, "src", "cli.ts");
const FIXTURES = join(PACKAGE_ROOT, "fixtures");
const DATA_FILES = ["scene-graph.json", "screen-specs.json", "seams.json", "role-workplace.json"];

const LINE_ID = "L-SC-T2-01-01";
const ORIGINAL = "Placeholder: Toby is behind on the feast trays.";
const EDITED = "Toby is drowning in feast trays and knows it.";

const tmp = mkdtempSync(join(tmpdir(), "resolver-roundtrip-"));
after(() => rmSync(tmp, { recursive: true, force: true }));

function makeDataDir(name: string, mutate?: (g: SceneGraph) => void): string {
  const dir = join(tmp, name);
  mkdirSync(dir, { recursive: true });
  for (const f of DATA_FILES) copyFileSync(join(FIXTURES, f), join(dir, f));
  if (mutate) {
    const file = join(dir, "scene-graph.json");
    const graph = JSON.parse(readFileSync(file, "utf8")) as SceneGraph;
    mutate(graph);
    writeFileSync(file, JSON.stringify(graph, null, 2));
  }
  return dir;
}

function build(dataDir: string, outDir: string, editsFile?: string) {
  const args = [CLI, "build", "--data", dataDir, "--out", outDir];
  if (editsFile) args.push("--edits", editsFile);
  const res = spawnSync(process.execPath, args, { encoding: "utf8" });
  assert.equal(res.error, undefined);
  return res;
}

/** Read a built ink/ tree back into the compile helper's file map. */
function readInkTree(inkDir: string): InkFiles {
  const files: InkFiles = new Map();
  for (const rel of readdirSync(inkDir, { recursive: true }) as string[]) {
    if (!rel.endsWith(".ink")) continue;
    files.set(rel.replaceAll("\\", "/"), readFileSync(join(inkDir, rel), "utf8"));
  }
  return files;
}

function readReport(outDir: string): EditReport {
  return JSON.parse(readFileSync(join(outDir, "edit-report.json"), "utf8")) as EditReport;
}

/** The Lantern bridge shape, verbatim: an array of appended patch records. */
function writeLanternEdits(runDir: string, edits: object[]): string {
  const out = join(runDir, "out");
  mkdirSync(out, { recursive: true });
  const file = join(out, "edits.json");
  writeFileSync(file, JSON.stringify(edits, null, 2));
  return file;
}

// ---- shared first pass: build, edit, regenerate ----

const dataDir = makeDataDir("data");
const run1 = join(tmp, "run1");
const run2 = join(tmp, "run2");

test("round trip: a Lantern edit survives regeneration, and the rebuilt story compiles and plays it", () => {
  // (1) first build from fixture data — the run folder Lantern would open
  const first = build(dataDir, run1);
  assert.equal(first.status, 0, first.stderr);
  assert.match(
    readFileSync(join(run1, "ink", "souls", "toby.ink"), "utf8"),
    new RegExp(ORIGINAL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    "baseline build carries the source text",
  );

  // (2) Lantern's reviewer edits one line; the bridge appends to <run>/out/edits.json
  const editsFile = writeLanternEdits(run1, [
    { target: LINE_ID, old_text: ORIGINAL, new_text: EDITED, timestamp: new Date().toISOString() },
  ]);

  // (3) regenerate from source data + the edits
  const second = build(dataDir, run2, editsFile);
  assert.equal(second.status, 0, second.stderr);

  const report = readReport(run2);
  assert.equal(report.applied.length, 1);
  assert.equal(report.rejected.length, 0);
  assert.equal(report.orphans.length, 0);

  // (4a) the edit survives in graph.json and in the emitted ink
  const graphText = readFileSync(join(run2, "graph.json"), "utf8");
  assert.ok(graphText.includes(EDITED), "regenerated graph.json carries the edited text");
  assert.ok(!graphText.includes(ORIGINAL), "old text is gone from the regenerated graph");
  const toby = readFileSync(join(run2, "ink", "souls", "toby.ink"), "utf8");
  assert.ok(toby.includes(EDITED), "regenerated ink carries the edited text");
  assert.ok(!toby.includes(ORIGINAL), "old text is gone from the regenerated ink");

  // (4b) the regenerated tree still compiles clean and plays the edited line
  const { story, errors, warnings } = compileInkFiles(readInkTree(join(run2, "ink")));
  assert.deepEqual(errors, [], `compile errors:\n${errors.join("\n")}`);
  assert.deepEqual(warnings, [], `compile warnings:\n${warnings.join("\n")}`);
  assert.ok(story, "compiler returned a story");
  story!.Continue(); // day start (sets TimeOfDay = morning)
  story!.variablesState.$("present_toby", "T2");
  story!.ChoosePathString("toby.sc_t2_01");
  let text = "";
  while (story!.canContinue) text += story!.Continue();
  assert.ok(text.includes(EDITED), "the running story speaks the edited line");
});

test("stale edit: source text changed upstream -> rejected, surfaced, source wins", () => {
  // The writer rewrote the line at the source; the reviewer's patch is now stale.
  const UPSTREAM = "Rewritten upstream: Toby recounts the trays again.";
  const staleData = makeDataDir("data-stale", (g) => {
    const line = g.scenes
      .flatMap((s) => s.lines)
      .find((l) => l.content_id === LINE_ID)!;
    line.text = UPSTREAM;
  });
  const editsFile = join(run1, "out", "edits.json"); // same edits.json as before
  const run3 = join(tmp, "run3");
  const res = build(staleData, run3, editsFile);

  assert.notEqual(res.status, 0, "a rejected edit fails the build loudly");
  assert.match(res.stderr, /edit rejected: L-SC-T2-01-01/);
  const report = readReport(run3);
  assert.equal(report.applied.length, 0);
  assert.equal(report.rejected.length, 1);
  assert.match(report.rejected[0].reason, /old_text/);
  assert.equal(report.rejected[0].current_text, UPSTREAM);
  // The build output is still written, and the source text wins.
  const toby = readFileSync(join(run3, "ink", "souls", "toby.ink"), "utf8");
  assert.ok(toby.includes(UPSTREAM), "regenerated ink keeps the upstream rewrite");
  assert.ok(!toby.includes(EDITED), "the stale edit never clobbers regenerated content");
});

test("orphaned edit: target deleted upstream -> lands in the orphan report", () => {
  const orphanData = makeDataDir("data-orphan", (g) => {
    for (const scene of g.scenes) {
      scene.lines = scene.lines.filter((l) => l.content_id !== LINE_ID);
    }
  });
  const editsFile = join(run1, "out", "edits.json");
  const run4 = join(tmp, "run4");
  const res = build(orphanData, run4, editsFile);

  assert.notEqual(res.status, 0, "an orphaned edit fails the build loudly");
  assert.match(res.stderr, /edit orphaned: L-SC-T2-01-01/);
  const report = readReport(run4);
  assert.equal(report.applied.length, 0);
  assert.equal(report.orphans.length, 1);
  assert.match(report.orphans[0].reason, /no longer exists/);
});
