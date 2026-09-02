// walk.ts — the deterministic playtest walker (W2).
//
// Plain code, no LLM. It drives the COMPILED story (inkjs) the way the host
// will: it binds the four EXTERNALs, keeps the one hidden bond count per soul,
// mirrors the resulting BAND back into bondLevel_<soul>, and re-applies
// present_<soul> from day-N.json every time the (day, TimeOfDay) pair moves.
//
// Two entry points:
//   walkWeek(...)        plays one 5-day week under a supplied strategy
//   searchReachable(...) a BOUNDED best-effort search for what a week can reach
//
// The core takes story JSON + graph + days as arguments and does no file I/O,
// so tests can build all three in memory.
//
// -------------------------------------------------------------------------
// Why the search is shaped the way it is
// -------------------------------------------------------------------------
// A blind BFS/DFS over whole-game states is hopeless here: a day offers ~6-8
// world choices, a week is 5 days x (1 start + 3 moves) plus every scene's
// options, so the raw tree is ~10^30 leaves. Memoising on a state key does not
// help either, because the interesting state (bond counts, KnownPhrases,
// once-only read counts) is nearly all distinct along every path.
//
// So the search factors the problem the way the GAME factors it:
//
//   Stage 1 (pure, no ink)  The world layer is small and finite. A day is
//       "pick a start screen, then <= moves_per_day exits", and moves_per_day
//       is a PER-BLOCK budget (RULED 2026-08-01): 3 moves fill morning, 3 more
//       fill afternoon, 3 more fill evening — night is never entered by
//       movement, it is festival night, day 5's terminal beat, not a walkable
//       block (see ink.ts's advance_time, which never cycles evening ->
//       night). connects_to is a path, so exits run both ways. Enumerating
//       every route is ~100 sequences. Crossed with each day's slot_fill that
//       yields the exact set of scene ENTRY OPPORTUNITIES (scene, day, screen,
//       block), each flagged LIVE or not — see below.
//
//   Stage 2 (exact assignment)  Collapse those routes to the distinct maximal
//       sets of scenes each day can open, drop dominated sets, and solve the
//       week with a memoised DFS over (day, covered). Exact, not greedy: two
//       scenes can share their only day, so a greedy "grab the easy one first"
//       strands the other for the whole week.
//
//   Stage 3 (real ink)  Bond and knowledge only move INSIDE scenes. Walk the
//       plan for real and at each scene run an EXHAUSTIVE snapshot/restore DFS
//       over that scene's option tree — tens to hundreds of leaves, complete.
//       Record every choice_id / option_id, then replay the biased branch.
//
//   Stage 4 (probe and repeat)  A scene entry is ONCE-ONLY for the whole week,
//       so entering on the wrong day does not waste a turn, it destroys the
//       scene. Two mechanisms keep that from silently costing coverage:
//       - the plan refuses any day on which a scene's day gates leave it shut,
//         and prefers the day that opens the MOST of it;
//       - any entry that came back incomplete gets its day recorded, and the
//         next week is planned to try a different one, until no untried day is
//         left. This backstop needs no predicate reading, so it also covers
//         gates the planner cannot see (knows(...), an item, a band).
//
//   Stage 5 RETIRED (2026-08-31) — bond_band(...) gating is parked, superseded
//       by talk_days (predicates.ts), and zero authored scenes gate on it any
//       more, so there is no second variant left for a "min" pass to open.
//       Everything above now runs ONE pass, replaying the FIRST fully-explored
//       branch at every choice point rather than a bond-maximal one — see
//       exploreScene's own header for why "max" actively hurt coverage.
//
//   Stage 6 (bond, not coverage)  Coverage is the wrong objective for "how
//       much bond": two cheap scenes out-score one rich one. With every scene's
//       measured gain in hand, re-solve the assignment against BOND and walk
//       it. Each soul gets its own optimal week, because "max bond for Toby"
//       and "max bond for Ilsa" are different questions.
//
// Exact on the world layer, exhaustive inside each scene, and honest about the
// join: MaxBond.upperBound sums every reachable scene's gain, `exact` says
// whether one week could actually collect all of it, and `blockedBy` names the
// scenes it had to give up when it could not.
//
// Every bound is reported. A truncated search must never read as a proof of
// unreachability, so SearchResult.bounds.hit is the first thing to check, and
// UnreachableNote.expected separates "by design" from "somebody look at this".

import { Story } from "inkjs";
import { inkAddress } from "./ids.ts";
import { bondBandOf, bondDelta } from "./tuning.ts";
import { FESTIVAL_SCREEN_ID, NARRATOR_SOUL_ID } from "./graph.ts";
import { TIME_BLOCKS } from "./types.ts";
import type { DayJson, Graph, TimeBlock } from "./types.ts";

// ---------------------------------------------------------------------------
// Generated navigation labels
// ---------------------------------------------------------------------------
// inkjs does not expose a Choice's tags, so the walker reads the world layer
// off the labels the EMITTER generates (ink.ts). These are machine-authored
// strings, never prose — authored dialogue never produces them. Scene identity
// is still confirmed from the #scene: tag on the lines that follow.

export const LABEL_END_DAY = "End the day";
export const PREFIX_TALK = "Talk to ";
export const PREFIX_BEGIN = "Begin at ";
export const PREFIX_GO = "Go to ";
/** The Festival Grounds' always-available night choice (ink.ts's emitScreen). */
export const LABEL_BEGIN_VIGNETTE = "Begin the festival vignette";
/** The night-version screen's only forward option (ink.ts's emitMain,
 * GP-51) — starts with PREFIX_GO, matching the world-move convention, so
 * inWorld and the first-choice fallbacks already handle it. */
export const LABEL_GO_RESULTS = "Go to the results";

/** ink.ts collapses whitespace in every label it emits; match that exactly. */
function cleanText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Float bond counts (a 0.7 trait coefficient) need pinning or they drift. */
function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

/**
 * Whether a scene's return costs the whole time block (GP-93 rule 1) or is
 * free (Roc, 2026-08-31): a GRT- or SPB- scene is free — a greeting or a
 * spell-beat glimpse, not a real conversation — everything else (ENC-,
 * NGT-) still spends the slot. Mirrors ink.ts's `spendsTimeSlot`, which is
 * what the compiled ink actually does; walk.ts has no import path to that
 * file's internals (nothing here does), so this reads the same authored
 * scene_id prefix convention directly, same as day.ts's own SPB- check.
 */
function spendsTimeSlot(sceneId: string): boolean {
  return !sceneId.startsWith("GRT-") && !sceneId.startsWith("SPB-");
}

// ---------------------------------------------------------------------------
// Public shapes
// ---------------------------------------------------------------------------

export interface WalkInputs {
  /** inkjs Story.ToJson() output — out-calib/story.json, or built in memory. */
  storyJson: string;
  graph: Graph;
  /** day-1.json .. day-N.json, in day order. */
  days: DayJson[];
}

export interface ChoiceView {
  readonly index: number;
  readonly text: string;
}

/** Everything a strategy may look at. Enough state that a strategy can be pure. */
export interface WalkContext {
  readonly step: number;
  readonly day: number;
  readonly timeBlock: string;
  readonly movesLeft: number;
  /** screen_id from the last #screen: tag; null at the day's screen_hub. */
  readonly screen: string | null;
  /** scene_id when inside a scene, null in the world layer. */
  readonly scene: string | null;
  /** how many choice points this scene visit has already presented. */
  readonly sceneStep: number;
  /** true at screen_hub or a screen hub — i.e. not inside a scene. */
  readonly inWorld: boolean;
  readonly choices: readonly ChoiceView[];
  readonly visitedScenes: ReadonlySet<string>;
  readonly takenOptions: ReadonlySet<string>;
  readonly bond: Readonly<Record<string, number>>;
}

export type Strategy = (ctx: WalkContext) => number;

export interface WalkTraceEntry {
  step: number;
  day: number;
  timeBlock: string;
  screen: string | null;
  scene: string | null;
  index: number;
  text: string;
}

export interface WalkResult {
  /** the story reached -> END (day > days_per_life). */
  ended: boolean;
  finalDay: number;
  steps: number;
  scenesEntered: string[];
  choiceNodesEntered: string[];
  optionsTaken: string[];
  /** the one hidden count per soul. */
  bond: Record<string, number>;
  /** 0 low / 1 mid / 2 high, as mirrored into bondLevel_<soul>. */
  bands: Record<string, 0 | 1 | 2>;
  threadsMoved: string[];
  knowledge: string[];
  canonWrites: string[];
  /** anything story.onError reported — an unbound EXTERNAL, a bad divert. */
  errors: string[];
  /** true when the step cap stopped the walk before the story ended. */
  truncated: boolean;
  trace: WalkTraceEntry[];
}

export interface WalkOptions {
  /** hard cap on choices taken; a real 5-day week needs well under 200. */
  maxSteps?: number;
}

// ---------------------------------------------------------------------------
// The runner
// ---------------------------------------------------------------------------

type Bucket = "scenes" | "choiceNodes" | "options" | "threads" | "knowledge" | "canon";

interface Snapshot {
  state: string;
  bond: Record<string, number>;
  scenesEntered: string[];
  choiceNodesEntered: string[];
  optionsTaken: string[];
  threadsMoved: string[];
  knowledge: string[];
  canonWrites: string[];
  errors: string[];
  sceneEntryDay: [string, number][];
  talkDaysSeen: [string, number[]][];
  screen: string | null;
  scene: string | null;
  sceneStep: number;
  presenceKey: string;
  step: number;
}

/**
 * One live playthrough. Exported because searchReachable drives it directly
 * (snapshot/restore around a scene's option tree), which no Strategy could do.
 */
export class Walker {
  readonly story: Story;
  readonly graph: Graph;
  readonly bond: Record<string, number> = {};

  private readonly soulIds: string[];
  private readonly presence = new Map<string, Map<string, string>>();
  /** soul_id -> the resolver-baked spell-beat shuffle (day.ts's `spell_beat_order`).
   * Identical on every day.json this week (seeded off day 1 regardless of which
   * day is being resolved), so the first day's copy is authoritative for all. */
  private readonly spellBeatOrder: Record<string, string[]>;
  /** "<screen_id>|<Talk to ...>" -> scene_id, for the staleness check on `choices`. */
  private readonly talkLabels: Record<string, string>;
  private readonly sceneById: Map<string, Graph["scenes"][number]>;
  private seen: Record<Bucket, Set<string>> = {
    scenes: new Set<string>(),
    choiceNodes: new Set<string>(),
    options: new Set<string>(),
    threads: new Set<string>(),
    knowledge: new Set<string>(),
    canon: new Set<string>(),
  };
  private order: Record<Bucket, string[]> = {
    scenes: [],
    choiceNodes: [],
    options: [],
    threads: [],
    knowledge: [],
    canon: [],
  };
  private sceneEntryDay = new Map<string, number>();
  /** scene_id -> the soul it belongs to (constant; built once in the constructor). */
  private readonly sceneSoul: Map<string, string>;
  /** soul_id -> the DISTINCT days a scene of theirs has been entered on this
   * walk, mirroring TalkDaysLedger's "distinct days, not conversations"
   * rule — see `mirrorTalkDays`. */
  private talkDaysSeen = new Map<string, Set<number>>();
  private errors: string[] = [];
  private screen: string | null = null;
  private scene: string | null = null;
  private sceneStep = 0;
  private presenceKey = "";
  private step = 0;

  constructor(inputs: WalkInputs) {
    this.graph = inputs.graph;
    this.soulIds = inputs.graph.souls.map((s) => s.soul_id);
    this.spellBeatOrder = inputs.days[0]?.spell_beat_order ?? {};
    this.sceneSoul = new Map(inputs.graph.scenes.map((s) => [s.scene_id, s.soul]));
    this.talkLabels = talkLabelIndex(inputs.graph);
    this.sceneById = new Map(inputs.graph.scenes.map((s) => [s.scene_id, s]));
    for (const day of inputs.days) {
      for (const fill of day.slot_fill) {
        const key = `${day.day}|${fill.time_block}`;
        let m = this.presence.get(key);
        if (!m) {
          m = new Map();
          this.presence.set(key, m);
        }
        // First entry wins, matching the order day.json lists them in.
        if (!m.has(fill.soul)) m.set(fill.soul, fill.screen_id);
      }
    }

    this.story = new Story(inputs.storyJson);
    // The host binds these for real, so the walker must too. Fallbacks OFF is
    // the point of the exercise: an unbound EXTERNAL has to be an error.
    this.story.allowExternalFunctionFallbacks = false;
    this.story.onError = (message: string) => {
      this.errors.push(message);
    };

    this.story.BindExternalFunction("recordBond", (soul: string, category: string) => {
      // ONE hidden count per soul. Never a per-category sub-score — the
      // category is a WEIGHT on this single delta (guardrails check 2).
      const next = round6((this.bond[soul] ?? 0) + bondDelta(category, soul, this.graph.bond));
      this.bond[soul] = next;
      // Mirror the BAND (not the count) back for the compiled guard to read.
      this.story.variablesState[`bondLevel_${inkAddress(soul)}`] = bondBandOf(next, this.graph.bond);
      return 0;
    });
    this.story.BindExternalFunction("recordKnowledge", (phrase: string) => {
      this.note("knowledge", phrase);
      return 0;
    });
    this.story.BindExternalFunction("recordThreadMove", (threadId: string) => {
      this.note("threads", threadId);
      return 0;
    });
    this.story.BindExternalFunction("recordCanonWrite", (fact: string) => {
      this.note("canon", fact);
      return 0;
    });
    // Learn-scene bridge externals (2026-08-30). Write-side in the game (they
    // grant a spell clue / run a real cast), but the resolver walk has no magic
    // system — a scene's see_spell/cast_learn does nothing to the narrative
    // graph — so they are no-ops here. Bound because fallbacks are off above and
    // enriched learn-scene content now emits `~ seeSpell(...)` / `~ castSpell(...)`,
    // which would otherwise error. Deliberately NOT note()'d, same reasoning as
    // gateCleared below: it would widen Snapshot and churn the determinism tests.
    this.story.BindExternalFunction("seeSpell", (_spellId: string) => 0);
    this.story.BindExternalFunction("castSpell", (_spellId: string) => 0);
    // READ-side, added 2026-08-17 with the gate-ownership ruling. The resolver
    // walks the narrative graph and has no magic system, so nothing here ever
    // clears a gate on its own — `clearedGates` starts empty and a test seeds it
    // to exercise gate-reactive content. Returning 0 by default is the honest
    // answer, not a stub: from the walker's position no gate IS cleared.
    // Bound rather than left to fallback because fallbacks are off above, and an
    // unbound EXTERNAL must stay an error.
    // Deliberately NOT recorded through `note()`: that would need a new Bucket,
    // which widens Snapshot and would churn the determinism tests that compare
    // snapshots byte-for-byte. A test proves the reaction rendered by reading
    // the emitted text, which is the fact that actually matters.
    this.story.BindExternalFunction("gateCleared", (gateId: string) =>
      this.clearedGates.has(gateId) ? 1 : 0,
    );
  }

  /**
   * Gates the host would have cleared. Empty in an ordinary walk. A test seeds
   * it to prove an authored `{gateCleared("G-..."): ...}` reaction renders.
   */
  readonly clearedGates = new Set<string>();

  private note(bucket: Bucket, value: string): void {
    if (this.seen[bucket].has(value)) return;
    this.seen[bucket].add(value);
    this.order[bucket].push(value);
  }

  /** The day a scene was first entered on, or undefined if it never was. */
  dayOfSceneEntry(sceneId: string): number | undefined {
    return this.sceneEntryDay.get(sceneId);
  }

  /** Cheap read-only views, so the search never serialises state just to look. */
  get seenChoiceNodes(): ReadonlySet<string> {
    return this.seen.choiceNodes;
  }

  get seenOptions(): ReadonlySet<string> {
    return this.seen.options;
  }

  // ---- world state ----

  get currentDay(): number {
    return Number(this.story.variablesState["day"] ?? 0);
  }

  get currentBlock(): string {
    const raw: unknown = this.story.variablesState["TimeOfDay"];
    return raw === null || raw === undefined ? "" : String(raw);
  }

  get movesLeft(): number {
    return Number(this.story.variablesState["movesLeft"] ?? 0);
  }

