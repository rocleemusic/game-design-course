// The single tuning home (Roc's rule, 2026-07-30: all global game settings
// tune in one place). Loads <dataDir>/tuning.json when it exists; otherwise
// the built-in defaults below, which are byte-identical to the constants the
// resolver shipped with — no file, no behavior change.
//
// Same normalize-and-warn pattern as data.ts: the loader accepts the file's
// provisional envelope, fills anything missing from the defaults, warns on
// unknown keys and wrong-typed values, and never rewrites the file.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { FIXTURES_DIR } from "./data.ts";

/**
 * Bond scoring (W1a). ONE hidden count per soul — guardrails.md check 2 flags a
 * second stored bond number, and pipeline.md step 9 is explicit that Trust /
 * Intimacy / Recognition are WEIGHTS ON A SINGLE DELTA, never stored
 * per-soul dimensions. So these are inputs to one number; nothing here is a
 * per-category score, and nothing downstream may keep one.
 *
 * Sized against the slice's real content, not guessed. After the W1 content
 * pass a fully attentive life yields ~24 (Toby) / ~29 (Ilsa), so:
 * mid_min 12 => one attentive life earns mid, and about half of one does not.
 * high_min 32 => a second life is needed.
 * These numbers serve a RULING (Roc: one life mid, two lives high), so when
 * content changes they get re-sized — test/tuning.test.ts derives the totals
 * from the real scene data and fails when the ruling stops holding.
 * demo_multiplier scales the DELTA (not the thresholds), so 2.0 reaches high
 * inside one life for demonstration and the real bar stays readable.
 */
export interface BondTuning {
  /** action-category -> weight. Closed enum (choice-node-schema.md). */
  category_weights: Record<string, number>;
  /** soul_id -> coefficient; "_default" applies to any soul not listed. */
  trait_coefficients: Record<string, number>;
  band_thresholds: { mid_min: number; high_min: number };
  demo_multiplier: number;
}

/** The closed action-category enum (choice-node-schema.md, pipeline.md step 9). */
// "Respect" retired 2026-08-10 (Roc): folded into Trust and Recognition. Nine authored
// threads recorded zero Respect deltas, and pipeline.md step 9 no longer defines it.
export const BOND_CATEGORIES = ["Trust", "Intimacy", "Recognition"] as const;

export interface Tuning {
  arch_promote: {
    threads_moved_min: number;
    of_threads: number;
    role_goals_advanced_min: number;
  };
  bond: BondTuning;
  /** was hard-coded in the emitted day loop; a flat section, like the others. */
  day_loop: { moves_per_day: number; days_per_life: number };
  availability_weights: {
    role_anchor: number;
    home_evening: number;
    base: number;
  };
  floor: {
    // null = pending ruling; treated exactly like false (current behavior).
    prefer_unlocked_screens: boolean | null;
    // W1: restrict the guarantee draw to screens where the soul has an authored
    // scene, so "guaranteed to appear" means "you can actually talk to them".
    // null = off, byte-identical to pre-W1 output.
    prefer_scene_screens: boolean | null;
  };
  live_leads: { min: number; max: number };
  aliveness_bands: {
    // null = thresholds not yet set (await playtest); nothing consumes them yet.
    quiet_max_days: number | null;
    waking_max_days: number | null;
  };
  npc_slot_defaults: { per_block_multiplier: number };
}

// Defaults mirror the pre-tuning constants exactly:
//   day.ts weights (5/4/1), the 2-or-3 live-lead coin flip, multiplier 1.0,
//   the arch-promote-proposal thresholds (3 of 5, 2), and both pending nulls.
export const DEFAULT_TUNING: Tuning = {
  arch_promote: { threads_moved_min: 3, of_threads: 5, role_goals_advanced_min: 2 },
  bond: {
    category_weights: { Trust: 2, Intimacy: 2, Recognition: 3 },
    trait_coefficients: { _default: 1.0 },
    band_thresholds: { mid_min: 12, high_min: 36 },
    demo_multiplier: 1.0,
  },
  day_loop: { moves_per_day: 3, days_per_life: 5 },
  availability_weights: { role_anchor: 5, home_evening: 4, base: 1 },
  floor: { prefer_unlocked_screens: null, prefer_scene_screens: null },
  live_leads: { min: 2, max: 3 },
  aliveness_bands: { quiet_max_days: null, waking_max_days: null },
  npc_slot_defaults: { per_block_multiplier: 1.0 },
};

