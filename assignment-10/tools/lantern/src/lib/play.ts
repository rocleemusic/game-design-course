import { Story } from "inkjs";
import type { BondTuning, Day } from "../types";
import { parseTags, stripTags, type ParsedTags } from "./tags";
import { unquote, type GraphIndex, type PlayPos } from "./playMap";
import { nextTimeBlock } from "./stage";
import { DEFAULT_BOND_TUNING, WorldState, type BondBand } from "./world";

/** "Go to <screen>" (an exit) or "Begin at <screen>" (day 1's manual start
 *  pick) — the other half of a "move" choice is the literal "End the day". */
const MOVE_TEXT = /^(Go to |Begin at )/;

/**
 * D6 — carry model (GDD 03-core-loop.md:14): "you carry from the screen only
 * what fits the satchel." A flat cap on the satchel strip. Once it is full,
 * an ordinary pickup has nowhere to go (see `pickup`) — the only way to keep
 * carrying is a pack-triage (see `packTriage`, `ARMS_CAPACITY`).
 */
export const SATCHEL_CAPACITY = 6;

/**
 * D6 — pack-triage (GDD 03-core-loop.md:14): "end a day early to bank a full
 * pack plus what you can carry in your arms." A small buffer, separate from
 * the satchel and its cap, that a pickup can spill into only once the
 * satchel is already full. Arms-carry is not free extra satchel space: it
 * only ever gets banked home when the day ends specifically THROUGH
 * `packTriage()` — an ordinary "End the day" (or the day running out on its
 * own) drops it instead. See `bankSatchel`.
 */
export const ARMS_CAPACITY = 2;

/**
 * resolver/src/graph.ts's `HOME_SCREEN_ID` — the Home Hub's screen_id.
 * Duplicated here (a literal, not an import) because lantern reads
 * graph.json/day.json as data and does not import the resolver's TS source
 * for this constant; the resolver's own screen-specs.json ships a matching
 * `"screen_id": "HOME"` entry (D2 iteration 3) and lantern's own
 * `Screen.location` union already documents "home" as this same hub
 * (types.ts).
 */
const HOME_SCREEN_ID = "HOME";

/**
 * resolver/src/graph.ts's `FESTIVAL_SCREEN_ID` — the Festival Grounds'
 * screen_id, and the only screen the final sequence's night ever reaches
 * (RULED 2026-08-01). Duplicated here as a literal for the same reason as
 * `HOME_SCREEN_ID` above.
 */
const FESTIVAL_SCREEN_ID = "T7";

/**
 * resolver/src/graph.ts's `NARRATOR_SOUL_ID` — the non-diegetic narrator voice
 * that carries the festival-vignette tier scenes. It must NEVER be placed as an
 * NPC on a screen (RULED: no speaker -> narrator is an inferred heuristic, not a
 * cast member). Duplicated here as a literal for the same reason as
 * `HOME_SCREEN_ID` above; `applyPresence` skips it so `present_narrator` stays
 * "none" even when the day resolver's slot_fill happens to seat it — the game's
 * mirror of walk.ts's `syncPresence` narrator skip.
 */
const NARRATOR_SOUL_ID = "narrator";

/**
 * The play engine: inkjs wrapped behind a small DOM-free class so the whole
 * flow — continue, choices, snapshots, jumps — unit-tests against the real
 * compiled fixture. UI code holds one instance and re-reads view() after
 * every action.
 *
 * Snapshot rule (spec): story.state.ToJson() at every choice point, taken the
 * moment a choice is made — so restoring a snapshot lands you back AT that
 * choice, other branch still open, no replay.
 *
 * Tag reality (verified against the compiled fixture): inkjs does NOT carry
 * the #opt tag on Choice objects. The tag arrives on an empty content line
 * right after the choice is taken. So option identity at choice time comes
 * from matching the weave text against the graph's options; the post-choice
 * tag line is consumed silently and confirms the visited trace.
 */

export interface PlayLine {
  text: string;
  tags: ParsedTags;
  /** the player's own picked option, echoed into the transcript */
  player?: boolean;
  /** marker lines are the tool's own annotations (jumps, restores) */
  marker?: boolean;
}

export interface PlayChoice {
  index: number;
  /** raw weave text, tags stripped */
  text: string;
  optionId: string | null;
  /**
   * spoken/deed = a dialogue option, inside a scene's choice weave.
   * move = a location or day-end choice off a screen hub (RULED 2026-08-01:
   * "[Go to X]", "[Begin at X]", "[End the day]") — these spend the block's
   * move budget (or end the day) rather than advance a conversation, so the
   * UI puts them in their own row above Continue/Restart instead of the
   * dialogue choice list.
   */
  kind: "spoken" | "deed" | "move";
  /**
   * WHICH fixed screen-hub verb this is, when it is one at all — `undefined`
   * for every authored dialogue option, look, talk and scene entry.
   *
   * Added 2026-08-24 for the HUD relayout (T14, `plans/2026-08-23-hud-relayout-
   * ruling.md`). `kind` deliberately does NOT change: its ruled meaning is
   * still "this is a screen-hub choice, not a conversation choice" (see above),
   * and `CollectScene`'s VN scope seam, the walker, `ReceiverHotspots` and the
   * lantern tool's own play pane all read it that way. Re-partitioning `kind`
   * to split day-end out of `move` would silently flip that seam at NIGHT,
   * when ink suppresses every "Go to X" and "End the day" is the ONLY hub
   * choice left — the VN box would take the hub over. So the split rides here
   * instead, additively.
   *
   * The HUD needs the distinction because the three hub verbs now render in
   * three different places: an `exit` is a clickable dashed region on the
   * painting, `wait` is a bar tile, `endday` is the bar's ember pill (with a
   * confirm). Only `exit` names a place on screen, so only `exit` can become
   * a region — which is exactly what `kind === "move"` alone could not tell
   * you, because it covers day-end too.
   *
   * Matched on the same literal strings, under the same `!opt` guard, as
   * `kind` itself — see `choices()`. `emitScreen`/`emitMain` in
   * `tools/resolver/src/ink.ts` are the only writers of these phrasings.
   */
  hubAction?: "exit" | "wait" | "endday";
  /** what the play pane renders: quoted player_line or [bracketed deed] */
  display: string;
  /**
   * Set only for a "move" choice into a status-LOCKED screen (D3): the
   * target's ScreenSpec.status, straight off the graph — "locked(gate_id[,
   * gate_id])" only. "reachable(gate_id)" is deliberately excluded — the
   * schema defines it as never blocked (screen-spec-schema.md), so it is not
   * a lock and must not read as one. ink.ts emits the lock as a #lock: tag on
   * the exit's own line, but inkjs does not carry it on the pre-selection
   * Choice object (same gap as #opt — see playMap.ts's lockForScreenName), so
   * this is looked up by the target screen's name instead of read off a tag.
   * The lock is advisory only: ink.ts emits it and enforces nothing, on
   * purpose (a gate has no machine-readable condition to compile), so showing
   * it here is the only place a player ever learns about it before walking
   * through.
   */
  lock?: string;
}

export interface PlaySnapshot {
  label: string;
  stateJson: string;
  visited: string[];
  lineCount: number;
  /** satchel semantics: the satchel is part of the snapshot state — restore
   *  rolls pickups back and the items return to their slots. Pool names, in
   *  slot order with any empty slots skipped (compacted) — same shape as
   *  `PlayView.satchel`. NOTE: slot ARRANGEMENT (which physical pocket held
   *  which item — see `PlayView.satchelSlots`) is deliberately NOT part of
   *  what a snapshot carries; a restore repacks survivors starting at slot 0.
   *  A drop/move rearranges pockets, it does not change what is held, so
   *  nothing is lost across a restore — only the on-screen layout resets. */
  satchel: string[];
  pickedSlots: string[];
  /** D6 — pack-triage's arms-carry buffer, same rollback semantics as satchel */
  arms: string[];
  /** D6 — the permanent home collection. Rides the snapshot too: restoring to
   *  a point before a bank happened must undo the bank, or a restore would
   *  leave items remembered at home that this timeline branch never sent
   *  there. */
  banked: string[];
  timeBlock: string;
  /** ink's `day` VAR at the snapshot — lets restore swap back to the matching
   *  day file (see `syncDay`) instead of re-applying presence from whichever
   *  day happens to be current when the snapshot is restored. */
  day: number;
  /**
   * Host world state at the snapshot. Without this a restore would roll ink
   * back while the bond kept its later value, and the two would silently
   * disagree about the same moment — the bond would remember a conversation
   * the story has un-had.
   */
  world: string;
}