  /**
   * present_<soul> = screen_id for every slot_fill entry matching the current
   * (day, time_block), "none" for everyone else. Re-applied whenever the pair
   * moves — including mid-Continue, because the day loop moves both.
   */
  private syncPresence(): void {
    const block = this.currentBlock;
    if (block === "") return; // TimeOfDay is unset until day_start runs
    const key = `${this.currentDay}|${block}`;
    if (key === this.presenceKey) return;
    this.presenceKey = key;
    const here = this.presence.get(key);
    for (const soul of this.soulIds) {
      this.story.variablesState[`present_${inkAddress(soul)}`] = here?.get(soul) ?? "none";
    }
    // The narrator identity is never seated on a screen (S1): its festival
    // vignette scenes are router-diverted, never offered as a [Talk to X]
    // choice, and emitScreen filters it out of every roster. Force its presence
    // to "none" so no day-fill accident (or future data edit) could ever place
    // it as an NPC. soulIds still carries it, so bond/band tests keep reporting
    // an entry per soul.
    this.story.variablesState[`present_${inkAddress(NARRATOR_SOUL_ID)}`] = "none";
  }

  /**
   * Mirror "which spell-beat is up right now" into `spellbeat_current_<soul>`,
   * matching LanternPlayer.mirrorSpellBeats (tools/lantern/src/lib/play.ts):
   * the FIRST entry of that soul's baked shuffle not yet `completed_<scene>`,
   * `""` once every entry is done. The walker has no host to call the real
   * mirror for it — same reason `syncPresence` re-implements presence
   * injection here — so without this every SPB-* scene's entry gate reads
   * `spellbeat_current_<soul> == "<scene>"` against a variable that never
   * moves off its `""` default and no spell-beat is ever offered.
   */
  private mirrorSpellBeats(): void {
    for (const [soulId, order] of Object.entries(this.spellBeatOrder)) {
      const current =
        order.find((sceneId) => !this.story.variablesState[`completed_${inkAddress(sceneId)}`]) ?? "";
      this.story.variablesState[`spellbeat_current_${inkAddress(soulId)}`] = current;
    }
  }

  /**
   * Mirror the CUMULATIVE distinct-days-talked-to-this-soul count into
   * `talkDays_<soul>`, matching TalkDaysLedger + LanternPlayer.mirrorTalkDays
   * (phaser/src/world/TalkDaysLedger.ts, tools/lantern/src/lib/play.ts): a
   * day counts once no matter how many scenes of that soul's are entered on
   * it. The walker has no host and no save slot to read a REAL cumulative
   * count from, so "distinct days entered so far in this one walk" is the
   * closest local approximation — same posture as `mirrorSpellBeats` and
   * `syncPresence`. Without this, `talk_days(soul) >= 1`/`>= 4` (the GRT-*-2/
   * GRT-*-3 greeting-tier gates) can never read true and the walker never
   * unlocks past a soul's very first greeting.
   */
  private mirrorTalkDays(sceneId: string): void {
    const soulId = this.sceneSoul.get(sceneId);
    if (soulId === undefined) return;
    let seen = this.talkDaysSeen.get(soulId);
    if (!seen) {
      seen = new Set<number>();
      this.talkDaysSeen.set(soulId, seen);
    }
    seen.add(this.currentDay);
    this.story.variablesState[`talkDays_${inkAddress(soulId)}`] = seen.size;
  }

  private ingestTags(tags: readonly string[]): void {
    for (const tag of tags) {
      const i = tag.indexOf(":");
      if (i < 0) continue;
      const key = tag.slice(0, i);
      const value = tag.slice(i + 1);
      if (key === "screen") {
        this.screen = value;
      } else if (key === "scene") {
        // A self-divert re-enters the scene from the top; do not restart the
        // in-scene step counter, or a replayed option sequence desynchronises.
        if (this.scene !== value) {
          this.scene = value;
          this.sceneStep = 0;
        }
        if (!this.sceneEntryDay.has(value)) {
          this.sceneEntryDay.set(value, this.currentDay);
          this.mirrorTalkDays(value);
        }
        this.note("scenes", value);
      } else if (key === "choice") {
        this.note("choiceNodes", value);
      } else if (key === "opt") {
        this.note("options", value);
      } else if (key === "id" && value === "SYS-DAY-BEGIN") {
        // A new day starts at screen_hub, which is nowhere in particular.
        this.screen = null;
      }
    }
  }

  /**
   * Continue one line at a time (never ContinueMaximally) so presence can be
   * re-applied between the day loop moving the clock and the next screen hub
   * evaluating its {present_<soul> == "..."} guards.
   */
  pump(): void {
    while (this.story.canContinue) {
      this.story.Continue();
      this.ingestTags(this.story.currentTags ?? []);
      this.syncPresence();
      this.mirrorSpellBeats();
    }
    this.syncPresence();
    this.mirrorSpellBeats();
  }

  /**
   * A conversation's return spends the WHOLE time slot unconditionally
   * (GP-93 rule 1, ink.ts's emitConversationReturn: `~ advance_time()` then
   * `-> ${target}` back to the SAME hub, in one uninterrupted ink step). That
   * divert-and-re-offer happens inside a single `Continue()` call, so there is
   * no JS-visible point between "TimeOfDay moves" and "ink evaluates the
   * hub's next choice guards" for `syncPresence()` to land in time — the
   * choice list ink hands back can still list a `[Talk to <soul>]` line whose
   * soul has already left for the new block (proved directly: taking a
   * second F1 conversation in one visit could make a THIRD, already-offered
   * one vanish for the rest of the week even though it plays fine on a later
   * day). `present_<soul>` is host-mirrored, never read by ink for anything
   * but this guard, so re-checking it here against the now-correct
   * (post-`syncPresence`) value and dropping any choice that fails it is
   * exact, not a heuristic — it is exactly the check ink's own guard was
   * supposed to make with fresh state.
   */
  get choices(): ChoiceView[] {
    const offered = this.story.currentChoices as { text: string }[];
    const out: ChoiceView[] = [];
    offered.forEach((c, index) => {
      if (this.screen !== null && c.text.startsWith(PREFIX_TALK)) {
        const sceneId = this.talkLabels[`${this.screen}|${c.text}`];
        const scene = sceneId !== undefined ? this.sceneById.get(sceneId) : undefined;
        if (scene && this.story.variablesState[`present_${inkAddress(scene.soul)}`] !== scene.screen_id) {
          return;
        }
      }
      out.push({ index, text: c.text });
    });
    return out;
  }

  /**
   * The world layer always offers "End the day", EXCEPT the Home Hub's
   * calendar (ink.ts's `calendar` stitch, D2) — there is no day left to end
   * between days, so it offers only "Go to <name>" picks — and the Festival
   * Grounds at night (ink.ts's emitScreen), which offers "End the day" too
   * but is otherwise recognized by its always-available
   * "Begin the festival vignette" (the final sequence's own reserved label,
   * same machine-authored contract). A scene's option list never produces
   * any of these (the file header comment: they are machine-authored, never
   * prose), so checking all three keeps the discriminator correct without
   * weakening it anywhere a scene could be mistaken for the world layer.
   */
  get inWorld(): boolean {
    const offered = this.story.currentChoices as { text: string }[];
    return offered.some(
      (c) => c.text === LABEL_END_DAY || c.text.startsWith(PREFIX_GO) || c.text === LABEL_BEGIN_VIGNETTE,
    );
  }

  context(): WalkContext {
    const inWorld = this.inWorld;
    if (inWorld && this.scene !== null) {
      this.scene = null;
      this.sceneStep = 0;
    }
    return {
      step: this.step,
      day: this.currentDay,
      timeBlock: this.currentBlock,
      movesLeft: this.movesLeft,
      screen: this.screen,
      scene: this.scene,
      sceneStep: this.sceneStep,
      inWorld,
      choices: this.choices,
      visitedScenes: this.seen.scenes,
      takenOptions: this.seen.options,
      bond: this.bond,
    };
  }

  /**
   * Choose-then-continue: an option's `~` actions only run on the Continue.
   * `index` is a position in `this.choices` (the caller's view), which the
   * staleness filter on that getter can make a DIFFERENT array from
   * `story.currentChoices` — so it must be translated through the matching
   * entry's own `.index` (the position that getter preserved) before it
   * reaches ink, never passed straight through.
   */
  choose(index: number): void {
    const raw = this.choices[index]?.index ?? index;
    const inScene = !this.inWorld;
    this.story.ChooseChoiceIndex(raw);
    this.step += 1;
    if (inScene) this.sceneStep += 1;
    this.pump();
  }

  // ---- snapshot / restore (the search's only way to branch) ----

  snapshot(): Snapshot {
    return {
      state: this.story.state.ToJson(),
      bond: { ...this.bond },
      scenesEntered: [...this.order.scenes],
      choiceNodesEntered: [...this.order.choiceNodes],
      optionsTaken: [...this.order.options],
      threadsMoved: [...this.order.threads],
      knowledge: [...this.order.knowledge],
      canonWrites: [...this.order.canon],
      errors: [...this.errors],
      sceneEntryDay: [...this.sceneEntryDay],
      talkDaysSeen: [...this.talkDaysSeen].map(([soul, days]) => [soul, [...days]]),
      screen: this.screen,
      scene: this.scene,
      sceneStep: this.sceneStep,
      presenceKey: this.presenceKey,
      step: this.step,
    };
  }

  restore(snap: Snapshot): void {
    this.story.state.LoadJson(snap.state);
    for (const k of Object.keys(this.bond)) delete this.bond[k];
    Object.assign(this.bond, snap.bond);
    this.order = {
      scenes: [...snap.scenesEntered],
      choiceNodes: [...snap.choiceNodesEntered],
      options: [...snap.optionsTaken],
      threads: [...snap.threadsMoved],
      knowledge: [...snap.knowledge],
      canon: [...snap.canonWrites],
    };
    this.seen.scenes = new Set(this.order.scenes);
    this.seen.choiceNodes = new Set(this.order.choiceNodes);
    this.seen.options = new Set(this.order.options);
    this.seen.threads = new Set(this.order.threads);
    this.seen.knowledge = new Set(this.order.knowledge);
    this.seen.canon = new Set(this.order.canon);
    this.errors = [...snap.errors];
    this.sceneEntryDay = new Map(snap.sceneEntryDay);
    this.talkDaysSeen = new Map(snap.talkDaysSeen.map(([soul, days]) => [soul, new Set(days)]));
    this.screen = snap.screen;
    this.scene = snap.scene;
    this.sceneStep = snap.sceneStep;
    this.presenceKey = snap.presenceKey;
    this.step = snap.step;
  }

  result(truncated: boolean, trace: WalkTraceEntry[]): WalkResult {
    const bands: Record<string, 0 | 1 | 2> = {};
    for (const soul of this.soulIds) {
      bands[soul] = bondBandOf(this.bond[soul] ?? 0, this.graph.bond);
    }
    const bond: Record<string, number> = {};
    for (const soul of this.soulIds) bond[soul] = this.bond[soul] ?? 0;
    return {
      ended: !this.story.canContinue && this.story.currentChoices.length === 0,
      finalDay: this.currentDay,
      steps: this.step,
      scenesEntered: [...this.order.scenes],
      choiceNodesEntered: [...this.order.choiceNodes],
      optionsTaken: [...this.order.options],
      bond,
      bands,
      threadsMoved: [...this.order.threads],
      knowledge: [...this.order.knowledge],
      canonWrites: [...this.order.canon],
      errors: [...this.errors],
      truncated,
      trace,
    };
  }
}

// ---------------------------------------------------------------------------
// (a) walkWeek
// ---------------------------------------------------------------------------

/**
 * Play one week under `strategy`. Deterministic: the same inputs and the same
 * strategy produce a byte-identical WalkResult, because nothing here is seeded
 * by a clock or a PRNG.
 */
export function walkWeek(
  inputs: WalkInputs,
  strategy: Strategy,
  options: WalkOptions = {},
): WalkResult {
  const maxSteps = options.maxSteps ?? 2000;
  const walker = new Walker(inputs);
  const trace: WalkTraceEntry[] = [];
  let truncated = false;

  walker.pump();
  while (walker.choices.length > 0) {
    if (trace.length >= maxSteps) {
      truncated = true;
      break;
    }
    const ctx = walker.context();
    const index = strategy(ctx);
    if (!Number.isInteger(index) || index < 0 || index >= ctx.choices.length) {
      throw new Error(
        `strategy returned ${String(index)}, outside 0..${ctx.choices.length - 1} ` +
          `at step ${ctx.step} (day ${ctx.day} ${ctx.timeBlock}, screen ${String(ctx.screen)})`,
      );
    }
    trace.push({
      step: ctx.step,
      day: ctx.day,
      timeBlock: ctx.timeBlock,
      screen: ctx.screen,
      scene: ctx.scene,
      index,
      text: ctx.choices[index].text,
    });
    walker.choose(index);
  }
  return walker.result(truncated, trace);
}

// ---------------------------------------------------------------------------
// Stage 1 — the world layer, enumerated exactly (pure; no ink involved)
// ---------------------------------------------------------------------------

export interface Visit {
  screen: string;
  block: TimeBlock;
}

/** One day's movement: screens[0] is where the day begins, then each move. */
export interface Route {
  screens: string[];
  visits: Visit[];
}

/** The three ordinary daily blocks a route can walk through. Night is never
 * entered by movement — it is festival night, day 5's terminal beat, not a
 * normal block (ink.ts's advance_time never cycles evening -> night). */
const DAY_BLOCKS: TimeBlock[] = ["morning", "afternoon", "evening"];

/**
 * moves_per_day is a PER-BLOCK budget (RULED 2026-08-01), not a whole-day
 * total — see emitMoveTo in ink.ts. A block's Nth (budget-exhausting) move
 * both advances the clock AND makes the move in the same step, so that
 * arrival lands already inside the NEXT block; only evening has no next
 * block to hand off to, so its Nth move sends the player home instead of
 * arriving anywhere. That makes each block's own arrival count N-1, N, N for
 * morning/afternoon/evening respectively (3N-1 total, not 3N).
 */
function blockAt(moveIndex: number, movesPerBlock: number): TimeBlock {
  const morningEnd = movesPerBlock - 1; // morning keeps N-1 arrivals
  const afternoonEnd = morningEnd + movesPerBlock; // afternoon keeps N
  if (moveIndex < morningEnd) return DAY_BLOCKS[0];
  if (moveIndex < afternoonEnd) return DAY_BLOCKS[1];
  return DAY_BLOCKS[2];
}

/**
 * Every maximal route a single day can take: a start screen, then exits until
 * the day's whole 3-block budget (3*moves_per_day - 1 arrivals — see blockAt)
 * is spent or the screen has nowhere to go. Prefixes are not listed
 * separately — a prefix visits a subset of the same places, so it can never
 * reach more.
 */
export function enumerateRoutes(graph: Graph): Route[] {
  const byId = new Map(graph.screens.map((s) => [s.screen_id, s]));
  // Connections are UNDIRECTED, matching what emitScreen emits and what
  // computeHealth has always assumed: connects_to models a path between two
  // places, not a one-way door. Reading it as directed made T6, T7, T8, F6, F7
  // and F8 look unreachable — each declares an exit and nothing declares one
  // back — which stranded SC-T6-01 and both festival-night arc turns.
  const exits = new Map<string, Set<string>>();
  const link = (from: string, to: string) => {
    if (!byId.has(from) || !byId.has(to)) return;
    if (!exits.has(from)) exits.set(from, new Set());
    exits.get(from)!.add(to);
  };
  for (const screen of graph.screens) {
    exits.set(screen.screen_id, exits.get(screen.screen_id) ?? new Set());
    for (const c of screen.connects_to ?? []) {
      const id = typeof c === "string" ? c : c.screen_id;
      link(screen.screen_id, id);
      link(id, screen.screen_id);
    }
  }
  const movesPerBlock = graph.day_loop?.moves_per_day ?? 3;
  const maxScreens = Math.max(1, movesPerBlock * DAY_BLOCKS.length - 1);
  const routes: Route[] = [];

  const walk = (screens: string[]): void => {
    const here = screens[screens.length - 1];
    // STRICT bound: maxScreens is the number of screens a day can truly STAND
    // ON (3N-1 arrivals — see blockAt). Allowing one more screen fabricated a
    // phantom 9th visit: evening's Nth (budget-exhausting) move sends the
    // player home instead of arriving (emitMoveTo in ink.ts), so a route whose
    // last screen sat at that index promised a visit the real walk never makes.
    // That is exactly how SC-T6-01 went "never entered" — the planner kept
    // scheduling T6 as the day's phantom final screen.
    const next = screens.length < maxScreens ? [...(exits.get(here) ?? [])].sort() : [];
    if (next.length === 0) {
      routes.push({
        screens: [...screens],
        visits: screens.map((screen, i) => ({ screen, block: blockAt(i, movesPerBlock) })),
      });
      return;
    }
    for (const target of next) walk([...screens, target]);
  };

  for (const screen of graph.screens) {
    if (screen.status.startsWith("start")) walk([screen.screen_id]);
  }
  return routes;
}

