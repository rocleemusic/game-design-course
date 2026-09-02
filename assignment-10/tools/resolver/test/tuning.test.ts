import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadData, PACKAGE_ROOT } from "../src/data.ts";
import { bondBandOf, bondDelta, DEFAULT_TUNING, loadTuning } from "../src/tuning.ts";
import type { Tuning } from "../src/tuning.ts";
import { resolveDay } from "../src/day.ts";
import { buildGraph, FESTIVAL_SCREEN_ID } from "../src/graph.ts";
import type { DayInput } from "../src/types.ts";

const DATA_DIR = join(PACKAGE_ROOT, "data");

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

const withTuning = (patch: Partial<{ [K in keyof Tuning]: Partial<Tuning[K]> }>): Tuning => {
  const t = structuredClone(DEFAULT_TUNING);
  for (const [k, v] of Object.entries(patch)) Object.assign((t as any)[k], v);
  return t;
};

const hash = (v: unknown) => createHash("sha256").update(JSON.stringify(v)).digest("hex");

// ---------- loader ----------

test("loadTuning: no tuning.json (fixtures, or any bare dir) -> the built-in defaults, no warnings", () => {
  const warnings: string[] = [];
  assert.deepEqual(loadTuning(undefined, warnings), DEFAULT_TUNING);
  const bare = mkdtempSync(join(tmpdir(), "resolver-tuning-"));
  assert.deepEqual(loadTuning(bare, warnings), DEFAULT_TUNING);
  assert.deepEqual(warnings, [], "a missing tuning file is not an accommodation");
});

test("loadTuning: data/tuning.json reads clean — floor is ruled on, the playtest nulls still hold", () => {
  const warnings: string[] = [];
  const t = loadTuning(DATA_DIR, warnings);
  // The shipped file no longer mirrors the pre-tuning constants. THREE intended
  // departures, and nothing else may drift:
  //   1. B1 is ruled (Roc, 2026-07-30) and the floor knob is deliberately ON.
  //   2. bond.trait_coefficients carries per-soul entries. DEFAULT_TUNING cannot
  //      hold these — souls are data, not tuning — so the default is "_default"
  //      alone and the shipped file names the souls it has coefficients for.
  //   3. bond.band_thresholds: RE-SIZED 2026-08-17 for the retired bond ruling
  //      (Roc: "one attentive life MAY reach HIGH"), from 12/82 to 6/18, per
  //      tuning.json's bond._note. DEFAULT_TUNING keeps the slice-era values as
  //      the no-tuning-file fallback; only the shipped file needed to move.
  //      Sized against the WALKED ceiling (walk.test.ts), not maxBondPerLife —
  //      see "the theoretical ceiling is NOT the sizing basis" below.
  assert.equal(t.floor.prefer_unlocked_screens, true, "B1 ruled: guaranteed souls land where you can go");
  assert.equal(t.floor.prefer_scene_screens, true, "W1: and land where they have something to say");
  assert.deepEqual(
    t.bond.trait_coefficients,
    { _default: 1.0, toby: 1.0, ilsa: 0.7 },
    "ilsa < 1.0: the Kinbound is guarded, and a guarded soul's bond moves slower",
  );
  assert.deepEqual(
    t.bond.band_thresholds,
    { mid_min: 6, high_min: 18 },
    "re-sized 2026-08-17 for the retired bond ruling; high_min sits under mara's walked 20",
  );
  assert.deepEqual(
    {
      ...t,
      floor: DEFAULT_TUNING.floor,
      bond: {
        ...t.bond,
        trait_coefficients: DEFAULT_TUNING.bond.trait_coefficients,
        band_thresholds: DEFAULT_TUNING.bond.band_thresholds,
      },
    },
    DEFAULT_TUNING,
    "the floor knobs, the per-soul bond coefficients, and bond.band_thresholds are the ONLY departures",
  );
  assert.equal(t.aliveness_bands.quiet_max_days, null, "band thresholds await playtest");
  assert.ok(
    warnings.some((w) => w.includes("provisional envelope")),
    "provisional envelope is warned, like data.ts",
  );
  assert.ok(!warnings.some((w) => w.includes("unknown key")), "no unknown-key noise from the real file");
});

