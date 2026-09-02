// wait-choice.test.ts — T8, the Wait action (RULED by Roc 2026-08-24).
//
// The ruling has two halves, and both are only true if Wait is emitted as an
// ORDINARY EXIT that happens to lead back where it started:
//
//   1. it is a REAL INK CHOICE. The day clock only ever advances through ink,
//      so a host-side `setVar("TimeOfDay", ...)` shortcut is not a legal way
//      to build this — the choice has to exist in the compiled story.
//   2. it COSTS A MOVE, like every other time-consuming action. Which means
//      it runs `emitMoveTo`'s body unchanged: spend one move, and advance the
//      BLOCK (not the day) only once that block's budget is empty.
//
// CONTENT-AGNOSTIC BY CONTRACT, same rule as walk.test.ts and
// festival-night.test.ts: every assertion below is about ids, labels the
// EMITTER generates, and topology — never a line of placeholder prose.

import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { loadData, PACKAGE_ROOT } from "../src/data.ts";
import { loadTuning } from "../src/tuning.ts";
import {
  buildGraph,
  HOME_SCREEN_ID,
  VIGNETTE_SCREEN_ID,
  NIGHT_SCREEN_ID,
  FINAL_SCREEN_ID,
  VIGNETTE_QUIET_SCREEN_ID,
  VIGNETTE_WARM_SCREEN_ID,
  VIGNETTE_GRAND_SCREEN_ID,
} from "../src/graph.ts";
import { emitInk } from "../src/ink.ts";
import { emitStoryJson } from "../src/story.ts";
import { resolveWeek, seedThreadsFromContent } from "../src/week.ts";
import { Walker, PREFIX_BEGIN } from "../src/walk.ts";
import type { WalkInputs } from "../src/walk.ts";
import type { DayInput } from "../src/types.ts";

/** The label ink.ts's emitScreen generates. Machine-authored, never prose. */
const LABEL_WAIT = "Wait";

const DATA_DIR = join(PACKAGE_ROOT, "data");
const data = loadData(DATA_DIR, []);
const tuning = loadTuning(DATA_DIR, []);
const graph = buildGraph(data, tuning);
const files = emitInk(graph);
const storyJson = emitStoryJson(files);

/**
 * The screens emitScreen actually emits. The Home Hub, the final sequence's
 * three screens, and the three festival-vignette tier screens (VIGQ/VIGW/VIGG)
 * are hand-authored inside main.ink / played by the narrator (emitInk's
 * HAND_AUTHORED_SCREEN_IDS), so they have no world/*.ink and no move budget of
 * their own — Home advances the day through the calendar instead.
 */
const HAND_AUTHORED = new Set([
  HOME_SCREEN_ID,
  VIGNETTE_SCREEN_ID,
  NIGHT_SCREEN_ID,
  FINAL_SCREEN_ID,
  VIGNETTE_QUIET_SCREEN_ID,
  VIGNETTE_WARM_SCREEN_ID,
  VIGNETTE_GRAND_SCREEN_ID,
]);
const explorable = graph.screens.filter((s) => !HAND_AUTHORED.has(s.screen_id));

const weekBase: Omit<DayInput, "day"> = {
  slot: 1,
  life: 1,
  picked_location: "town",
  threads: [],
  lead_pool: ["LEAD-01", "LEAD-02", "LEAD-03"],
  aliveness_band: "quiet",
};
const days = resolveWeek(data, weekBase, tuning, {
  seedThreads: seedThreadsFromContent(data),
});
const inputs: WalkInputs = { storyJson, graph, days };

// ------------------------------------------------------------------ emission

test("every explorable screen offers Wait, guarded exactly like its own exits", () => {
  for (const screen of explorable) {
    const text = files.get(`world/${screen.ink_address}.ink`);
    assert.ok(text, `no world file emitted for ${screen.screen_id}`);
    assert.match(
      text!,
      new RegExp(`^\\+ \\{movesLeft > 0 && TimeOfDay != night\\} \\[${LABEL_WAIT}\\]$`, "m"),
      `${screen.screen_id} is missing the guarded Wait choice`,
    );
  }
});