export interface PlayView {
  lines: PlayLine[];
  choices: PlayChoice[];
  canContinue: boolean;
  ended: boolean;
  errors: string[];
  pos: PlayPos;
  timeline: PlaySnapshot[];
  /** picked-up items, in slot order with empty slots skipped (compacted) —
   *  the satchel strip renders these. See `satchelSlots` for the positional
   *  version a drop/move UI needs; this field's shape is unchanged by that
   *  track on purpose, so every existing reader (the HUD strip, saves) needs
   *  no update. */
  satchel: string[];
  /** D6 — the satchel's cap (SATCHEL_CAPACITY), surfaced for the strip's
   *  "n / cap" readout and to disable pickup once full. */
  satchelCapacity: number;
  /**
   * The satchel's own physical layout, one entry per pocket, `null` for
   * empty — added for the satchel drop/move track (2026-08-22). `satchel`
   * above answers "what am I carrying"; this answers "which pocket is it
   * in," which only exists because `LanternPlayer.satchel` itself became a
   * fixed-length, gap-holding array instead of a dense append-only one (see
   * that field's own comment for why a dense array cannot support "move to
   * THIS empty pocket" at all). `SatchelScene` is the only reader today.
   */
  satchelSlots: readonly (string | null)[];
  /** D6 — pack-triage's arms-carry buffer: items picked up after the satchel
   *  was already full, kept only if the day ends via `packTriage()` (see
   *  `bankSatchel`). */
  arms: string[];
  /** D6 — arms-carry's cap (ARMS_CAPACITY). */
  armsCapacity: number;
  /** D6 — the permanent home collection (GDD 03-core-loop.md:14:
   *  "everything you've ever collected is recorded permanently"). Grows
   *  every time play reaches the Home Hub, from whatever the satchel and
   *  arms were carrying at that moment; never cleared for the life of this
   *  session. */
  banked: string[];
  /** D6 — the notebook (GDD 03-core-loop.md:14: "referenced at any time,
   *  holds the knowledge you have collected"). A straight read of
   *  `WorldState.knownPhrases()` (the host-side mirror of ink's own
   *  KnownPhrases LIST — see `bindExternals`'s doc comment), in the order
   *  each phrase was first learned. */
  notebook: string[];
  /** slot_ids already emptied this day */
  pickedSlots: string[];
  /** the current time block, read back from ink — ink owns the clock */
  timeBlock: string;
  /** ink's own `day` VAR, read back directly — for the header (day · block · moves) */
  day: number;
  /**
   * ink's own `year` VAR, read back directly — T13's year loop
   * (plans/2026-08-24-year-loop-saves-build-plan.md, Phase 2).
   *
   * A READ, exactly like `day` above, and there is no writer anywhere outside
   * ink: `begin_new_year` is the only thing that ever increments it (`~ year =
   * year + 1`, emitted by the resolver), and the host only ever diverts INTO
   * that knot. Nothing here or downstream may `setVar("year", ...)` — the same
   * rule `day`/`TimeOfDay`/`movesLeft` already live under, and the reason
   * phaser's `tests/SaveLoad.test.ts` greps `src/world/save/**` for `setVar`.
   *
   * Falls back to 1 when the story has no `year` VAR at all (the small T1/T2
   * fixtures, and any story compiled before Phase 1) — same defensive default
   * `day` uses, so an older bundle reads "year 1" rather than NaN.
   */
  year: number;
  /** ink's own `movesLeft` VAR — the CURRENT BLOCK's remaining move budget
   *  (RULED 2026-08-01: 3 moves per block, not per day) */
  movesLeft: number;
  /**
   * D4 — Active threads. `WorldState.threadMoves()` had zero call sites
   * outside world.ts; this is that data reaching the UI. thread_id -> how
   * many times `recordThreadMove` fired for it THIS session — which threads
   * HAVE moved, distinct from week.ts's static "which scenes CAN move a
   * thread" (authored state_actions, never executed).
   */
  threadMoves: Record<string, number>;
  /** Raw thread-move events in the order they fired (duplicates kept) — the
   *  session's own event log, filtered to `kind: "thread"`. No id -> human
   *  label map exists yet (arc-festival-slice.md's thread table has no id
   *  column), so these are surfaced as bare ids; see ThreadsPanel. */
  threadMoveLog: string[];
  /**
   * D5 — live bond state, COARSE ONLY. `soul_id -> band (0/1/2)` for every
   * soul the world has scored this session. persona-card-schema.md:31-35 and
   * world.ts's own guardrail comment: the bond score "accretes host-side,
   * never on the card, never surfaced" — only the derived band may leave
   * WorldState. There is deliberately no raw-count field anywhere on
   * PlayView; do not add one.
   */
  bondBands: Record<string, BondBand>;
}

export class LanternPlayer {
  private story: Story;
  private index: GraphIndex;
  private lines: PlayLine[] = [];
  private timeline: PlaySnapshot[] = [];
  private errors: string[] = [];
  private visited = new Set<string>();
  private currentScreen: string | null = null;
  private currentLine: string | null = null;
  private currentChoice: string | null = null;
  private day: Day | null = null;
  /**
   * The satchel, PHYSICALLY — a fixed-length array of `SATCHEL_CAPACITY`
   * pockets, `null` where a pocket is empty (mode5 satchel drop/move track,
   * 2026-08-22). Was a dense, append-only `string[]` (push on pickup,
   * nothing else ever removed a middle entry) — that shape has no way to
   * represent "this specific pocket, and no other, is empty," so a
   * drop-then-move UI had nowhere stable to land an item. `dropSatchelSlot`/
   * `moveSatchelSlot` are the only mutators besides `pickup` and the
   * day/bank resets below; every one of them preserves the fixed length.
   *
   * Every EXTERNAL contract this field used to back — `PlayView.satchel`,
   * `PlaySnapshot.satchel`, the save file's `satchelPoolNames` — stays the
   * old compacted `string[]` shape on purpose (see `compactSatchel`), so nothing
   * outside this file needed to change to keep working. `PlayView.satchelSlots`
   * is the one new, additive way to see the gaps.
   */
  private satchel: (string | null)[] = new Array(SATCHEL_CAPACITY).fill(null);
  /** D6 — pack-triage's arms-carry buffer. See `pickup`, `bankSatchel`. */
  private arms: string[] = [];
  /** D6 — the permanent home collection. Never cleared by `applyDay`; only
   *  `restore` can roll it back (to an earlier snapshot's own value). */
  private banked: string[] = [];
  private pickedSlots = new Set<string>();
  /**
   * D6 iteration 2 — pack-triage's actual stake (GDD 03-core-loop.md:14 draws
   * two distinct outcomes: ordinary day's end carries only "what fits the
   * satchel"; the separate early-end action banks "a full pack plus what you
   * can carry in your arms"). Set true only inside `packTriage()`, consumed
   * (and cleared) by the very next `bankSatchel()`. Every OTHER route to the
   * Home Hub — the plain "End the day" choice sitting in the ordinary move
   * row, or ink's own automatic day_end when an evening's moves run out —
   * leaves this false, so arms-carry is dropped instead of banked. Without
   * this flag, pack-triage was a relabeled "End the day" with no outcome of
   * its own: arms banked unconditionally either way.
   */
  private triageArmsPending = false;
  private timeBlock = "morning";
  /**
   * Every day file for the week, keyed by its `day` number — the whole-life
   * output of `resolver resolve-week` (bridge.ts's `run.days`), when the
   * caller has it. Lets the player swap in the matching day's presence and
   * item rolls the moment ink's own `day` VAR rolls over, instead of playing
   * the rest of the week on day 1's file. Empty when only a single day.json
   * was loaded (fixture mode pre-W1d) — day-swap is then simply a no-op, same
   * as before this existed.
   */
  private days = new Map<number, Day>();
  /** host-side state: the "code" that disposes what narration proposes */
  readonly world: WorldState;
  /** set by hand through setVar — a forced walk must never read as an earned one */
  private forced = false;
  /**
   * Names bound through `bindExternal` (the learn-scene bridge, 2026-08-30) —
   * tracked so a rebind is a REBIND and not inkjs's "already bound" throw. This
   * player is built once and shared across every scene/life (`InkBridge`), so
   * `CollectScene.init` calling `bindExternal("castSpell", …)` on a second life
   * hits an already-bound name; without this set the second bind would throw.
   * The four constructor-time externals (`bindExternals`) are deliberately NOT
   * in here — nothing rebinds them, and they must stay exactly one-writer.
   */
  private readonly boundExternals = new Set<string>();
  /**
   * True only INSIDE `previewChoice` — see that method. Every EXTERNAL bound by
   * this class (and every one a host binds through `bindExternal`) short-circuits
   * while it is set, because a preview runs real ink content and an external is
   * the one thing a `state.LoadJson` rollback cannot undo: it writes OUTSIDE the
   * story (the host's Knowledge/Inventory via `seeSpell`, `WorldState` via
   * `recordBond`). Ink-side effects roll back with the state; host-side effects
   * would not, so they must never run at all.
   */
  private previewing = false;

