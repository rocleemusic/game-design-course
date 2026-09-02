// The predicate vocabulary (screen-spec-schema.md). These are the only
// predicates a lock, a choice_node, or a dialogue guard may use. Anything not
// in the table is not a predicate — the compiler here throws on sight.
//
// Each predicate compiles to one ink guard expression and names the state.ink
// variables it reads, so buildGraph can derive readers[] per variable.

import { inkAddress } from "./ids.ts";

export interface CompiledPredicate {
  /** ink guard expression; "" when the predicate is structural (no runtime test) */
  guard: string;
  /** state.ink variable names this predicate reads */
  reads: string[];
}

export interface PredicateContext {
  /** the screen the guarded thing sits on (npc_present tests against it) */
  screen_id?: string;
  /**
   * scene_id -> ink address, for played(). A scene's address is <soul>.<scene>,
   * so the soul cannot be recovered from the scene id alone and the caller has
   * to supply the mapping.
   */
  scene_addresses?: Map<string, string>;
}

const BAND_VALUE: Record<string, number> = { low: 0, mid: 1, high: 2 };

export function compilePredicate(cond: string, ctx: PredicateContext = {}): CompiledPredicate {
  const c = cond.trim();
  let m: RegExpMatchArray | null;

  // current_screen = X — position is structural (the knot itself); no runtime guard
  if ((m = c.match(/^current_screen\s*=\s*(\S+)$/))) {
    return { guard: "", reads: [] };
  }

  // time_of_day = X — tests the TimeOfDay LIST variable
  if ((m = c.match(/^time_of_day\s*=\s*(\w+)$/))) {
    return { guard: `TimeOfDay == ${inkAddress(m[1])}`, reads: ["TimeOfDay"] };
  }

  // day >= N (also accepts =, ==, >, <, <=)
  if ((m = c.match(/^day\s*(>=|<=|==|=|>|<)\s*(\d+)$/))) {
    const op = m[1] === "=" ? "==" : m[1];
    return { guard: `day ${op} ${m[2]}`, reads: ["day"] };
  }

  // npc_present(soul) — present_<soul> holds a screen_id or "none"
  if ((m = c.match(/^npc_present\(([^)]+)\)$/))) {
    const v = `present_${inkAddress(m[1])}`;
    if (!ctx.screen_id) {
      throw new Error(`npc_present(${m[1]}) needs a screen context to compile`);
    }
    return { guard: `${v} == "${ctx.screen_id}"`, reads: [v] };
  }

  // item_held(item) — Satchel LIST membership
  if ((m = c.match(/^item_held\(([^)]+)\)$/))) {
    return { guard: `Satchel ? ${inkAddress(m[1])}`, reads: ["Satchel"] };
  }

  // item_in_slot(slot) — slot_<slot_id> holds an item or "empty"
  if ((m = c.match(/^item_in_slot\(([^)]+)\)$/))) {
    const v = `slot_${inkAddress(m[1])}`;
    return { guard: `${v} != "empty"`, reads: [v] };
  }

  // knows(phrase) — KnownPhrases membership
  if ((m = c.match(/^knows\(([^)]+)\)$/))) {
    return { guard: `KnownPhrases ? ${inkAddress(m[1])}`, reads: ["KnownPhrases"] };
  }

  // played(scene_id) — has this conversation been played? A knot name evaluates
  // to its own read count in ink, so this needs no extra state.
  //
  // This IS a lock, and that is the whole point: it is what an entry_gate uses
  // to make a thread's conversations play in order (ruled 2026-08-11). seen()
  // below reads the same thing and is documented "never a lock" — overloading it
  // would have made every existing seen() call site ambiguous between colour and
  // gate, so sequence gets its own name instead.
  if ((m = c.match(/^played\(([^)]+)\)$/))) {
    const sceneId = m[1].trim();
    const addr = ctx.scene_addresses?.get(sceneId);
    if (!addr) {
      // Unknown scene id is the interesting failure — a renamed or archived
      // scene leaves a gate that can never be true, and a silently-false gate
      // is how content goes quietly unreachable.
      throw new Error(
        `played(${sceneId}) does not name a scene in this graph` +
          (ctx.scene_addresses ? "" : " (no scene address context supplied)"),
      );
    }
    return { guard: `${addr} > 0`, reads: [] };
  }

  // completed(scene_id) — did this conversation reach its OWN ending, not just
  // get entered? `played()` above is ink's automatic knot-visit count, true the
  // moment the story diverts in at all — including a `rejoin: divert` option
  // that leaves a scene before its shared gather, which is a real, modeled
  // authoring shape (choice-node-schema.md) even though no scene uses it today.
  // `completed_<scene>` is a SEPARATE, emitter-owned flag (ink.ts's `emitSoul`),
  // set only on the path that reaches the scene's normal return to the hub —
  // an early-exit divert never runs that line, so `played() && !completed()` is
  // exactly "entered but walked away", which `played()` alone cannot express.
  // Ruled 2026-08-31 (Roc): ENC-* scenes chain on THIS, not on played() — a
  // divert that does not finish ENC-N must not open ENC-N+1.
  if ((m = c.match(/^completed\(([^)]+)\)$/))) {
    const sceneId = m[1].trim();
    if (!ctx.scene_addresses?.has(sceneId)) {
      throw new Error(
        `completed(${sceneId}) does not name a scene in this graph` +
          (ctx.scene_addresses ? "" : " (no scene address context supplied)"),
      );
    }
    const v = `completed_${inkAddress(sceneId)}`;
    return { guard: v, reads: [v] };
  }

  // spellbeat_current(scene_id) — is THIS the one spell-beat currently up for
  // its soul? Ruled 2026-08-31 (Roc): spell-beats never gate each other or any
  // encounter, and exactly one is available at a time, chosen randomly (not a
  // fixed order — "possible to get temper before ignite"). The order itself
  // is resolver-baked per LIFE (day.ts's `spell_beat_order`, one random
  // permutation, stable across the whole week); the host mirrors "the first
  // entry not yet completed" into `spellbeat_current_<soul>` every time ink
  // advances (`LanternPlayer.mirrorSpellBeats`) — same "host decides, ink only
  // reads" posture as `present_<soul>`. THIS SHOULD BE THE ONLY CONDITION ANY
  // SPB-* scene's entry_gate carries; a played()/completed() chain among
  // spell-beats would reintroduce the fixed ordering this predicate exists to
  // remove.
  if ((m = c.match(/^spellbeat_current\(([^)]+)\)$/))) {
    const sceneId = m[1].trim();
    const addr = ctx.scene_addresses?.get(sceneId);
    if (!addr) {
      throw new Error(
        `spellbeat_current(${sceneId}) does not name a scene in this graph` +
          (ctx.scene_addresses ? "" : " (no scene address context supplied)"),
      );
    }
    const soulAddr = addr.split(".")[0];
    const v = `spellbeat_current_${soulAddr}`;
    return { guard: `${v} == "${sceneId}"`, reads: [v] };
  }

  // seen(knot) — read count of the visited knot. Dialogue color only, never a lock.
  if ((m = c.match(/^seen\(([^)]+)\)$/))) {
    const addr = m[1]
      .split(".")
      .map((part) => inkAddress(part))
      .join(".");
    return { guard: addr, reads: [] };
  }

  // bond_band(soul) = band — bondLevel_<soul> mirrors the band in (0/1/2).
  // Dialogue color only, never a lock or an essence gate.
  // PARKED for the prototype (2026-08-30, resources/parking-lot.md) — kept
  // compiling so archived content still builds, superseded by talk_days below.
  if ((m = c.match(/^bond_band\(([^)]+)\)\s*=\s*(low|mid|high)$/))) {
    const v = `bondLevel_${inkAddress(m[1])}`;
    return { guard: `${v} == ${BAND_VALUE[m[2]]}`, reads: [v] };
  }

  // talk_days(soul) >= N — talkDays_<soul> mirrors in the CUMULATIVE count of
  // distinct days the player has talked to the soul, continuous across years
  // until a new save slot (2026-08-30, Roc). Replaces bond_band for gating:
  // greeting tiers (0 / 1-3 / 4+) and NGT-mara's doll reveal (>= 4). Accepts
  // >=, <=, ==, =, >, <.
  if ((m = c.match(/^talk_days\(([^)]+)\)\s*(>=|<=|==|=|>|<)\s*(\d+)$/))) {
    const v = `talkDays_${inkAddress(m[1])}`;
    const op = m[2] === "=" ? "==" : m[2];
    return { guard: `${v} ${op} ${m[3]}`, reads: [v] };
  }

  throw new Error(`Not a predicate (screen-spec-schema.md vocabulary): "${cond}"`);
}

/** Compile a condition list to one combined ink guard (AND), dropping structural terms. */
export function compileConditions(
  conds: string[] | undefined,
  ctx: PredicateContext = {},
): CompiledPredicate {
  const reads: string[] = [];
  const parts: string[] = [];
  for (const cond of conds ?? []) {
    const p = compilePredicate(cond, ctx);
    if (p.guard !== "") parts.push(p.guard);
    reads.push(...p.reads);
  }
  return { guard: parts.join(" && "), reads };
}