test("loadTuning: unknown keys and wrong types warn; defaults kept", () => {
  const dir = mkdtempSync(join(tmpdir(), "resolver-tuning-"));
  writeFileSync(
    join(dir, "tuning.json"),
    JSON.stringify({
      availability_weights: { role_anchor: 9, home_evening: "four", mystery: 1 },
      live_leads: { min: 1, max: 5 },
      gravity: { g: 9.8 },
    }),
  );
  const warnings: string[] = [];
  const t = loadTuning(dir, warnings);
  assert.equal(t.availability_weights.role_anchor, 9, "valid override read");
  assert.equal(t.availability_weights.home_evening, 4, "wrong type falls back to default");
  assert.deepEqual(t.live_leads, { min: 1, max: 5 });
  assert.deepEqual(t.arch_promote, DEFAULT_TUNING.arch_promote, "absent sections default");
  assert.ok(warnings.some((w) => w.includes('unknown key "gravity"')));
  assert.ok(warnings.some((w) => w.includes('unknown key "availability_weights.mystery"')));
  assert.ok(warnings.some((w) => w.includes('"availability_weights.home_evening" has the wrong type')));
});

// ---------- regression: no behavior change at defaults ----------

// Pinned pre-tuning outputs (SHA-256 of the day.json), captured before the
// tuning loader existed. Same seeds -> same day.json, file or no file.
// Re-pinned 2026-08-02 alongside enumerateRoutes' strict screen bound
// (walk.ts: the phantom-final-screen fix — routes used to promise one more
// screen than a day can stand on) and the fixture set gaining its minimal T7
// stand-in (emitMain now requires FESTIVAL_SCREEN_ID in every graph). The
// floor-off pairing below was re-verified at the same time: floor off still
// reproduces exactly these hashes against today's data.
//
// `data.*` re-pinned again 2026-08-12. Two independent causes shifted the
// whole day.json stream, both verified, neither a defect (session handoff
// finding #6, GP-148):
//   1. Adding Mara's role_tag changed her weight in the weighted NPC-fill
//      pick, which perturbs which soul lands where from day 1 onward — the
//      draw is deterministic but the pool composition changed.
//   2. GP-145: day-5 Festival Grounds placement is now restricted to the
//      "night" time_block (day.ts's collectOpenings), so a soul who used to
//      seat at T7 in the evening now seats at T7 at night instead — the fix
//      for present_toby/present_ilsa never being true at night on day 5.
// `fixtures` is untouched — the fixtures dir has no Mara role_tag entry and
// carries no day-5 Festival Grounds npc_slots, so neither cause reaches it.
//
// `data.*` re-pinned again 2026-08-24 (T19, Task 5), same cause as the
// 2026-08-12 Mara re-pin above: three more role_tags landed in
// scene-graph.json (bex/Farmer, juno/Priest, pip/Postman — ratified 2026-08-09,
// wired 2026-08-24), which changes their weight in the same weighted NPC-fill
// pick. Verified this is the whole cause and not a defect the same way the
// 2026-08-12 note did: with `data/scene-graph.json` reverted to its
// pre-Task-5 content (the three souls back to no `role_tag`), both regression
// tests below pass unchanged against the OLD pinned hashes. Day 1 still
// coincides between floor-on and floor-off, same invariant as before.
//
// `data.*` re-pinned again 2026-08-30 (dialogue rebuild): scene-graph.json was
// fully rebuilt — 41 new scenes across new souls (a `narrator` was added) and
// new role coverage — which shifts the weighted NPC-fill draw the same way the
// role_tag additions above did. Verified this is the whole cause, not a defect:
// day 1's floor-off output still coincides with floor-on (615daa3a…), and the
// floor knob still visibly moves placement on days 2-5 (daysChanged=4 below).
//
// BOTH re-pinned again 2026-08-31 (spell-beat randomization): `resolveDay`'s
// return grew a new field, `spell_beat_order` (day.ts) — a soul's SPB-* scene
// ids in one random per-life permutation, feeding the new `spellbeat_current`
// gate. This changes every `hash(out)` here on shape alone; the NPC-fill draw
// itself is untouched (`spell_beat_order` is computed off a SEPARATE rng
// stream keyed to day 1, see day.ts's comment on `lifeRng`), so day 1's
// floor-off/floor-on coincidence (443b9b85…) and the floor's day 2-5 effect
// both still hold — verified below, not just asserted here.
//
// `data` re-pinned AGAIN the same day (fixed placement): three deep souls now
// carry `Soul.fixed_placement` (Mara/Toby mornings+afternoons, Ilsa
// afternoons+evenings) and Juno carries `confined_location: "town"` — both
// applied in day.ts BEFORE the guarantee floor or the ordinary draw ever run,
// so they reshape the NPC-fill draw on EVERY day, floor on or off. This is
// what breaks day 1's long-standing floor-off/floor-on coincidence (see
// RULED_FLOOR_HASHES' own note below) — the fixed/confined souls are seated
// identically either way, but the SOULS LEFT for day 1's guarantee floor to
// place differ now, so the floor toggle has something to act on there too.
// `fixtures` is untouched: fixture data carries no `fixed_placement`/
// `confined_location` at all.
const PRE_TUNING_HASHES: Record<string, string[]> = {
  fixtures: [
    "8ccfa1b37ffd513fdda5fbf47c2264a0418870d477e776d818dc81c67f64e7da",
    "636fe8584fa241f8fe06707fc05c845ed96e82a15c2e1f68db5e142d23b3e9f7",
    "812978ef431a4f7865dde6af2ceb2a8356f11ace18b9a772965e28f33f966d31",
    "521406974747744d3c95b66c4a3977f3ae5663ccdfc810f64ca7e60205a2cd75",
    "0494649d91b4acbe824be50a397c182c6a8dd058d9bcaacae455b3709dd08cc5",
  ],
  data: [
    "d0f243376382b4bdab6a1f0831c8429e1eb5dae05dac170b917617fe47da83a6",
    "6fa24bdb0604ddc5461c3dd85382c0fca312c6f2cfc3f31da8f8cdb0a6459407",
    "94c8af830196b127397229e026fdc03f262c3c97268b243c255b67a48b967faf",
    "0c4f5208211b526eebb396744d17045ff0af369d8572ec5734f50b11545c73a1",
    "0c5b2ce03eb15885909183bcc84c17d6b75c4319a0f470f9bd834561ba0f52a5",
  ],
};