/**
 * The band a raw bond count falls in: 0 low / 1 mid / 2 high, matching
 * predicates.ts BAND_VALUE so the compiled `bondLevel_<soul> == N` guard reads
 * it directly. Thresholds are inclusive minimums.
 *
 * RULED (Roc, 2026-08-06 / GP-115): `low` is the floor band, on purpose, for
 * every count that does not clear `mid_min` — zero, negative (should not
 * happen, but is not special-cased into an error), and any not-yet-bonded
 * soul. This is a real return value, not a silent fallthrough: a three-way
 * `bond_band(soul) = low | mid | high` fork in content is exhaustive BY THIS
 * CONTRACT and needs no `else` — see the predicate vocabulary note in
 * narrative-pipeline/templates/choice-node-schema.md. If that ever stops
 * being true (a fourth band, or a case this function throws on), every such
 * fork gets an unauthored hole. Pinned by test: "GP-115: bondBandOf's low
 * default is explicit, not a silent fallthrough" (tuning.test.ts).
 */
export function bondBandOf(count: number, t: BondTuning): 0 | 1 | 2 {
  const LOW = 0; // the explicit default band — see the ruling above, not an error case
  const MID = 1;
  const HIGH = 2;
  if (count >= t.band_thresholds.high_min) return HIGH;
  if (count >= t.band_thresholds.mid_min) return MID;
  return LOW;
}

/**
 * One delta for one bond_event. The category weights it, the soul's fixed card
 * trait scales it, and demo_multiplier scales the whole thing. An unknown
 * category scores 0 rather than throwing: the enum is enforced at authoring
 * time by compileStateActions, and a scoring function is the wrong place to
 * fail a build.
 */
export function bondDelta(category: string, soulId: string, t: BondTuning): number {
  const weight = t.category_weights[category] ?? 0;
  const coefficient = t.trait_coefficients[soulId] ?? t.trait_coefficients._default ?? 1;
  return weight * coefficient * t.demo_multiplier;
}

/** The Arch's promotes_to condition text, with the tuned numbers stamped in. */
export function archPromoteCondition(t: Tuning["arch_promote"]): string {
  return (
    `promote(T1.arch) := threads_moved(${t.threads_moved_min} of ${t.of_threads})` +
    ` AND role_goals_advanced(${t.role_goals_advanced_min})` +
    ` — thresholds from tuning.json arch_promote; bond barred (RULED 2026-07-29)`
  );
}

// Envelope / commentary keys the file may carry at any level.
const ENVELOPE_KEYS = new Set(["provisional", "generated", "note", "_note"]);
// Documented in the file but deliberately not tunable (register/guardrails contract).
const KNOWN_UNTUNABLE = new Set(["word_ceilings"]);

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

// Per-key value checks. Everything is a finite number unless listed here.
const NULLABLE_NUMBER_KEYS = new Set(["quiet_max_days", "waking_max_days"]);
const NULLABLE_BOOLEAN_KEYS = new Set(["prefer_unlocked_screens", "prefer_scene_screens"]);

function valueOk(key: string, value: unknown): boolean {
  if (NULLABLE_BOOLEAN_KEYS.has(key)) return value === null || typeof value === "boolean";
  if (NULLABLE_NUMBER_KEYS.has(key)) {
    return value === null || (typeof value === "number" && Number.isFinite(value));
  }
  return typeof value === "number" && Number.isFinite(value);
}

function readSection(
  raw: Record<string, unknown>,
  section: string,
  defaults: Record<string, unknown>,
  warnings: string[],
): Record<string, unknown> {
  const out = { ...defaults };
  const src = raw[section];
  if (src === undefined) return out;
  if (!isRecord(src)) {
    warnings.push(`tuning.json: "${section}" is not an object; defaults kept`);
    return out;
  }
  for (const [key, value] of Object.entries(src)) {
    if (ENVELOPE_KEYS.has(key)) continue;
    if (!(key in defaults)) {
      warnings.push(`tuning.json: unknown key "${section}.${key}" ignored`);
      continue;
    }
    if (!valueOk(key, value)) {
      warnings.push(`tuning.json: "${section}.${key}" has the wrong type; default kept`);
      continue;
    }
    out[key] = value;
  }
  return out;
}

/**
 * Read a flat name -> number map. `open` allows keys the defaults don't list
 * (trait_coefficients is per-soul, and souls are data, not tuning); a closed
 * map warns on anything outside its default key set, like readSection does.
 */
function readNumberMap(
  src: unknown,
  path: string,
  defaults: Record<string, number>,
  open: boolean,
  warnings: string[],
): Record<string, number> {
  const out = { ...defaults };
  if (src === undefined) return out;
  if (!isRecord(src)) {
    warnings.push(`tuning.json: "${path}" is not an object; defaults kept`);
    return out;
  }
  for (const [key, value] of Object.entries(src)) {
    if (ENVELOPE_KEYS.has(key)) continue;
    if (!open && !(key in defaults)) {
      warnings.push(`tuning.json: unknown key "${path}.${key}" ignored`);
      continue;
    }
    if (typeof value !== "number" || !Number.isFinite(value)) {
      warnings.push(`tuning.json: "${path}.${key}" has the wrong type; default kept`);
      continue;
    }
    out[key] = value;
  }
  return out;
}

