// festival-night.test.ts — encodes the rulings from
// plans/2026-08-01-festival-night-transition-plan.md, section F:
//   - night is entered only from home_hub_final on day days_per_life, only
//     by choice
//   - no path from night back into any day-cycle knot (one-way final
//     sequence)
//   - the vignette is reachable both early (by choice) and by completing
//     all night scenes
//   - advance_time() still never produces night
//   - day 1-4 evenings still land on the normal home_hub/calendar
//     (regression guard)
//
// CONTENT-AGNOSTIC BY CONTRACT, same rule as walk.test.ts: every assertion
// is about ids, tags, and topology, never a line of placeholder prose.

import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { loadData, PACKAGE_ROOT } from "../src/data.ts";
import { loadTuning } from "../src/tuning.ts";
import { buildGraph, HOME_SCREEN_ID, FESTIVAL_SCREEN_ID, NIGHT_SCREEN_ID, FINAL_SCREEN_ID } from "../src/graph.ts";
import { emitInk } from "../src/ink.ts";
import { emitStoryJson } from "../src/story.ts";
import { resolveWeek, seedThreadsFromContent } from "../src/week.ts";
import { Walker, LABEL_END_DAY, LABEL_BEGIN_VIGNETTE, LABEL_GO_RESULTS, PREFIX_TALK, PREFIX_GO, PREFIX_BEGIN } from "../src/walk.ts";
import type { WalkInputs } from "../src/walk.ts";
import type { DayInput } from "../src/types.ts";

const DATA_DIR = join(PACKAGE_ROOT, "data");
const data = loadData(DATA_DIR, []);
const tuning = loadTuning(DATA_DIR, []);
const graph = buildGraph(data, tuning);
const files = emitInk(graph);
const mainInk = files.get("main.ink")!;
const storyJson = emitStoryJson(files);

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
const DAYS_PER_LIFE = graph.day_loop.days_per_life;

/** Drive one walker to end every day up to and including days_per_life, by
 * always taking "End the day" / the sticky fallback — mirrors
 * endEachDayStrategy but as a hand-crankable loop so a test can pause right
 * after the final sequence's own hub. home_hub_final (A4, 2026-08-30) is now
 * an automatic pass-through with no #screen tag and no choice of its own: it
 * writes night and diverts straight onto the Festival Grounds in the same
 * continue-run, so "arrived at home_hub_final" now reads as "landed on
 * FESTIVAL_SCREEN_ID, at night, on the life's last day" rather than any
 * choice being offered. Caps the step count so a stuck walk fails loudly
 * instead of hanging. */
function driveToHomeHubFinal(walker: Walker): void {
  let steps = 0;
  while (true) {
    const ctx = walker.context();
    if (ctx.day === DAYS_PER_LIFE && ctx.timeBlock === "night" && ctx.screen === FESTIVAL_SCREEN_ID) {
      return; // home_hub_final auto-diverted straight through onto the Festival Grounds
    }
    const endDay = ctx.choices.findIndex((c) => c.text === LABEL_END_DAY);
    walker.choose(endDay >= 0 ? endDay : 0);
    steps += 1;
    if (steps > 200) throw new Error("never reached the Festival Grounds at night — walk stuck");
  }
}

// ---------------------------------------------------------------------------
// Night is entered only from home_hub_final, only by choice
// ---------------------------------------------------------------------------

test("TimeOfDay = night is written exactly once in the whole story, inside home_hub_final", () => {
  const writes = [...mainInk.matchAll(/TimeOfDay\s*=\s*night/g)];
  assert.equal(writes.length, 1, "night must be written exactly once");
  const homeHubFinalStart = mainInk.indexOf("=== home_hub_final ===");
  const nextKnot = mainInk.indexOf("\n=== ", homeHubFinalStart + 1);
  assert.ok(homeHubFinalStart >= 0, "home_hub_final must exist");
  assert.ok(
    writes[0].index! > homeHubFinalStart && writes[0].index! < nextKnot,
    "the single TimeOfDay = night write must sit inside home_hub_final",
  );
});