test("regression: no tuning file -> day.json identical to pre-tuning output (pinned hashes, days 1-5)", () => {
  const data = loadData();
  const tuning = loadTuning(); // fixtures dir has no tuning.json -> defaults
  for (let day = 1; day <= 5; day++) {
    const out = resolveDay(data, { ...baseInput, day }, tuning);
    assert.equal(hash(out), PRE_TUNING_HASHES.fixtures[day - 1], `fixtures day ${day} drifted`);
    assert.deepEqual(out, resolveDay(data, { ...baseInput, day }), "omitting tuning = same defaults");
  }
});

// The shipped day.json after B1 (floor ON). Re-pinned 2026-07-30 alongside the
// ruling — never re-pin these without the floor-off test below still passing.
// The shipped day.json after B1 (floor ON) and W1 (scene-screen floor ON).
// Re-pinned 2026-07-31 alongside prefer_scene_screens — never re-pin these
// without the floor-off test above still passing, which is what proves the
// drift comes from the ruled knobs and from nothing else.
// Re-pinned 2026-08-02 alongside the enumerateRoutes strict bound (see the
// PRE_TUNING_HASHES note above). Day 1's floor-on output now coincides with
// floor-off — with the phantom final screen gone, day 1's placement no longer
// has a locked-screen pick for the floor to move — so the "floor changes
// placement" proof below asserts over the whole week, not per day.
// Re-pinned 2026-08-12 for the same two causes as PRE_TUNING_HASHES.data
// above (Mara's role_tag weight, GP-145's day-5 night restriction) — see that
// comment for detail. Day 1 still coincides with floor-off, unaffected by
// either cause.
// Re-pinned again 2026-08-24 (T19, Task 5) — same cause as PRE_TUNING_HASHES
// .data's 2026-08-24 note (bex/juno/pip role_tags). Day 1 still coincides
// with floor-off.
// Re-pinned again 2026-08-30 (dialogue rebuild) — same cause as PRE_TUNING_
// HASHES.data's 2026-08-30 note (the 41-scene rebuild reshaped the NPC-fill
// draw). Day 1 still coincides with floor-off; days 2-5 still differ.
// Re-pinned again 2026-08-31 — same shape-only cause as PRE_TUNING_HASHES'
// 2026-08-31 note (the new `spell_beat_order` field). Day 1 still coincides
// with floor-off (443b9b85…); days 2-5 still differ, so the floor knob's
// effect survives untouched.
// Re-pinned AGAIN the same day (fixed placement) — same cause as
// PRE_TUNING_HASHES' matching note above. Day 1's floor-on/floor-off
// coincidence, true since 2026-08-02, is what breaks now: the fixed/confined
// souls seat identically whether the floor is on or off, but who is LEFT for
// day 1's guarantee floor to place differs from before, so the floor knob has
// something to act on there again. `daysChanged >= 1` (this file's own
// assertion) still holds — it was never a per-day claim, only "at least
// one" — and now holds more strongly than before.
const RULED_FLOOR_HASHES = [
  "2569e5f0d0fb3b80070a49b94ac58bb0d01c7cdd4d9b385d2c514a6e4dc8385c",
  "8fec5ae7757fc0d48d3da20cd073793bbd272022199c1ad6afd68498d9bad32c",
  "33fc6413d4c97d8a791232a65c59eb3db424b1b1214fdc11bf5cb2f13bbed1f4",
  "9bc274ea2e697ac9f71fbd32c82bc48d1e59c25fec2b60af90e44bff232846e3",
  "5bdfcacf447ae0d93e8e639c3ad572d31b6a4b965675a09d7f771c006b22f27a",
];