export interface SceneOpportunity {
  scene_id: string;
  day: number;
  screen: string;
  block: TimeBlock;
  /**
   * false when the soul is standing there but the scene cannot actually be
   * played that day: its entry gate is false (the hub offers no "Talk to" at
   * all), or every choice node is shut by a day gate. Entering then plays
   * nothing AND spends the once-only hub entry, so it is worse than not going:
   * the planner treats a dead opportunity as no opportunity, and the strategy
   * refuses to take it.
   */
  live: boolean;
}

/**
 * Evaluate the `day <op> N` predicates on a condition list. This is the
 * predicate VOCABULARY from predicates.ts, not prose — the same grammar the
 * emitter compiles into `{day >= 5}`. Non-day conditions are ignored here;
 * they are runtime state the planner cannot know, and the search's inert-entry
 * backstop covers them instead.
 */
export function dayGateAllows(conditions: string[] | undefined, day: number): boolean {
  for (const cond of conditions ?? []) {
    const m = cond.trim().match(/^day\s*(>=|<=|==|=|>|<)\s*(\d+)$/);
    if (!m) continue;
    const n = Number(m[2]);
    const ok =
      m[1] === ">=" ? day >= n
      : m[1] === "<=" ? day <= n
      : m[1] === ">" ? day > n
      : m[1] === "<" ? day < n
      : day === n;
    if (!ok) return false;
  }
  return true;
}

/** How many of a scene's choice nodes survive the day gates on `day`. */
function openNodeCount(scene: Graph["scenes"][number], day: number): number {
  return scene.choice_nodes.filter((n) => dayGateAllows(n.availability_conditions, day)).length;
}

// ---------------------------------------------------------------------------
// Entry gates
// ---------------------------------------------------------------------------
// `Scene.entry_gate` guards the hub's "Talk to ..." choice itself, so a scene
// whose gate is false is not merely quiet — it is not offered at all. The
// planner has to know that: it plans which scene to enter on which day, and an
// entry it plans for a day the gate shuts is an entry the walk never takes,
// which then reads as unreachable content rather than as a mis-planned week.
//
// Only the forms an entry gate actually uses are modelled: `day <op> N`,
// played(scene) and knows(phrase). Anything else stays opaque and falls to the
// inert-entry backstop, same as an unreadable node gate.

/**
 * A scene's own entry day, matching ink.sceneEntryDay: the MAX `day >= N` floor
 * across its nodes, not the min. The hub guards the entry on the day every one
 * of a scene's beats is open, because the entry is once-only and a partial
 * entry strands the rest. So when this scene is somebody else's played()
 * prerequisite, THIS is the day the prerequisite actually lands, and nothing
 * waiting on it can open earlier.
 */
function sceneEntryDay(scene: Graph["scenes"][number]): number {
  if (scene.choice_nodes.length === 0) return 1;
  return Math.max(
    ...scene.choice_nodes.map((node) => {
      let floor = 1;
      for (const cond of node.availability_conditions ?? []) {
        const m = /^day\s*(>=|==|=|>)\s*(\d+)$/.exec(cond.trim());
        if (!m) continue;
        floor = Math.max(floor, m[1] === ">" ? Number(m[2]) + 1 : Number(m[2]));
      }
      return floor;
    }),
  );
}

interface EntryGateTerms {
  /** earliest day the gate's own `day >= N` terms allow. */
  dayFloor: number;
  /** scene_ids from played(...) — conversations that must come first. */
  played: string[];
  /** phrases from knows(...) — set by a state action or an examinable. */
  knows: string[];
  /** terms the planner cannot evaluate (an item, a band); backstop covers them. */
  opaque: string[];
}

function entryGateTerms(scene: Graph["scenes"][number]): EntryGateTerms {
  const terms: EntryGateTerms = { dayFloor: 1, played: [], knows: [], opaque: [] };
  for (const cond of scene.entry_gate ?? []) {
    const c = cond.trim();
    let m: RegExpExecArray | null;
    if ((m = /^day\s*(>=|==|=|>)\s*(\d+)$/.exec(c))) {
      terms.dayFloor = Math.max(terms.dayFloor, m[1] === ">" ? Number(m[2]) + 1 : Number(m[2]));
      continue;
    }
    // A ceiling is not a floor; dayGateAllows still enforces it per day.
    if (/^day\s*(<=|<)\s*\d+$/.test(c)) continue;
    if ((m = /^played\(([^)]+)\)$/.exec(c))) {
      terms.played.push(m[1].trim());
      continue;
    }
    // completed(scene_id) — the ENC-* chain's own gate (predicates.ts), true
    // only once the prerequisite scene reaches its normal return to the hub,
    // not merely entered. The planner cannot simulate that distinction (it
    // has no ink), but ordering-wise it needs exactly the same treatment as
    // played(): schedule the prerequisite no later than this scene, and close
    // it into `want` via withEntryPrereqs. Modelling it as opaque (the prior
    // behaviour) was the day-scheduler bug: the planner would happily place
    // ENC-N and ENC-N-1 in either order, or ENC-N in a week that never
    // schedules ENC-N-1 at all, and ENC-N's entry then bought nothing.
    if ((m = /^completed\(([^)]+)\)$/.exec(c))) {
      terms.played.push(m[1].trim());
      continue;
    }
    if ((m = /^knows\(([^)]+)\)$/.exec(c))) {
      terms.knows.push(m[1].trim());
      continue;
    }
    terms.opaque.push(c);
  }
  return terms;
}

interface EntryGateFacts {
  /** scene_id -> earliest day its entry_gate can possibly be true. */
  gateFloor: Map<string, number>;
  /** scene_id -> why the gate can NEVER be true, for the scenes where it cannot. */
  blocked: Map<string, string>;
}

const entryGateCache = new WeakMap<Graph, EntryGateFacts>();
const prereqSceneCache = new WeakMap<Graph, Set<string>>();

/**
 * Every scene_id that SOME other scene's entry_gate names as a played()/
 * completed() prerequisite. Used to pick which scene a contested block
 * should default to (see dayCandidates): a scene nothing depends on can
 * still be picked up opportunistically whenever a route happens to offer it
 * (an unscheduled scene is simply never banned), so branching the day-level
 * search on every possible non-prerequisite alternative buys nothing but
 * state-space — it is the prerequisite scenes that actually need the
 * planner to prefer them over a same-block sibling.
 */
function prereqScenes(graph: Graph): Set<string> {
  const hit = prereqSceneCache.get(graph);
  if (hit) return hit;
  const out = new Set<string>();
  for (const scene of graph.scenes) {
    for (const id of entryGateTerms(scene).played) out.add(id);
  }
  prereqSceneCache.set(graph, out);
  return out;
}

const soulOpenerCache = new WeakMap<Graph, Map<string, string>>();

/**
 * A tier-1 greeting is gated `talk_days(<soul>) == 0` — true only before the
 * player has EVER had a real conversation with that soul. Unlike a played()/
 * completed() gate, nothing in the graph names this scene as a prerequisite,
 * so the planner had no reason to schedule it before the soul's other
 * content. But the real rule is exactly a prerequisite: this scene's window
 * closes the moment ANY other same-soul scene (even one that plays nothing,
 * since a real conversation slot still spends talk_days — GP-93 rule 1) is
 * scheduled first. Scheduling out of order doesn't just miss the greeting;
 * it silently closes it for the rest of that week's attempt. Detected once
 * per graph and cached.
 */
function soulOpeners(graph: Graph): Map<string, string> {
  const hit = soulOpenerCache.get(graph);
  if (hit) return hit;
  const out = new Map<string, string>();
  for (const scene of graph.scenes) {
    if (!scene.soul) continue;
    const zero = (scene.entry_gate ?? []).some((c) => {
      const m = /^talk_days\(([^)]+)\)\s*==\s*0$/.exec(c.trim());
      return m !== null && m[1].trim() === scene.soul;
    });
    if (zero) out.set(scene.soul, scene.scene_id);
  }
  soulOpenerCache.set(graph, out);
  return out;
}

/**
 * `entryGateTerms(scene).played` plus, when `scene` isn't itself the soul's
 * tier-1 greeting, that greeting's scene_id — so every ordering/weighting
 * mechanism that already understands played()/completed() prerequisites (
 * withEntryPrereqs, the week's day-order enforcement, chain weighting) treats
 * "must come after the soul's opener" exactly like an authored prerequisite,
 * without the content itself needing to spell it out.
 */
function effectivePlayedPrereqs(graph: Graph, scene: Graph["scenes"][number]): string[] {
  const played = entryGateTerms(scene).played;
  const opener = scene.soul ? soulOpeners(graph).get(scene.soul) : undefined;
  if (opener === undefined || opener === scene.scene_id || played.includes(opener)) return played;
  return [...played, opener];
}

/**
 * Resolve every scene's entry gate to a day floor, or to a reason it can never
 * open. Cached per graph: the answer is a property of the content, and the
 * planner asks for it once per (scene, day) pair.
 */
function entryGateFacts(graph: Graph): EntryGateFacts {
  const hit = entryGateCache.get(graph);
  if (hit) return hit;

  const byId = new Map(graph.scenes.map((s) => [s.scene_id, s]));
  const gateFloor = new Map<string, number>();
  const blocked = new Map<string, string>();

  // Who can set a knows() phrase. A choice option's knowledge_flag action makes
  // the setting scene a prerequisite; an examinable is world furniture the
  // player can poke on any day, so it satisfies the phrase without ordering.
  const bySceneAction = new Map<string, string[]>();
  const byExaminable = new Set<string>();
  for (const screen of graph.screens) {
    for (const ex of screen.examinables ?? []) {
      if (ex.knowledge_flag) byExaminable.add(inkAddress(ex.knowledge_flag));
    }
  }
  for (const scene of graph.scenes) {
    for (const node of scene.choice_nodes) {
      for (const opt of node.options) {
        for (const act of opt.state_actions ?? []) {
          if (act.type !== "knowledge_flag") continue;
          const key = inkAddress(act.arg);
          bySceneAction.set(key, [...(bySceneAction.get(key) ?? []), scene.scene_id]);
        }
      }
    }
  }

  const visiting = new Set<string>();

  /** The day a scene can actually be ENTERED: its own beats AND its gate. */
  const openFloor = (sceneId: string): number => {
    const scene = byId.get(sceneId)!;
    return Math.max(sceneEntryDay(scene), resolveGate(sceneId));
  };

  function resolveGate(sceneId: string): number {
    const memo = gateFloor.get(sceneId);
    if (memo !== undefined) return memo;
    const scene = byId.get(sceneId);
    if (scene === undefined) return 1;
    if (visiting.has(sceneId)) {
      // A ring of gates waiting on each other: nothing in it can go first, so
      // nothing in it opens. conditions.ts reports the ring as a finding; here
      // it only has to stop the recursion and mark the scene shut.
      const ring = [...visiting, sceneId].join(" -> ");
      blocked.set(sceneId, `its played() prerequisites form a cycle (${ring})`);
      gateFloor.set(sceneId, Infinity);
      return Infinity;
    }
    visiting.add(sceneId);
    const terms = entryGateTerms(scene);
    let floor = terms.dayFloor;
    const why: string[] = [];

    for (const prereq of terms.played) {
      if (!byId.has(prereq)) {
        why.push(`played(${prereq}) names no scene in this graph`);
        continue;
      }
      floor = Math.max(floor, openFloor(prereq));
      const prereqShut = blocked.get(prereq);
      if (prereqShut !== undefined) {
        why.push(`played(${prereq}) can never be true, because ${prereq} cannot open: ${prereqShut}`);
      }
    }

    for (const phrase of terms.knows) {
      const key = inkAddress(phrase);
      if (byExaminable.has(key)) continue;
      const from = bySceneAction.get(key) ?? [];
      if (from.length === 0) {
        why.push(`knows(${phrase}) is set by no choice option and no examinable`);
        continue;
      }
      const others = [...new Set(from)].filter((id) => id !== sceneId);
      if (others.length === 0) {
        why.push(`knows(${phrase}) is only ever set inside ${sceneId} itself, which this gate shuts`);
        continue;
      }
      // ANY setter is enough, so the floor is the EARLIEST of them, and the
      // gate is only shut when every setter is shut.
      const live = others.filter((id) => !blocked.has(id)).map((id) => openFloor(id));
      if (live.length === 0) {
        why.push(`knows(${phrase}) is only set inside ${others.join(", ")}, none of which can open`);
        continue;
      }
      floor = Math.max(floor, Math.min(...live));
    }

    visiting.delete(sceneId);
    if (why.length > 0) {
      blocked.set(sceneId, why.join("; "));
      floor = Infinity;
    }
    gateFloor.set(sceneId, floor);
    return floor;
  }

  for (const scene of graph.scenes) resolveGate(scene.scene_id);
  const facts: EntryGateFacts = { gateFloor, blocked };
  entryGateCache.set(graph, facts);
  return facts;
}

/** Can this scene's entry gate be satisfied on `day`, at the earliest? */
function entryGateAllows(graph: Graph, scene: Graph["scenes"][number], day: number): boolean {
  const facts = entryGateFacts(graph);
  if (facts.blocked.has(scene.scene_id)) return false;
  return day >= (facts.gateFloor.get(scene.scene_id) ?? 1) && dayGateAllows(scene.entry_gate, day);
}

/**
 * Close a wanted set under played() prerequisites.
 *
 * Every planned week is a FRESH Story, so read counts do not carry over: a
 * gated scene needs its prerequisite played again in the same week, even when
 * an earlier week already explored that prerequisite to exhaustion. Without
 * this the plan quietly stops routing the prerequisite and the gated scene can
 * never be entered again.
 */
function withEntryPrereqs(graph: Graph, want: ReadonlySet<string>): Set<string> {
  const byId = new Map(graph.scenes.map((s) => [s.scene_id, s]));
  const out = new Set(want);
  const queue = [...want];
  while (queue.length > 0) {
    const scene = byId.get(queue.pop()!);
    if (scene === undefined) continue;
    for (const prereq of effectivePlayedPrereqs(graph, scene)) {
      if (!byId.has(prereq) || out.has(prereq)) continue;
      out.add(prereq);
      queue.push(prereq);
    }
  }
  return out;
}

/**
 * A scene is LIVE on a day when its entry gate can be satisfied AND at least
 * one of its nodes survives the day gates. Both halves are needed: a shut gate
 * means the hub never offers the entry, a shut node gate means the entry plays
 * nothing.
 */
function sceneLiveOn(graph: Graph, scene: Graph["scenes"][number], day: number): boolean {
  if (!entryGateAllows(graph, scene, day)) return false;
  if (scene.choice_nodes.length === 0) return true;
  return openNodeCount(scene, day) > 0;
}

/**
 * The days on which a scene opens the MOST of itself.
 *
 * "Live" is not enough. SC-T6-01 is live from day 1 — most of its nodes are
 * ungated — but its first beat needs `day >= 4`, and the knowledge flag that
 * beat sets is what unlocks a later one. Entering on day 2 therefore plays the
 * scene, spends the once-only entry, and permanently strands two of its nodes.
 * So the planner is told which day plays the most of a scene, not merely which
 * days play any of it.
 */
function bestDaysFor(scene: Graph["scenes"][number], days: DayJson[]): Set<number> {
  let best = 0;
  for (const day of days) best = Math.max(best, openNodeCount(scene, day.day));
  const out = new Set<number>();
  for (const day of days) {
    if (openNodeCount(scene, day.day) === best) out.add(day.day);
  }
  return out;
}

interface WorldFacts {
  routes: Route[];
  /** "<screen>|<block>" the player can actually occupy. */
  visitable: Set<string>;
  /** screens any route touches at all. */
  visitableScreens: Set<string>;
  /** day -> block -> soul -> screen */
  presence: Map<number, Map<string, Map<string, string>>>;
  opportunities: SceneOpportunity[];
}

