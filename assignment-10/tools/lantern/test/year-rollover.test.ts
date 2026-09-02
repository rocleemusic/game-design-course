import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { normalizeGraph } from "../src/lib/normalizeGraph";
import { buildGraphIndex } from "../src/lib/playMap";
import { LanternPlayer, type PlayChoice } from "../src/lib/play";
import type { Day, Graph } from "../src/types";

/**
 * T13 Phase 1 — the `begin_new_year` entry point
 * (plans/2026-08-24-year-loop-saves-build-plan.md, Phase 1).
 *
 * Sibling to test/spike-jump-after-end.test.ts, which proved the shape works
 * (jumpToAddress lands cleanly in a knot after the real story reaches END).
 * This file verifies the REAL knot the ruling asked for: `begin_new_year`
 * (tools/resolver/src/ink.ts emitMain), host-divert-only, resetting year/day/
 * pickedStartScreen and handing off to day_start for the rest (TimeOfDay,
 * movesLeft).
 *
 * Same real compiled run folder as the spike (lantern-projects/v01), same
 * reasoning for why the tiny T1/T2 fixture can't be used here — it has no
 * final sequence, so it can never reach `-> END` in the first place.
 */

const runDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../lantern-projects/v01",
);
const readJson = (name: string): unknown =>
  JSON.parse(fs.readFileSync(path.join(runDir, name), "utf-8"));

const graph: Graph = normalizeGraph(readJson("graph.json"));
const storyJson = fs.readFileSync(path.join(runDir, "story.json"), "utf-8");
const index = buildGraphIndex(graph);
const days: Day[] = [1, 2, 3, 4, 5].map((n) => readJson(`day-${n}.json`) as Day);
const movesPerDay = graph.day_loop?.moves_per_day ?? 3;

function newRealPlayer(): LanternPlayer {
  return new LanternPlayer(storyJson, index, days[0], undefined, days);
}

/** Same drain helper as the spike — continueOnce() only advances one visible
 *  line per call, so draining to the next choice point (or END) needs a loop,
 *  not a single call. */
function advance(p: LanternPlayer, budget = 500): void {
  let steps = 0;
  while (p.view().canContinue) {
    if (steps++ > budget) {
      throw new Error("advance(): exceeded step budget without reaching a choice point");
    }
    p.continueOnce();
  }
}

/** Same fastest-legal-path walker as the spike — this test only needs a real
 *  week to reach `final_screen -> END`, not to explore content. See the
 *  spike's doc comment for why "End the day" can't be preferred over the
 *  festival leg once TimeOfDay is night. */
function driveToFinalScreen(p: LanternPlayer): void {
  advance(p);
  const priority = [
    "Go to the results",
    "Begin the festival vignette",
    "Go to the Festival night",
    "End the day",
    "Start the Next Day",
  ];
  for (let step = 0; step < 400; step++) {
    const v = p.view();
    if (v.ended) return;
    const choices = v.choices;
    let idx = -1;
    for (const text of priority) {
      idx = choices.findIndex((c: PlayChoice) => c.text === text);
      if (idx >= 0) break;
    }
    if (idx < 0) {
      idx = choices.findIndex((c: PlayChoice) => c.text.startsWith("Go to "));
    }
    if (idx < 0) {
      throw new Error(
        `walker stuck — no recognized choice among: ${JSON.stringify(choices.map((c) => c.text))}`,
      );
    }
    p.choose(idx);
    advance(p);
  }
  throw new Error("walker exceeded step budget without reaching END");
}

describe("T13 Phase 1 — begin_new_year", () => {
  it("resets day to 1, TimeOfDay to morning, and movesLeft to full, and bumps year to 2", () => {
    const p = newRealPlayer();
    driveToFinalScreen(p);
    expect(p.view().ended).toBe(true);
    expect(p.peekVar("year")).toBe(1);

    const jumped = p.jumpToAddress("begin_new_year");
    expect(jumped).toBe(true);
    advance(p);

    expect(p.view().errors).toEqual([]);
    expect(p.peekVar("day")).toBe(1);
    expect(p.peekVar("year")).toBe(2);
    expect(String(p.peekVar("TimeOfDay"))).toBe("morning");
    expect(p.peekVar("movesLeft")).toBe(movesPerDay);
    expect(p.view().day).toBe(1);
    expect(p.view().timeBlock).toBe("morning");
    expect(p.view().movesLeft).toBe(movesPerDay);
  });

  it("lands at screen_hub with real choices, same as a fresh session (pickedStartScreen reset)", () => {
    const p = newRealPlayer();
    driveToFinalScreen(p);

    expect(p.jumpToAddress("begin_new_year")).toBe(true);
    advance(p);

    const v = p.view();
    expect(v.errors).toEqual([]);
    expect(v.choices.length).toBeGreaterThan(0);
    const endTheDay = v.choices.findIndex((c) => c.text === "End the day");
    expect(endTheDay).toBeGreaterThanOrEqual(0);
  });

  it("carries KnownPhrases and bonds across the year boundary untouched (WorldState, not ink)", () => {
    const p = newRealPlayer();
    driveToFinalScreen(p);
    expect(p.view().ended).toBe(true);

    // Seed real, non-trivial state via the player's own public API right at
    // the parked END, immediately before the jump. p.world (WorldState) is
    // never touched by jumpToAddress or by begin_new_year's own ink lines
    // (year/day/pickedStartScreen only) — this proves that directly, rather
    // than assuming it from reading the source.
    p.world.recordKnowledge("test_phrase_year_loop");
    p.world.recordBond("toby", "quiet_favor");
    const beforeNotebook = p.view().notebook;
    const beforeBonds = p.view().bondBands;
    expect(beforeNotebook).toContain("test_phrase_year_loop");
    expect(beforeBonds.toby).toBeDefined();

    expect(p.jumpToAddress("begin_new_year")).toBe(true);
    advance(p);

    expect(p.view().errors).toEqual([]);
    expect(p.view().notebook).toEqual(beforeNotebook);
    expect(p.view().bondBands).toEqual(beforeBonds);
  });

  /**
   * NOT a Phase 1 regression — pre-existing `applyDay` behavior
   * (tools/lantern/src/lib/play.ts ~line 402-405): ANY day transition
   * empties the satchel ("item slots respawn... so the satchel empties and
   * picked slots refill" — this is `syncDay`'s day-file swap firing because
   * `day` dropped from 5 to 1, exactly the "day-file swap... selects by day
   * number" case Phase 2 of the build plan already flags as needing
   * verification, not assumption). The satchel has never survived an
   * ordinary day boundary either, inside one year — this test documents that
   * the year boundary behaves the SAME way, not differently, so nobody reads
   * silence here as proof the satchel carries over. If Phase 5 needs the
   * satchel to survive the rollover, that is new work on `syncDay`/
   * `applyDay`, not something Phase 1's ink-only change provides for free.
   */
  it("the satchel resets on the year boundary, same as any ordinary day transition (not carried)", () => {
    const p = newRealPlayer();
    driveToFinalScreen(p);
    expect(p.view().ended).toBe(true);

    const pickedUp = p.pickup("test-slot-year-loop", "test-item-year-loop");
    expect(pickedUp).toBe(true);
    expect(p.view().satchel).toContain("test-item-year-loop");

    expect(p.jumpToAddress("begin_new_year")).toBe(true);
    advance(p);

    expect(p.view().errors).toEqual([]);
    expect(p.view().satchel).toEqual([]);
  });
});