// This pair is the point: the floor-off run must still reproduce the ORIGINAL
// pre-tuning hashes against today's data. That is what proves the drift in the
// shipped output comes from the ruled floor knob and from nothing else — not
// from the T7 status edit, the Demo archetypes, or the T5/F7 schema additions.
test("regression: data/ with the floor forced off -> still byte-identical to pre-tuning output", () => {
  const data = loadData(DATA_DIR, []);
  const floorOff = withTuning({ floor: { prefer_unlocked_screens: null } });
  for (let day = 1; day <= 5; day++) {
    const out = resolveDay(data, { ...baseInput, day }, floorOff);
    assert.equal(hash(out), PRE_TUNING_HASHES.data[day - 1], `data day ${day} drifted with the floor off`);
  }
});

test("regression: data/tuning.json as shipped (floor ON, B1 ruled) -> the re-pinned output", () => {
  const data = loadData(DATA_DIR, []);
  const tuning = loadTuning(DATA_DIR, []);
  assert.equal(tuning.floor.prefer_unlocked_screens, true, "the shipped file is the floor-on case");
  let daysChanged = 0;
  for (let day = 1; day <= 5; day++) {
    const out = resolveDay(data, { ...baseInput, day }, tuning);
    assert.equal(hash(out), RULED_FLOOR_HASHES[day - 1], `data day ${day} drifted`);
    if (hash(out) !== PRE_TUNING_HASHES.data[day - 1]) daysChanged++;
  }
  // Over the week, not per day: since the strict route bound (2026-08-02),
  // day 1 has no locked-screen pick for the floor to move, so its floor-on
  // and floor-off outputs coincide. The knob must still visibly act somewhere.
  assert.ok(daysChanged >= 1, "the floor should change placement on at least one day");
});

// ---------- knobs actually turn ----------

test("availability_weights override changes the draw", () => {
  const data = loadData();
  const flat = withTuning({ availability_weights: { role_anchor: 0, home_evening: 0, base: 1 } });
  const a = resolveDay(data, baseInput);
  const b = resolveDay(data, structuredClone(baseInput), flat);
  assert.notDeepEqual(a.slot_fill, b.slot_fill, "uniform weights should reshuffle the fill");
  assert.deepEqual(b, resolveDay(data, structuredClone(baseInput), flat), "still deterministic");
});