  constructor(
    storyJson: string,
    index: GraphIndex,
    day: Day | null = null,
    bondTuning: BondTuning = DEFAULT_BOND_TUNING,
    days: Day[] = [],
  ) {
    this.story = new Story(storyJson);
    this.world = new WorldState(bondTuning);
    this.bindExternals();
    // Every external the emitted project declares is now bound for real, so a
    // fallback would only ever hide a NEW unbound one. Turning this OFF is the
    // line that makes the W1a class of bug impossible to reintroduce: an
    // unbound external becomes a loud error instead of a silent zero.
    this.story.allowExternalFunctionFallbacks = false;
    this.story.onError = (message) => this.errors.push(String(message));
    this.index = index;
    for (const d of days) this.days.set(d.day, d);
    if (day) this.applyDay(day);
  }

  /**
   * Bind the four EXTERNALs the resolver emits (actions.ts EXTERNAL_FUNCTIONS).
   * Ink stores nothing; the host does — "narration proposes, code disposes"
   * (choice-node-schema.md). Each returns 0 because ink declares them as
   * functions used in `~` statements, and the value is never read.
   *
   * recordKnowledge deliberately does NOT write the KnownPhrases LIST: the
   * emitted ink already does `~ KnownPhrases += <phrase>` right beside the
   * external call, and a second writer would give one fact two owners.
   */
  private bindExternals(): void {
    const soulOf = (v: unknown) => String(v);
    this.story.BindExternalFunction("recordBond", (soul: unknown, category: unknown) => {
      if (this.previewing) return 0;
      const next = this.world.recordBond(soulOf(soul), String(category));
      this.mirrorBond(soulOf(soul), next);
      return 0;
    });
    this.story.BindExternalFunction("recordKnowledge", (phrase: unknown) => {
      if (this.previewing) return 0;
      this.world.recordKnowledge(String(phrase));
      return 0;
    });
    this.story.BindExternalFunction("recordThreadMove", (threadId: unknown) => {
      if (this.previewing) return 0;
      this.world.recordThreadMove(String(threadId));
      return 0;
    });
    this.story.BindExternalFunction("recordCanonWrite", (fact: unknown) => {
      if (this.previewing) return 0;
      this.world.recordCanonWrite(String(fact));
      return 0;
    });
    // Learn-scene bridge externals (2026-08-30). Bound as no-ops HERE, at
    // construction, so the story validates and boots even before a scene owns
    // the spell machinery — enriched content now emits `~ seeSpell(...)` /
    // `~ castSpell(...)`, and with fallbacks disabled (above) an unbound
    // external throws the moment ink runs, which crashed the boot. CollectScene
    // rebinds the real handlers via `bindExternal()`; tracking them in
    // `boundExternals` lets that rebind unbind-then-bind instead of throwing
    // "already bound".
    this.story.BindExternalFunction("seeSpell", () => 0);
    this.story.BindExternalFunction("castSpell", () => 0);
    this.boundExternals.add("seeSpell");
    this.boundExternals.add("castSpell");
  }

  /**
   * Bind (or rebind) one ink EXTERNAL to a real host handler — the mount point
   * for the learn-scene bridge (`seeSpell`/`castSpell`, 2026-08-30). The emitted
   * `system/externals.ink` ships a no-op `=== function` fallback for each, so
   * binding OVER one is always safe: with `allowExternalFunctionFallbacks =
   * false` (set in the constructor) an unbound external is a loud error the
   * moment ink calls it, and this is how a scene that owns the real spell
   * machinery (`CollectScene`) supplies the real handler once its
   * Inventory/Knowledge/pipeline exist.
   *
   * IDEMPOTENT: inkjs's `BindExternalFunction` throws if the name is already
   * bound, so a name seen before is unbound first — this player is shared across
   * lives and `init` runs per life. `lookaheadSafe = false` because these
   * handlers MUTATE host state (consume components, learn a spell); ink's glue
   * lookahead must never run them speculatively — the same posture the
   * constructor's write-side externals rely on.
   */
  bindExternal(name: string, fn: (...args: unknown[]) => unknown): void {
    if (this.boundExternals.has(name)) this.story.UnbindExternalFunction(name);
    // Wrapped, never bound raw: a host handler mutates HOST state (learn a
    // spell, consume components), and `previewChoice` runs real ink content it
    // then rolls back. Ink state rolls back; the host's does not — so a preview
    // must see the same no-op stub the constructor binds. See `previewing`.
    this.story.BindExternalFunction(name, (...args: unknown[]) => (this.previewing ? 0 : fn(...args)), false);
    this.boundExternals.add(name);
  }

  /**
   * Mirror the derived BAND (not the raw count) into bondLevel_<soul>.
   * screen-spec-schema.md: "Mirror in, event out; ink never assigns it." The
   * raw count stays host-side and hidden, which is the whole design — ink only
   * ever sees the coarse 0/1/2 that bond_band() compiles against.
   */
  private mirrorBond(soulId: string, _count: number): void {
    this.trySetVar(`bondLevel_${inkAddress(soulId)}`, this.world.bandOf(soulId));
  }

  /** Re-mirror every scored soul — after a restore, or after a forced set. */
  private mirrorAllBonds(): void {
    for (const soulId of this.world.scoredSouls()) {
      this.mirrorBond(soulId, this.world.bondOf(soulId));
    }
  }

  /**
   * Mirror the host's CUMULATIVE talk-days count into `talkDays_<soul>` — the
   * int the `talk_days(soul) >= N` predicate reads (gates greetings and
   * NGT-mara's doll reveal, 2026-08-30). Same "mirror in, ink never assigns"
   * posture as `mirrorBond`, and it goes through `trySetVar`, which does NOT set
   * the `forced` flag — so mirroring a talk-days value never marks the session
   * hand-steered (unlike the public `setVar`). The COUNT is owned host-side by
   * the caller's `TalkDaysLedger` (continuous across years, per save slot); ink
   * only ever sees the number handed in here. No-ops when the VAR is absent (a
   * story.json built before `talkDays_<soul>` existed).
   */
  mirrorTalkDays(soulId: string, count: number): void {
    this.trySetVar(`talkDays_${inkAddress(soulId)}`, count);
  }

  /**
   * Mirror "which spell-beat is up right now" into `spellbeat_current_<soul>`
   * (2026-08-31, Roc — "spells do not gate each other... only 1 of them is
   * available and should be random"). For each soul `day.spell_beat_order`
   * names, the FIRST entry of that soul's resolver-baked shuffle NOT already
   * `completed_<scene>` — a finished spell-beat never comes back up, which is
   * how "so we don't replay them if already done" holds without the entry_gate
   * needing its own separate check. `""` once every entry for a soul is done.
   *
   * Reads `this.day`, so this only means anything after `applyDay` has run at
   * least once. Called there for day-start, and again by the host (InkBridge's
   * `commit()`) after every ink action — completing a spell-beat sets its
   * `completed_*` flag from WITHIN that same action, and the next one has to
   * become available in the same render pass, not on the next day boundary.
   * Absent `spell_beat_order` (a day.json built before this field existed) is
   * a silent no-op, same posture as every other optional-field guard here.
   */
  mirrorSpellBeats(): void {
    for (const [soulId, order] of Object.entries(this.day?.spell_beat_order ?? {})) {
      const current = order.find((sceneId) => !this.peekVar(`completed_${inkAddress(sceneId)}`)) ?? "";
      this.trySetVar(`spellbeat_current_${inkAddress(soulId)}`, current);
    }
  }