function worldFacts(graph: Graph, days: DayJson[]): WorldFacts {
  const routes = enumerateRoutes(graph);
  const visitable = new Set<string>();
  const visitableScreens = new Set<string>();
  for (const route of routes) {
    for (const v of route.visits) {
      visitable.add(`${v.screen}|${v.block}`);
      visitableScreens.add(v.screen);
    }
  }
  // The final sequence (festival-night-transition-plan.md): night is never
  // entered by movement — home_hub_final diverts straight to
  // FESTIVAL_SCREEN_ID, unconditionally, once evening's route (whatever it
  // was) is spent on the life's last day. So it is visitable independent of
  // routes, day.ts's `input.day >= 5` gate is what actually confines any
  // night presence to that one day (day.ts:55), not this set.
  visitable.add(`${FESTIVAL_SCREEN_ID}|night`);
  visitableScreens.add(FESTIVAL_SCREEN_ID);

  const presence = new Map<number, Map<string, Map<string, string>>>();
  for (const day of days) {
    const byBlock = new Map<string, Map<string, string>>();
    for (const fill of day.slot_fill) {
      let m = byBlock.get(fill.time_block);
      if (!m) {
        m = new Map();
        byBlock.set(fill.time_block, m);
      }
      if (!m.has(fill.soul)) m.set(fill.soul, fill.screen_id);
    }
    presence.set(day.day, byBlock);
  }

  const opportunities: SceneOpportunity[] = [];
  for (const day of days) {
    const byBlock = presence.get(day.day)!;
    for (const block of TIME_BLOCKS) {
      if (byBlock.get(block) === undefined) continue;
      for (const scene of graph.scenes) {
        if (byBlock.get(block)!.get(scene.soul) !== scene.screen_id) continue;
        if (!visitable.has(`${scene.screen_id}|${block}`)) continue;
        opportunities.push({
          scene_id: scene.scene_id,
          day: day.day,
          screen: scene.screen_id,
          block,
          live: sceneLiveOn(graph, scene, day.day),
        });
      }
    }
  }
  return { routes, visitable, visitableScreens, presence, opportunities };
}

/** Why a scene has no entry opportunity anywhere in this week. */
function diagnoseScene(graph: Graph, days: DayJson[], facts: WorldFacts, sceneId: string): string {
  const scene = graph.scenes.find((s) => s.scene_id === sceneId)!;
  const moves = graph.day_loop?.moves_per_day ?? 3;

  const status = graph.screens.find((s) => s.screen_id === scene.screen_id)?.status ?? "?";
  if (!facts.visitableScreens.has(scene.screen_id)) {
    const neighbours = new Set<string>();
    for (const s of graph.screens) {
      for (const c of s.connects_to ?? []) {
        const to = typeof c === "string" ? c : c.screen_id;
        if (to === scene.screen_id) neighbours.add(s.screen_id);
        if (s.screen_id === scene.screen_id) neighbours.add(to);
      }
    }
    return (
      `screen ${scene.screen_id} is unreachable: its status is "${status}" (not a start screen)` +
      ` and it links to no reachable screen (neighbours: ${neighbours.size ? [...neighbours].sort().join(", ") : "none"})`
    );
  }

  const blocksHere = TIME_BLOCKS.filter((b) => facts.visitable.has(`${scene.screen_id}|${b}`));
  const soulAt: string[] = [];
  for (const day of days) {
    for (const fill of day.slot_fill) {
      if (fill.soul === scene.soul) soulAt.push(`d${day.day} ${fill.time_block} ${fill.screen_id}`);
    }
  }
  const onScreen = soulAt.filter((s) => s.endsWith(` ${scene.screen_id}`));
  if (onScreen.length === 0) {
    return (
      `soul "${scene.soul}" is never placed on ${scene.screen_id} by this week's slot_fill` +
      ` (placed instead at: ${soulAt.join("; ") || "nowhere"})`
    );
  }

  // An entry gate nothing can ever satisfy has to name the prerequisite that
  // is stuck. "never offered" would send the reader hunting for a day gate that
  // is not there — the scene is fine, the conversation it waits on is not.
  const gates = entryGateFacts(graph);
  const shut = gates.blocked.get(sceneId);
  if (shut !== undefined) {
    return `entry gate ${JSON.stringify(scene.entry_gate)} can never be satisfied: ${shut}`;
  }
  const gateFloor = gates.gateFloor.get(sceneId) ?? 1;

  // The soul IS reachable there — so if there is still no opportunity, every
  // day it could happen on is one where the scene's own day gates shut it.
  const dead = facts.opportunities.filter((o) => o.scene_id === sceneId);
  if (dead.length > 0) {
    // Gate first: entryGateAllows is half of `live`, and blaming the node day
    // gates for a shut gate points at the wrong line of the spec.
    if ((scene.entry_gate ?? []).length > 0 && dead.every((o) => !entryGateAllows(graph, scene, o.day))) {
      const prereqs = entryGateTerms(scene)
        .played.map((id) => {
          const p = graph.scenes.find((s) => s.scene_id === id);
          return p ? `${id} (its own entry day is ${sceneEntryDay(p)})` : `${id} (no such scene)`;
        })
        .join(", ");
      return (
        `soul "${scene.soul}" reaches ${scene.screen_id} on ${dead.map((o) => `d${o.day}/${o.block}`).join(", ")},` +
        ` but the entry gate ${JSON.stringify(scene.entry_gate)} is false on every one of those days` +
        ` (earliest day it can be true: d${gateFloor}` +
        (prereqs ? `; waits on ${prereqs}` : "") +
        `)`
      );
    }
    const gates = [
      ...new Set(
        scene.choice_nodes.flatMap((n) =>
          (n.availability_conditions ?? []).filter((c) => /^day\s*(>=|<=|==|=|>|<)\s*\d+$/.test(c.trim())),
        ),
      ),
    ];
    return (
      `soul "${scene.soul}" reaches ${scene.screen_id} on ${dead.map((o) => `d${o.day}/${o.block}`).join(", ")},` +
      ` but every choice node is shut by a day gate on those days (gates: ${gates.join(", ") || "none found"})`
    );
  }
  return (
    `soul "${scene.soul}" stands on ${scene.screen_id} only at ${onScreen.join("; ")},` +
    ` but the player can only occupy ${scene.screen_id} at [${blocksHere.join(", ")}]` +
    ` within ${moves} moves/day (screen status "${status}")`
  );
}

// ---------------------------------------------------------------------------
// Week plans and the strategy that plays them
// ---------------------------------------------------------------------------

export interface WeekPlan {
  /** day -> screens[] (screens[0] is "Begin at ..."). */
  routes: Record<number, string[]>;
  /** scene_id -> in-scene choice indices, in order. */
  sceneOptions: Record<string, number[]>;
  movesPerDay: number;
  /** screen_id -> the label ink.ts emits for it. */
  screenNames: Record<string, string>;
  /** "<screen_id>|<Talk to ...>" -> scene_id, mirroring emitScreen's labelling. */
  talkLabels: Record<string, string>;
  /**
   * "<scene_id>|<day>" the strategy must NOT enter. A scene entry is once-only
   * for the life of the Story, so walking into one on a day its content cannot
   * play burns it for the whole week. Holds day-gated dead days plus anything
   * a previous week proved inert.
   */
  doNotEnter: string[];
}

/**
 * scene_id for every "Talk to ..." label the world can offer, keyed by screen.
 * Mirrors emitScreen: the soul's authored NAME, suffixed with the scene_id only
 * when that soul has more than one scene on that screen. That suffix rule is
 * what makes the un-suffixed form unique per (screen, soul), so the mapping is
 * exact rather than a guess.
 */
function talkLabelIndex(graph: Graph): Record<string, string> {
  const out: Record<string, string> = {};
  for (const screen of graph.screens) {
    const here = graph.scenes.filter((s) => s.screen_id === screen.screen_id);
    for (const scene of here) {
      const ambiguous = here.filter((s) => s.soul === scene.soul).length > 1;
      const name = cleanText(graph.souls.find((s) => s.soul_id === scene.soul)?.name ?? scene.soul);
      const label = PREFIX_TALK + name + (ambiguous ? ` (${scene.scene_id})` : "");
      out[`${screen.screen_id}|${label}`] = scene.scene_id;
    }
  }
  return out;
}

interface DayCandidate {
  day: number;
  route: string[];
  /** scene_ids this route can enter that day, already filtered to live ones. */
  scenes: string[];
  /**
   * True for a deliberately-reduced variant of another candidate this same
   * day — one that keeps only a SINGLE scene of a needy soul's (see
   * `talkDaysNeeds`) instead of every one the route could reach, so the rest
   * stay available to be picked up on a DIFFERENT day instead. Exempted from
   * the dominance-pruning pass below: without an explicit exemption, this
   * candidate is ALWAYS a proper subset of the "take everything" candidate
   * for the same route (same scenes minus the held-back ones), so the normal
   * "a superset day is never worse" pruning rule would delete it before
   * chooseBestWeek ever got a chance to weigh it against spreading a needy
   * soul's visits across more distinct days. See chooseBestWeek's own doc
   * for why bundling everything into the earliest day scores identically to
   * spreading it UNLESS this alternative also exists to spread it into.
   */
  holdBack?: boolean;
}

/** "<scene_id>|<day>" entries a previous week proved wasted, in two strengths. */
export interface PlanBlocks {
  /** the entry played nothing at all — never plan it. */
  dead: ReadonlySet<string>;
  /** the entry played only part of the scene — prefer another day if one exists. */
  partial: ReadonlySet<string>;
}

const NO_BLOCKS: PlanBlocks = { dead: new Set(), partial: new Set() };

/**
 * Per day, the distinct MAXIMAL sets of wanted scenes a single route can open.
 *
 * Collapsing 116 routes to their scene sets, then dropping any set that is a
 * subset of another, leaves a handful of genuinely different days. That is
 * what makes an exact week assignment affordable: the choice is not "which of
 * 116 routes" but "which of ~5 outcomes".
 */
const TALK_DAYS_GATE = /^talk_days\(([^)]+)\)\s*>=\s*(\d+)$/;

/**
 * soul_id -> N, for every soul with a still-`want`ed scene gated
 * `talk_days(soul) >= N` (Roc, 2026-08-31 — "any talk, including a
 * greeting, is a talk day"). `dayCandidates` uses this to mark, not just
 * WHICH scenes a day's route can open, but WHICH DAYS a needy soul gets
 * visited at all — see the `~talkday:` marker below.
 */
function talkDaysNeeds(graph: Graph, want: ReadonlySet<string>): Map<string, number> {
  const needs = new Map<string, number>();
  for (const scene of graph.scenes) {
    if (!want.has(scene.scene_id)) continue;
    for (const term of scene.entry_gate ?? []) {
      const m = TALK_DAYS_GATE.exec(term.trim());
      if (!m) continue;
      const [, soul, nStr] = m;
      needs.set(soul, Math.max(needs.get(soul) ?? 0, Number(nStr)));
    }
  }
  return needs;
}

/** soul_id -> every scene_id belonging to it. Used to attribute a candidate
 * day's scenes back to the soul(s) they'd give a talk-day credit toward —
 * see chooseBestWeek's dynamic `~talkday:` marker. */
function soulSceneIndex(graph: Graph): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const scene of graph.scenes) {
    let set = out.get(scene.soul);
    if (!set) out.set(scene.soul, (set = new Set()));
    set.add(scene.scene_id);
  }
  return out;
}

function dayCandidates(
  graph: Graph,
  facts: WorldFacts,
  want: ReadonlySet<string>,
  days: DayJson[],
  blocked: PlanBlocks,
): DayCandidate[][] {
  // Needed to generate `holdBack` variants below — a soul still short of its
  // `talk_days(soul) >= N` want, and every scene_id belonging to it.
  const needySouls = talkDaysNeeds(graph, want);
  const soulScenes = soulSceneIndex(graph);
  // Per scene, the days worth entering it on.
  //
  //   dead    an entry there played NOTHING. Hard exclusion: it can only ever
  //           destroy the once-only entry.
  //   partial an entry there played only part of the scene. Soft: try another
  //           day first, but if the scene has no other day, go anyway — a
  //           partly-played scene beats a scene nobody ever sees. Making this
  //           a hard exclusion is what silently dropped the festival scenes
  //           from the bond plans: their band variants are MUTUALLY exclusive,
  //           so they can never be "complete", so their only day got banned.
  const preferred = new Map<string, Set<number>>();
  for (const scene of graph.scenes) {
    const live = days.map((d) => d.day).filter((d) => sceneLiveOn(graph, scene, d));
    const usable = live.filter((d) => !blocked.dead.has(`${scene.scene_id}|${d}`));
    const fresh = usable.filter((d) => !blocked.partial.has(`${scene.scene_id}|${d}`));
    const pool = fresh.length > 0 ? fresh : usable;
    const best = [...bestDaysFor(scene, days)].filter((d) => pool.includes(d));
    preferred.set(scene.scene_id, new Set(best.length > 0 ? best : pool));
  }

  const out: DayCandidate[][] = [];
  for (const day of days) {
    const byBlock = facts.presence.get(day.day)!;
    const scenesAt = new Map<string, string[]>();
    for (const scene of graph.scenes) {
      if (!want.has(scene.scene_id)) continue;
      if (!preferred.get(scene.scene_id)!.has(day.day)) continue;
      for (const block of TIME_BLOCKS) {
        if (byBlock.get(block)?.get(scene.soul) !== scene.screen_id) continue;
        const key = `${scene.screen_id}|${block}`;
        scenesAt.set(key, [...(scenesAt.get(key) ?? []), scene.scene_id]);
      }
    }
    // The final sequence (RULED 2026-08-01): on the life's last day, night
    // always follows evening once its route is spent, regardless of WHICH
    // route got there — home_hub_final diverts straight to FESTIVAL_SCREEN_ID,
    // so a night scene is never one of a route's own visits (see worldFacts).
    // Every route this day therefore gains it identically.
    const nightBonus = scenesAt.get(`${FESTIVAL_SCREEN_ID}|night`) ?? [];

    // One candidate per distinct scene set, keeping the smallest route for it.
    //
    // A REAL conversation spends the WHOLE block unconditionally (GP-93 rule
    // 1, ink.ts's emitConversationReturn), but a greeting or a spell-beat
    // does not (Roc, 2026-08-31 — see ink.ts's `spendsTimeSlot`): those are
    // a plain divert back to the hub, so any number of them can be taken in
    // the same visit, in the same block, alongside the one real conversation
    // that block still allows. Folding every (screen, block) visit's scenes
    // into one flat union without that split let the planner "collect" two
    // real conversations in the same block — a set no real walk can ever
    // actually take, since taking the first ends the block and strands the
    // second. Model each block as "every free scene reachable there, plus at
    // most one real conversation", and let the day's candidate be the union
    // of that across all three blocks.
    const byKey = new Map<string, DayCandidate>();
    for (const route of facts.routes) {
      const perBlock: string[][] = TIME_BLOCKS.map((block) => {
        const ids = new Set<string>();
        for (const v of route.visits) {
          if (v.block !== block) continue;
          for (const id of scenesAt.get(`${v.screen}|${block}`) ?? []) ids.add(id);
        }
        return [...ids];
      });
      const freePerBlock = perBlock.map((options) => options.filter((id) => !spendsTimeSlot(id)));
      const costlyPerBlock = perBlock.map((options) => options.filter((id) => spendsTimeSlot(id)));
      const allFree = freePerBlock.flat();
      // "At most one REAL conversation per block" is genuinely a per-block
      // choice, but a full cross-product over 3 independent blocks is
      // exponential, and on a week wanting many scenes across three souls it
      // blew the week-level DFS's own state cap — chooseBestWeek then
      // returned whatever the truncated search happened to reach first, not
      // the actual optimum. Generate a linear number of candidates instead:
      // a baseline (each block's own PREREQUISITE conversation if it has one
      // live there, else its first reachable one), plus — for every block —
      // one variant per OTHER prerequisite conversation reachable there,
      // swapped in alone. A scene nothing depends on is never explicitly
      // banned by staying unscheduled (see `doNotEnter`), so it stays
      // reachable opportunistically wherever a route offers it without
      // needing its own branch here — branching on every leaf alternative
      // bought only state-space, not coverage. The only combinations this
      // can no longer see are the rarer ones needing TWO blocks' real
      // conversation swapped away from baseline in the same day, which
      // cross-day accumulation over the search's repeated weeks recovers.
      const prereqs = prereqScenes(graph);
      const baseline = costlyPerBlock.map((options) => options.find((id) => prereqs.has(id)) ?? options[0]);
      const combos: string[][] = [[...allFree, ...baseline.filter((id): id is string => id !== undefined)]];
      costlyPerBlock.forEach((options, i) => {
        for (const id of options) {
          if (id === baseline[i] || !prereqs.has(id)) continue;
          const combo = [...baseline];
          combo[i] = id;
          combos.push([...allFree, ...combo.filter((x): x is string => x !== undefined)]);
        }
      });
      const put = (scenes: string[]): void => {
        const key = scenes.join(",");
        const prior = byKey.get(key);
        if (prior === undefined || route.screens.join(">") < prior.route.join(">")) {
          byKey.set(key, { day: day.day, route: [...route.screens], scenes });
        }
      };
      for (const combo of combos) {
        const gain = new Set(combo);
        for (const id of nightBonus) gain.add(id);
        // NOTE: a soul gated behind `talk_days(soul) >= N` needs N DISTINCT
        // days visited, not merely N scenes eventually covered. This used to
        // be encoded here as a static `~talkday:soul:day` marker added
        // whenever a day's candidate touched the soul at all — but that is
        // exactly what made it a phantom credit: a day's ROUTE can pass a
        // needy soul's screen while every scene it would offer there already
        // got claimed by an EARLIER day's chosen candidate (dedup in
        // buildPlan's `scheduledDay` always keeps the earliest), so the
        // "visit" this day plays nothing real. chooseBestWeek now computes
        // the marker itself, dynamically, against the `covered` set it
        // already threads day-by-day — only a day whose candidate offers a
        // scene NOT already claimed by an earlier day earns the soul's
        // distinct-day credit. See chooseBestWeek's own doc.
        put([...gain].sort());
      }
    }
    // Drop dominated sets. Every value function here is monotone in the set
    // (bond gains and scene counts are both non-negative), so a superset day
    // is never worse than the subset day it contains.
    const all = [...byKey.values()];
    const kept = all.filter(
      (c) =>
        !all.some(
          (other) =>
            other !== c &&
            other.scenes.length > c.scenes.length &&
            c.scenes.every((id) => other.scenes.includes(id)),
        ),
    );
    kept.sort((a, b) => a.route.join(">").localeCompare(b.route.join(">")));
    const base = kept.length > 0 ? kept : all;

    // TRIED AND REVERTED THIS SESSION (Roc — see git history around
    // 2026-08-31/09-01 for the full mechanism if picking this back up): a
    // "held-back" candidate variant that deliberately withholds part of a
    // needy soul's (talk_days(soul) >= N — see talkDaysNeeds) reachable
    // content for the day, so a later day's candidate has something left to
    // independently earn a distinct-day credit from (paired with
    // chooseBestWeek's dynamic `~talkday:` marker below, and with a
    // dependency-depth-ordered ladder so a reduction never keeps a scene
    // while holding back its own played()/completed() prerequisite).
    //
    // chooseBestWeek's OWN plan for it was provably correct — talkDayCredits
    // and scheduledDay both showed the right scene scheduled on the right
    // day — but the REAL walk (exploreWeek/plannedStrategy) did not
    // reliably follow through: content the plan scheduled for day 2+
    // sometimes never got entered, and — worse — turning on ANY ONE soul's
    // held-back generation (isolated and verified) could silently strand an
    // UNRELATED soul's ordinary content that worked fine before held-back
    // candidates existed at all (observed: mara-only held-back generation
    // left ilsa with zero entries that week, despite ilsa's own candidates
    // being untouched by mara's reduction). Root cause not found despite
    // direct instrumentation of scheduledDay/routes/talkDayCredits all
    // looking correct on paper, nor by restricting ladder sources to
    // non-repeating routes (routes revisiting a screen were one suspect,
    // ruled out) — something about a much larger day-candidate list changes
    // either chooseBestWeek's choice or how the real walker executes it, in
    // a way this session could not pin down in the time available. A
    // talk_days fix that reliably strands unrelated content is worse than
    // the known gap it was meant to close, so it stays off.
    const withHeldBack = base;
    if (process.env.DEBUG_DAYCAND) {
      console.error(
        `day ${day.day} kept=${withHeldBack.length}/${all.length} nightBonus=${nightBonus.join(",")}:`,
        withHeldBack.map((c) => `[${c.scenes.filter((s) => s.includes("ilsa")).join("+")}]`).join(" "),
      );
    }
    out.push(withHeldBack);
  }
  return out;
}