test("Wait runs emitMoveTo's body, self-targeting its own screen — it is an exit that goes nowhere", () => {
  for (const screen of explorable) {
    const text = files.get(`world/${screen.ink_address}.ink`)!;
    const body = text.slice(text.indexOf(`[${LABEL_WAIT}]`));
    // The same five load-bearing lines every "Go to X" emits, in order: spend
    // the move, loop back while the budget holds, otherwise either go home
    // (evening has no next block) or roll the clock and loop back.
    assert.match(body, /^ {4}~ movesLeft = movesLeft - 1$/m, `${screen.screen_id}: Wait spends no move`);
    assert.match(body, /^ {4}\{ movesLeft > 0:\n {8}-> \S+$/m, `${screen.screen_id}: Wait has no budget branch`);
    assert.match(body, /^ {12}~ advance_time\(\)$/m, `${screen.screen_id}: Wait never advances the block`);
    // Self-targeting: both diverts in the body name THIS screen, not another.
    const diverts = [...body.matchAll(/^\s+-> (\S+)$/gm)].map((m) => m[1]).slice(0, 3);
    assert.deepEqual(
      diverts,
      [screen.ink_address, "day_end", screen.ink_address],
      `${screen.screen_id}: Wait does not lead back to itself`,
    );
  }
});

test("the Home Hub knot has no Wait — Home advances the day through the calendar, not a move budget", () => {
  assert.doesNotMatch(files.get("main.ink")!, new RegExp(`\\[${LABEL_WAIT}\\]`));
});

// ------------------------------------------------------------------ behaviour

/** A fresh walker standing on the day's first screen, its start pick spent. */
function walkerOnAScreen(): Walker {
  const walker = new Walker(inputs);
  walker.pump();
  const i = walker.choices.findIndex((c) => c.text.startsWith(PREFIX_BEGIN));
  assert.ok(i >= 0, "no start pick offered at screen_hub");
  walker.choose(i);
  return walker;
}

test("Wait is offered in the compiled story, not just in the ink source", () => {
  const walker = walkerOnAScreen();
  assert.ok(
    walker.choices.some((c) => c.text === LABEL_WAIT),
    `the hub offered [${walker.choices.map((c) => c.text).join(" | ")}]`,
  );
});

test("a Wait with budget left SPENDS A MOVE and leaves the clock alone", () => {
  const walker = walkerOnAScreen();
  assert.ok(walker.movesLeft > 1, "this test needs a block with more than one move left");
  const before = { block: walker.currentBlock, moves: walker.movesLeft, day: walker.currentDay };

  walker.choose(walker.choices.findIndex((c) => c.text === LABEL_WAIT));

  assert.equal(walker.movesLeft, before.moves - 1, "Wait did not cost a move");
  assert.equal(walker.currentBlock, before.block, "Wait moved the clock while budget remained");
  assert.equal(walker.currentDay, before.day, "Wait moved the day");
});

test("the Wait that empties the block's budget ADVANCES THE BLOCK and refills it", () => {
  const walker = walkerOnAScreen();
  const startBlock = walker.currentBlock;
  const startDay = walker.currentDay;

  // Spend the block down with Waits alone — nothing else is needed to reach
  // the boundary, which is the whole point of the action.
  let guard = 0;
  while (walker.movesLeft > 1) {
    walker.choose(walker.choices.findIndex((c) => c.text === LABEL_WAIT));
    assert.ok(++guard < 20, "Wait never drew the budget down");
  }
  assert.equal(walker.currentBlock, startBlock, "the clock moved before the budget was spent");

  walker.choose(walker.choices.findIndex((c) => c.text === LABEL_WAIT));

  assert.notEqual(walker.currentBlock, startBlock, "the budget-emptying Wait did not advance the block");
  assert.equal(walker.currentDay, startDay, "advancing a BLOCK must not advance the DAY");
  assert.equal(walker.movesLeft, graph.day_loop.moves_per_day, "the new block's budget was not refilled");
});

test("Wait cannot burn the night — the guard shuts it exactly where the exits shut", () => {
  // Whatever the walk is doing, the invariant is one line: Wait is never
  // offered in a block with no move budget, which is what night is.
  const walker = walkerOnAScreen();
  for (let i = 0; i < 40 && walker.choices.length > 0; i++) {
    if (walker.currentBlock === "night" || walker.movesLeft === 0) {
      assert.ok(
        !walker.choices.some((c) => c.text === LABEL_WAIT),
        `Wait was offered at ${walker.currentBlock} with ${walker.movesLeft} moves left`,
      );
    }
    const wait = walker.choices.findIndex((c) => c.text === LABEL_WAIT);
    const endDay = walker.choices.findIndex((c) => c.text === "End the day");
    const next = wait >= 0 ? wait : endDay >= 0 ? endDay : 0;
    walker.choose(next);
  }
});
