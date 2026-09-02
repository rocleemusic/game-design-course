// Static condition analysis (W2, the cheap half).
//
// The walker (walk.ts) proves reachability by actually playing. This is the
// complement: contradictions decidable WITHOUT running anything, so a bad gate
// fails at build time instead of surfacing as a mysteriously skipped beat.
//
// Deliberately narrow. It reports only what it can prove from the condition
// text alone — an unsatisfiable day window, a repeated-but-contradictory band,
// a predicate outside the vocabulary. Anything needing world state is the
// walker's job, and guessing here would produce false alarms on legal content.

import type { SceneGraph, ScreenSpec } from "./types.ts";

export interface ConditionProblem {
  scene_id: string;
  choice_id: string;
  /** the conditions that cannot hold together */
  conditions: string[];
  reason: string;
}

const DAY = /^day\s*(>=|<=|==|=|>|<)\s*(\d+)$/;
const BAND = /^bond_band\(([^)]+)\)\s*=\s*(low|mid|high)$/;

/**
 * The day window a condition list allows, as [floor, ceiling].
 * A ceiling of Infinity means it never closes — availability is a floor by
 * default, which is what makes catch-up the default.
 */
export function dayWindow(conditions: string[]): [number, number] {
  let floor = 1;
  let ceiling = Number.POSITIVE_INFINITY;
  for (const cond of conditions) {
    const m = DAY.exec(cond.trim());
    if (!m) continue;
    const n = Number(m[2]);
    switch (m[1]) {
      case ">=": floor = Math.max(floor, n); break;
      case ">": floor = Math.max(floor, n + 1); break;
      case "<=": ceiling = Math.min(ceiling, n); break;
      case "<": ceiling = Math.min(ceiling, n - 1); break;
      case "==":
      case "=": floor = Math.max(floor, n); ceiling = Math.min(ceiling, n); break;
    }
  }
  return [floor, ceiling];
}

/**
 * Every choice node whose conditions cannot all hold at once.
 *
 * `daysPerLife` closes the other half: a beat gated past the end of a life is
 * satisfiable in the abstract and unreachable in the game, which is the same
 * defect from the player's side.
 */
/**
 * `choice_id` for a problem found on a scene's entry_gate rather than on a node.
 * An entry gate belongs to the scene, so there is no choice to name, but every
 * consumer of ConditionProblem expects the field.
 */
export const ENTRY_GATE = "(entry_gate)";

const PLAYED = /^played\(([^)]+)\)$/;

/** The day-window and band contradictions in one condition list. */
function contradictions(conditions: string[], daysPerLife: number): string[] {
  const reasons: string[] = [];

  const [floor, ceiling] = dayWindow(conditions);
  if (floor > ceiling) {
    reasons.push(`the day window is empty: earliest ${floor}, latest ${ceiling}`);
  } else if (floor > daysPerLife) {
    reasons.push(`opens on day ${floor}, but a life is only ${daysPerLife} days`);
  }

  // Two different bands for one soul on one beat can never both hold —
  // the bands are exclusive by construction.
  const bands = new Map<string, Set<string>>();
  for (const cond of conditions) {
    const m = BAND.exec(cond.trim());
    if (!m) continue;
    const set = bands.get(m[1]) ?? new Set<string>();
    set.add(m[2]);
    bands.set(m[1], set);
  }
  for (const [soul, set] of bands) {
    if (set.size > 1) {
      reasons.push(`bond_band(${soul}) is required to be both ${[...set].sort().join(" and ")}`);
    }
  }
  return reasons;
}

export function findUnsatisfiable(
  sceneGraph: SceneGraph,
  daysPerLife = 5,
): ConditionProblem[] {
  const problems: ConditionProblem[] = [];

  for (const scene of sceneGraph.scenes) {
    // The scene's own entry gate. Checked with the same arithmetic as a node's
    // conditions — before this it was checked by nothing, because both loops
    // here only ever walked choice_nodes.
    const entry = scene.entry_gate ?? [];
    if (entry.length > 0) {
      for (const reason of contradictions(entry, daysPerLife)) {
        problems.push({ scene_id: scene.scene_id, choice_id: ENTRY_GATE, conditions: entry, reason });
      }
      // A conversation gated on having played itself can never be entered.
      for (const cond of entry) {
        const m = PLAYED.exec(cond.trim());
        if (m && m[1].trim() === scene.scene_id) {
          problems.push({
            scene_id: scene.scene_id,
            choice_id: ENTRY_GATE,
            conditions: entry,
            reason: `gated on played(${scene.scene_id}) — itself, so it can never open`,
          });
        }
      }
    }

    for (const node of scene.choice_nodes) {
      const conditions = node.availability_conditions ?? [];
      if (conditions.length === 0) continue;
      for (const reason of contradictions(conditions, daysPerLife)) {
        problems.push({
          scene_id: scene.scene_id,
          choice_id: node.choice_id,
          conditions,
          reason,
        });
      }
    }
  }

  problems.push(...findEntryGateCycles(sceneGraph));
  return problems;
}

/**
 * Scenes whose entry gates wait on each other. A requires played(B) and B
 * requires played(A) locks both out permanently, and neither scene looks wrong
 * on its own — only the pair does. Worth its own check because the whole point
 * of entry_gate is threading conversations in sequence, and a sequence that
 * closes into a ring is the one way to write that wrong.
 */