test("per_block_multiplier scales declared capacity: round half-up, floor at 0", () => {
  const data = loadData();
  const countBy = (fill: { screen_id: string; time_block: string }[]) => {
    const m = new Map<string, number>();
    for (const f of fill) m.set(`${f.screen_id}|${f.time_block}`, (m.get(`${f.screen_id}|${f.time_block}`) ?? 0) + 1);
    return m;
  };

  // 0.5: T1 {2,2,2} -> {1,1,1}; T2 {2,1,1} -> {1,1,1} (0.5 rounds UP to 1).
  const half = resolveDay(data, baseInput, withTuning({ npc_slot_defaults: { per_block_multiplier: 0.5 } }));
  const halfCounts = countBy(half.slot_fill);
  for (const k of ["T1|morning", "T1|afternoon", "T1|evening", "T2|morning", "T2|afternoon", "T2|evening"]) {
    assert.equal(halfCounts.get(k) ?? 0, 1, `${k} at x0.5`);
  }

  // 0.25: count 2 -> round(0.5) = 1 (half-up); count 1 -> round(0.25) = 0.
  const quarter = resolveDay(data, baseInput, withTuning({ npc_slot_defaults: { per_block_multiplier: 0.25 } }));
  const quarterCounts = countBy(quarter.slot_fill);
  assert.equal(quarterCounts.get("T1|morning"), 1);
  assert.equal(quarterCounts.get("T2|morning"), 1);
  assert.equal(quarterCounts.get("T2|afternoon") ?? 0, 0, "count 1 x 0.25 rounds to 0");
  assert.equal(quarterCounts.get("T2|evening") ?? 0, 0);

  // 0: every capacity floors at 0 -> nobody stands anywhere (no live threads,
  // so the guarantee floor has nothing to demand).
  const noThreads: DayInput = {
    ...baseInput,
    threads: [{ thread_id: "giver-receive", soul: "toby", status: "done" }],
  };
  const zero = resolveDay(data, noThreads, withTuning({ npc_slot_defaults: { per_block_multiplier: 0 } }));
  assert.deepEqual(zero.slot_fill, []);
});

test("floor.prefer_unlocked_screens=true: guaranteed souls stand on start/reachable screens, days 1-5, both locations", () => {
  const data = loadData(DATA_DIR, []);
  const prefer = withTuning({ floor: { prefer_unlocked_screens: true } });
  const deepLive: DayInput = {
    ...baseInput,
    threads: [
      { thread_id: "giver-receive", soul: "toby", status: "live" },
      { thread_id: "keeper-loss", soul: "mara", status: "live" },
      { thread_id: "rite-doubt", soul: "ilsa", status: "live" },
    ],
  };
  const unlocked = new Set(
    data.screens
      .filter((s) => s.status === "start" || s.status.startsWith("reachable"))
      .map((s) => s.screen_id),
  );
  for (const picked_location of ["town", "forest"]) {
    const locationScreens = new Set(
      data.screens.filter((s) => s.location === picked_location).map((s) => s.screen_id),
    );
    for (let day = 1; day <= 5; day++) {
      const out = resolveDay(data, { ...deepLive, day, picked_location }, prefer);
      for (const soul of ["toby", "mara", "ilsa"]) {
        // Festival Grounds (T7) is a day-5-only exception to "stays in the
        // picked location" (C1 part 1, 2026-08-30): it is a mandatory final
        // destination regardless of where day 5 started, so a forest-picked
        // day 5 is expected to guarantee-place a deep soul there even though
        // T7 itself is a "town" screen. Days 1-4 still hold to picked_location.
        const inLocation = (screenId: string) =>
          locationScreens.has(screenId) || (day >= 5 && screenId === FESTIVAL_SCREEN_ID);
        const placements = out.slot_fill.filter((f) => f.soul === soul && inLocation(f.screen_id));
        assert.ok(placements.length >= 1, `${picked_location} day ${day}: ${soul} missing (floor broken)`);
        assert.ok(
          placements.some((f) => unlocked.has(f.screen_id)),
          `${picked_location} day ${day}: ${soul} guaranteed only on locked screens: ` +
            placements.map((f) => f.screen_id).join(","),
        );
      }
    }
  }
});