  /**
   * Presence injection — the "day-start-resolver" writer role from graph.json:
   * present_<soul> = screen_id and slot_<id> = item, plain string VARs only.
   * TimeOfDay itself is set by the story's own day_start knot.
   *
   * Day re-roll semantics: applying a day is day-start — item slots respawn
   * (respawn_rule: day-start), so the satchel empties and picked slots refill.
   *
   * D3 fix: this must also set ink's OWN `day` VAR (declared `VAR day = 1` in
   * graph.ts, and otherwise only ever advanced by the story's own `day_end`
   * knot doing `~ day = day + 1`). Before this, applyDay set every OTHER
   * piece of day-N state (presence, item rolls) but left ink's `day` frozen
   * at 1 whenever a session was constructed directly on a day > 1 (fresh
   * "day 2/3/4 start", not reached by playing day_end forward) — so every
   * `day >= N` gate in the content (screen-spec-schema.md's day predicate;
   * e.g. Toby's SC-T6-01 `day >= 4` beat, T7's `day >= 5` arc) stayed
   * unreachable even though the day's NPC presence looked correct. Setting
   * it here keeps ink and the host's Day object in agreement the moment a
   * day is applied, whether that's the constructor's initial day, a reroll,
   * or syncDay's mid-session swap.
   */
  applyDay(day: Day, timeBlock = "morning"): void {
    this.day = day;
    this.timeBlock = timeBlock;
    this.satchel = new Array(SATCHEL_CAPACITY).fill(null);
    // D6: arms-carry never survives a day boundary either — by the time this
    // runs, a real day-end has already banked it via `bankSatchel` (fired off
    // the Home Hub's own #screen: tag, see `takeTags`); a reroll discards
    // whatever the day being redone was holding, same as it already does for
    // the satchel.
    this.arms = [];
    this.pickedSlots.clear();
    this.trySetVar("day", day.day);
    this.applyPresence(day, timeBlock);
    for (const roll of day.item_rolls) {
      this.trySetVar(slotVarName(roll.slot_id), roll.item);
    }
    this.mirrorSpellBeats();
  }

  /** Set present_<soul> for one time block (everyone else goes "none"). */
  private applyPresence(day: Day, timeBlock: string): void {
    for (const fill of day.slot_fill) {
      this.trySetVar(`present_${fill.soul}`, "none");
    }
    for (const fill of day.slot_fill) {
      if (fill.time_block !== timeBlock) continue;
      // The narrator is never placed as an NPC on a screen (see NARRATOR_SOUL_ID)
      // — leave present_narrator "none" even if the day resolver seated it in
      // slot_fill, so the cast layer never draws it. Mirrors walk.ts syncPresence.
      if (fill.soul === NARRATOR_SOUL_ID) continue;
      this.trySetVar(`present_${fill.soul}`, this.workplaceScreenFor(fill.soul, fill.screen_id));
    }
  }

  /**
   * B7 (2026-08-30) — pin a DEEP soul to their role's declared workplace.
   *
   * The day resolver fills presence slots without ever consulting
   * `RoleWorkplace.workplace_screens`, so Toby the Baker turned up on a forest
   * road and Ilsa the Blacksmith in the Forager's Clearing while their own
   * workshops sat empty. Deep souls are the ones the player is meant to be able
   * to FIND — their scenes hang off their workplace hubs (`t2.ink`'s Toby
   * greetings, `t4.ink`'s Ilsa greetings) — so a deep soul standing anywhere
   * else is content the player cannot reach.
   *
   * REDIRECTS rather than drops. Dropping the off-workplace fill would satisfy
   * "only ever at their workplace" too, but day-2 and day-4 give Ilsa no T4
   * slot at all, so she would simply vanish for whole days. Keeping the
   * resolver's decision that the soul is present in THIS time block, and
   * correcting only WHERE, preserves the day's shape.
   *
   * When the role declares several workplaces (the Herbalist works T2 and F1)
   * the one in the same region as the resolver's pick wins — the region prefix
   * is the same `T`/`F` convention `HOME_SCREEN_ID`/`FESTIVAL_SCREEN_ID` above
   * already lean on — so a forest slot stays in the forest rather than teleporting
   * the soul into town. Otherwise the first declared workplace wins.
   *
   * `FESTIVAL_SCREEN_ID` is exempt and must stay exempt: the last night is a
   * mandatory whole-cast destination (`home_hub_final` diverts straight into
   * it), it is nobody's workplace, and pinning it away would empty the festival.
   */
  private workplaceScreenFor(soul: string, screenId: string): string {
    if (screenId === FESTIVAL_SCREEN_ID || screenId === HOME_SCREEN_ID) return screenId;
    const workplaces = this.index.deepWorkplaces.get(soul);
    if (!workplaces?.length || workplaces.includes(screenId)) return screenId;
    const region = screenId.slice(0, 1);
    return workplaces.find((s) => s.startsWith(region)) ?? workplaces[0];
  }

  /**
   * Manually advance the clock. Now drives INK's own TimeOfDay rather than a
   * separate tool-side counter, then syncs presence off it.
   *
   * It used to move only the tool's block and say so ("ink TimeOfDay
   * unchanged"). Once W1c made every exit call ink's `advance_time()`, that
   * left the app running TWO CLOCKS: ink's TimeOfDay moved as the player walked
   * while the block driving `applyPresence` did not, so `present_<soul>` went
   * stale mid-day and a soul could vanish from the screen they were standing on.
   * The walker never had this bug because it always read the clock back from
   * ink; the app now does the same.
   *
   * The evening -> night edge (RULED 2026-08-01,
   * plans/2026-08-01-festival-night-transition-plan.md) is a further special
   * case, kept as a labeled dev shortcut. The real transition is a player
   * CHOICE from `home_hub_final` that both writes TimeOfDay = night AND
   * diverts straight into the Festival Grounds' own knot; flipping only the
   * VAR (the old behavior) left the story paused wherever it already was —
   * often mid another screen's hub, whose exits are now suppressed at night
   * and whose "Talk to" choices are for the wrong souls entirely. Forcing
   * night now also jumps to FESTIVAL_SCREEN_ID, the same as the real choice,
   * so the shortcut lands in the same state (day untouched, at T7, the move
   * budget irrelevant per the ruling) rather than a state the real game can
   * never actually produce.
   */
  advanceTime(): void {
    const day = Number(this.peekVar("day") ?? 1);
    const next = nextTimeBlock(this.timeBlock, day);
    const enteringNight = next === "night" && this.timeBlock !== "night";
    this.trySetVar("TimeOfDay", next);
    this.syncClock();
    this.syncDay();
    if (enteringNight) this.jumpTo(FESTIVAL_SCREEN_ID);
    this.lines.push({
      text: `time block -> ${this.timeBlock}`,
      tags: {},
      marker: true,
    });
    if (enteringNight) this.continueOnce();
  }

  /**
   * Read the clock back from ink and re-apply presence if it moved.
   *
   * ONE CLOCK, and ink owns it. Every exit in the emitted world calls
   * `advance_time()`, and `day_end` bumps `day`, so the story moves time on its
   * own as the player walks. Anything here that kept its own count would drift.
   * Called after every continue, because a single continue can cross both a
   * time block and a day boundary.
   */
  private syncClock(): void {
    const raw = this.peekVar("TimeOfDay");
    if (raw === null) return;
    // inkjs returns a LIST value as an object; its string form is the element.
    const block = String(raw);
    if (block === this.timeBlock) return;
    this.timeBlock = block;
    if (this.day) this.applyPresence(this.day, this.timeBlock);
  }

