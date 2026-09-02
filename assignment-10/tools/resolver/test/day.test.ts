import { test } from "node:test";
import assert from "node:assert/strict";
import { loadData } from "../src/data.ts";
import { resolveDay } from "../src/day.ts";
import { daySeed } from "../src/seed.ts";
import type { DayInput } from "../src/types.ts";

const data = loadData();

const baseInput: DayInput = {
  slot: 1,
  life: 2,
  day: 3,
  picked_location: "town",
  threads: [
    { thread_id: "giver-receive", soul: "toby", status: "live" },
    { thread_id: "keeper-loss", soul: "mara", status: "unstarted" },
  ],
  lead_pool: ["LEAD-01", "LEAD-02", "LEAD-03", "LEAD-04"],
  aliveness_band: "quiet",
};

test("seed is SHA-256 of slot|life|day", () => {
  assert.equal(
    daySeed(1, 2, 3),
    "7ee74ca6db4b367eec57934b47ce1e5b6df3bec871194875b45bb7de23168c0b",
  );
});

test("same seed in = identical output (deep equality)", () => {
  const a = resolveDay(data, baseInput);
  const b = resolveDay(data, structuredClone(baseInput));
  assert.deepEqual(a, b);
  assert.equal(a.seed, daySeed(1, 2, 3));
  assert.equal(a.day, 3);
});

test("a different slot|life|day gives a different seed", () => {
  const a = resolveDay(data, baseInput);
  const b = resolveDay(data, { ...baseInput, day: 4 });
  assert.notEqual(a.seed, b.seed);
});

test("slot fill honors capacities and one-place-at-a-time", () => {
  const day = resolveDay(data, baseInput);
  const counts = new Map<string, number>();
  const perBlock = new Map<string, Set<string>>();
  for (const f of day.slot_fill) {
    const k = `${f.screen_id}|${f.time_block}`;
    counts.set(k, (counts.get(k) ?? 0) + 1);
    const set = perBlock.get(f.time_block) ?? new Set();
    assert.ok(!set.has(f.soul), `${f.soul} placed twice in ${f.time_block}`);
    set.add(f.soul);
    perBlock.set(f.time_block, set);
  }
  for (const screen of data.screens) {
    for (const cap of screen.npc_slots ?? []) {
      const used = counts.get(`${screen.screen_id}|${cap.time_block}`) ?? 0;
      assert.ok(used <= cap.count, `${screen.screen_id} ${cap.time_block}: ${used} > ${cap.count}`);
    }
  }
});

test("guarantee floor: the deep soul with a live thread stands in the picked location", () => {
  for (const day of [1, 2, 3, 4, 5]) {
    const resolved = resolveDay(data, { ...baseInput, day });
    const townScreens = new Set(
      data.screens.filter((s) => s.location === "town").map((s) => s.screen_id),
    );
    const tobyPlacements = resolved.slot_fill.filter(
      (f) => f.soul === "toby" && townScreens.has(f.screen_id),
    );
    assert.ok(tobyPlacements.length >= 1, `day ${day}: toby (live thread) missing from town`);
  }
});

test("no floor for unstarted/done threads — ordinary draw only (may sit a day out)", () => {
  const input: DayInput = {
    ...baseInput,
    threads: [{ thread_id: "giver-receive", soul: "toby", status: "done" }],
  };
  // Just proves it resolves without the floor forcing anything; determinism holds.
  assert.deepEqual(resolveDay(data, input), resolveDay(data, structuredClone(input)));
});

test("item rolls come from the bucket, with explicit empty entries", () => {
  const day = resolveDay(data, baseInput);
  assert.equal(day.item_rolls.length, 1);
  const roll = day.item_rolls[0];
  assert.equal(roll.slot_id, "SL-T2-01");
  assert.ok(["wool", "grass", "empty"].includes(roll.item), `unexpected roll: ${roll.item}`);
});

test("aliveness bands gate rare entries as selection weights", () => {
  // At quiet, the min_band:"alive" lantern can never roll, over all 5-day seeds.
  for (const day of [1, 2, 3, 4, 5]) {
    const quiet = resolveDay(data, { ...baseInput, day, aliveness_band: "quiet" });
    assert.notEqual(quiet.item_rolls[0].item, "lit_lantern");
  }
  // At alive, the entry is at least in the pool (find a seed where it rolls).
  let seen = false;
  for (let life = 1; life <= 40 && !seen; life++) {
    for (let day = 1; day <= 5 && !seen; day++) {
      const d = resolveDay(data, { ...baseInput, life, day, aliveness_band: "alive" });
      if (d.item_rolls[0].item === "lit_lantern") seen = true;
    }
  }
  assert.ok(seen, "min_band entry never rolled at its band across 200 seeds");
});

test("live leads: 2-3 picked from the authored pool, passthrough band", () => {
  const day = resolveDay(data, baseInput);
  assert.ok(day.live_leads.length >= 2 && day.live_leads.length <= 3);
  for (const lead of day.live_leads) assert.ok(baseInput.lead_pool.includes(lead));
  assert.equal(new Set(day.live_leads).size, day.live_leads.length, "no duplicate leads");
  assert.equal(day.aliveness_band, "quiet");
});