interface WeekAssignment {
  routes: Record<number, string[]>;
  /**
   * day -> the EXACT scene set chooseBestWeek picked for that day. Needed
   * alongside `routes` because `route` (a screen list) is no longer a unique
   * key back to "which candidate" once held-back variants exist: several
   * candidates for the same day can share the same route/screens and differ
   * only in which of a needy soul's scenes they include (see
   * DayCandidate.holdBack). buildPlan used to re-derive "the chosen
   * candidate" by searching that day's candidate list for one whose route
   * matched — which silently found whichever candidate with that route came
   * FIRST (almost always the unreduced, everything-bundled one, since it is
   * generated before its held-back reductions), not the one solve() actually
   * scored and picked. That quietly discarded the whole point of a
   * held-back pick: chooseBestWeek could correctly choose to spread a needy
   * soul's visits across days, and buildPlan would then go schedule the
   * bundled version anyway.
   */
  pickedScenes: Record<number, string[]>;
  scenes: string[];
  capped: boolean;
  /**
   * soul_id -> the days (in order) chooseBestWeek credited it a NEW distinct
   * talk-day on, for every soul in `needySoulScenes`. buildPlan uses this to
   * enforce the flip side of the marker: a scene gated `talk_days(soul) >=
   * N` cannot actually open in the real walk until the Nth of these days —
   * the static day-candidate generator has no idea what `talk_days(...)`
   * even means (see entryGateTerms's `opaque` bucket) and happily treats
   * such a scene as available any day, so without this the plan can — and,
   * before this existed, reliably did — schedule it on whichever early day
   * first offered it, betting on a gate that will not actually be true yet.
   */
  talkDayCredits: Map<string, number[]>;
}

/**
 * The EXACT best week over those candidates, maximising `value(union)`.
 *
 * This replaced a day-by-day greedy that scored only "how many new scenes does
 * today open". Greedy is myopic in a way that matters here: two scenes may be
 * available on the same single day, so taking the easy one early can strand
 * the other for the whole week. Memoised DFS over (day index, covered set) is
 * small — the candidate sets per day are few — and it is exact.
 *
 * Bounded: `cap` limits memo states, and `capped` says whether the answer is
 * the true optimum or the best found before the cap.
 */
function chooseBestWeek(
  candidates: DayCandidate[][],
  value: (scenes: ReadonlySet<string>) => number,
  cap: number,
  /**
   * Perturbs which equally-scored plan wins a tie. Content whose scene
   * graph is structurally symmetric across souls (a greeting gating the
   * same 3-deep chain for each of them) produces GENUINE ties in total
   * value — opening ilsa's chain this week scores identically to opening
   * toby's — and a fixed tie-break (the lexicographically smallest route)
   * picks the SAME soul's chain every single week, forever, since nothing
   * about a repeat of the identical winning plan teaches the search
   * anything new to converge on. Varying the seed per week (searchReachable
   * passes weeksThisPass) lets a later week's tie resolve toward a
   * DIFFERENT symmetric optimum, so repeated weeks actually sample across
   * the tied options instead of reproducing the first week forever.
   */
  tieBreakSeed = 0,
  /**
   * soul_id -> (its N from `talk_days(soul) >= N`, its scene ids), for every
   * soul with an outstanding distinct-day want (Roc, 2026-08-31 — "any talk,
   * including a greeting, is a talk day"). Used to award a soul a synthetic
   * `~talkday:soul:day` credit in `covered`/`value` — but computed HERE,
   * against the `covered` set this DP already threads day-by-day, not
   * pre-baked into a DayCandidate the way an earlier attempt did. That
   * earlier version added the marker in `dayCandidates` whenever a day's
   * candidate merely TOUCHED a needy soul's screen, regardless of whether
   * anything the soul offered there was actually new — so a day whose only
   * soul-scenes had already been claimed by an EARLIER day's pick (dedup in
   * buildPlan's `scheduledDay` always keeps the earliest) still "earned" a
   * credit for a visit that, once scheduling collapsed to one real day per
   * scene, played nothing. That phantom credit is why the marker never
   * actually changed which four failing tests passed: chooseBestWeek always
   * saw every day as free real estate for a needy soul, so it never had to
   * choose between spreading them out and bundling everything into the
   * earliest day — bundling scored exactly the same. Awarding the credit
   * here instead, against the REAL running `covered` set, means a day only
   * earns it when the candidate offers a scene nothing earlier in the same
   * DP path already claimed — which is exactly "this day would add the soul
   * to a NEW distinct talk-day", the actual thing worth rewarding.
   */
  needySoulScenes: ReadonlyMap<string, { need: number; scenes: ReadonlySet<string> }> = new Map(),
): WeekAssignment {
  let states = 0;
  let capped = false;
  const memo = new Map<string, { value: number; routeKey: string; rank: number; picks: DayCandidate[] }>();
  const tieRank = (s: string): number => {
    let h = tieBreakSeed >>> 0;
    for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) >>> 0;
    return h;
  };
  const talkDayCount = (covered: ReadonlySet<string>, soul: string): number => {
    let n = 0;
    const prefix = `~talkday:${soul}:`;
    for (const id of covered) if (id.startsWith(prefix)) n += 1;
    return n;
  };

  const solve = (
    i: number,
    covered: Set<string>,
  ): { value: number; routeKey: string; rank: number; picks: DayCandidate[] } => {
    if (i === candidates.length) return { value: value(covered), routeKey: "", rank: 0, picks: [] };
    const key = `${i}|${[...covered].sort().join(",")}`;
    const hit = memo.get(key);
    if (hit) return hit;
    if (states >= cap) {
      capped = true;
      return { value: value(covered), routeKey: "", rank: 0, picks: [] };
    }
    states += 1;

    let best: { value: number; routeKey: string; rank: number; picks: DayCandidate[] } | null = null;
    for (const candidate of candidates[i]) {
      const next = new Set(covered);
      for (const id of candidate.scenes) next.add(id);
      for (const [soul, { need, scenes }] of needySoulScenes) {
        if (talkDayCount(covered, soul) >= need) continue;
        const bringsNewScene = candidate.scenes.some((id) => scenes.has(id) && !covered.has(id));
        if (bringsNewScene) next.add(`~talkday:${soul}:${candidate.day}`);
      }
      const sub = solve(i + 1, next);
      const routeKey = `${candidate.route.join(">")}|${sub.routeKey}`;
      const rank = tieRank(routeKey);
      if (best === null || sub.value > best.value || (sub.value === best.value && rank < best.rank)) {
        best = { value: sub.value, routeKey, rank, picks: [candidate, ...sub.picks] };
      }
    }
    const answer = best ?? { value: value(covered), routeKey: "", rank: 0, picks: [] };
    memo.set(key, answer);
    return answer;
  };

  const solved = solve(0, new Set());
  const routes: Record<number, string[]> = {};
  const pickedScenes: Record<number, string[]> = {};
  const scenes = new Set<string>();
  for (const pick of solved.picks) {
    routes[pick.day] = pick.route;
    pickedScenes[pick.day] = pick.scenes;
    for (const id of pick.scenes) scenes.add(id);
  }
  if (process.env.DEBUG_PICKS) {
    console.error(
      "picks:",
      solved.picks.map((p) => `d${p.day}=[${p.scenes.join(",")}]`),
    );
  }
  // Replay the same dynamic-marker rule used inside `solve` once, linearly,
  // over the WINNING path — cheap compared to the DP itself — to recover
  // WHICH day each needy soul's distinct-day credits actually landed on.
  // `solve` computed this transiently (folded into `next`/`value`) to score
  // candidates; nothing about the winning path itself records it, and
  // buildPlan needs the days themselves, not just the count, to enforce a
  // `talk_days(soul) >= N` scene's real ordering (see WeekAssignment's own
  // doc).
  const talkDayCredits = new Map<string, number[]>();
  {
    const seen = new Set<string>();
    for (const pick of solved.picks) {
      for (const [soul, { need, scenes: soulScenesForCredit }] of needySoulScenes) {
        const credited = talkDayCredits.get(soul) ?? [];
        if (credited.length >= need) continue;
        const bringsNew = pick.scenes.some((id) => soulScenesForCredit.has(id) && !seen.has(id));
        if (bringsNew) {
          credited.push(pick.day);
          talkDayCredits.set(soul, credited);
        }
      }
      for (const id of pick.scenes) seen.add(id);
    }
  }
  if (process.env.DEBUG_DAYCAND) {
    console.error(
      `chooseBestWeek: states=${states} capped=${capped} value=${solved.value} credits=${
        [...talkDayCredits.entries()].map(([s, d]) => `${s}:${d.join("/")}`).join(" ")
      }`,
    );
  }
  return { routes, pickedScenes, scenes: [...scenes].sort(), capped, talkDayCredits };
}

/**
 * Day-by-day scheduling that opens as many still-wanted LIVE scenes as it can.
 *
 * Counting only live opportunities is the fix for the festival-night bug: a
 * `day >= 5` scene sitting on a screen the day-1 route happens to pass through
 * used to score as coverage, get entered, play nothing (every node's gate
 * false, every fallback fires), and spend its once-only entry — after which no
 * later week could ever reach it, and the search spent its whole budget
 * re-planning the same dead week.
 *
 * Counting only live opportunities is the fix for the festival-night bug: a
 * `day >= 5` scene sitting on a screen the day-1 route happens to pass through
 * used to score as coverage, get entered, play nothing (every node's gate
 * false, every fallback fires), and spend its once-only entry — after which no
 * later week could ever reach it, and the search span its whole budget
 * re-planning the same dead week.
 */