  /**
   * Read the day number back from ink and swap in the matching day file when
   * it rolls over (D1 gap: `applyDay` used to run only from the constructor
   * and `reroll`, so `day_end`'s `~ day = day + 1` moved ink's own clock into
   * day 2 while presence, item rolls and the satchel's respawn all stayed
   * frozen on day 1's file for the rest of the week).
   *
   * Needs the whole week's day files (the constructor's `days` argument) —
   * with none loaded (single-day.json fixture mode) this is a no-op, same as
   * before day-swap existed. A day beyond what was loaded (week ran out, or a
   * day number the caller never supplied) is also a no-op rather than a
   * thrown error: nothing to swap TO is not the same as a bug.
   *
   * Called alongside `syncClock`, for the same reason: a single continue can
   * cross a day boundary, and `day_start` sets `TimeOfDay = morning` in the
   * same step that reads the new day's presence — the block must already be
   * "morning" (from `syncClock`, called first) before this re-applies it.
   */
  private syncDay(): void {
    if (this.days.size === 0) return;
    const raw = this.peekVar("day");
    if (raw === null) return;
    const dayNum = Number(raw);
    const current = this.day?.day ?? 1;
    if (!Number.isFinite(dayNum) || dayNum === current) return;
    const next = this.days.get(dayNum);
    if (!next) return;
    this.applyDay(next, this.timeBlock);
  }

  /**
   * Pick up a rolled item: the slot empties (its slot_<id> VAR goes "empty"
   * so the story sees the same world) and the item joins the satchel strip.
   * No-op when the slot rolled "empty" or was already picked.
   *
   * D6 (GDD 03-core-loop.md:14): the satchel is capped at SATCHEL_CAPACITY.
   * Once full, a pickup spills into the small arms-carry buffer instead
   * (ARMS_CAPACITY) — kept only if the day then ends via `packTriage()`; an
   * ordinary day's end drops it — and once arms is ALSO full, the item is
   * left behind on pickup itself.
   */
  pickup(slotId: string, item: string): boolean {
    if (!item || item === "empty" || this.pickedSlots.has(slotId)) return false;
    const freeIndex = this.satchel.indexOf(null);
    if (freeIndex !== -1) {
      this.pickedSlots.add(slotId);
      this.satchel[freeIndex] = item;
      this.trySetVar(slotVarName(slotId), "empty");
      this.lines.push({
        text: `picked up ${item} (${slotId})`,
        tags: {},
        marker: true,
      });
      return true;
    }
    if (this.arms.length < ARMS_CAPACITY) {
      this.pickedSlots.add(slotId);
      this.arms.push(item);
      this.trySetVar(slotVarName(slotId), "empty");
      this.lines.push({
        text: `satchel full — carrying ${item} (${slotId}) in your arms; pack-triage to keep it`,
        tags: {},
        marker: true,
      });
      return true;
    }
    this.lines.push({
      text: `satchel and arms both full — left ${item} behind (${slotId})`,
      tags: {},
      marker: true,
    });
    return false;
  }

  /** `PlayView.satchel`/`PlaySnapshot.satchel`'s shape: survivors only, in
   *  slot order — the external contract every pre-existing reader expects. */
  private compactSatchel(): string[] {
    return this.satchel.filter((s): s is string => s !== null);
  }

  /** The inverse: repack a compacted list back into slots 0..n-1, padding
   *  the rest with `null`. Used only by `restore` — see that call site's
   *  comment on why arrangement does not survive a save/restore round trip. */
  private slotsFromCompact(items: readonly string[]): (string | null)[] {
    const slots: (string | null)[] = items.slice(0, SATCHEL_CAPACITY);
    while (slots.length < SATCHEL_CAPACITY) slots.push(null);
    return slots;
  }

  /**
   * Remove the pool name at one physical satchel slot, leaving a genuine gap
   * rather than compacting the rest forward (mode5 satchel drop/move track,
   * 2026-08-22). Positional, not by item id — this class only ever speaks
   * pool-name vocabulary (`SatchelLedger.ts`'s header: the pool-name and
   * item-id vocabularies must never conflate), so the caller resolves which
   * slot backs a given held item id (via `itemForPool`) before calling this.
   *
   * A drop is only HALF the fix: the caller must also remove the item from
   * `Inventory.held` (`Inventory.drop`), or the next `SatchelLedger.reJoinInto`
   * resync re-gives it from wherever else it's still discoverable. See
   * `SatchelScene`'s `onDrop` wiring, which does both.
   *
   * Returns the pool name that was removed, or `null` for a no-op (an
   * out-of-range or already-empty slot — never throws, so a stale UI click
   * racing a resync is harmless).
   */
  dropSatchelSlot(index: number): string | null {
    if (index < 0 || index >= this.satchel.length) return null;
    const pool = this.satchel[index];
    if (pool === null) return null;
    this.satchel[index] = null;
    this.lines.push({ text: `dropped ${pool} from the satchel`, tags: {}, marker: true });
    return pool;
  }

  /**
   * Slot-to-slot move — the other half of the drop/move track. Requires a
   * real item at `from` and a genuinely empty `to`; anything else (a
   * same-slot "move," an out-of-range index, a `to` that is not actually
   * empty) is a no-op returning `false`. This is the entire reason `satchel`
   * became a gap-holding array instead of a dense one: a dense array has no
   * stable notion of "this particular empty pocket," so a move could never
   * land anywhere specific.
   *
   * Held-ness on `Inventory` does not change — moving within your own
   * satchel neither gains nor loses an item, so there is no `Inventory` half
   * to this one (unlike drop).
   */
  moveSatchelSlot(from: number, to: number): boolean {
    if (from === to) return false;
    if (from < 0 || from >= this.satchel.length) return false;
    if (to < 0 || to >= this.satchel.length) return false;
    const pool = this.satchel[from];
    if (pool === null || this.satchel[to] !== null) return false;
    this.satchel[to] = pool;
    this.satchel[from] = null;
    this.lines.push({ text: `moved ${pool} to another pocket`, tags: {}, marker: true });
    return true;
  }

  /**
   * Remove one occurrence of `pool` from wherever the day's carry holds it
   * OUTSIDE the satchel array — arms-carry first, then the home bank
   * (satchel-cluster track, 2026-08-23). Exists because a drop of an
   * UNSLOTTED held item (`SatchelScene`'s `slotIndex: null` entries — an
   * arms- or banked-derived id the render-time re-join keeps re-giving) had
   * no satchel-array slot to clear, so `Inventory.drop` alone was undone by
   * the very next `SatchelLedger.reJoinInto` resync — Roc's 2026-08-23
   * "drop does not actually remove" bug. Same two-sided contract as
   * `dropSatchelSlot`: the caller still owns the `Inventory.drop` half.
   *
   * Removing from `banked` is deliberate, not a violation of "the home
   * collection is permanent": permanence of the RECORD lives in
   * `Inventory.everHeld` (what the Home Hub decorates from), which a drop
   * never touches. `banked` is the physical stock, and a thing physically
   * dropped into the world cannot also still be physically at home.
   *
   * Returns where the pool was found, or `null` for a no-op.
   */
  removeCarriedPool(pool: string): "arms" | "banked" | null {
    const armsIdx = this.arms.indexOf(pool);
    if (armsIdx !== -1) {
      this.arms.splice(armsIdx, 1);
      this.lines.push({ text: `dropped ${pool} from your arms`, tags: {}, marker: true });
      return "arms";
    }
    const bankedIdx = this.banked.indexOf(pool);
    if (bankedIdx !== -1) {
      this.banked.splice(bankedIdx, 1);
      this.lines.push({ text: `dropped ${pool} from the home stores`, tags: {}, marker: true });
      return "banked";
    }
    return null;
  }

  /**
   * Put a pool back into the day's carry with no forage slot behind it —
   * the satchel-side half of picking a DROPPED item back up off the ground
   * (satchel-cluster track, 2026-08-23). `pickup` is deliberately not
   * reused: that method claims a `slot_<id>` VAR and a `pickedSlots` entry,
   * and a dropped item has neither — it was already foraged once, and its
   * original slot must stay spent. Same satchel-then-arms spill order as
   * `pickup`, same "both full" refusal.
   */
  stashPool(pool: string): "satchel" | "arms" | null {
    const freeIndex = this.satchel.indexOf(null);
    if (freeIndex !== -1) {
      this.satchel[freeIndex] = pool;
      this.lines.push({ text: `picked ${pool} back up`, tags: {}, marker: true });
      return "satchel";
    }
    if (this.arms.length < ARMS_CAPACITY) {
      this.arms.push(pool);
      this.lines.push({
        text: `satchel full — carrying ${pool} back in your arms; pack-triage to keep it`,
        tags: {},
        marker: true,
      });
      return "arms";
    }
    this.lines.push({ text: `satchel and arms both full — left ${pool} where it lies`, tags: {}, marker: true });
    return null;
  }