test("home_hub_final offers no calendar and no choice at all — it auto-diverts straight onto the Festival (A4, 2026-08-30)", () => {
  const start = mainInk.indexOf("=== home_hub_final ===");
  const end = mainInk.indexOf("\n=== festival_vignette ===");
  const block = mainInk.slice(start, end);
  assert.doesNotMatch(block, /Pick tomorrow's destination/, "no calendar prompt inside the final sequence");
  assert.doesNotMatch(block, /pickedStartScreen\s*=/, "no calendar write inside the final sequence");
  const goChoices = [...block.matchAll(/^\+ \[Go to ([^\]]+)\]/gm)].map((m) => m[1]);
  assert.deepEqual(goChoices, [], "home_hub_final offers no choices — it's an automatic pass-through, not a manual step");
  const festivalAddress = graph.screens.find((s) => s.screen_id === FESTIVAL_SCREEN_ID)!.ink_address;
  assert.match(
    block,
    new RegExp(`-> ${festivalAddress}\\b`),
    "home_hub_final diverts straight onto the Festival screen in the same continue-run",
  );
});

test("walking day 5's evening to its end auto-diverts through home_hub_final, writing night and landing on T7", () => {
  const walker = new Walker(inputs);
  walker.pump();
  driveToHomeHubFinal(walker);

  // home_hub_final (A4, 2026-08-30) is an automatic pass-through: there is no
  // manual step to pause on and no calendar left on the last day — the same
  // continue-run that ends day 5's last evening lands straight on the
  // Festival Grounds with TimeOfDay already written to night.
  const ctx = walker.context();
  assert.equal(ctx.timeBlock, "night", "home_hub_final's pass-through writes TimeOfDay = night");
  assert.equal(ctx.screen, FESTIVAL_SCREEN_ID, "the pass-through lands on the Festival Grounds");
  assert.equal(ctx.day, DAYS_PER_LIFE, "day is untouched by the final sequence's own hub");
  assert.ok(
    !ctx.choices.some((c) => c.text === "Start the Next Day"),
    "home_hub_final must not offer the ordinary calendar",
  );
});

// ---------------------------------------------------------------------------
// One-way: no path from night back into the ordinary day cycle
// ---------------------------------------------------------------------------

test("festival_vignette and final_screen contain no divert back into the day cycle", () => {
  const vignetteStart = mainInk.indexOf("=== festival_vignette ===");
  // begin_new_year (T13, 2026-08-23 ruling) is HOST-DIVERT-ONLY: no choice
  // anywhere above ever diverts into it, and the host only jumps there from
  // final_screen's parked END on an explicit player "continue". It legitimately
  // contains "-> day_start" to reset the clock, so the one-way scan below stops
  // before it rather than reading that knot as a reachable path back.
  const beginNewYearStart = mainInk.indexOf("\n=== begin_new_year ===");
  const tail = mainInk.slice(vignetteStart, beginNewYearStart === -1 ? undefined : beginNewYearStart);
  for (const forbidden of ["-> home_hub\n", "-> calendar", "-> day_start", "-> screen_hub"]) {
    assert.doesNotMatch(
      tail,
      new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      `${forbidden.trim()} must not appear from festival_vignette onward`,
    );
  }
  assert.match(tail, /-> END/, "final_screen must still end the story");
});

test("day_end's old day-overrun ending is retired: day can never exceed days_per_life", () => {
  assert.doesNotMatch(mainInk, /day\s*>\s*\d+/, "no day-overrun check remains in main.ink");
  assert.doesNotMatch(mainInk, /SYS-CYCLE-END/, "the retired ending's id must not appear");
});

// ---------------------------------------------------------------------------
// The vignette: reachable early by choice, and by completing every night scene
// ---------------------------------------------------------------------------

function nightScenesOnFestivalScreen(): string[] {
  return graph.scenes.filter((s) => s.screen_id === FESTIVAL_SCREEN_ID).map((s) => s.scene_id);
}

/** From inside the vignette tier scene, play its option tree through to the
 * night screen. The tier scene (narrator.vig_quiet|warm|grand) now carries its
 * own choice node and ends `-> night_screen` (dialogue rebuild 2026-08-30), so
 * it no longer falls straight through — take choice 0 at each of its beats. */