function buildPlan(
  graph: Graph,
  facts: WorldFacts,
  want: Set<string>,
  days: DayJson[],
  blocked: PlanBlocks = NO_BLOCKS,
  /** score a week by the scenes it opens; default is "as many as possible". */
  value: (scenes: ReadonlySet<string>) => number = (scenes) => scenes.size,
  cap = 200_000,
  /** see chooseBestWeek's own doc — perturbs which tied plan wins. */
  tieBreakSeed = 0,
): WeekPlan & { capped: boolean } {
  const screenNames: Record<string, string> = {};
  for (const s of graph.screens) screenNames[s.screen_id] = cleanText(s.name);

  const candidates = dayCandidates(graph, facts, withEntryPrereqs(graph, want), days, blocked);

  const needs = talkDaysNeeds(graph, want);
  const soulScenes = soulSceneIndex(graph);
  const needySoulScenes = new Map(
    [...needs].map(([soul, need]) => [soul, { need, scenes: soulScenes.get(soul) ?? new Set<string>() }]),
  );
  if (process.env.DEBUG_DAYCAND) {
    console.error(`buildPlan needySoulScenes:`, [...needySoulScenes.entries()].map(([s, v]) => `${s}:${v.need}`));
  }
  const assignment = chooseBestWeek(candidates, value, cap, tieBreakSeed, needySoulScenes);
  if (process.env.DEBUG_DAYCAND) {
    console.error(
      `talkDayCredits:`,
      [...assignment.talkDayCredits.entries()].map(([s, d]) => `${s}:${d.join("/")}`),
    );
  }

  // What the strategy must refuse. A scene entry is once-only for the whole
  // week, so a wrong day does not just waste a turn — it destroys the scene.
  //   - any day the scene plays nothing (day-gated shut, or proven inert)
  //   - any day other than the one the plan scheduled it on
  // A scene the plan did not schedule anywhere is left alone: if a route
  // happens past it on a day it can play, taking it is free.
  // A `talk_days(soul) >= N` gate (entryGateTerms's `opaque` bucket — the
  // static day-candidate generator has no notion of runtime talk-day state,
  // so it treats a scene gated this way as available any day the soul is
  // presence-eligible, same as an ungated one). The REAL gate only opens
  // once N distinct days have actually been credited (chooseBestWeek's
  // `talkDayCredits`, replayed above) — so a scene like GRT-ilsa-3 must not
  // be treated as schedulable before that, even though it appears in every
  // day's candidate set the same as GRT-ilsa-1 does.
  const talkDaysGateOf = new Map<string, { soul: string; n: number }>();
  for (const scene of graph.scenes) {
    for (const term of scene.entry_gate ?? []) {
      const m = TALK_DAYS_GATE.exec(term.trim());
      if (m) talkDaysGateOf.set(scene.scene_id, { soul: m[1], n: Number(m[2]) });
    }
  }
  const readyDay = (sceneId: string): number => {
    const gate = talkDaysGateOf.get(sceneId);
    if (!gate) return 1;
    const credits = assignment.talkDayCredits.get(gate.soul) ?? [];
    return credits.length >= gate.n ? credits[gate.n - 1] : Infinity;
  };

  const scheduledDay = new Map<string, number>();
  for (const [dayStr] of Object.entries(assignment.routes)) {
    const day = Number(dayStr);
    // The EXACT scene set chooseBestWeek picked for this day — see
    // pickedScenes's own doc for why this can no longer be re-derived by
    // matching `route` back against the day's candidate list.
    for (const id of assignment.pickedScenes[day] ?? []) {
      // A day whose talk-day credits haven't reached this scene's own gate
      // yet is not a real opportunity for it (see readyDay's own doc) —
      // skip it entirely rather than let it win the "earliest" race below.
      if (day < readyDay(id)) continue;
      // A free scene (GP-93: a greeting/spell-beat doesn't spend the block)
      // can legitimately fall out of MULTIPLE days' picked candidate set —
      // every day its soul is visited for something else. The EARLIEST of
      // those (among the days it is actually gate-eligible on) is the day
      // it plays; a later overwrite here used to win by iteration order,
      // which then fed prereq-ordering below the LATEST day a free
      // prerequisite happened to tag along on, wrongly pushing everything
      // that depends on it later than it needs to be.
      const prior = scheduledDay.get(id);
      if (prior === undefined || day < prior) scheduledDay.set(id, day);
    }
  }
  if (process.env.DEBUG_SCHED) {
    console.error(
      "scheduledDay:",
      [...scheduledDay.entries()].map(([id, d]) => `${id}@${d}`),
    );
    console.error(
      "routes:",
      Object.entries(assignment.routes).map(([d, r]) => `d${d}=${r.join(">")}`),
    );
  }
  const doNotEnter = new Set<string>();
  for (const day of days) {
    for (const scene of graph.scenes) {
      const key = `${scene.scene_id}|${day.day}`;
      const wrongDay = scheduledDay.has(scene.scene_id) && scheduledDay.get(scene.scene_id) !== day.day;
      const notReady = day.day < readyDay(scene.scene_id);
      if (!sceneLiveOn(graph, scene, day.day) || blocked.dead.has(key) || wrongDay || notReady) {
        doNotEnter.add(key);
      }
    }
  }
  // Entry-gate ORDER inside the week. A gated scene walked into before its
  // played() prerequisite is simply not offered, so the entry buys nothing and
  // the plan has spent a day for it. Only constrain against prerequisites this
  // plan actually scheduled: an unscheduled one may still be picked up free by
  // a route that happens past it, and banning every day would cost coverage.
  for (const scene of graph.scenes) {
    const prereqs = effectivePlayedPrereqs(graph, scene).filter((id) => scheduledDay.has(id));
    if (prereqs.length === 0) continue;
    const earliest = Math.max(...prereqs.map((id) => scheduledDay.get(id)!));
    for (const day of days) {
      if (day.day < earliest) doNotEnter.add(`${scene.scene_id}|${day.day}`);
    }
  }
  return {
    routes: assignment.routes,
    sceneOptions: {},
    movesPerDay: graph.day_loop?.moves_per_day ?? 3,
    screenNames,
    talkLabels: talkLabelIndex(graph),
    doNotEnter: [...doNotEnter].sort(),
    capped: assignment.capped,
  };
}

/**
 * Play a WeekPlan: begin where the plan says, take every "Talk to" the hub
 * offers, spend the remaining moves along the route, end the day. Inside a
 * scene, follow the plan's recorded option indices (falling back to 0).
 *
 * Pure: every decision comes off the WalkContext, so two calls with the same
 * plan produce identical walks.
 */
export function plannedStrategy(plan: WeekPlan): Strategy {
  const indexOfText = (ctx: WalkContext, text: string): number =>
    ctx.choices.findIndex((c) => c.text === text);
  const doNotEnter = new Set(plan.doNotEnter);

  // moves_per_day is a PER-BLOCK budget (RULED 2026-08-01) — ctx.movesLeft
  // resets every block, so it cannot tell us how far along TODAY's route we
  // are once the day has crossed a block boundary. Track absolute progress
  // through `route` ourselves instead: it only advances on a step this
  // strategy itself recognizes as a world move (the screen_hub pick or a "Go
  // to" pick), so it stays in lock-step with the walker even though the
  // walker calls this closure sequentially rather than the caller threading
  // state through WalkContext.
  let trackedDay = -1;
  let movesToday = 0;

  return (ctx: WalkContext): number => {
    if (!ctx.inWorld) {
      const seq = plan.sceneOptions[ctx.scene ?? ""] ?? [];
      const pick = seq[ctx.sceneStep];
      return pick !== undefined && pick < ctx.choices.length ? pick : 0;
    }
    if (ctx.day !== trackedDay) {
      trackedDay = ctx.day;
      movesToday = 0;
    }
    const route = plan.routes[ctx.day] ?? [];
    const endDay = indexOfText(ctx, LABEL_END_DAY);

    if (ctx.screen === null) {
      // screen_hub — pick where the day begins. Spends move 1 of morning's
      // budget (RULED 2026-08-01), same as any other move.
      const first = route[0];
      const i = first === undefined ? -1 : indexOfText(ctx, PREFIX_BEGIN + plan.screenNames[first]);
      if (i >= 0) {
        movesToday = 1;
        return i;
      }
      return Math.max(endDay, 0);
    }
    // A scene entry is once-only and costs no move, so take it — UNLESS the
    // plan has ruled this scene off limits today. Spending the entry on a day
    // the content cannot play destroys it for the rest of the week.
    //
    // A GREETING WINS THE TIE (Roc, 2026-08-31: "a greeting should always
    // play"). The real game no longer lets a player reach a soul's other
    // choices (a spell-beat, an encounter) without their portrait committing
    // the greeting first — `NpcTalkSystem.talkToNpc` always resolves it
    // before drawing any other pill. Ink itself has no such ordering; a raw
    // hub choice list offers a GRT-* and an SPB-*/ENC-* choice as
    // independent, equally-selectable options, and taking the other one
    // first ticks `talk_days` off the greeting's `== 0`/tier window exactly
    // like a real conversation does — permanently, since the tier that
    // needed it never opens again. Preferring a live GRT-* choice here keeps
    // the walker's own behavior honest to what a real player actually
    // experiences through the portrait now, instead of a raw ink walk that
    // can still lose a race the UI has already closed.
    const eligible = (c: ChoiceView): boolean => {
      if (!c.text.startsWith(PREFIX_TALK)) return false;
      const sceneId = plan.talkLabels[`${ctx.screen}|${c.text}`];
      // An unresolvable label is taken rather than skipped: coverage is the
      // safer failure, and the label index is built from the same rule the
      // emitter uses, so a miss means the emitter changed and should show up.
      return sceneId === undefined || !doNotEnter.has(`${sceneId}|${ctx.day}`);
    };
    let talk = ctx.choices.findIndex((c) => eligible(c) && plan.talkLabels[`${ctx.screen}|${c.text}`]?.startsWith("GRT-"));
    if (talk < 0) talk = ctx.choices.findIndex(eligible);
    if (talk >= 0) return talk;

    const next = route[movesToday];
    if (next !== undefined) {
      const i = indexOfText(ctx, PREFIX_GO + plan.screenNames[next]);
      if (i >= 0) {
        movesToday += 1;
        return i;
      }
    }
    // The final sequence (RULED 2026-08-01): once every wanted night scene on
    // the Festival Grounds is spent, start the vignette rather than falling
    // through to `Math.max(endDay, 0)` — "End the day" is offered there too
    // (ink.ts's emitScreen makes no other change at night), and its index is
    // always the largest in the list, so the untouched fallback would pick it
    // over the vignette every time and loop the walk back through
    // home_hub_final forever instead of ever finishing the life.
    const vignette = indexOfText(ctx, LABEL_BEGIN_VIGNETTE);
    if (vignette >= 0) return vignette;
    return Math.max(endDay, 0);
  };
}

/** The trivial control walk: always take the first offered choice. */
export const firstChoiceStrategy: Strategy = () => 0;

/**
 * A week that only ever ends its days. Proves the loop terminates with no
 * content at all — the floor under "a 5-day week is traversable".
 *
 * On the life's last night, the Festival Grounds offers no "End the day"
 * that actually ends anything permanent — RULED 2026-08-01, night is the
 * only exit on day 5 — so this also recognizes the vignette's own reserved
 * label; without it, a trivial strategy that always prefers "End the day"
 * would ricochet between home_hub_final and the Festival Grounds forever,
 * because "End the day" there only loops back home instead of finishing the
 * life. Since the vignette choice is offered BEFORE "End the day" in the
 * hub's choice list (ink.ts's emitScreen), findIndex naturally prefers it.
 */
export const endEachDayStrategy: Strategy = (ctx) => {
  const i = ctx.choices.findIndex((c) => c.text === LABEL_END_DAY || c.text === LABEL_BEGIN_VIGNETTE);
  return i >= 0 ? i : 0;
};

// ---------------------------------------------------------------------------
// (b) searchReachable
// ---------------------------------------------------------------------------

export interface SearchOptions {
  /** exhaustive in-scene DFS leaf cap, per scene visit. */
  maxScenePaths?: number;
  /** in-scene choice-point depth cap (self-diverts can loop). */
  maxSceneDepth?: number;
  /** how many planned weeks to walk before giving up on the leftovers. */
  maxWeeks?: number;
  /** per-walk choice cap. */
  maxSteps?: number;
  /** wall-clock budget for the whole search. */
  maxMillis?: number;
  /**
   * How many weeks IN A ROW may teach the search nothing (no new
   * choice/option seen, no new dead/partial day learned) before it gives up
   * on the leftovers. Structurally-symmetric content (souls with an
   * identically-shaped chain, competing for the same tie-break-seeded slot)
   * can need several dry weeks before the seed cycles onto the chain that's
   * actually still open — see chooseBestWeek's tie-break doc. Default 3.
   */
  maxDryStreak?: number;
}

/**
 * Why something was never reached — and crucially, whether that is a finding
 * or a defect.
 *
 *   scene-unreachable        the scene itself cannot be entered this week
 *   scene-unexplored         the budget ran out before the scene was explored
 *   band-needs-another-life  gated on a bond band one life cannot reach; this
 *                            is the RULING working, not a bug
 *   defect                   reached, explored exhaustively, still never
 *                            offered — an unsatisfiable gate
 */
export type UnreachableKind =
  | "scene-unreachable"
  | "scene-unexplored"
  | "band-needs-another-life"
  | "defect";

export interface UnreachableNote {
  id: string;
  kind: UnreachableKind;
  /** true when this is by design; false means somebody has to look at it. */
  expected: boolean;
  reason: string;
}

export interface MaxBond {
  /** the count a real, fully walked week actually reached. */
  achieved: number;
  /** 0 low / 1 mid / 2 high at `achieved`. */
  band: 0 | 1 | 2;
  /** sum of every reachable scene's best in-scene gain — see `exact`. */
  upperBound: number;
  /** true when achieved == upperBound: nothing was given up, so this is the max. */
  exact: boolean;
  /** the scenes the walked week actually earned this soul's bond in. */
  scenesUsed: string[];
  /**
   * Reachable scenes that carry bond for this soul but that the best week
   * could not also fit — this is why `exact` is false when it is false.
   */
  blockedBy: string[];
}

export interface SearchBounds {
  hit: boolean;
  reasons: string[];
  weeksWalked: number;
  scenePathsExplored: number;
  millis: number;
  /**
   * True only when the maxMillis BACKSTOP — not an ordinary content-derived
   * budget (maxWeeks / maxSteps / maxScenePaths) — is what stopped the
   * search early (GP-142). This should never be true on a healthy run: the
   * work-based bounds are meant to always be what governs. `hit` already
   * says "don't trust these numbers"; this field says specifically why not,
   * so a load-truncated run is never misread as a content-truncated one.
   */
  timeBackstopHit: boolean;
  /**
   * Scenes the world layer says are enterable but that no week managed to
   * explore. Non-empty means the reachability answer is INCOMPLETE.
   */
  unexploredScenes: string[];
}

export interface SearchResult {
  reachableScenes: string[];
  unreachableScenes: UnreachableNote[];
  reachableChoiceNodes: string[];
  unreachableChoiceNodes: UnreachableNote[];
  reachableOptions: string[];
  unreachableOptions: UnreachableNote[];
  /** soul_id -> max bond in a real week. */
  maxBond: Record<string, MaxBond>;
  /** every (scene, day, screen, block) the world layer allows. */
  opportunities: SceneOpportunity[];
  /** the week that produced maxBond.achieved, replayed through walkWeek. */
  verifiedWeek: WalkResult;
  /** the plan verifiedWeek played, so a caller can reproduce it. */
  verifiedPlan: WeekPlan;
  bounds: SearchBounds;
  errors: string[];
}

interface SceneExploration {
  bestSequence: number[];
  bestGain: Record<string, number>;
  paths: number;
  capped: boolean;
}

/**
 * RETIRED (Roc, 2026-08-31): the two-pass max/min bond bias below this used to
 * pick. `bond_band(...)` gating is parked — superseded by `talk_days`
 * (`predicates.ts`) — and zero authored scenes gate on it any more, so there
 * is no second variant left for a "min" pass to open and no optimum left for
 * a "max" pass to chase.
 *
 * Worse than merely pointless: "max" actively steered the walker's simulated
 * position away from real content. `exploreScene` explores every option for
 * choice/option COVERAGE regardless of bias, but only replays ONE branch —
 * the highest-bond one — to decide where the walk continues from. Content
 * whose entry gate reads `played(<the OTHER option>)` then never becomes
 * true in the simulation, no matter the budget. This is why `ENC-ilsa-1`
 * (gated on `played(SPB-ignite)`, itself reachable only through the LOWER-
 * bond "Trust" option) and its siblings never got explored — the search
 * wasn't out of budget, it was walking away from the one branch every later
 * scene's prerequisite chain actually depends on.
 *
 * Replaced by `bestSequence` taking the FIRST fully-explored branch
 * (lexicographically earliest option at every choice point) — see
 * `exploreScene` below. That is deterministic, matches this file's own
 * "ties keep the lexicographically earliest branch" comment, and — because
 * every authored scene puts its lowest-key option first (Trust before
 * Recognition, etc.) — is the branch prerequisite chains are actually
 * authored against.
 */

/**
 * Exhaustive DFS of ONE scene visit's option tree, from the live state.
 * The walker must be sitting on the scene's first in-scene choice point.
 * Leaves the walker on the chosen branch, back in the world layer.
 */
function exploreScene(
  walker: Walker,
  seenChoices: Set<string>,
  seenOptions: Set<string>,
  maxPaths: number,
  maxDepth: number,
): SceneExploration {
  const base = walker.snapshot();
  const baseBond = { ...walker.bond };
  let paths = 0;
  let capped = false;
  // The FIRST fully-explored branch wins — lexicographically earliest option
  // at every choice point, since `i` counts up from 0 and this is set only
  // once. See this file's BondBias retirement note above for why: every
  // authored scene puts the option later content's prerequisites depend on
  // first, and the walker's simulated position has to actually take it.
  let bestSequence: number[] = [];
  let haveSequence = false;

  const harvest = (): void => {
    for (const id of walker.seenChoiceNodes) seenChoices.add(id);
    for (const id of walker.seenOptions) seenOptions.add(id);
  };

  const dfs = (prefix: number[], depth: number): void => {
    if (capped) return;
    if (depth >= maxDepth) {
      capped = true;
      return;
    }
    const here = walker.snapshot();
    const count = walker.choices.length;
    for (let i = 0; i < count; i++) {
      if (capped) break;
      if (i > 0) walker.restore(here);
      walker.choose(i);
      harvest();
      const sequence = [...prefix, i];
      if (walker.inWorld || walker.choices.length === 0) {
        paths += 1;
        if (!haveSequence) {
          haveSequence = true;
          bestSequence = sequence;
        }
        if (paths >= maxPaths) {
          capped = true;
          break;
        }
      } else {
        dfs(sequence, depth + 1);
      }
    }
    walker.restore(here);
  };

  dfs([], 0);

  // Replay the winner for real.
  walker.restore(base);
  for (const index of bestSequence) {
    if (index >= walker.choices.length) break;
    walker.choose(index);
  }
  const bestGain: Record<string, number> = {};
  for (const soul of Object.keys(walker.bond)) {
    const delta = round6(walker.bond[soul] - (baseBond[soul] ?? 0));
    if (delta !== 0) bestGain[soul] = delta;
  }
  return { bestSequence, bestGain, paths, capped };
}