test("floor.prefer_unlocked_screens null/false: byte-identical to current behavior", () => {
  const data = loadData(DATA_DIR, []);
  const nullT = withTuning({ floor: { prefer_unlocked_screens: null } });
  const falseT = withTuning({ floor: { prefer_unlocked_screens: false } });
  for (let day = 1; day <= 5; day++) {
    const plain = resolveDay(data, { ...baseInput, day });
    assert.deepEqual(resolveDay(data, { ...baseInput, day }, nullT), plain);
    assert.deepEqual(resolveDay(data, { ...baseInput, day }, falseT), plain);
  }
});

test("live_leads: min/max range respected, capped by the pool", () => {
  const data = loadData();
  const wide = withTuning({ live_leads: { min: 1, max: 4 } });
  const seen = new Set<number>();
  for (let life = 1; life <= 20; life++) {
    for (let day = 1; day <= 5; day++) {
      const out = resolveDay(data, { ...baseInput, life, day }, wide);
      assert.ok(out.live_leads.length >= 1 && out.live_leads.length <= 4, `got ${out.live_leads.length}`);
      seen.add(out.live_leads.length);
    }
  }
  assert.ok(seen.size > 1, "a 1..4 range should produce more than one count across 100 seeds");

  const pinned = withTuning({ live_leads: { min: 3, max: 3 } });
  for (let day = 1; day <= 5; day++) {
    assert.equal(resolveDay(data, { ...baseInput, day }, pinned).live_leads.length, 3);
  }
});

// ---------- arch promote stamped into the graph ----------

test("buildGraph stamps tuning arch_promote numbers into the Arch's promotes_to condition", () => {
  const data = loadData(DATA_DIR, []);
  const archOf = (g: ReturnType<typeof buildGraph>) =>
    g.screens.find((s) => s.screen_id === "T1")!.examinables!.find((e) => e.id === "arch")!;

  const stamped = archOf(buildGraph(data, loadTuning(DATA_DIR, [])));
  assert.ok(stamped.promotes_to!.condition.includes("threads_moved(3 of 5)"), stamped.promotes_to!.condition);
  assert.ok(stamped.promotes_to!.condition.includes("role_goals_advanced(2)"));
  assert.equal(stamped.promotes_to!.tier, "hard-key", "tier untouched");

  const custom = archOf(
    buildGraph(data, withTuning({ arch_promote: { threads_moved_min: 4, of_threads: 6, role_goals_advanced_min: 1 } })),
  );
  assert.ok(custom.promotes_to!.condition.includes("threads_moved(4 of 6)"));
  assert.ok(custom.promotes_to!.condition.includes("role_goals_advanced(1)"));

  // Source data is never mutated — the proposal pointer text survives in data/.
  const sourceArch = data.screens.find((s) => s.screen_id === "T1")!.examinables!.find((e) => e.id === "arch")!;
  assert.ok(sourceArch.promotes_to!.condition.includes("arch-promote-proposal.json"), "input data untouched");

  // The unruled forest promotes_to (old_carvings, condition null) is not stamped.
  const carvings = buildGraph(data, loadTuning(DATA_DIR, []))
    .screens.find((s) => s.screen_id === "F3")!
    .examinables!.find((e) => e.id === "old_carvings")!;
  assert.equal(carvings.promotes_to!.condition, null, "null condition stays null — pending the gate");
});

// ---------- bond scoring (W1a) ----------
// The bond is ONE hidden count per soul (guardrails.md check 2). These tests
// pin the SHAPE of that rule as much as the numbers: a delta is a function of
// category and soul, and nothing here stores a per-category score.

test("bondBandOf: thresholds are inclusive minimums, and match predicates.ts BAND_VALUE", () => {
  const b = DEFAULT_TUNING.bond;
  const { mid_min, high_min } = b.band_thresholds;
  assert.equal(bondBandOf(0, b), 0, "an untouched soul is low");
  assert.equal(bondBandOf(mid_min - 1, b), 0, "just under mid is still low");
  assert.equal(bondBandOf(mid_min, b), 1, "mid_min is inclusive");
  assert.equal(bondBandOf(high_min - 1, b), 1);
  assert.equal(bondBandOf(high_min, b), 2, "high_min is inclusive");
  // 0/1/2 is not arbitrary — predicates.ts compiles bond_band(x)=mid to
  // `bondLevel_x == 1`, so these ARE the values the ink guard reads.
});