/**
 * The morning presence day N's file asks for, computed the same way
 * `LanternPlayer.applyPresence` computes it: everyone in the file goes "none",
 * then the morning fills name a screen. Recomputed here rather than read off a
 * second player, so the assertion is against the DAY FILE (the thing being
 * swapped in) and not against another run of the same code.
 */
function expectedMorningPresence(day: Day): Record<string, string> {
  const out: Record<string, string> = {};
  for (const fill of day.slot_fill) out[`present_${fill.soul}`] = "none";
  for (const fill of day.slot_fill) {
    if (fill.time_block !== "morning") continue;
    out[`present_${fill.soul}`] = fill.screen_id;
  }
  return out;
}

/** Read the `present_<soul>` VARs named by `expected`, as plain strings. */
function actualPresence(p: LanternPlayer, expected: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name of Object.keys(expected)) out[name] = String(p.peekVar(name));
  return out;
}

/**
 * T13 Phase 2 — `year` becomes readable, and the day-file swap is checked
 * across the boundary (plans/2026-08-24-year-loop-saves-build-plan.md, Phase 2:
 * "it selects by day number, so year-2 day-1 should re-apply day-1 presence —
 * verify, don't assume").
 */
describe("T13 Phase 2 — year on the view, and the 5 -> 1 day-file swap", () => {
  it("view() exposes year as a read of ink's own VAR, and nothing forces it", () => {
    const p = newRealPlayer();
    advance(p);
    // Year 1 from the opening, before any rollover exists.
    expect(p.view().year).toBe(1);
    expect(p.view().year).toBe(Number(p.peekVar("year")));

    driveToFinalScreen(p);
    expect(p.jumpToAddress("begin_new_year")).toBe(true);
    advance(p);

    // Year 2 because INK incremented it, not because anything assigned it:
    // `isForced()` flips only inside `setVar`, so a false reading here is
    // proof the host never wrote the year (nor the day, nor the block).
    expect(p.view().year).toBe(2);
    expect(p.view().year).toBe(Number(p.peekVar("year")));
    expect(p.isForced()).toBe(false);
  });

  it("swaps the day FILE back to day 1 when the year rolls 5 -> 1, re-applying day-1 morning presence", () => {
    const p = newRealPlayer();
    driveToFinalScreen(p);
    expect(p.view().ended).toBe(true);
    expect(p.view().day).toBe(5);

    const day1 = expectedMorningPresence(days[0]);
    const day5 = expectedMorningPresence(days[4]);
    // Guard the guard: if day 1 and day 5 ever roll the same morning presence,
    // this test would pass without the swap happening at all.
    expect(day1).not.toEqual(day5);

    // At `final_screen` the week has run to day 5 night — presence is day 5's,
    // so it cannot already be the day-1 answer this test is about to assert.
    expect(actualPresence(p, day1)).not.toEqual(day1);

    expect(p.jumpToAddress("begin_new_year")).toBe(true);
    advance(p);

    // `syncDay` sees ink's `day` drop 5 -> 1, looks day 1 up BY NUMBER in the
    // week it was constructed with, and re-applies it — so year 2 day 1 gets
    // day 1's own presence, not a second run of day 5's.
    expect(p.view().errors).toEqual([]);
    expect(p.view().day).toBe(1);
    expect(p.view().year).toBe(2);
    expect(p.view().timeBlock).toBe("morning");
    expect(actualPresence(p, day1)).toEqual(day1);
    // Picked slots are part of what `applyDay` resets — the day-1 file being
    // re-applied is a day START, not a resumption of a day already played.
    expect(p.view().pickedSlots).toEqual([]);
  });
});
