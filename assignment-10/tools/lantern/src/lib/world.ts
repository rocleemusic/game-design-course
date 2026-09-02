import type { BondTuning } from "../types";

/**
 * Host-side world state — the "code" in "narration proposes, code disposes"
 * (choice-node-schema.md). Ink fires an EXTERNAL and stores nothing; this holds
 * what the shipped game's persistence engine would hold, and mirrors the
 * derived bond BAND back into `bondLevel_<soul>` so the compiled
 * `bond_band(soul) = mid` guard reads real state.
 *
 * Until W1a these four externals were bound to `~ return 0` no-op stubs in
 * system/externals.ink, with `allowExternalFunctionFallbacks = true` letting
 * them win. The bond therefore never left 0, and every mid/high arc-turn
 * variant was unreachable by construction. That is the bug this file closes.
 *
 * THE GUARDRAIL THAT SHAPES THIS FILE, and it is not a preference:
 * the bond is ONE hidden count per soul. guardrails.md check 2 flags a second
 * stored bond number per soul on sight, and pipeline.md step 9 is explicit that
 * Trust / Intimacy / Recognition / Respect are WEIGHTS ON A SINGLE DELTA, never
 * persisted per-soul dimensions. So `bond` below is Map<soul, number> and there
 * is deliberately no per-category map anywhere. A `Map<soul, Map<category, n>>`
 * would be NEQ's Companion Memory Core — the quantified-emotion model this
 * pipeline explicitly refuses. Do not add one for "debuggability": the event
 * log below already answers "where did this number come from" without storing
 * a second score.
 */

export const DEFAULT_BOND_TUNING: BondTuning = {
  category_weights: { Trust: 2, Intimacy: 2, Recognition: 3, Respect: 2 },
  trait_coefficients: { _default: 1.0 },
  band_thresholds: { mid_min: 6, high_min: 14 },
  demo_multiplier: 1.0,
};

export type BondBand = 0 | 1 | 2;

/** One thing that happened, for the transcript and for "why is this number 8?". */
export interface WorldEvent {
  kind: "bond" | "knowledge" | "thread" | "canon";
  /** soul for bond, thread_id for thread, phrase for knowledge, fact for canon */
  subject: string;
  /** bond only: the action-category that weighted the delta */
  category?: string;
  /** bond only: the delta this event contributed */
  delta?: number;
}

/**
 * 0 low / 1 mid / 2 high. Not arbitrary — predicates.ts compiles
 * `bond_band(x) = mid` to `bondLevel_x == 1`, so these ARE the ink values.
 * Thresholds are inclusive minimums.
 */
export function bondBandOf(count: number, t: BondTuning): BondBand {
  if (count >= t.band_thresholds.high_min) return 2;
  if (count >= t.band_thresholds.mid_min) return 1;
  return 0;
}

/**
 * One delta for one bond_event: category weight x the soul's fixed card-trait
 * coefficient x the demo multiplier. An unknown category scores 0 rather than
 * throwing — the closed enum is enforced at authoring time by the resolver's
 * compileStateActions, and a scoring function is the wrong place to fail.
 */
export function bondDelta(category: string, soulId: string, t: BondTuning): number {
  const weight = t.category_weights[category] ?? 0;
  const coefficient = t.trait_coefficients[soulId] ?? t.trait_coefficients._default ?? 1;
  return weight * coefficient * t.demo_multiplier;
}

export class WorldState {
  /** soul_id -> the single hidden count. NEVER split by category. */
  private bond = new Map<string, number>();
  /** thread_id -> how many times it moved; feeds the day-end handoff (W1d). */
  private threads = new Map<string, number>();
  /**
   * thread_id -> the event-log index its most recent move landed at. Staleness
   * (arc-doc-template.md's "Threads to Not Drop" — last moved vs. the six-scene
   * default cap) needs WHEN a thread last moved, not just how many times; a
   * thread moved once on line 1 of a long life is stale, a thread moved five
   * times but not recently isn't fresh. The event log already orders every
   * move, so this just remembers the index instead of adding a second log.
   */
  private threadLastMoved = new Map<string, number>();
  /** phrases the player learned. Ink owns the real KnownPhrases LIST; this mirrors for the tool. */
  private knowledge = new Set<string>();
  /** canon_write is human-gated always, so these are surfaced, never auto-applied. */
  private canon: string[] = [];
  private events: WorldEvent[] = [];

