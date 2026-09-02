// D2 iteration 3 — the Home Hub as a real screen (GDD 08-levels.md:24-29).
//
// Before this, main.ink's home_hub/calendar knots carried no #screen: tag, so
// nothing external to the story ever learned the player had left a real
// screen for the Home Hub: play.ts's currentScreen (and walk.ts's own
// Walker.screen, which uses the identical #screen: contract) simply kept
// whatever the last real screen was, for the whole Home Hub visit. These
// tests prove, against the REAL data (not a fixture), that the Home Hub now
// carries its own tag, resolves to a genuine ScreenSpec entry, and that
// leaving it re-tags to wherever the player goes next.

import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { loadData, PACKAGE_ROOT } from "../src/data.ts";
import { loadTuning } from "../src/tuning.ts";
import { buildGraph, HOME_SCREEN_ID } from "../src/graph.ts";
import { emitInk } from "../src/ink.ts";
import { emitStoryJson } from "../src/story.ts";
import { resolveWeek, seedThreadsFromContent } from "../src/week.ts";
import { Walker, LABEL_END_DAY, PREFIX_GO } from "../src/walk.ts";
import type { WalkInputs } from "../src/walk.ts";
import type { DayInput } from "../src/types.ts";

const DATA_DIR = join(PACKAGE_ROOT, "data");
const data = loadData(DATA_DIR, []);
const tuning = loadTuning(DATA_DIR, []);
const graph = buildGraph(data, tuning);
const files = emitInk(graph);
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

test("HOME is a real ScreenSpec entry: not a start screen, not a calendar destination", () => {
  const home = graph.screens.find((s) => s.screen_id === HOME_SCREEN_ID);
  assert.ok(home, "HOME_SCREEN_ID must resolve against graph.screens");
  assert.equal(home!.status.startsWith("start"), false, "HOME must never be a start screen");
  assert.equal(home!.location, "home");

  const mainInk = files.get("main.ink")!;
  // screen_hub (day 1's manual pick) and the calendar (every other day's
  // pick) both enumerate `starts` — HOME must appear in neither.
  assert.doesNotMatch(mainInk, /\[Begin at Home\]/);
  assert.doesNotMatch(mainInk, /\[Go to Home\]/);
});

test("the Home Hub carries its own #screen: tag, and mints no generic world file", () => {
  const mainInk = files.get("main.ink")!;
  const homeHubBlock = mainInk.slice(mainInk.indexOf("=== home_hub ==="));
  assert.match(homeHubBlock, new RegExp(`#screen:${HOME_SCREEN_ID}\\b.*#id:SYS-HOME-HUB`));
  const calendarBlock = mainInk.slice(mainInk.indexOf("=== calendar ==="));
  assert.match(calendarBlock, new RegExp(`#screen:${HOME_SCREEN_ID}\\b.*#id:SYS-CALENDAR`));

  // emitScreen's generic per-screen pipeline must not also run for HOME — its
  // flow is hand-authored in emitMain, not generated.
  assert.equal(files.has("world/home.ink"), false);
});