  /**
   * Satchel pocket -> arms-carry (satchel-cluster track, 2026-08-23 — Roc:
   * "there's currently no way to move items between satchel and arms").
   * Requires a real item at `index` and room in arms. Held-ness on
   * `Inventory` does not change — same reasoning as `moveSatchelSlot`.
   * Arms-carry's day-end rules apply to the moved item exactly as if it had
   * spilled there on pickup: banked only through `packTriage()`.
   */
  moveSatchelSlotToArms(index: number): boolean {
    if (index < 0 || index >= this.satchel.length) return false;
    const pool = this.satchel[index];
    if (pool === null || this.arms.length >= ARMS_CAPACITY) return false;
    this.satchel[index] = null;
    this.arms.push(pool);
    this.lines.push({ text: `moved ${pool} from the satchel to your arms`, tags: {}, marker: true });
    return true;
  }

  /**
   * Arms-carry -> first free satchel pocket, by pool name — the other
   * direction. By POOL, not index, because the Arms display is grouped by
   * type (`SatchelPockets.buildPockets`) and two arms units of the same pool
   * are interchangeable. Requires the pool actually in arms and a free
   * pocket.
   */
  moveArmsPoolToSatchel(pool: string): boolean {
    const armsIdx = this.arms.indexOf(pool);
    if (armsIdx === -1) return false;
    const freeIndex = this.satchel.indexOf(null);
    if (freeIndex === -1) return false;
    this.arms.splice(armsIdx, 1);
    this.satchel[freeIndex] = pool;
    this.lines.push({ text: `moved ${pool} from your arms into the satchel`, tags: {}, marker: true });
    return true;
  }

  /**
   * D6 — day's end (GDD 03-core-loop.md:14): "you carry from the screen only
   * what fits the satchel, and you return home." Fires exactly once per Home
   * Hub arrival (guarded on the transition, not the tag alone — `calendar`
   * carries the same #screen: tag and must not double-bank).
   *
   * D6 iteration 2: the satchel always banks — that is the ordinary, default
   * outcome the GDD sentence describes. Arms-carry is DIFFERENT: it only
   * banks when `triageArmsPending` is set, i.e. this Home Hub arrival was
   * driven by `packTriage()`. Any other arrival (a plain "End the day" click
   * off the ordinary move row, or ink's own automatic day_end firing when an
   * evening's move budget hits zero) leaves arms-carry behind — it is
   * cleared, not banked, matching the GDD's plain reading: only the special
   * early-end action ("pack-triage") earns the arms bonus.
   */
  private bankSatchel(): void {
    const triaged = this.triageArmsPending;
    this.triageArmsPending = false;
    const satchelItems = this.compactSatchel();
    if (satchelItems.length === 0 && this.arms.length === 0) return;
    const satchelCount = satchelItems.length;
    this.banked.push(...satchelItems);
    this.satchel = new Array(SATCHEL_CAPACITY).fill(null);
    if (triaged) {
      const armsCount = this.arms.length;
      this.banked.push(...this.arms);
      this.arms = [];
      this.lines.push({
        text: `home: banked ${satchelCount} item(s) from the satchel plus ${armsCount} from pack-triaged arms-carry`,
        tags: {},
        marker: true,
      });
      return;
    }
    if (this.arms.length > 0) {
      this.lines.push({
        text: `home: banked ${satchelCount} item(s) from the satchel — left ${this.arms.length} arms-carry item(s) behind (no pack-triage)`,
        tags: {},
        marker: true,
      });
      this.arms = [];
      return;
    }
    this.lines.push({
      text: `home: banked ${satchelCount} item(s)`,
      tags: {},
      marker: true,
    });
  }

  /**
   * D6 — pack-triage, the explicit player action (GDD 03-core-loop.md:14):
   * "end a day early to bank a full pack plus what you can carry in your
   * arms." Drives the same ink-authored "End the day" choice every screen
   * hub already offers (RULED 2026-08-01), regardless of movesLeft — ending
   * the day right now instead of whenever the block budget or the evening
   * would otherwise force it.
   *
   * The functional payoff lives in `triageArmsPending`: setting it here is
   * what makes THIS route to the Home Hub bank arms-carry too, where a plain
   * "End the day" click (same underlying ink choice, taken directly off the
   * move row without going through this method) would leave arms behind.
   * That is the whole difference between pack-triage and just ending the
   * day — see `bankSatchel`.
   *
   * No-op (returns false) when "End the day" is not currently offered — e.g.
   * mid-dialogue, where no hub choice exists to drive.
   */
  packTriage(): boolean {
    const choices = this.choices();
    const endIndex = choices.findIndex((c) => c.text === "End the day");
    if (endIndex === -1) return false;
    this.triageArmsPending = true;
    this.lines.push({
      text: `pack-triage: heading home early with ${this.compactSatchel().length} in the satchel and ${this.arms.length} in your arms`,
      tags: {},
      marker: true,
    });
    this.choose(endIndex);
    this.continueOnce();
    return true;
  }

  private trySetVar(name: string, value: string | number): void {
    const vars = this.story.variablesState;
    if (vars.GlobalVariableExistsWithName(name)) vars.$(name, value);
  }

  /** Read a global VAR back (tests + debugging); null when undeclared. */
  peekVar(name: string): unknown {
    const vars = this.story.variablesState;
    return vars.GlobalVariableExistsWithName(name) ? vars.$(name) : null;
  }