function playVignetteToNightScreen(walker: Walker): void {
  let steps = 0;
  while (walker.context().screen !== NIGHT_SCREEN_ID) {
    if (walker.context().choices.length === 0) throw new Error("vignette dead-ended before the night screen");
    walker.choose(0);
    if (++steps > 50) throw new Error("vignette never reached the night screen");
  }
}

test("the vignette is reachable early, before any night scene is played", () => {
  const walker = new Walker(inputs);
  walker.pump();
  driveToHomeHubFinal(walker);
  assert.equal(walker.context().screen, FESTIVAL_SCREEN_ID, "home_hub_final's pass-through already lands here");

  const vignette = walker.context().choices.findIndex((c) => c.text === LABEL_BEGIN_VIGNETTE);
  assert.ok(vignette >= 0, "the vignette choice is offered immediately at night");
  walker.choose(vignette);
  // The router picks a tier scene on festival_score (RULED 2026-08-30): a base
  // week scores 0, so it routes into narrator.vig_quiet. What proves "reached
  // the vignette before playing any night scene" is that no NGT scene was ever
  // entered on the way in — only the router's OWN tier scene should show up.
  // The tier scenes now carry their own #scene tag (Roc, 2026-08-31 — without
  // one, a walk that genuinely played VIG-quiet/warm/grand start to finish had
  // no way to ever report it as entered, since a router divert is the only way
  // in and emitScreen's [Talk to X] line is the only other place that tag gets
  // written), so scenesEntered holds exactly the routed tier, not zero.
  const result = walker.result(false, []);
  assert.deepEqual(result.scenesEntered, ["VIG-quiet"], "only the routed tier scene, no NGT scene, played before the vignette");
  // The tier scene now holds the play at its own choice node rather than
  // falling straight through; walking it to the end lands on the night screen.
  playVignetteToNightScreen(walker);
  assert.equal(walker.context().screen, NIGHT_SCREEN_ID, "the vignette tier scene continues into the night screen");
});

test("the vignette is entered by the pill only, never auto-started, even once every night scene is spent", () => {
  // RE-AIMED again (RULED, Roc 2026-09-02, festival-night-rules.md): the forward
  // path off the Festival Grounds is PILL-ONLY. The old auto-divert — which fired
  // `-> festival_vignette` on its own once every deep NGT scene was spent
  // (`ilsa.ngt_ilsa > 0 && mara.ngt_mara > 0 && toby.ngt_toby > 0`) — was removed
  // in ink.ts's emitScreen. So even with every NGT played, the T7 night hub must
  // STAY put and keep offering "Begin the festival vignette"; the player has to
  // choose it. Content-agnostic: keys only on the generated navigation labels and
  // the scenes' own screen, never on prose.
  const nightScenes = nightScenesOnFestivalScreen();
  assert.ok(nightScenes.length >= 1, "the Festival Grounds must carry night scenes to test this");

  const walker = new Walker(inputs);
  walker.pump();
  // talkDays_<soul> is a HOST_MIRROR_WRITER variable (graph.ts): the real host
  // writes it from the player's save data across the life, and nothing in this
  // resolver's Walker ever simulates that accrual. T7's NGT/GRT choices require
  // talk_days(soul) >= 4 on top of presence (bond-gated festival attendance),
  // so seed it directly, the same way a host would have it true by festival week.
  for (const soul of graph.souls.filter((s) => s.deep).map((s) => s.soul_id)) {
    walker.story.variablesState[`talkDays_${soul}`] = 4;
  }
  // home_hub_final's pass-through lands straight on the Festival Grounds at night.
  driveToHomeHubFinal(walker);
  assert.equal(walker.context().screen, FESTIVAL_SCREEN_ID, "the last night lands on the Festival Grounds");

  // Play every deep NGT the hub offers here, exhausting the night roster. With
  // the old auto-divert this would trip the divert; pill-only, it must not.
  let steps = 0;
  for (;;) {
    const ctx = walker.context();
    if (!ctx.inWorld) {
      walker.choose(0); // inside an NGT/GRT scene — play it through, returns to t7.hub
    } else {
      const talk = ctx.choices.findIndex((c) => c.text.startsWith(PREFIX_TALK));
      if (talk < 0) break; // no more deep-soul greetings/scenes to play
      walker.choose(talk);
    }
    assert.equal(
      walker.context().screen,
      FESTIVAL_SCREEN_ID,
      "greeting a deep soul returns to the Festival Grounds hub, never ejects or auto-advances",
    );
    if (++steps > 400) throw new Error("stuck exhausting the festival roster");
  }

  // Roster exhausted, still on the Festival Grounds — no auto-divert fired.
  assert.equal(walker.context().screen, FESTIVAL_SCREEN_ID, "the hub stays put; nothing auto-advances");
  const pill = walker.context().choices.findIndex((c) => c.text === LABEL_BEGIN_VIGNETTE);
  assert.ok(pill >= 0, "the 'Begin the festival vignette' pill is the sole forward path and is still offered");

  // Only the pill moves the story on.
  walker.choose(pill);
  playVignetteToNightScreen(walker);
  assert.equal(walker.context().screen, NIGHT_SCREEN_ID, "the pill (not an auto-divert) leads into the night screen");
});