function findEntryGateCycles(sceneGraph: SceneGraph): ConditionProblem[] {
  const waitsOn = new Map<string, string[]>();
  for (const scene of sceneGraph.scenes) {
    const deps: string[] = [];
    for (const cond of scene.entry_gate ?? []) {
      const m = PLAYED.exec(cond.trim());
      // A self-gate is reported by findUnsatisfiable with a clearer message;
      // leaving it in here would report the same defect twice as a 1-scene ring.
      if (m && m[1].trim() !== scene.scene_id) deps.push(m[1].trim());
    }
    waitsOn.set(scene.scene_id, deps);
  }

  const problems: ConditionProblem[] = [];
  const state = new Map<string, "open" | "done">();
  const reported = new Set<string>();

  const visit = (id: string, path: string[]): void => {
    if (state.get(id) === "done") return;
    if (state.get(id) === "open") {
      const ring = path.slice(path.indexOf(id)).concat(id);
      const key = [...ring].sort().join("|");
      if (!reported.has(key)) {
        reported.add(key);
        problems.push({
          scene_id: id,
          choice_id: ENTRY_GATE,
          conditions: sceneGraph.scenes.find((s) => s.scene_id === id)?.entry_gate ?? [],
          reason: `entry gates wait on each other in a ring: ${ring.join(" -> ")} — none can open`,
        });
      }
      return;
    }
    state.set(id, "open");
    for (const dep of waitsOn.get(id) ?? []) visit(dep, [...path, id]);
    state.set(id, "done");
  };

  for (const id of waitsOn.keys()) visit(id, []);
  return problems;
}

/**
 * Scenes whose band-gated beats do not cover all three bands.
 *
 * A partially covered scene falls through for whichever band is missing, and
 * the player gets a beat with nothing in it — silently, because the emitter's
 * gate fallback correctly skips it. Reported rather than fixed, because the
 * right fix is authoring.
 */
export function findPartialBandCoverage(sceneGraph: SceneGraph): ConditionProblem[] {
  const out: ConditionProblem[] = [];
  for (const scene of sceneGraph.scenes) {
    const bands = new Set<string>();
    for (const node of scene.choice_nodes) {
      for (const cond of node.availability_conditions ?? []) {
        const m = BAND.exec(cond.trim());
        if (m) bands.add(m[2]);
      }
    }
    if (bands.size === 0 || bands.size === 3) continue;
    out.push({
      scene_id: scene.scene_id,
      choice_id: "(scene)",
      conditions: [...bands].map((b) => `bond_band = ${b}`),
      reason: `only ${[...bands].sort().join(", ")} covered — a run in another band falls through`,
    });
  }
  return out;
}

/**
 * Choice nodes whose gather has no authored line.
 *
 * A gather is a beat: after a branch converges, something is true that was not
 * true before, and `gather_line` is the slot that says it. Until 2026-09-01 an
 * unauthored gather printed `Placeholder: the scene continues.` INTO THE GAME
 * so the hole would be visible — which made it visible to the player, mid
 * conversation, on every branch, rather than to the person who could author it.
 * `ink.ts` now emits a silent gather; this is where the hole is reported
 * instead. Reported, never fatal: the right fix is authoring, and a scene whose
 * closing prose sits in a following free-standing line reads fine without one.
 */
export function findUnauthoredGathers(sceneGraph: SceneGraph): ConditionProblem[] {
  const out: ConditionProblem[] = [];
  for (const scene of sceneGraph.scenes) {
    for (const node of scene.choice_nodes) {
      if (node.gather_line) continue;
      out.push({
        scene_id: scene.scene_id,
        choice_id: node.choice_id,
        conditions: [],
        reason: "no gather_line — the beat after this branch converges is silent",
      });
    }
  }
  return out;
}

/**
 * Screens whose establishing / backdrop beats have no authored prose.
 *
 * A screen's intro and each of its time-states are BACKDROP beats — they set
 * the place, not a conversation — and today NONE is authored: screen-specs.json
 * carries no establishing-prose field, so the emitter only ever had a
 * placeholder to print. Until 2026-09-01 it printed `Placeholder: <name>.`
 * straight into the VN dialogue feed, so the hole was visible to the PLAYER
 * mid-play (Roc: the night-festival line "Placeholder: the town under festival
 * night..." showed in the box) instead of to the author who could fill it.
 * `ink.ts` now emits those beats tag-only (silent, see `backdropBeat`); this is
 * where the hole is reported instead — the exact contract `findUnauthoredGathers`
 * uses. Reported, never fatal: the fix is authoring, and a screen with no
 * establishing prose reads fine as a silent backdrop swap.
 *
 * `choice_id` names the beat: `(intro)` for the screen intro, `(ts:<block>)`
 * for a time-state — there is no choice to name, same as `ENTRY_GATE`.
 */
export function findUnauthoredBackdrops(screens: ScreenSpec[]): ConditionProblem[] {
  const out: ConditionProblem[] = [];
  for (const screen of screens) {
    out.push({
      scene_id: screen.screen_id,
      choice_id: "(intro)",
      conditions: [],
      reason: "no authored establishing prose — the screen intro beat is silent",
    });
    for (const ts of screen.time_states ?? []) {
      out.push({
        scene_id: screen.screen_id,
        choice_id: `(ts:${ts})`,
        conditions: [],
        reason: `no authored establishing prose — the ${ts} backdrop beat is silent`,
      });
    }
  }
  return out;
}