  /**
   * Live values for the names the caller asks about — the variables panel
   * feeds it `graph.variables`, which is the authoritative declaration list, so
   * the player never has to enumerate inkjs's internals.
   */
  peekVars(names: string[]): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const name of names) out[name] = this.peekVar(name);
    return out;
  }

  /**
   * Set a global by hand — L5's variables override, and how the walk tests
   * reach a state the content cannot yet produce. Marks the session forced, so
   * a hand-steered walk is never mistaken for an earned one.
   *
   * Setting bondLevel_<soul> directly would be a lie the next bond_event
   * overwrites, so it is redirected into the host count that actually drives
   * the mirror. That keeps ONE writer for that VAR.
   */
  setVar(name: string, value: string | number): boolean {
    const vars = this.story.variablesState;
    if (!vars.GlobalVariableExistsWithName(name)) return false;
    this.forced = true;
    const bond = /^bondLevel_(.+)$/.exec(name);
    if (bond) {
      const band = Number(value);
      const t = this.world.tuning;
      // Land on the threshold for the requested band, so the count and the
      // mirrored band agree and the next earned event builds from there.
      const count = band >= 2 ? t.band_thresholds.high_min : band >= 1 ? t.band_thresholds.mid_min : 0;
      this.world.setBond(bond[1], count);
      this.mirrorBond(bond[1], count);
    } else {
      vars.$(name, value);
    }
    this.lines.push({
      text: `forced ${name} = ${value}`,
      tags: {},
      marker: true,
    });
    return true;
  }

  /** True once any variable was set by hand. Walk tests assert this stays false. */
  isForced(): boolean {
    return this.forced;
  }

  /** Absorb one raw ink line's tags into position + trace. */
  private takeTags(tags: ParsedTags): void {
    if (tags.screen) {
      // D6: every real day-end routes through the Home Hub (day_end ->
      // home_hub, ordinarily or via packTriage) — bank the moment play
      // ARRIVES, not on every line the hub prints. `calendar` carries this
      // same #screen: tag (D2 iteration 3), so the guard is the transition,
      // not the tag alone, or picking tomorrow's location would bank twice.
      if (tags.screen === HOME_SCREEN_ID && this.currentScreen !== HOME_SCREEN_ID) {
        this.bankSatchel();
      }
      this.currentScreen = tags.screen;
      this.visited.add(tags.screen);
    }
    if (tags.choice) {
      this.currentChoice = tags.choice;
      this.visited.add(tags.choice);
    }
    if (tags.opt) {
      // post-choice confirmation line: the option (and its player_line) played
      this.visited.add(tags.opt);
      const opt = this.index.options.get(tags.opt);
      if (opt?.playerLineId) this.visited.add(opt.playerLineId);
    }
    if (tags.id) this.visited.add(tags.id);
  }

  /**
   * One step of the continue-to-next-line flow: advances to the next line
   * with visible text (tag-only blank lines are absorbed silently).
   */
  continueOnce(): void {
    while (this.story.canContinue) {
      const text = stripTags(this.story.Continue() ?? "");
      const tags = parseTags(this.story.currentTags);
      this.takeTags(tags);
      // Sync INSIDE the loop, not just after it: the day loop can cross a time
      // block (or a whole day) while emitting only tag-only lines, and presence
      // has to land before the next hub evaluates its npc_present guards.
      this.syncClock();
      this.syncDay();
      if (text) {
        if (tags.id) this.currentLine = tags.id;
        this.lines.push({ text, tags });
        break;
      }
    }
    this.syncClock();
    this.syncDay();
    // leaving a choice behind once the flow moves on
    if (this.story.canContinue) this.currentChoice = null;
  }

  choices(): PlayChoice[] {
    if (this.story.canContinue) return [];
    const optionIds = this.currentChoice
      ? (this.index.choiceOptions.get(this.currentChoice) ?? [])
      : [];
    return this.story.currentChoices.map((ch, index) => {
      const text = stripTags(ch.text);
      // inkjs drops #opt from Choice objects — match the weave text instead
      const optionId =
        optionIds.find(
          (id) => this.index.options.get(id)?.matchText === unquote(text)
        ) ?? null;
      const opt = optionId ? this.index.options.get(optionId) : undefined;
      const spoken = opt ? opt.spoken : text.startsWith('"');
      // Location and day-end choices are the fixed set of literal strings
      // ink.ts's emitScreen/emitMain generate for a screen hub: "Go to <X>"
      // (an exit), "Begin at <X>" (day 1's manual start pick, screen_hub) and
      // "End the day" (day_end). Matched on text, not on an option lookup —
      // like "Talk to X" and "Look at X", these are never authored options
      // (no content_id/surface_action), so `opt` is undefined for all four;
      // only the literal phrasing tells a move apart from a hub look/talk.
      // `!opt` still guards against a dialogue surface_action that happens to
      // start the same way (e.g. "[Go to bed]" as a deed) — MOVE_TEXT alone
      // would misclassify it.
      const move = !opt && (MOVE_TEXT.test(text) || text === "End the day");
      // WHICH hub verb, for the HUD (T14) — see `PlayChoice.hubAction`. Same
      // literal set, same `!opt` guard as `move` above; "Wait" is the third
      // string `emitScreen` writes on every explorable screen and is the one
      // hub verb that is NOT `kind: "move"` (it advances a conversation-free
      // hub without being a location choice, so it has always classified as a
      // deed — that is unchanged here, only named).
      const hubAction: PlayChoice["hubAction"] = opt
        ? undefined
        : MOVE_TEXT.test(text)
          ? "exit"
          : text === "End the day"
            ? "endday"
            : text === "Wait"
              ? "wait"
              : undefined;
      const goTarget = /^Go to (.+)$/.exec(text)?.[1];
      const lock = goTarget ? this.index.lockForScreenName.get(goTarget) : undefined;
      return {
        index,
        text,
        optionId,
        kind: move ? "move" : spoken ? "spoken" : "deed",
        hubAction,
        display: spoken ? (text.startsWith('"') ? text : `"${text}"`) : `[${text}]`,
        lock,
      } as PlayChoice;
    });
  }

  /**
   * Snapshot the choice point, then take the option.
   *
   * CONTRACT: this only SELECTS. Ink runs the option's body — including every
   * `~ recordBond(...)` state action — on the next continueOnce(). So a caller
   * that chooses without continuing sees no world change, which is exactly what
   * the UI does (`p.choose(i); p.continueOnce()`) and what any walker must do.
   */
  choose(index: number): void {
    const picked = this.choices()[index];
    if (!picked) return;
    this.timeline.push({
      label: this.currentChoice ?? picked.optionId ?? `choice ${index + 1}`,
      stateJson: this.story.state.ToJson(),
      visited: [...this.visited],
      lineCount: this.lines.length,
      satchel: this.compactSatchel(),
      pickedSlots: [...this.pickedSlots],
      arms: [...this.arms],
      banked: [...this.banked],
      timeBlock: this.timeBlock,
      day: this.day?.day ?? 1,
      world: this.world.snapshot(),
    });
    if (picked.optionId) {
      this.visited.add(picked.optionId);
      const opt = this.index.options.get(picked.optionId);
      if (opt?.playerLineId) this.visited.add(opt.playerLineId);
    }
    this.lines.push({
      text: picked.display,
      tags: picked.optionId ? { opt: picked.optionId } : {},
      player: true,
    });
    this.story.ChooseChoiceIndex(index);
    this.currentChoice = null;
  }

  /**
   * READ what a choice would say, WITHOUT taking it. Returns the visible lines
   * the option's body would print, or `[]` when there is no such choice.
   *
   * Built for the NPC portrait modal's greeting preview (Roc, 2026-08-31): a
   * GRT-* greeting is one beat with no choice node, so entering it for real
   * resolves the whole knot synchronously and the VN box is gone before it can
   * be read. The modal shows this text held open instead, and only enters the
   * conversation when the player takes the Talk pill.
   *
   * HOW IT IS SAFE, in two halves — both are load-bearing:
   *
   * 1. INK STATE: snapshot `story.state.ToJson()`, run the option for real, then
   *    `story.state.LoadJson(snapshot)`. This is the same pair `choose()` and
   *    `restore()` already use for the timeline, so it is not a new capability —
   *    only a new caller that discards instead of banks. Every VAR the previewed
   *    content wrote (`talkDays_*` reads, seen-flags, bond mirrors, ink's own
   *    read counts and callstack) is back exactly as it was.
   * 2. HOST STATE: `previewing` guards every EXTERNAL, so `recordBond`,
   *    `recordThreadMove`, `recordKnowledge`, `recordCanonWrite`, `seeSpell` and
   *    `castSpell` do nothing during the run. A LoadJson cannot roll those back —
   *    they write outside the story.
   *
   * Nothing else on this player is touched either: no `takeTags` (so no screen
   * change, no `bankSatchel`, no `visited` growth), no `syncClock`/`syncDay` (so
   * the clock cannot advance), no `lines` push (so the transcript is untouched)
   * and no `timeline` entry (a preview is not a choice point). `currentScreen`,
   * `currentLine` and `currentChoice` are saved and put back regardless, because
   * a future edit to this method must not be able to leak position either.
   *
   * DOES NOT COUNT AS A TALK. Nothing here calls the host's `onTalk` path —
   * that stays on the real `choose()` (B3, 2026-08-30: a portrait click that
   * burned the `talkDays_<soul> == 0` window without showing a greeting).
   *
   * `limit` caps the continue loop; capture also stops at the first line that
   * carries a `#screen:` tag AFTER something was captured, which is the scene
   * ending and ink falling back into a hub — the hub's own re-entry narration is
   * not part of what this soul has to say.
   */
  previewChoice(index: number, limit = 24): string[] {
    if (this.story.canContinue) return [];
    if (!this.story.currentChoices[index]) return [];

    const stateJson = this.story.state.ToJson();
    const world = this.world.snapshot();
    const errorCount = this.errors.length;
    const lineCount = this.lines.length;
    const screen = this.currentScreen;
    const line = this.currentLine;
    const choice = this.currentChoice;
    const visited = new Set(this.visited);

    const out: string[] = [];
    this.previewing = true;
    try {
      this.story.ChooseChoiceIndex(index);
      let n = 0;
      while (this.story.canContinue && n++ < limit) {
        const text = stripTags(this.story.Continue() ?? "");
        const tags = parseTags(this.story.currentTags);
        if (tags.screen && out.length) break;
        if (text) out.push(text);
      }
    } catch (err) {
      this.errors.push(`preview failed: ${String(err)}`);
    } finally {
      this.previewing = false;
      this.story.state.LoadJson(stateJson);
      this.world.restore(world);
      this.errors.length = errorCount;
      this.lines.length = lineCount;
      this.currentScreen = screen;
      this.currentLine = line;
      this.currentChoice = choice;
      this.visited = visited;
    }
    return out;
  }

  /**
   * Commit a talk choice FOR REAL and return the narration lines it produced
   * — `choose()` followed by continuing to the next choice point, same as
   * any other conversation entry, with the lines captured along the way.
   *
   * Built for the NPC portrait modal (Roc, 2026-08-31 ruling): OPENING the
   * modal is now what enters a GRT-* greeting — not a separate "Talk with
   * X" click afterward — so the modal needs the REAL committed text to hold
   * open, not a discarded preview. Contrast `previewChoice`: externals fire
   * for real here, and nothing rolls back. This is exactly the state change
   * `choose()` + a `continueOnce()` loop always was; the only new thing is
   * handing the caller what got said, the same capture technique
   * `previewChoice` uses, minus the snapshot/restore around it.
   *
   * `limit` caps the continue loop as a runaway backstop, same role as
   * `previewChoice`'s.
   */
  commitChoiceAndCapture(index: number, limit = 24): string[] {
    if (this.story.canContinue) return [];
    if (!this.story.currentChoices[index]) return [];
    this.choose(index);
    const out: string[] = [];
    let n = 0;
    while (this.story.canContinue && n++ < limit) {
      const before = this.lines.length;
      this.continueOnce();
      for (let i = before; i < this.lines.length; i++) out.push(this.lines[i].text);
    }
    return out;
  }

  /** Click any node to jump there — ChoosePathString on the graph's address. */
  jumpTo(nodeId: string): boolean {
    const address = this.index.jumpAddress(nodeId);
    if (!address) return false;
    this.story.ChoosePathString(address);
    this.currentChoice = null;
    this.lines.push({ text: `jumped to ${address}`, tags: {}, marker: true });
    return true;
  }

  /** Timeline click: restore = jump back, other branch open, no replay. */
  restore(timelineIndex: number): void {
    const snap = this.timeline[timelineIndex];
    if (!snap) return;
    this.story.state.LoadJson(snap.stateJson);
    // World state rides ink's timeline. Restore it BEFORE re-mirroring, or the
    // bond VARs would be rewritten from counts the restore is about to discard.
    this.world.restore(snap.world);
    this.mirrorAllBonds();
    this.visited = new Set(snap.visited);
    this.lines = this.lines.slice(0, snap.lineCount);
    this.lines.push({ text: `restored to ${snap.label}`, tags: {}, marker: true });
    this.currentChoice = snap.label;
    this.currentLine = null;
    // the satchel is snapshot state: pickups after this point roll back and
    // their items return to their slots (slot VARs live in stateJson).
    // `snap.satchel` is the compacted list (see PlaySnapshot's own comment);
    // repack it starting at pocket 0 — arrangement is not part of a restore.
    this.satchel = this.slotsFromCompact(snap.satchel);
    this.pickedSlots = new Set(snap.pickedSlots);
    // D6: arms-carry and the home bank ride the same rollback — a restore to
    // before a pack-triage (or before a normal day-end's bank) must undo it,
    // or the bank would remember items this timeline branch never sent home.
    this.arms = [...snap.arms];
    this.banked = [...snap.banked];
    this.timeBlock = snap.timeBlock;
    // Swap back to the snapshot's own day file when the week has moved on
    // since — otherwise a restore across a day boundary re-applies presence
    // from the WRONG day (see syncDay). Falls back to whichever day is
    // already current when the snapshot's day was never loaded (fixture mode).
    const snapDay = this.days.get(snap.day);
    if (snapDay) this.day = snapDay;
    if (this.day) this.applyPresence(this.day, this.timeBlock);
  }

  /**
   * ADDITIVE, approved by Roc 2026-08-17 — the out-of-session half of the
   * timeline. `restore(i)` only indexes snapshots THIS session made, `story` is
   * private and `view().timeline` hands back a copy, so a save written to disk
   * had no way back in. These two methods are that way in, and they add no new
   * behaviour: `saveSnapshot` is the object `choose()` already builds, and
   * `loadSnapshot` routes straight through the existing `restore`.
   *
   * Pure read. Safe to call on an autosave mid-play.
   */
  saveSnapshot(): PlaySnapshot {
    return {
      label: this.currentChoice ?? "saved game",
      stateJson: this.story.state.ToJson(),
      visited: [...this.visited],
      lineCount: this.lines.length,
      satchel: this.compactSatchel(),
      pickedSlots: [...this.pickedSlots],
      arms: [...this.arms],
      banked: [...this.banked],
      timeBlock: this.timeBlock,
      day: this.day?.day ?? 1,
      world: this.world.snapshot(),
    };
  }

  /**
   * Take a snapshot from OUTSIDE this session (a save file) and restore it.
   *
   * INK OWNS THE CLOCK, and this is where that is enforced for saved games:
   * `snap.timeBlock` is IGNORED. The block is read back out of the ink state
   * that was just loaded, so a save file can never assign a clock value — it can
   * only carry the story state the clock lives inside. Nothing here calls
   * `setVar`, so a loaded game is never marked `forced`.
   *
   * `lineCount` is overridden for the same reason in the other direction: the
   * transcript belongs to the running session, not to the file, and truncating
   * it to another session's count would blank the pane.
   */
  loadSnapshot(snap: PlaySnapshot): void {
    this.timeline.push({ ...snap, lineCount: this.lines.length });
    this.restore(this.timeline.length - 1);
    const block = this.peekVar("TimeOfDay");
    if (block === null) return;
    this.timeBlock = String(block);
    if (this.day) this.applyPresence(this.day, this.timeBlock);
  }

  /** Jump straight to an ink address (examinable stitches on the stage). */
  jumpToAddress(address: string): boolean {
    try {
      this.story.ChoosePathString(address);
    } catch {
      this.errors.push(`no ink at ${address}`);
      return false;
    }
    this.currentChoice = null;
    this.lines.push({ text: `jumped to ${address}`, tags: {}, marker: true });
    return true;
  }

  view(): PlayView {
    return {
      lines: [...this.lines],
      choices: this.choices(),
      canContinue: this.story.canContinue,
      ended: !this.story.canContinue && this.story.currentChoices.length === 0,
      errors: [...this.errors],
      pos: {
        currentScreen: this.currentScreen,
        currentLine: this.currentLine,
        currentChoice: this.currentChoice,
        visited: this.visited,
      },
      timeline: [...this.timeline],
      satchel: this.compactSatchel(),
      satchelCapacity: SATCHEL_CAPACITY,
      satchelSlots: [...this.satchel],
      arms: [...this.arms],
      armsCapacity: ARMS_CAPACITY,
      banked: [...this.banked],
      notebook: this.world.knownPhrases(),
      pickedSlots: [...this.pickedSlots],
      timeBlock: this.timeBlock,
      day: Number(this.peekVar("day") ?? 1),
      year: Number(this.peekVar("year") ?? 1),
      movesLeft: Number(this.peekVar("movesLeft") ?? 0),
      threadMoves: this.world.threadMoves(),
      threadMoveLog: this.world
        .eventLog()
        .filter((e) => e.kind === "thread")
        .map((e) => e.subject),
      bondBands: Object.fromEntries(
        this.world.scoredSouls().map((soulId) => [soulId, this.world.bandOf(soulId)])
      ),
    };
  }
}

/**
 * The resolver's address rule (build-loop.md, mirrored from resolver ids.ts):
 * lowercase, every non-alphanumeric becomes "_". Both VAR-name builders below
 * go through it so a soul or slot id with a hyphen cannot name one variable
 * here and a different one in the emitted ink.
 */
function inkAddress(id: string): string {
  return id.toLowerCase().replace(/[^a-z0-9]/g, "_");
}

/** SL-T2-01 -> slot_sl_t2_01 (the resolver's slot VAR naming). */
function slotVarName(slotId: string): string {
  return `slot_${inkAddress(slotId)}`;
}
