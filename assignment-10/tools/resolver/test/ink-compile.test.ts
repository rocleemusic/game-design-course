// The compile-proof: the emitted ink/ tree must compile clean under inkjs's
// Compiler (the same compiler Inky wraps), and the story must actually run.

import { test } from "node:test";
import assert from "node:assert/strict";
import { loadData } from "../src/data.ts";
import { buildGraph } from "../src/graph.ts";
import { emitInk, type InkFiles } from "../src/ink.ts";
import { compileInkFiles } from "./helpers/compile.ts";

const graph = buildGraph(loadData());
const files: InkFiles = emitInk(graph);

test("emitted tree has the S4 file split", () => {
  const names = [...files.keys()].sort();
  assert.deepEqual(names, [
    "main.ink",
    // souls/narrator.ink — the festival_vignette router diverts into
    // narrator.vig_* (dialogue rebuild 2026-08-30), so emitSoul now emits the
    // narrator soul file alongside the authored souls.
    "souls/narrator.ink",
    "souls/toby.ink",
    "state.ink",
    "system/externals.ink",
    "world/t1.ink",
    "world/t2.ink",
    "world/t7.ink",
  ]);
});

test("state.ink is the single declaration site", () => {
  const state = files.get("state.ink")!;
  assert.match(state, /LIST TimeOfDay = morning, afternoon, evening, night/);
  assert.match(state, /VAR day = 1/);
  assert.match(state, /VAR movesLeft = 3/);
  assert.match(state, /VAR present_toby = "none"/);
  assert.match(state, /VAR slot_sl_t2_01 = "empty"/);
  assert.match(state, /VAR bondLevel_toby = 0/);
  // no declarations anywhere else
  for (const [name, content] of files) {
    if (name === "state.ink") continue;
    assert.doesNotMatch(content, /^\s*(VAR|LIST)\s/m, `${name} must not declare state`);
  }
});

test("tag contract: #screen: / #choice: / #opt: plus per-line id tags", () => {
  assert.match(files.get("world/t1.ink")!, /#screen:T1/);
  const toby = files.get("souls/toby.ink")!;
  assert.match(toby, /#choice:CH-T2-01/);
  assert.match(toby, /#opt:CH-T2-01-a/);
  assert.match(toby, /#opt:CH-T2-01-b/);
  assert.match(toby, /#id:L-SC-T2-01-01/);
  assert.match(toby, /\(g_ch_t2_01\)/);
});

test("state_actions emit as EXTERNAL calls with no-op fallback stubs", () => {
  const toby = files.get("souls/toby.ink")!;
  assert.match(toby, /~ recordBond\("toby", "Intimacy"\)/);
  assert.match(toby, /~ recordThreadMove\("giver-receive"\)/);
  const ext = files.get("system/externals.ink")!;
  assert.match(ext, /EXTERNAL recordBond\(soul, category\)/);
  assert.match(ext, /=== function recordBond\(soul, category\)/);
});

test("MUST COMPILE: inkjs Compiler compiles the emitted project with zero errors", () => {
  const { story, errors, warnings } = compileInkFiles(files);
  assert.deepEqual(errors, [], `compile errors:\n${errors.join("\n")}`);
  assert.deepEqual(warnings, [], `compile warnings:\n${warnings.join("\n")}`);
  assert.ok(story, "compiler returned a story");

  // Play-proof: the canned build runs on the no-op fallbacks.
  const first = story!.Continue();
  assert.match(first ?? "", /Day 1 begins/);
  assert.ok(story!.currentChoices.length > 0, "day-loop hub offers choices");
});

test("the compiled story can enter the scene stitch by address and walk a branch", () => {
  const { story } = compileInkFiles(files);
  assert.ok(story);
  // Run day_start first (sets TimeOfDay = morning), then precondition the
  // presence guard the way the day-start resolver would.
  story!.Continue();
  story!.variablesState.$("present_toby", "T2");
  story!.ChoosePathString("toby.sc_t2_01");
  let text = "";
  while (story!.canContinue) text += story!.Continue();
  assert.match(text, /Placeholder set-up/);
  assert.equal(story!.currentChoices.length, 2, "both options pass the guard");
  story!.ChooseChoiceIndex(0);
  while (story!.canContinue) text += story!.Continue();
  assert.match(text, /goes flat and short/);
  // The branch rejoined at the gather and ran on past it. Asserted by where the
  // flow LANDS, not by gather text: an unauthored gather emits a bare label and
  // prints nothing at all as of 2026-09-01 (it used to print "Placeholder: the
  // scene continues." straight into the game — see `emitChoiceNode`).
  assert.ok(
    story!.currentChoices.length > 0,
    "flow ran through the gather to the screen hub, which offers choices",
  );
});