/**
 * The bond section is the one nested block, so it gets its own reader rather
 * than bending readSection out of shape. Kept nested because tuning.json is a
 * file Roc reads, and flattening it to weight_trust / weight_intimacy / ...
 * would trade his legibility for the loader's convenience.
 */
function readBond(raw: Record<string, unknown>, warnings: string[]): BondTuning {
  const d = DEFAULT_TUNING.bond;
  const src = raw.bond;
  if (src === undefined) return structuredClone(d);
  if (!isRecord(src)) {
    warnings.push('tuning.json: "bond" is not an object; defaults kept');
    return structuredClone(d);
  }

  for (const key of Object.keys(src)) {
    if (ENVELOPE_KEYS.has(key)) continue;
    if (!(key in d)) warnings.push(`tuning.json: unknown key "bond.${key}" ignored`);
  }

  const bond: BondTuning = {
    category_weights: readNumberMap(
      src.category_weights, "bond.category_weights", { ...d.category_weights }, false, warnings,
    ),
    trait_coefficients: readNumberMap(
      src.trait_coefficients, "bond.trait_coefficients", { ...d.trait_coefficients }, true, warnings,
    ),
    band_thresholds: readNumberMap(
      src.band_thresholds, "bond.band_thresholds", { ...d.band_thresholds }, false, warnings,
    ) as BondTuning["band_thresholds"],
    demo_multiplier: d.demo_multiplier,
  };

  if (src.demo_multiplier !== undefined) {
    if (typeof src.demo_multiplier === "number" && Number.isFinite(src.demo_multiplier)) {
      bond.demo_multiplier = src.demo_multiplier;
    } else {
      warnings.push('tuning.json: "bond.demo_multiplier" has the wrong type; default kept');
    }
  }

  // An inverted pair would make mid unreachable while high stayed open, which
  // reads as a bond that skips a band rather than as a config error.
  if (bond.band_thresholds.mid_min > bond.band_thresholds.high_min) {
    warnings.push(
      `tuning.json: bond.band_thresholds.mid_min (${bond.band_thresholds.mid_min}) > ` +
        `high_min (${bond.band_thresholds.high_min}); defaults kept`,
    );
    bond.band_thresholds = { ...d.band_thresholds };
  }
  return bond;
}

/**
 * Load tuning from <dataDir>/tuning.json. A missing file (fixtures/, or any
 * data dir without one) is not an accommodation — it silently yields the
 * defaults, and same seeds produce the same day.json as before tuning existed.
 */
export function loadTuning(dataDir: string = FIXTURES_DIR, warnings: string[] = []): Tuning {
  const file = join(dataDir, "tuning.json");
  if (!existsSync(file)) return structuredClone(DEFAULT_TUNING);

  const raw: unknown = JSON.parse(readFileSync(file, "utf8"));
  if (!isRecord(raw)) {
    warnings.push("tuning.json: expected an object; defaults kept");
    return structuredClone(DEFAULT_TUNING);
  }
  if (raw.provisional) warnings.push("tuning.json: provisional envelope");

  const d = DEFAULT_TUNING;
  const tuning: Tuning = {
    arch_promote: readSection(raw, "arch_promote", { ...d.arch_promote }, warnings) as Tuning["arch_promote"],
    bond: readBond(raw, warnings),
    day_loop: readSection(raw, "day_loop", { ...d.day_loop }, warnings) as Tuning["day_loop"],
    availability_weights: readSection(raw, "availability_weights", { ...d.availability_weights }, warnings) as Tuning["availability_weights"],
    floor: readSection(raw, "floor", { ...d.floor }, warnings) as Tuning["floor"],
    live_leads: readSection(raw, "live_leads", { ...d.live_leads }, warnings) as Tuning["live_leads"],
    aliveness_bands: readSection(raw, "aliveness_bands", { ...d.aliveness_bands }, warnings) as Tuning["aliveness_bands"],
    npc_slot_defaults: readSection(raw, "npc_slot_defaults", { ...d.npc_slot_defaults }, warnings) as Tuning["npc_slot_defaults"],
  };

  for (const key of Object.keys(raw)) {
    if (ENVELOPE_KEYS.has(key) || KNOWN_UNTUNABLE.has(key)) continue;
    if (!(key in d)) warnings.push(`tuning.json: unknown key "${key}" ignored`);
  }

  if (tuning.live_leads.min > tuning.live_leads.max) {
    warnings.push(
      `tuning.json: live_leads.min (${tuning.live_leads.min}) > max (${tuning.live_leads.max}); defaults kept`,
    );
    tuning.live_leads = { ...d.live_leads };
  }
  return tuning;
}