interface WeekRun {
  sceneOptions: Record<string, number[]>;
  sceneGain: Record<string, Record<string, number>>;
  /** scenes whose option tree was walked (they presented a choice point). */
  scenesExplored: string[];
  /** every scene the walk entered, taken from the #scene: tags. */
  scenesEntered: string[];
  /** scene_id -> the day it was entered on. */
  entryDays: Record<string, number>;
  /**
   * "<scene_id>|<day>" for entries that presented NO choice point at all —
   * the once-only entry was spent and nothing played. Fed back into the next
   * week's plan so the search stops repeating a wasted day. This is the
   * backstop for gates the day-predicate reader cannot see (knows(...), a
   * band, an item), where only running it can tell you the scene is inert.
   */
  inertEntries: string[];
  paths: number;
  capped: boolean;
  steps: number;
  errors: string[];
}

/**
 * Walk one planned week for real, pausing at every scene to explore it
 * exhaustively before committing to the earliest branch (see `exploreScene`).
 */
function exploreWeek(
  inputs: WalkInputs,
  plan: WeekPlan,
  seenChoices: Set<string>,
  seenOptions: Set<string>,
  opts: Required<SearchOptions>,
): WeekRun {
  const walker = new Walker(inputs);
  const strategy = plannedStrategy(plan);
  const sceneOptions: Record<string, number[]> = {};
  const sceneGain: Record<string, Record<string, number>> = {};
  const scenesExplored: string[] = [];
  let paths = 0;
  let capped = false;
  let steps = 0;

  walker.pump();
  while (walker.choices.length > 0) {
    // WORK-based bound only (GP-142). maxSteps is a pure step count, so the
    // same content stops here at the same point on any machine. A wall-clock
    // check used to sit here too (Date.now() > deadline) and made THIS loop's
    // outcome depend on how busy the machine was while it happened to run —
    // walk.test.ts alone failed a different six than it did inside the full
    // suite, purely from scheduling jitter, with no change to the content.
    // searchReachable still carries maxMillis, but only as an outer backstop
    // on the week loop below, never as a reason a single week's walk stops
    // early.
    if (steps >= opts.maxSteps) {
      capped = true;
      break;
    }
    const ctx = walker.context();
    if (!ctx.inWorld && ctx.scene !== null && ctx.sceneStep === 0) {
      // First choice point of this scene visit — explore the whole subtree.
      const found = exploreScene(
        walker, seenChoices, seenOptions, opts.maxScenePaths, opts.maxSceneDepth,
      );
      paths += found.paths;
      capped = capped || found.capped;
      sceneOptions[ctx.scene] = found.bestSequence;
      sceneGain[ctx.scene] = found.bestGain;
      scenesExplored.push(ctx.scene);
      steps += found.bestSequence.length;
      continue;
    }
    const index = strategy(ctx);
    walker.choose(index);
    steps += 1;
  }

  // scenesEntered comes off the walker's own #scene: record, NOT off the
  // explore hook above: a scene whose every node is gated shut runs from its
  // entry straight to the hub with no choice point, so the hook never fires
  // even though the entry was spent. Conflating the two is what let a dead
  // festival-night entry look like "not entered" forever.
  const finished = walker.result(false, []);
  const explored = new Set(scenesExplored);
  const noNodes = new Set(
    inputs.graph.scenes.filter((s) => s.choice_nodes.length === 0).map((s) => s.scene_id),
  );
  // A choiceless scene (a bare greeting, narration straight through to a
  // divert) never presents a choice point, so the explore hook above never
  // fires for it and it falls out of `scenesExplored` even though the entry
  // was spent and it played for real. That is the classification gap: it is
  // never in the day-1 "unreachable" list either (the world layer correctly
  // sees it as a live opportunity), so it lands in neither bucket. It has
  // zero nodes/options to explore, so counting it explored the moment it is
  // entered is exact, not an approximation.
  for (const sceneId of finished.scenesEntered) {
    if (noNodes.has(sceneId) && !explored.has(sceneId)) {
      explored.add(sceneId);
      scenesExplored.push(sceneId);
    }
  }
  const inertEntries: string[] = [];
  const entryDays: Record<string, number> = {};
  for (const sceneId of finished.scenesEntered) {
    entryDays[sceneId] = walker.dayOfSceneEntry(sceneId) ?? 0;
    if (explored.has(sceneId) || noNodes.has(sceneId)) continue;
    inertEntries.push(`${sceneId}|${entryDays[sceneId]}`);
  }

  return {
    sceneOptions,
    sceneGain,
    scenesExplored,
    scenesEntered: finished.scenesEntered,
    entryDays,
    inertEntries,
    paths,
    capped,
    steps,
    errors: finished.errors,
  };
}

/**
 * A BOUNDED best-effort search for what a playable week can reach.
 *
 * See the file header for why it is factored this way. Read `bounds.hit`
 * first: when it is true, an "unreachable" entry means "not found within the
 * budget", NOT "proven unreachable".
 */