test("GP-115: bondBandOf's low default is explicit, not a silent fallthrough", () => {
  // Ruled by Roc 2026-08-06: low is the floor and covers the zero/unbonded
  // case. This pins that the code actually does that, for zero AND for the
  // uninitialised/negative case a fresh soul or a bad delta could produce —
  // both must land on the SAME explicit low, never throw, never null. A
  // three-way bond_band fork in content is exhaustive only as long as this
  // holds; see the predicate vocabulary note in
  // narrative-pipeline/templates/choice-node-schema.md.
  const b = DEFAULT_TUNING.bond;
  assert.equal(bondBandOf(0, b), 0, "an unbonded soul resolves to low, the explicit floor");
  assert.equal(bondBandOf(-1, b), 0, "a count that should never be negative still lands on low, not an error");
});

test("bondDelta: category weights it, the soul's trait coefficient scales it", () => {
  const b = loadTuning(DATA_DIR).bond;
  assert.equal(bondDelta("Intimacy", "toby", b), 2, "Intimacy 2 x toby 1.0");
  assert.equal(bondDelta("Recognition", "toby", b), 3, "Recognition is weighted highest");
  assert.ok(
    Math.abs(bondDelta("Intimacy", "ilsa", b) - 1.4) < 1e-9,
    "the Kinbound is guarded: 2 x 0.7",
  );
  assert.equal(bondDelta("Intimacy", "mara", b), 2, "an uncarded soul falls back to _default");
  assert.equal(bondDelta("Flattery", "toby", b), 0, "outside the closed enum scores nothing");
});

// `maxBondPerLife` and the two tests that measured a soul's bond_event
// ceiling against band_thresholds are RETIRED (Roc, 2026-08-31): bond_band
// gating is parked (`predicates.ts`, superseded by `talk_days`) and zero
// authored scenes gate on it any more — checking whether a soul's weighted
// bond_event total could ever clear HIGH or MID was checking a ceiling
// nothing in the shipped content reads. System 1 (talk_days, the cumulative
// count of days talked) is the real gate now: greeting tiers, festival
// attendance, NGT-mara's reveal. See `walk.test.ts` for the coverage tests
// that measure what a real week can actually reach.

test("a bond_band-gated beat exists for every band, so no variant is dead content", () => {
  const data = loadData(DATA_DIR, []);
  for (const scene of data.sceneGraph.scenes) {
    const bands = new Set(
      scene.choice_nodes
        .flatMap((n) => n.availability_conditions)
        .map((c) => /^bond_band\([^)]+\)\s*=\s*(low|mid|high)$/.exec(c)?.[1])
        .filter(Boolean) as string[],
    );
    if (bands.size === 0) continue;
    assert.deepEqual(
      [...bands].sort(),
      ["high", "low", "mid"],
      `${scene.scene_id}: a band-gated scene must cover all three, or a run falls through it`,
    );
  }
});

// `demo_multiplier is REDUNDANT...` is RETIRED alongside `maxBondPerLife`
// (Roc, 2026-08-31) — it existed only to prove the multiplier scales
// bond_event's weighted delta linearly, a System 2 internal with no bearing
// on System 1 (talk_days), the mechanic that actually gates content now.

test("bond: inverted thresholds warn and fall back; unknown keys warn", () => {
  const dir = mkdtempSync(join(tmpdir(), "resolver-tuning-"));
  writeFileSync(
    join(dir, "tuning.json"),
    JSON.stringify({
      bond: {
        band_thresholds: { mid_min: 20, high_min: 5 },
        category_weights: { Trust: 4, Charisma: 9 },
        demo_multiplier: "loud",
      },
    }),
  );
  const warnings: string[] = [];
  const t = loadTuning(dir, warnings);
  assert.deepEqual(
    t.bond.band_thresholds,
    DEFAULT_TUNING.bond.band_thresholds,
    "mid above high would read as a band that skips, not as a config error",
  );
  assert.equal(t.bond.category_weights.Trust, 4, "a legal category still tunes");
  assert.equal(t.bond.category_weights.Charisma, undefined, "outside the closed enum is dropped");
  assert.equal(t.bond.demo_multiplier, 1.0, "wrong type keeps the default");
  assert.ok(warnings.some((w) => w.includes("mid_min")));
  assert.ok(warnings.some((w) => w.includes("Charisma")));
  assert.ok(warnings.some((w) => w.includes("demo_multiplier")));
});

