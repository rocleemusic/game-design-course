// W1d: a life is five days chained through the thread feedback loop.
//
// DayInput.threads has always been documented as "the host's day-end record of
// thread_move events" and nothing ever filled it, so the week could not react
// to play. These tests pin the loop now that it is closed.

import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { loadData, PACKAGE_ROOT } from "../src/data.ts";
import { loadTuning } from "../src/tuning.ts";
import { applyOutcome, resolveWeek, seedThreadsFromContent } from "../src/week.ts";
import type { DayInput, ThreadState } from "../src/types.ts";

const DATA_DIR = join(PACKAGE_ROOT, "data");
const data = loadData(DATA_DIR, []);
const tuning = loadTuning(DATA_DIR, []);

const base: Omit<DayInput, "day"> = {
  slot: 1,
  life: 1,
  picked_location: "town",
  threads: [],
  lead_pool: ["LEAD-01", "LEAD-02", "LEAD-03"],
  aliveness_band: "quiet",
};

test("seedThreadsFromContent finds every thread the authored content can move", () => {
  const seeded = seedThreadsFromContent(data);
  const ids = seeded.map((t) => t.thread_id).sort();
  // Re-pinned 2026-08-30 (dialogue rebuild): the ENC-{ilsa,mara,toby} scenes are
  // the only ones carrying thread_move state_actions, and between them they move
  // exactly these four distinct thread ids.
  //
  // Re-pinned again same day (C2 fix): each role's goal thread was shared
  // across all three ENC beats, so beat 1 alone completed the festival goal.
  // Beats 1 and 2 now move their own per-beat id (`<thread>-1` / `<thread>-2`)
  // and only the final beat (ENC-*-3) still moves the bare ratified id that
  // role-workplace.json's goal_threads names — see FestivalScore.ts's
  // GOAL_COMPLETE_MIN_MOVES and tools/resolver/data/scene-graph.json.
  assert.deepEqual(ids, [
    "ilsa-forge-short",
    "ilsa-forge-short-1",
    "ilsa-forge-short-2",
    "mara-tonic-frost",
    "mara-tonic-frost-1",
    "mara-tonic-frost-2",
    "toby-feast-short",
    "toby-feast-short-1",
    "toby-feast-short-2",
    "toby-the-shelf",
  ]);
  assert.ok(seeded.every((t) => t.status === "live"), "seeded live, or the floor guarantees nobody");
  // Each thread is attributed to the soul whose scene moves it, because the
  // guarantee floor matches on soul, not on thread.
  assert.equal(seeded.find((t) => t.thread_id === "ilsa-forge-short")!.soul, "ilsa");
  assert.equal(seeded.find((t) => t.thread_id === "mara-tonic-frost")!.soul, "mara");
  assert.equal(seeded.find((t) => t.thread_id === "toby-feast-short")!.soul, "toby");
  assert.equal(seeded.find((t) => t.thread_id === "toby-the-shelf")!.soul, "toby");
});

test("resolveWeek writes one day per day of the life", () => {
  const days = resolveWeek(data, base, tuning, { seedThreads: seedThreadsFromContent(data) });
  assert.equal(days.length, tuning.day_loop.days_per_life);
  assert.deepEqual(days.map((d) => d.day), [1, 2, 3, 4, 5]);
});

test("an unseeded life guarantees nobody — which is why seeding is explicit", () => {
  // The floor only holds a soul whose thread is already live. This is the
  // bootstrap trap: with everything unstarted, day 1 places no deep soul by
  // guarantee and the arc can never open. Pinned so the seeding requirement
  // cannot be quietly dropped.
  const unseeded = resolveWeek(data, base, tuning, { seedThreads: [] });
  const seeded = resolveWeek(data, base, tuning, { seedThreads: seedThreadsFromContent(data) });
  assert.notDeepEqual(unseeded[0].slot_fill, seeded[0].slot_fill);
});

test("the week REACTS: a different play produces a different week", () => {
  const seedThreads = seedThreadsFromContent(data).map(
    (t): ThreadState => ({ ...t, status: "unstarted" }),
  );
  const quiet = resolveWeek(data, base, tuning, { seedThreads });
  const active = resolveWeek(data, base, tuning, {
    seedThreads,
    // The player moved toby-feast-short on day 1, so it goes live and Toby is
    // guaranteed from day 2 on. This is the whole point of DayInput.threads.
    // (giver-receive was the pre-rebuild thread here; the rebuilt content moves
    // toby-feast-short instead — seedThreadsFromContent above.)
    outcomes: [{ moved_threads: ["toby-feast-short"] }],
  });
  assert.deepEqual(quiet[0], active[0], "day 1 is identical — the change comes from play");
  assert.notDeepEqual(
    quiet.slice(1).map((d) => d.slot_fill),
    active.slice(1).map((d) => d.slot_fill),
    "moving a thread on day 1 changes who stands where afterwards",
  );
});

test("a picked_location change carries into the following days", () => {
  const seedThreads = seedThreadsFromContent(data);
  const town = resolveWeek(data, base, tuning, { seedThreads });
  const toForest = resolveWeek(data, base, tuning, {
    seedThreads,
    outcomes: [{ picked_location: "forest" }],
  });
  assert.deepEqual(town[0], toForest[0], "day 1 unchanged");
  assert.ok(
    toForest[1].slot_fill.length > 0 && !town[1].slot_fill.every((f, i) =>
      f.screen_id === toForest[1].slot_fill[i]?.screen_id),
    "day 2 resolves against the newly picked location",
  );
});

test("resolveWeek is deterministic — same play, same week", () => {
  const opts = { seedThreads: seedThreadsFromContent(data), outcomes: [{ moved_threads: ["giver-receive"] }] };
  assert.deepEqual(resolveWeek(data, base, tuning, opts), resolveWeek(data, base, tuning, opts));
});

test("applyOutcome promotes unstarted -> live and never invents done", () => {
  const threads: ThreadState[] = [
    { thread_id: "a", soul: "toby", status: "unstarted" },
    { thread_id: "b", soul: "ilsa", status: "live" },
  ];
  const out = applyOutcome(threads, ["a", "b"]);
  assert.equal(out[0].status, "live");
  assert.equal(out[1].status, "live", "already live stays live");
  // The resolver cannot know an arc finished; guessing would silently drop a
  // soul out of the guarantee floor mid-week. Completion is the host's call.
  assert.ok(!out.some((t) => t.status === "done"));
});

test("every deep soul with an arc is guaranteed on a scene screen on every day", () => {
  // The end-to-end promise of W1: across a real week, each deep soul with
  // authored content stands somewhere the player can actually talk to them.
  const days = resolveWeek(data, base, tuning, { seedThreads: seedThreadsFromContent(data) });
  const deepWithArcs = data.sceneGraph.souls
    .filter((s) => s.deep)
    .filter((s) => data.sceneGraph.scenes.some((sc) => sc.soul === s.soul_id));
  for (const soul of deepWithArcs) {
    const screens = new Set(
      data.sceneGraph.scenes.filter((sc) => sc.soul === soul.soul_id).map((sc) => sc.screen_id),
    );
    for (const day of days) {
      assert.ok(
        day.slot_fill.some((f) => f.soul === soul.soul_id && screens.has(f.screen_id)),
        `day ${day.day}: ${soul.soul_id} must stand where they have something to say`,
      );
    }
  }
});