export function searchReachable(inputs: WalkInputs, options: SearchOptions = {}): SearchResult {
  const started = Date.now();
  const opts: Required<SearchOptions> = {
    maxScenePaths: options.maxScenePaths ?? 4000,
    maxSceneDepth: options.maxSceneDepth ?? 40,
    // 12, not 8: a week is now also spent PROBING — re-entering an
    // incompletely-played scene on a different day. The loop still stops the
    // moment a week teaches it nothing, so extra headroom costs nothing when
    // the search converges early (the current slice converges in 3).
    maxWeeks: options.maxWeeks ?? 12,
    maxSteps: options.maxSteps ?? 2000,
    maxMillis: options.maxMillis ?? 120_000,
    maxDryStreak: options.maxDryStreak ?? 12,
  };
  const deadline = started + opts.maxMillis;
  const { graph, days } = inputs;
  const facts = worldFacts(graph, days);

  // ---- stage 1: which scenes the world layer can even open, on a LIVE day ----
  // A dead-day opportunity (soul present, but every node shut by a day gate)
  // is not an opportunity — entering then plays nothing and spends the
  // once-only hub entry for the whole week.
  const opportune = new Set(facts.opportunities.filter((o) => o.live).map((o) => o.scene_id));
  // A router-triggered scene (Roc, 2026-08-31 — the narrator's festival
  // vignette tiers) has no `role_tag`: it is never drawn into a soul's
  // screen slot, so it can never show up in `facts.opportunities`, which is
  // built entirely from `day.slot_fill` (who's standing where). That made
  // every scene like it pre-classified `scene-unreachable` before the search
  // ever got a turn, even though `plannedStrategy` already has a fallback
  // ("Begin the festival vignette") that reaches it once nothing else is
  // left — proven reachable by hand for VIG-* (2026-08-31 handoff). Treat
  // such a scene as opportune outright rather than presence-gated: the
  // exploration loop below still has to actually enter and finish it for it
  // to count as reached, same as everything else — this only stops it being
  // thrown out before that chance exists.
  const soulsById = new Map(graph.souls.map((s) => [s.soul_id, s]));
  const routerTriggered = (scene: Graph["scenes"][number]): boolean =>
    soulsById.get(scene.soul)?.role_tag === undefined;
  for (const scene of graph.scenes) {
    if (routerTriggered(scene)) opportune.add(scene.scene_id);
  }
  const unreachableScenes: UnreachableNote[] = [];
  for (const scene of graph.scenes) {
    if (!opportune.has(scene.scene_id)) {
      unreachableScenes.push({
        id: scene.scene_id,
        kind: "scene-unreachable",
        expected: false,
        reason: diagnoseScene(graph, days, facts, scene.scene_id),
      });
    }
  }

  // ---- stage 2/3: walk planned weeks, exploring every scene exhaustively ----
  const seenChoices = new Set<string>();
  const seenOptions = new Set<string>();
  const explored = new Set<string>();
  const bestGain: Record<string, Record<string, number>> = {};
  const reasons: string[] = [];
  const errors: string[] = [];
  const dead = new Set<string>(); // (scene, day) entries that played nothing
  const partial = new Set<string>(); // (scene, day) entries that played only part
  const blocked: PlanBlocks = { dead, partial };
  let paths = 0;
  let weeks = 0;
  let unexplored = new Set(opportune);
  // GP-142: true only if the maxMillis backstop (not maxWeeks/maxSteps) is
  // what cut a pass short. See SearchBounds.timeBackstopHit.
  let timeBackstopHit = false;

  // One pass now (see the retirement note above `exploreScene`) — it walks
  // for coverage and is what the verified week replays.
  //
  // A scene stays WANTED until every one of its choice nodes and options has
  // been seen, not merely until it has been entered once. Entering SC-T6-01 on
  // day 2 explores it exhaustively AS PLAYED THAT DAY, but its `day >= 4` beat
  // and everything that beat unlocks stay invisible. So an incomplete scene
  // gets its entry day blocked and the next week is planned to try another.
  const nodesOf = new Map<string, string[]>();
  const optionsOf = new Map<string, string[]>();
  for (const scene of graph.scenes) {
    nodesOf.set(scene.scene_id, scene.choice_nodes.map((n) => n.choice_id));
    optionsOf.set(scene.scene_id, scene.choice_nodes.flatMap((n) => n.options.map((o) => o.option_id)));
  }
  const sceneComplete = (sceneId: string): boolean =>
    (nodesOf.get(sceneId) ?? []).every((id) => seenChoices.has(id)) &&
    (optionsOf.get(sceneId) ?? []).every((id) => seenOptions.has(id));

  // A scene is only worth re-planning while it still has a day nobody has
  // tried. Without this the search never terminates usefully: the festival
  // scenes can NEVER be complete (their low / mid / high variants are mutually
  // exclusive by construction), so they would compete for their one day
  // forever and starve every scene that shares it.
  const tried = new Set<string>();
  const hasUntriedDay = (sceneId: string): boolean => {
    const scene = graph.scenes.find((s) => s.scene_id === sceneId)!;
    return days.some((d) => {
      const key = `${sceneId}|${d.day}`;
      return sceneLiveOn(graph, scene, d.day) && !dead.has(key) && !tried.has(key);
    });
  };

  // ONE pass (Roc, 2026-08-31 — retiring the max/min bond bias split; see
  // this file's BondBias retirement note above `exploreScene`). There is no
  // second bond_band variant left for a "min" pass to open, so there is
  // nothing here two passes buy over one.
  {
    let want = new Set(opportune);
    let weeksThisPass = 0;
    // How many weeks IN A ROW taught the search nothing. A single dry week
    // used to be proof none of the rest would help either, because buildPlan
    // was a pure function of (want, blocked) — same inputs, same plan,
    // forever. It no longer is: chooseBestWeek's tie-break is now seeded by
    // weeksThisPass (see its own doc) specifically so structurally-symmetric
    // content (three souls with an identically-shaped chain, competing for
    // the same scarce per-block slot) doesn't get stuck replaying the same
    // winner every week. So one dry week only proves THAT seed's tie
    // resolved the same way as before, not that every remaining seed would
    // too — give a short run of them before concluding nothing is left.
    let dryStreak = 0;
    const maxDryStreak = opts.maxDryStreak;
    // WORK-based bound (GP-142): weeksThisPass < opts.maxWeeks is the loop's
    // real, content-derived budget, and it is what is meant to end this loop
    // in the ordinary case. The deadline check below is a BACKSTOP for a
    // machine so overloaded that even this bounded amount of work would hang
    // the caller — it is not supposed to fire during an ordinary run, and it
    // is reported distinctly (timeBackstopHit) when it does, so a
    // load-truncated result is never silently read as a content-truncated
    // one.
    while (weeksThisPass < opts.maxWeeks) {
      if (Date.now() > deadline) {
        timeBackstopHit = true;
        reasons.push(
          `TIME BACKSTOP: wall clock exceeded ${opts.maxMillis}ms after ` +
            `${weeksThisPass}/${opts.maxWeeks} week(s) — this is a machine-load truncation, not a ` +
            `content-derived one; the numbers below this point should not be trusted until re-run`,
        );
        break;
      }
      // A block holds at most one scene entry (see dayCandidates), so when a
      // prerequisite and one of its sibling scenes tie for the same block,
      // "maximize scene count" is blind to which one matters more: both
      // score +1 today, but the prerequisite is what unlocks its whole
      // downstream chain for every week after this one. A small linear bonus
      // (weight = 1 + chain size) is not enough either: it can land on the
      // exact same total as an unrelated same-day bundle of leaf scenes,
      // and chooseBestWeek's tie-break is an arbitrary route-string
      // comparison that has no reason to prefer the chain. Weighting a
      // chain-opening scene in the thousands makes that collision
      // vanishingly unlikely, so the optimizer reliably prefers opening a
      // real chain over any bundle of scenes nothing else depends on. This
      // is exactly what stranded GRT-ilsa-1 behind her own spell-beats at
      // T4, week after week: nothing about "one more leaf scene today" was
      // ever SUPPOSED to outweigh her, but a small flat bonus let it tie.
      const CHAIN_WEIGHT = 1000;
      const dependents = new Map<string, string[]>();
      for (const id of want) {
        const scene = graph.scenes.find((s) => s.scene_id === id);
        if (!scene) continue;
        for (const p of entryGateTerms(scene).played) {
          if (!dependents.has(p)) dependents.set(p, []);
          dependents.get(p)!.push(id);
        }
      }
      const chainWeight = new Map<string, number>();
      const weightOf = (id: string, seen: Set<string>): number => {
        const memo = chainWeight.get(id);
        if (memo !== undefined) return memo;
        if (seen.has(id)) return 0;
        seen.add(id);
        let total = 1;
        for (const dep of dependents.get(id) ?? []) total += CHAIN_WEIGHT * weightOf(dep, seen);
        chainWeight.set(id, total);
        return total;
      };
      // A `~talkday:soul:day` marker (dayCandidates) is not an authored scene
      // — weightOf's graph.scenes lookup finds nothing for it and falls back
      // to the same weight=1 as any unrelated leaf scene, which is too small
      // to reliably beat a tie against clustering (see dayCandidates' own
      // doc). Score it explicitly instead: enough to make the optimizer
      // prefer spreading a needy soul's visits across more distinct days,
      // still far under CHAIN_WEIGHT so it never outranks opening a real
      // chain.
      const TALK_DAY_MARKER_WEIGHT = 50;
      const value = (scenes: ReadonlySet<string>): number => {
        let total = 0;
        for (const id of scenes) {
          total += id.startsWith("~talkday:") ? TALK_DAY_MARKER_WEIGHT : weightOf(id, new Set());
        }
        return total;
      };
      const plan = buildPlan(graph, facts, want, days, blocked, value, 200_000, weeksThisPass);
      const run = exploreWeek(inputs, plan, seenChoices, seenOptions, opts);
      if (process.env.DEBUG_TALKDAYS) {
        const sceneSoulDbg = new Map(graph.scenes.map((s) => [s.scene_id, s.soul]));
        for (const soul of ["ilsa", "mara", "toby"]) {
          const entries = Object.entries(run.entryDays).filter(([id]) => sceneSoulDbg.get(id) === soul);
          const distinctDays = new Set(entries.map(([, d]) => d));
          console.error(
            `week ${weeksThisPass} [${soul}] distinctDays=${distinctDays.size}:`,
            entries.map(([id, d]) => `${id}@${d}`).join(", "),
          );
        }
      }
      weeks += 1;
      weeksThisPass += 1;
      paths += run.paths;
      if (run.capped) reasons.push(`week ${weeksThisPass}: in-scene search hit a cap`);
      for (const e of run.errors) if (!errors.includes(e)) errors.push(e);
      const before = seenChoices.size + seenOptions.size;
      for (const sceneId of run.scenesExplored) {
        explored.add(sceneId);
        const prior = bestGain[sceneId];
        const gain = run.sceneGain[sceneId] ?? {};
        const priorTotal = prior ? Object.values(prior).reduce((a, b) => a + b, 0) : -Infinity;
        const total = Object.values(gain).reduce((a, b) => a + b, 0);
        if (total > priorTotal) bestGain[sceneId] = gain;
      }
      const progressed = seenChoices.size + seenOptions.size > before;

      // Block the day of any entry that left the scene incomplete — an inert
      // entry (no choice point at all), or one that played only part of the
      // scene because a later day would open more of it. The next plan routes
      // around that exact (scene, day) instead of repeating itself.
      let learned = false;
      const block = (into: Set<string>, key: string): void => {
        if (!into.has(key)) {
          into.add(key);
          learned = true;
        }
      };
      for (const key of run.inertEntries) block(dead, key);
      for (const sceneId of run.scenesEntered) {
        const key = `${sceneId}|${run.entryDays[sceneId] ?? 0}`;
        if (!tried.has(key)) {
          tried.add(key);
          learned = true;
        }
        if (!sceneComplete(sceneId)) block(partial, key);
      }

      // A scene the plan SCHEDULED for one particular day but that never
      // actually got entered (its "Talk to" choice never appeared) teaches
      // the two mechanisms above nothing: no entry means no inertEntries
      // record and no scenesEntered/partial mark. Left alone, buildPlan is a
      // pure function of (want, blocked), so it deterministically
      // re-schedules that same day forever and the search converges having
      // never tried the scene's other live days. This is the day-scheduler's
      // real gap: it treats a day's opportunity set as a bag any subset of
      // which is achievable, but every conversation spends the WHOLE time
      // slot (GP-93 rule 1, ink.ts's emitConversationReturn) and presence
      // can differ block to block, so two scenes competing for the same
      // visit can silently strand the second one on that exact day even
      // though it plays fine on another. Soft-block (not dead — a later
      // week's smaller `want` may un-stick this very day once fewer scenes
      // are competing for it) the one day this scene WAS scheduled on, so
      // the next plan tries a different one instead of repeating itself.
      const doNotEnterSet = new Set(plan.doNotEnter);
      for (const sceneId of want) {
        if (run.scenesEntered.includes(sceneId)) continue;
        const scene = graph.scenes.find((s) => s.scene_id === sceneId);
        if (!scene) continue;
        const openDays = days
          .map((d) => d.day)
          .filter((d) => sceneLiveOn(graph, scene, d) && !doNotEnterSet.has(`${sceneId}|${d}`));
        if (openDays.length === 1) block(partial, `${sceneId}|${openDays[0]}`);
      }

      want = new Set([...opportune].filter((id) => !sceneComplete(id) && hasUntriedDay(id)));
      unexplored = new Set([...opportune].filter((id) => !explored.has(id)));
      if (want.size === 0) break;
      // Stop once a short run of weeks in a row taught us nothing at all —
      // no new id, and no new dead day to avoid. A single dry week is no
      // longer conclusive (see dryStreak's own doc above); a run of them is.
      dryStreak = !progressed && !learned ? dryStreak + 1 : 0;
      if (dryStreak >= maxDryStreak) break;
      if (weeksThisPass >= opts.maxWeeks) {
        reasons.push(
          `pass hit maxWeeks=${opts.maxWeeks} with ${want.size} scene(s) not fully explored`,
        );
      }
    }
  }
  if (unexplored.size > 0) {
    // Name the entry gate where there is one. The world layer said the gate can
    // open, so a scene that still never got entered is usually a gate the
    // WALK cannot satisfy even though the content can — knows(phrase) whose only
    // setter is an examinable, say, which no strategy here ever pokes. Without
    // the gate text that reads as a plain budget miss.
    const withGate = [...unexplored].sort().map((id) => {
      const gate = graph.scenes.find((s) => s.scene_id === id)?.entry_gate ?? [];
      return gate.length > 0 ? `${id} (entry gate ${JSON.stringify(gate)})` : id;
    });
    reasons.push(`never entered: ${withGate.join(", ")}`);
  }

  // ---- max bond: plan for BOND, not for scene count ----
  //
  // The exploration passes plan for coverage, which is the right objective for
  // "what can be reached" and the wrong one for "how much bond". Two cheap
  // scenes can out-score one rich one. Now that every reachable scene's best
  // in-scene gain is known, re-plan against that number and walk the result.
  // A soul gets its OWN optimal week — "the max bond for Toby" and "the max
  // bond for Ilsa" are different questions and may want different weeks.
  const soulIds = graph.souls.map((s) => s.soul_id);
  const gainOfScene = (sceneId: string, soul: string): number => bestGain[sceneId]?.[soul] ?? 0;

  /**
   * The AUTHORED per-scene ceiling for a soul, read straight off the graph.
   *
   * WHY THIS EXISTS (fixed 2026-08-17). `gainOfScene` reads `bestGain`, which is
   * PATH-DEPENDENT: it records only what some explored path through a scene
   * actually collected. A scene the search ENTERED but whose bond options no
   * explored path happened to take gets no entry at all, and `gainOfScene` then
   * silently returns 0 for it.
   *
   * That hole was observable and measured. Mara's own optimal week achieved 20
   * against an upperBound of 12, and `scenesUsed` named only SC-T2-12. But mara
   * has TWO scenes in the reachable set: SC-T2-12 (6 nodes, 12 authored) and
   * SC-T2-22 (5 nodes, 10 authored) — 22 between them, of which her week
   * collected 20. SC-T2-22 was in `explored` the whole time. It contributed 0 to
   * the ceiling, 0 to scenesUsed and 0 to blockedBy simultaneously, because one
   * missing `bestGain` entry silences all three.
   *
   * Note GP-142 already tried to fix this by WIDENING the domain of the sum from
   * explored to opportune. That could not work: an unrecorded scene contributes
   * 0 whichever set you iterate. The domain was never the problem — the lookup was.
   *
   * A ceiling computed from search results is not a ceiling. This one is
   * computed from the CONTENT: best option at every choice node, with
   * bond_band-gated nodes counted once (they are mutually exclusive variants of
   * one moment, not three separate earnings). Same rule as tuning.test.ts's
   * maxBondPerLife, applied per scene instead of per soul.
   */
  const authoredGainOfScene = (sceneId: string, soul: string): number => {
    const scene = graph.scenes.find((s) => s.scene_id === sceneId);
    if (!scene) return 0;
    // A scene awards bond to ITS OWN soul only: compileStateActions emits
    // `recordBond("<scene.soul>", category)`, so the soul is fixed at emit time
    // and a bond_event in toby's scene can never move mara's count. Without this
    // guard every soul is credited for every scene and the ceiling is nonsense.
    if (scene.soul !== soul) return 0;
    let ungated = 0;
    const variants = new Map<string, number>();
    for (const node of scene.choice_nodes) {
      const bandGate = node.availability_conditions.find((c) => c.startsWith("bond_band"));
      let best = 0;
      for (const o of node.options) {
        const d = (o.state_actions ?? [])
          .filter((a) => a.type === "bond_event")
          .reduce((t, a) => t + bondDelta(a.arg, soul, graph.bond), 0);
        if (d > best) best = d;
      }
      if (bandGate) variants.set(bandGate, Math.max(variants.get(bandGate) ?? 0, best));
      else ungated += best;
    }
    return round6(ungated + Math.max(0, ...variants.values()));
  };
  const valueFor =
    (souls: readonly string[]) =>
    (scenes: ReadonlySet<string>): number => {
      let total = 0;
      for (const id of scenes) for (const soul of souls) total += gainOfScene(id, soul);
      return round6(total);
    };

  // Distinct plans only: souls usually share an optimum, and each plan costs a
  // full explore + verify walk.
  const walkedPlans = new Map<string, { plan: WeekPlan; week: WalkResult }>();
  const planKeyForSoul = new Map<string, string>();
  const runPlan = (built: WeekPlan & { capped: boolean }, label: string): string => {
    const key = JSON.stringify(built.routes);
    if (built.capped) reasons.push(`${label}: week assignment hit the state cap`);
    if (!walkedPlans.has(key)) {
      const run = exploreWeek(inputs, built, seenChoices, seenOptions, opts);
      paths += run.paths;
      if (run.capped) reasons.push(`${label}: in-scene search hit a cap`);
      const plan: WeekPlan = { ...built, sceneOptions: run.sceneOptions };
      const week = walkWeek(inputs, plannedStrategy(plan), { maxSteps: opts.maxSteps });
      if (week.truncated) reasons.push(`${label}: verification walk hit the step cap`);
      for (const e of week.errors) if (!errors.includes(e)) errors.push(e);
      // The exploring walk and the plain replay must agree; if not, the
      // recorded option indices did not reproduce and the figure is suspect.
      const missed = run.scenesEntered.filter((s) => !week.scenesEntered.includes(s));
      if (missed.length > 0) {
        reasons.push(`${label}: replay diverged — explored ${missed.join(", ")}, replay did not`);
      }
      for (const sceneId of run.scenesExplored) explored.add(sceneId);
      walkedPlans.set(key, { plan, week });
    }
    return key;
  };

  const totalKey = runPlan(
    // The bond plans get only the HARD blocks. A "partial" day is a coverage
    // preference; for bond it must not stop a rich scene being scheduled at
    // all — the festival scenes can never be "complete" (their band variants
    // are mutually exclusive), and treating that as a ban dropped them.
    buildPlan(graph, facts, new Set(explored), days, { dead, partial: new Set() }, valueFor(soulIds)),
    "bond-optimal week (all souls)",
  );
  for (const soul of soulIds) {
    const potential = [...explored].reduce((t, id) => t + gainOfScene(id, soul), 0);
    if (potential <= 0) {
      planKeyForSoul.set(soul, totalKey);
      continue;
    }
    planKeyForSoul.set(
      soul,
      runPlan(
        buildPlan(graph, facts, new Set(explored), days, { dead, partial: new Set() }, valueFor([soul])),
        `bond-optimal week (${soul})`,
      ),
    );
  }

  const verifiedPlan = walkedPlans.get(totalKey)!.plan;
  const verifiedWeek = walkedPlans.get(totalKey)!.week;

  // Ceiling: every reachable scene's best in-scene gain, summed. It is only
  // ATTAINABLE if all of those scenes fit in one week — two scenes that only
  // ever appear on the same day at incompatible time blocks cannot. When the
  // walked week falls short, `blockedBy` names exactly which scenes it had to
  // give up, so `exact: false` is a fact about the content, not a shrug.
  // GP-142: sum over every REACHABLE scene (`opportune`, the same set
  // unreachableScenes was partitioned from above), not merely every scene
  // this particular search happened to EXPLORE (`bestGain`'s own domain).
  // `MaxBond.upperBound`'s own contract says "every reachable scene's best
  // in-scene gain" — bestGain can be a strict subset of that (a scene the
  // "max" bias pass never got to before converging elsewhere, or one only
  // entered later while walking the bond-optimal week itself), and summing
  // over that narrower set is exactly the shape this project keeps paying
  // for: a ceiling computed over less than the whole reachable set can read
  // as authoritative while quietly being too low. gainOfScene defaults a
  // scene with no recorded gain to 0, same as omitting it — so this is a
  // strictly more complete sum, never a smaller one, and it costs nothing
  // when bestGain already covers everything reachable.
  const upper: Record<string, number> = {};
  for (const sceneId of opportune) {
    for (const soul of soulIds) {
      const delta = authoredGainOfScene(sceneId, soul);
      if (delta !== 0) upper[soul] = round6((upper[soul] ?? 0) + delta);
    }
  }
  const maxBond: Record<string, MaxBond> = {};
  for (const soul of soulIds) {
    const week = walkedPlans.get(planKeyForSoul.get(soul)!)!.week;
    const achieved = round6(week.bond[soul] ?? 0);
    const upperBound = round6(upper[soul] ?? 0);
    // scenesUsed / blockedBy also move to the authored figure. They asked
    // "does this scene carry bond for this soul", which is a CONTENT question,
    // and answering it from search results is what let SC-T2-22 vanish.
    const used = week.scenesEntered.filter((id) => authoredGainOfScene(id, soul) > 0).sort();
    const blockedBy = [...opportune]
      .filter((id) => authoredGainOfScene(id, soul) > 0 && !week.scenesEntered.includes(id))
      .sort();
    maxBond[soul] = {
      achieved,
      band: bondBandOf(achieved, graph.bond),
      upperBound,
      // `exact` means "nothing was given up", which is a statement about SCENES
      // SKIPPED, not about hitting a numeric total. Those were conflated as
      // `achieved === upperBound`, and that only held while upperBound was
      // accidentally equal to what one week collected. A soul can enter every
      // scene that carries its bond and still take a sub-optimal option inside
      // one of them — that is not "something was blocked", it is a cheaper path
      // through a scene it did visit. Defining exact off blockedBy keeps the
      // field honest and keeps it consistent with its own docstring.
      exact: blockedBy.length === 0,
      scenesUsed: used,
      blockedBy,
    };
  }

  // ---- what never turned up, and whether that is a defect or by design ----
  //
  // A beat gated on `bond_band(soul) = high` when one life cannot reach high is
  // EXPECTED unreachable — that is the ruling ("one life earns mid, two lives
  // earn high"), not a bug. The test suite must not read it as one. The check
  // is derived, never hard-coded: the band's own threshold from
  // graph.bond.band_thresholds against the max bond a real week actually
  // achieved for that soul.
  const bandOutOfReach = (conditions: string[] | undefined): string | null => {
    for (const cond of conditions ?? []) {
      const m = cond.trim().match(/^bond_band\(([^)]+)\)\s*=\s*(low|mid|high)$/);
      if (!m) continue;
      const soul = m[1];
      const wanted = m[2] === "high" ? 2 : m[2] === "mid" ? 1 : 0;
      const best = maxBond[soul]?.achieved ?? 0;
      if (bondBandOf(best, graph.bond) < wanted) {
        const need =
          wanted === 2 ? graph.bond.band_thresholds.high_min : graph.bond.band_thresholds.mid_min;
        return (
          `gated on bond_band(${soul}) = ${m[2]}, which needs ${need}; the best a single life` +
          ` reaches for ${soul} is ${best}. Expected: the ruling is one life earns mid,` +
          ` a second life earns high`
        );
      }
    }
    return null;
  };

  const unreachableChoiceNodes: UnreachableNote[] = [];
  const unreachableOptions: UnreachableNote[] = [];
  const unreachableSceneIds = new Set(unreachableScenes.map((u) => u.id));
  const classify = (scene: Graph["scenes"][number], node: Graph["scenes"][number]["choice_nodes"][number]) => {
    if (unreachableSceneIds.has(scene.scene_id)) {
      return {
        kind: "scene-unreachable" as const,
        expected: false,
        reason: `scene ${scene.scene_id} is unreachable`,
      };
    }
    if (!explored.has(scene.scene_id)) {
      return {
        kind: "scene-unexplored" as const,
        expected: false,
        reason: `scene ${scene.scene_id} was never explored inside the search budget`,
      };
    }
    const bandReason = bandOutOfReach(node.availability_conditions);
    if (bandReason !== null) {
      return { kind: "band-needs-another-life" as const, expected: true, reason: bandReason };
    }
    return {
      kind: "defect" as const,
      expected: false,
      reason:
        `never offered inside ${scene.scene_id}, which the search explored exhaustively;` +
        ` gate: ${JSON.stringify(node.availability_conditions)}`,
    };
  };

  for (const scene of graph.scenes) {
    for (const node of scene.choice_nodes) {
      const verdict = classify(scene, node);
      if (!seenChoices.has(node.choice_id)) {
        unreachableChoiceNodes.push({ id: node.choice_id, ...verdict });
      }
      for (const opt of node.options) {
        if (seenOptions.has(opt.option_id)) continue;
        unreachableOptions.push({
          id: opt.option_id,
          ...verdict,
          reason: `${node.choice_id}: ${verdict.reason}`,
        });
      }
    }
  }

  const millis = Date.now() - started;
  if (millis > opts.maxMillis) reasons.push(`search ran ${millis}ms, past the ${opts.maxMillis}ms budget`);

  return {
    reachableScenes: [...explored].sort(),
    unreachableScenes,
    reachableChoiceNodes: [...seenChoices].sort(),
    unreachableChoiceNodes,
    reachableOptions: [...seenOptions].sort(),
    unreachableOptions,
    maxBond,
    opportunities: facts.opportunities,
    verifiedWeek,
    verifiedPlan,
    bounds: {
      hit: reasons.length > 0,
      reasons,
      weeksWalked: weeks,
      scenePathsExplored: paths,
      millis,
      timeBackstopHit,
      unexploredScenes: [...unexplored].sort(),
    },
    errors,
  };
}