test("the night screen sits between the vignette and the final screen, then the story ends", () => {
  const walker = new Walker(inputs);
  walker.pump();
  driveToHomeHubFinal(walker); // lands straight on the Festival Grounds — home_hub_final's own pass-through
  walker.choose(walker.context().choices.findIndex((c) => c.text === LABEL_BEGIN_VIGNETTE));
  // GP-51: the night-version screen holds the play between the vignette tier
  // scene and the results — it does not fall straight through. The tier scene
  // (score 0 -> narrator.vig_quiet) plays its own beat first, then continues
  // into the night screen (RULED 2026-08-30).
  playVignetteToNightScreen(walker);
  assert.equal(walker.context().screen, NIGHT_SCREEN_ID, "the vignette lands on the night screen, not the final screen");
  assert.equal(walker.context().timeBlock, "night", "still night on the night screen");
  const goResults = walker.context().choices.findIndex((c) => c.text === LABEL_GO_RESULTS);
  assert.ok(goResults >= 0, "the night screen offers its single forward option");
  walker.choose(goResults);
  assert.equal(walker.context().screen, FINAL_SCREEN_ID, "the results choice lands on the final screen");
  const result = walker.result(false, []);
  assert.equal(result.ended, true, "the story reaches -> END from final_screen");
  assert.deepEqual(result.errors, [], "no story errors along the way");
});

// ---------------------------------------------------------------------------
// advance_time() never produces night
// ---------------------------------------------------------------------------

test("advance_time() only ever cycles morning -> afternoon -> evening", () => {
  const start = mainInk.indexOf("=== function advance_time() ===");
  const end = mainInk.indexOf("\n\n", start);
  const block = mainInk.slice(start, end < 0 ? undefined : end);
  assert.doesNotMatch(block, /TimeOfDay\s*=\s*night/, "advance_time must never write night");
  assert.match(block, /TimeOfDay\s*=\s*afternoon/);
  assert.match(block, /TimeOfDay\s*=\s*evening/);
});

// ---------------------------------------------------------------------------
// Regression guard: days 1..(DAYS_PER_LIFE - 1) are unchanged
// ---------------------------------------------------------------------------

test("evenings before the life's last day still land on the ordinary home_hub/calendar", () => {
  const walker = new Walker(inputs);
  walker.pump();
  for (let d = 1; d < DAYS_PER_LIFE; d++) {
    let steps = 0;
    while (walker.context().day === d) {
      const ctx = walker.context();
      const endDay = ctx.choices.findIndex((c) => c.text === LABEL_END_DAY);
      walker.choose(endDay >= 0 ? endDay : 0);
      steps += 1;
      if (steps > 200) throw new Error(`day ${d} never ended`);
    }
    const ctx = walker.context();
    assert.equal(ctx.screen, HOME_SCREEN_ID, `day ${d} ends at the Home Hub`);
    assert.equal(ctx.timeBlock, "morning", `day ${d + 1} has already begun by the time the hub renders`);
    assert.notEqual(ctx.day, d, "the calendar path increments day, unlike home_hub_final");
  }
});