test("trait_coefficients is open-keyed: souls are data, not tuning", () => {
  const dir = mkdtempSync(join(tmpdir(), "resolver-tuning-"));
  writeFileSync(
    join(dir, "tuning.json"),
    JSON.stringify({ bond: { trait_coefficients: { nell: 0.5 } } }),
  );
  const warnings: string[] = [];
  const t = loadTuning(dir, warnings);
  assert.equal(t.bond.trait_coefficients.nell, 0.5, "a soul the defaults never heard of still tunes");
  assert.equal(t.bond.trait_coefficients._default, 1.0, "and the fallback survives");
  assert.ok(!warnings.some((w) => w.includes("nell")), "an open map must not warn on new souls");
});

test("graph.json carries the bond block, so the host needs no second reader on tuning.json", () => {
  const data = loadData(DATA_DIR, []);
  const tuning = loadTuning(DATA_DIR, []);
  const graph = buildGraph(data, tuning);
  assert.deepEqual(graph.bond, tuning.bond, "stamped at build, like the Arch's promote condition");
  assert.equal(graph.bond.trait_coefficients.ilsa, 0.7);
});

test("day_loop.moves_per_day is tunable and defaults to the old hard-coded 3", () => {
  assert.equal(DEFAULT_TUNING.day_loop.moves_per_day, 3, "same value the day loop shipped with");
  const dir = mkdtempSync(join(tmpdir(), "resolver-tuning-"));
  writeFileSync(join(dir, "tuning.json"), JSON.stringify({ day_loop: { moves_per_day: 5 } }));
  assert.equal(loadTuning(dir, []).day_loop.moves_per_day, 5);
});

// ---------- W1: the guarantee floor must guarantee something usable ----------

test("floor.prefer_scene_screens: a guaranteed soul lands where they have a scene", () => {
  const data = loadData(DATA_DIR, []);
  // Toby's authored scenes sit on T2, T6 and F1. Before this flag the floor
  // could put him on any town screen, so the arc was unreachable in play.
  const sceneScreens = new Set(
    data.sceneGraph.scenes.filter((s) => s.soul === "toby").map((s) => s.screen_id),
  );
  const on = withTuning({ floor: { prefer_unlocked_screens: true, prefer_scene_screens: true } });
  for (let day = 1; day <= 5; day++) {
    const out = resolveDay(data, { ...baseInput, day }, on);
    const toby = out.slot_fill.filter((f) => f.soul === "toby");
    assert.ok(
      toby.some((f) => sceneScreens.has(f.screen_id)),
      `day ${day}: toby is guaranteed somewhere he has something to say`,
    );
  }
});

test("floor.prefer_scene_screens off -> byte-identical to the flag never existing", () => {
  const data = loadData(DATA_DIR, []);
  const off = withTuning({ floor: { prefer_unlocked_screens: true, prefer_scene_screens: null } });
  const asFalse = withTuning({ floor: { prefer_unlocked_screens: true, prefer_scene_screens: false } });
  for (let day = 1; day <= 5; day++) {
    assert.deepEqual(
      resolveDay(data, { ...baseInput, day }, off),
      resolveDay(data, { ...baseInput, day }, asFalse),
      `day ${day}: null and false are the same off`,
    );
  }
});

test("a soul with no authored scenes is unaffected by the scene floor", () => {
  const data = loadData(DATA_DIR, []);
  // mara is deep but carries no authored scene, so narrowing to scene screens
  // would find nothing; the draw must widen rather than throw or drop her.
  const threads = [{ thread_id: "keeper-corner", soul: "mara", status: "live" as const }];
  const on = withTuning({ floor: { prefer_unlocked_screens: true, prefer_scene_screens: true } });
  const out = resolveDay(data, { ...baseInput, threads }, on);
  assert.ok(
    out.slot_fill.some((f) => f.soul === "mara"),
    "the guarantee still holds for a soul the narrowing cannot help",
  );
});