test("walking into the Home Hub sets the #screen: tag to HOME, not the previous real screen", () => {
  const walker = new Walker(inputs);
  walker.pump(); // day_start -> screen_hub

  const before = walker.context().screen;
  assert.equal(before, null, "day 1 opens at screen_hub, nowhere in particular yet");

  // Take the very first offered move so there IS a "previous real screen" to
  // confuse the old (untagged) behaviour with.
  const firstMove = walker.choices[0];
  assert.ok(firstMove, "screen_hub offers at least one start screen");
  walker.choose(firstMove.index);
  const realScreen = walker.context().screen;
  assert.ok(realScreen && realScreen !== HOME_SCREEN_ID, "landed on a real screen");

  // Drive toward "End the day" (taking it the moment it is offered) to reach
  // the Home Hub, capped so a stuck walk fails loudly instead of hanging.
  let steps = 0;
  while (walker.context().screen !== HOME_SCREEN_ID) {
    const ctx = walker.context();
    const endDay = ctx.choices.findIndex((c) => c.text === LABEL_END_DAY);
    walker.choose(endDay >= 0 ? endDay : 0);
    steps += 1;
    if (steps > 30) throw new Error("never reached the Home Hub — walk stuck");
  }

  // Now standing in the Home Hub: the tag must have moved OFF the real
  // screen visited earlier in the day, onto HOME — not stayed on `realScreen`.
  assert.equal(
    walker.context().screen,
    HOME_SCREEN_ID,
    `after "End the day" the tracked screen must be the Home Hub, not left on "${realScreen}"`,
  );

  // The Home Hub's own choices are offered here (not the prior screen's).
  const texts = walker.choices.map((c) => c.text);
  assert.ok(texts.includes("Start the Next Day"), `expected the Home Hub's own choices, got ${JSON.stringify(texts)}`);

  // Move through to the calendar and confirm the tag holds (same room).
  const openCalendar = walker.choices.findIndex((c) => c.text === "Start the Next Day");
  walker.choose(openCalendar);
  assert.equal(walker.context().screen, HOME_SCREEN_ID, "the calendar is still the Home Hub");

  // Pick tomorrow's destination and confirm the tag moves OFF the Home Hub
  // and onto wherever the player actually lands.
  const goChoice = walker.choices.findIndex((c) => c.text.startsWith(PREFIX_GO));
  assert.ok(goChoice >= 0, "the calendar offers at least one Go to <location> pick");
  walker.choose(goChoice);
  const afterCalendar = walker.context().screen;
  assert.notEqual(afterCalendar, HOME_SCREEN_ID, "leaving the calendar must move the tag off the Home Hub");
  assert.ok(
    graph.screens.some((s) => s.screen_id === afterCalendar),
    `"${afterCalendar}" must resolve to a real screen`,
  );
});

// GP-52 (playtest 2026-08-02): "should not auto-open calendar, let player
// open the calendar." Arriving at the Home Hub shows the calendar CLOSED —
// no "Go to <location>" picks — and every path stays closed until the
// explicit "Start the Next Day" choice is taken (renamed 2026-08-24 from
// "Open the calendar," per Roc's ruling; the knot is still named `calendar`).
// In particular the once-only
// "Look around your home" flavor pick must loop back to the hub, not divert
// into the calendar.
test("the calendar never opens on its own: closed on arrival, closed after looking around, open only on the explicit pick", () => {
  const walker = new Walker(inputs);
  walker.pump();

  // Reach the Home Hub the ordinary way: end the day as soon as offered.
  let steps = 0;
  while (walker.context().screen !== HOME_SCREEN_ID) {
    const endDay = walker.choices.findIndex((c) => c.text === LABEL_END_DAY);
    walker.choose(endDay >= 0 ? endDay : 0);
    steps += 1;
    if (steps > 30) throw new Error("never reached the Home Hub — walk stuck");
  }

  // Arrival: calendar closed. The hub offers its own picks, none of the
  // calendar's "Go to <location>" destinations.
  const arrival = walker.choices.map((c) => c.text);
  assert.ok(
    !arrival.some((t) => t.startsWith(PREFIX_GO)),
    `the calendar must be closed on arrival, got ${JSON.stringify(arrival)}`,
  );
  assert.ok(arrival.includes("Start the Next Day"), "the player can open it");

  // Looking around must return to the hub with the calendar still closed.
  const look = walker.choices.findIndex((c) => c.text === "Look around your home");
  assert.ok(look >= 0, "the once-only look-around is offered on first arrival");
  walker.choose(look);
  const afterLook = walker.choices.map((c) => c.text);
  assert.equal(walker.context().screen, HOME_SCREEN_ID, "still the Home Hub");
  assert.ok(
    !afterLook.some((t) => t.startsWith(PREFIX_GO)),
    `looking around must not auto-open the calendar, got ${JSON.stringify(afterLook)}`,
  );
  assert.ok(afterLook.includes("Start the Next Day"), "the open pick survives the look-around");

  // Only the explicit pick opens it.
  walker.choose(afterLook.indexOf("Start the Next Day"));
  assert.ok(
    walker.choices.some((c) => c.text.startsWith(PREFIX_GO)),
    "opening the calendar reveals the Go to <location> picks",
  );
});