  constructor(readonly tuning: BondTuning = DEFAULT_BOND_TUNING) {}

  recordBond(soulId: string, category: string): number {
    const delta = bondDelta(category, soulId, this.tuning);
    const next = (this.bond.get(soulId) ?? 0) + delta;
    this.bond.set(soulId, next);
    this.events.push({ kind: "bond", subject: soulId, category, delta });
    return next;
  }

  recordKnowledge(phrase: string): void {
    this.knowledge.add(phrase);
    this.events.push({ kind: "knowledge", subject: phrase });
  }

  recordThreadMove(threadId: string): void {
    this.threads.set(threadId, (this.threads.get(threadId) ?? 0) + 1);
    // Index this move will occupy once pushed below — the position in the
    // ordered event log, which is what "last moved" means.
    this.threadLastMoved.set(threadId, this.events.length);
    this.events.push({ kind: "thread", subject: threadId });
  }

  recordCanonWrite(fact: string): void {
    this.canon.push(fact);
    this.events.push({ kind: "canon", subject: fact });
  }

  bondOf(soulId: string): number {
    return this.bond.get(soulId) ?? 0;
  }

  bandOf(soulId: string): BondBand {
    return bondBandOf(this.bondOf(soulId), this.tuning);
  }

  /** Every soul that has ever scored, so the mirror knows which VARs to write. */
  scoredSouls(): string[] {
    return [...this.bond.keys()];
  }

  threadMoves(): Record<string, number> {
    return Object.fromEntries(this.threads);
  }

  /** Threads that moved at least once — the day-end handoff's `live` set (W1d). */
  movedThreads(): string[] {
    return [...this.threads.keys()];
  }

  /**
   * thread_id -> event-log index of its most recent move. This is what the
   * arc doc's "Threads to Not Drop" table needs (last-moved position, not a
   * total count) to bias the next scene once a thread sits past the cap.
   */
  threadLastMovedIndex(): Record<string, number> {
    return Object.fromEntries(this.threadLastMoved);
  }

  /**
   * How many events have elapsed since a thread last moved. A thread that
   * has never moved is maximally stale — the full event count, so it always
   * clears whatever cap the arc doc sets (default six scenes).
   */
  threadStaleness(threadId: string): number {
    const lastMoved = this.threadLastMoved.get(threadId);
    if (lastMoved === undefined) return this.events.length;
    return this.events.length - lastMoved;
  }

  knownPhrases(): string[] {
    return [...this.knowledge];
  }

  canonWrites(): string[] {
    return [...this.canon];
  }

  eventLog(): WorldEvent[] {
    return [...this.events];
  }

  /**
   * Force a soul's count directly (L5's variables override, and the walk tests).
   * Logged as an event with no category so a forced state is distinguishable
   * from an earned one in the transcript.
   */
  setBond(soulId: string, count: number): void {
    this.bond.set(soulId, count);
    this.events.push({ kind: "bond", subject: soulId, delta: count });
  }

  /**
   * Snapshot/restore, so world state rides ink's own timeline. Without this a
   * restored snapshot would roll ink back while the bond kept its later value,
   * and the two would silently disagree about the same moment.
   */
  snapshot(): string {
    return JSON.stringify({
      bond: [...this.bond],
      threads: [...this.threads],
      threadLastMoved: [...this.threadLastMoved],
      knowledge: [...this.knowledge],
      canon: this.canon,
      events: this.events,
    });
  }

  restore(json: string): void {
    const s = JSON.parse(json) as {
      bond: [string, number][];
      threads: [string, number][];
      threadLastMoved?: [string, number][];
      knowledge: string[];
      canon: string[];
      events: WorldEvent[];
    };
    this.bond = new Map(s.bond);
    this.threads = new Map(s.threads);
    // Older snapshots predate this field; fall back to empty rather than throw.
    this.threadLastMoved = new Map(s.threadLastMoved ?? []);
    this.knowledge = new Set(s.knowledge);
    this.canon = [...s.canon];
    this.events = [...s.events];
  }
}
