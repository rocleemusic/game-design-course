import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { normalizeGraph } from "../src/lib/normalizeGraph";
import { buildGraphIndex } from "../src/lib/playMap";
import { LanternPlayer, type PlayChoice } from "../src/lib/play";
import type { Day, Graph } from "../src/types";

/**
 * THROWAWAY SPIKE — T13 Phase 0 (plans/2026-08-24-year-loop-saves-build-plan.md).
 *
 * Question this answers: does `LanternPlayer.jumpToAddress` (ChoosePathString)
 * still land cleanly in a knot AFTER the real story has hit `-> END` via an
 * actual playthrough, and does play continue normally from there? The ruling's
 * whole "host diverts into begin_new_year" shape depends on this working.
 *
 * Deliberately does NOT use the tiny T1/T2-only test fixture
 * (fixtures/graph.json / story.json) — that fixture has no festival/final
 * sequence at all (see play.test.ts's own doc comments on story.json /
 * story-home.json), so it cannot reach END. Reuses the real compiled run
 * folder instead (lantern-projects/v01 — the resolver's own
 * `build --emit-story` + `resolve-week` output, checked into the repo), which
 * DOES carry the full day loop through to `final_screen -> END`. This counts
 * as reuse, not a hand-rolled fixture: nothing here is authored for this test.
 *
 * Target knot: `day_start` (tools/resolver/src/ink.ts emitMain), NOT the
 * not-yet-built `begin_new_year` — Phase 1's job, only if this spike passes.
 * day_start already does `~ TimeOfDay = morning` and `~ movesLeft = <full>`,
 * which gives an observable effect that proves ink logic actually ran after
 * the jump, not just that a pointer moved.
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

/** Drain continueOnce() (one visible line per call) until the story stops
 *  being continuable — i.e. until it is sitting at a choice point, or has
 *  ended. Bounded so a real fixture-drift bug fails loudly instead of
 *  hanging the suite. */
function advance(p: LanternPlayer, budget = 500): void {
  let steps = 0;
  while (p.view().canContinue) {
    if (steps++ > budget) {
      throw new Error("advance(): exceeded step budget without reaching a choice point");
    }
    p.continueOnce();
  }
}

/**
 * Drive a REAL week playthrough (day loop -> final sequence) to
 * `final_screen -> END`, the way a player actually would: always taking the
 * fastest legal path forward rather than exploring content, since this spike
 * only needs to prove the story CAN reach END, not play through scenes.
 *
 * Priority is deliberately ordered festival-leg-first: once TimeOfDay is
 * night, `emitScreen`'s HUB stitch still unconditionally offers "End the
 * day" alongside "Begin the festival vignette" (ink.ts ~line 421 vs ~line
 * 438) — preferring "End the day" there would bounce forever between
 * home_hub_final and the festival screen instead of ever reaching the
 * vignette.
 */
function driveToFinalScreen(p: LanternPlayer): void {
  advance(p); // day_start (day 1) -> screen_hub's first choice point
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
      // The calendar knot (ink.ts's `calendar`) offers only "Go to <X>" for
      // each start screen — any one works, the spike doesn't care which.
      idx = choices.findIndex((c: PlayChoice) => c.text.startsWith("Go to "));
    }
    if (idx < 0) {
      throw new Error(
        `spike walker stuck — no recognized choice among: ${JSON.stringify(choices.map((c) => c.text))}`,
      );
    }
    p.choose(idx);
    advance(p);
  }
  throw new Error("spike walker exceeded step budget without reaching END");
}

describe("T13 Phase 0 spike — jumpToAddress after a real playthrough reaches END", () => {
  it("reaches final_screen -> END on the real compiled week", () => {
    const p = newRealPlayer();
    driveToFinalScreen(p);
    const v = p.view();
    expect(v.ended).toBe(true);
    expect(v.canContinue).toBe(false);
    expect(v.choices).toEqual([]);
    // Sanity: this really is the story's own END, not the walker giving up —
    // day never advances past the last day (day_end's day==5 intercept,
    // ink.ts ~line 847, diverts to home_hub_final BEFORE `~ day = day + 1`).
    expect(p.peekVar("day")).toBe(5);
  });

  it("(a) jumpToAddress(\"day_start\") does not throw and reports success after END", () => {
    const p = newRealPlayer();
    driveToFinalScreen(p);
    expect(p.view().ended).toBe(true);

    let threw = false;
    let jumped = false;
    try {
      jumped = p.jumpToAddress("day_start");
    } catch {
      threw = true;
    }

    expect(threw).toBe(false);
    expect(jumped).toBe(true);
    // jumpToAddress fails CLOSED (catches internally, pushes to errors, returns
    // false) rather than throwing — so also check no failure was swallowed.
    expect(p.view().errors).toEqual([]);
  });

  it("(b) TimeOfDay reads back morning and movesLeft is full after the jump", () => {
    const p = newRealPlayer();
    driveToFinalScreen(p);
    expect(p.view().ended).toBe(true);

    const jumped = p.jumpToAddress("day_start");
    expect(jumped).toBe(true);

    // jumpToAddress only repositions the pointer (ChoosePathString) — day_start's
    // own `~` statements run on the next Continue(), same as any other knot.
    advance(p);

    expect(p.view().errors).toEqual([]);
    expect(String(p.peekVar("TimeOfDay"))).toBe("morning");
    expect(p.peekVar("movesLeft")).toBe(movesPerDay);
    expect(p.view().timeBlock).toBe("morning");
    expect(p.view().movesLeft).toBe(movesPerDay);
  });

  it("(c) the player can take normal choices post-jump without the story getting stuck", () => {
    const p = newRealPlayer();
    driveToFinalScreen(p);
    expect(p.view().ended).toBe(true);

    expect(p.jumpToAddress("day_start")).toBe(true);
    advance(p);

    // pickedStartScreen was already consumed entering day 5 (start_from_calendar
    // resets it to "none" on the way in, and nothing sets it again before END),
    // so day_start's else-branch lands here at screen_hub, same as a fresh
    // session — screen_hub always offers "End the day" regardless of movesLeft.
    let v = p.view();
    expect(v.choices.length).toBeGreaterThan(0);
    const endTheDay = v.choices.findIndex((c) => c.text === "End the day");
    expect(endTheDay).toBeGreaterThanOrEqual(0);

    p.choose(endTheDay);
    advance(p);

    v = p.view();
    expect(v.errors).toEqual([]);
    // Play continued into day_end and back out to a real choice point (home_hub
    // or the next day_start), not stuck with canContinue stalled forever.
    expect(v.canContinue).toBe(false);
    expect(v.choices.length + (v.ended ? 1 : 0)).toBeGreaterThan(0);
  });
});
