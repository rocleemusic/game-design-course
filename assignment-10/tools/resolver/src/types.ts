// Typed shapes for the resolver's inputs (data JSONs) and outputs (graph.json, day.json).
// Input shapes mirror narrative-pipeline/templates/screen-spec-schema.md and choice-node-schema.md.
// Output shapes are the pinned contracts in resources/review-tool-spec_draft.md.

import type { BondTuning } from "./tuning.ts";
export type { BondTuning };

// GDD naming (03-core-loop.md, 06-world-and-progression.md): "morning ->
// afternoon -> evening" are the playable blocks; "night" is festival night,
// day 5's terminal beat, never a normal daily block. Renamed from ink's
// original "midday" 2026-08-01 — the GDD wins.
// day.ts (day-start placement) now gates every "night" npc_slot/capacity
// entry to day >= 5, and walk.ts's reachability search (enumerateRoutes /
// blockAt) only ever walks morning -> afternoon -> evening — night is never
// entered by movement in the compiled ink day loop either (see
// ink.ts's advance_time). NOTE still open: there is no terminal-beat
// transition anywhere in ink.ts's day_end that actually enters "night" on
// day 5 — festival night has no trigger mechanism yet. That is a separate,
// larger gap (what screen/scene night plays) than "stop day 1-4 from
// spuriously filling it," which is what this pass fixes.
export type TimeBlock = "morning" | "afternoon" | "evening" | "night";
export const TIME_BLOCKS: TimeBlock[] = ["morning", "afternoon", "evening", "night"];

export type AlivenessBand = "quiet" | "waking" | "alive";
export const ALIVENESS_ORDER: AlivenessBand[] = ["quiet", "waking", "alive"];

// ---------- screen-specs.json ----------

export interface Gate {
  gate_id: string;
  // "Demo" marks where a verb is first taught. It blocks nothing and holds no
  // key, so it never appears inside a status lock (schema, ruled 2026-07-30).
  archetype:
    | "Knowledge"
    | "Cascade"
    | "Signpost"
    | "Landmark"
    | "Traveler"
    | "Proof"
    | "Demo";
  preview?: boolean;
  five_field_ref?: string;
}

export interface Examinable {
  id: string;
  clue_tier: "ambient" | "soft-signpost" | "hard-key";
  promotes_to?: { tier: string; condition: string };
  region?: string;
  /**
   * The knowledge phrase examining this thing records (R5's pickup path,
   * `plans/2026-08-03-storyline-authoring-process.md`). Same phrase vocabulary
   * as a `knowledge_flag` state_action and the `knows(phrase)` predicate, so a
   * flag set here opens exactly the paths a choice-set flag would.
   *
   * The examinable stays sticky and re-clickable; the record fires once,
   * because the emitted stitch guards on `not (KnownPhrases ? phrase)`.
   * Optional: an examinable that only shows the player something sets nothing.
   */
  knowledge_flag?: string;
}

export interface NpcSlotCapacity {
  time_block: TimeBlock;
  count: number;
  restrict?: "deep"; // narrows the slot to a deep NPC (T5); absent = anyone
}

export interface BucketEntry {
  item: string; // "empty" is the explicit no-spawn entry
  weight: number;
  min_band?: AlivenessBand; // aliveness-gated entries (rare manifestations)
}

export interface ItemSlot {
  slot_id: string;
  region?: string;
  bucket: BucketEntry[];
  respawn_rule?: string;
  conditions?: string[];
}

export interface Connection {
  screen_id: string;
  seam?: string;
}

export interface Region {
  region_id: string;
  shape:
    | { rect: { x: number; y: number; w: number; h: number } }
    | { polygon: [number, number][] };
}

export interface ScreenSpec {
  screen_id: string;
  // "home" is the Home Hub only (graph.ts's HOME_SCREEN_ID, D2) — never a
  // DayInput.picked_location value (day.ts's guarantee floor only ever
  // compares town/forest/farm; the Home Hub is never a start screen, so the
  // calendar can never write "home" into picked_location).
  location: "town" | "forest" | "farm" | "home";
  name: string;
  // "start" | "locked(gate_id[, gate_id])" | "reachable(gate_id)".
  // A two-gate lock is a conjunction — both keys, always. There is no OR form.
  status: string;
  vibe?: string;
  gates?: Gate[];
  examinables?: Examinable[];
  forage?: string[];
  npc_slots?: NpcSlotCapacity[];
  item_slots?: ItemSlot[];
  time_states?: TimeBlock[];
  connects_to?: (string | Connection)[];
  regions?: Region[];
}

// ---------- seams.json ----------

export interface Seam {
  from: string;
  to: string;
  name: string;
}

// ---------- scene-graph.json ----------

export interface Soul {
  soul_id: string;
  name?: string;
  role_tag?: string;
  home_screen?: string;
  deep?: boolean;
  /**
   * time_block -> screen_id this soul stands at UNCONDITIONALLY that block,
   * every day (Roc, 2026-08-31 — "Mara always on Market Row", etc.). Placed
   * before the guarantee floor and the ordinary weighted draw, bypassing
   * both entirely for the listed blocks; a block this map does not name
   * still falls through to the normal draw, so a soul can be pinned some
   * blocks and free-roaming others (Ilsa: fixed afternoon/evening, morning
   * open).
   */
  fixed_placement?: Partial<Record<TimeBlock, string>>;
  /**
   * A location this soul is NEVER placed outside of (Roc, 2026-08-31 —
   * "Juno always in town"), enforced as a filter on the ordinary weighted
   * draw's candidate pool — WHICH screen within that location still varies
   * normally. Distinct from `fixed_placement`: this confines, it does not pin.
   */
  confined_location?: string;
}

// guardrails.md check 8 (Slot typing): the closed enum every content item's
// slot_type must be one of.
export type SlotType = "dialogue" | "action" | "object" | "player_line";

export interface ContentLine {
  content_id: string;
  slot_type: SlotType;
  speaker_id: string; // "player" is a defined value for player_line slots
  text: string;
  // flat-array back-references (choice-node-schema.md: "items gain optional
  // choice_id and option_id back-references, nothing else")
  choice_id?: string;
  option_id?: string;
  /**
   * Optional gate on a FREE-STANDING scene line (2026-08-30). Same predicate
   * vocabulary as a node's `availability_conditions`; the emitter wraps the line
   * in `{ guard: text }`, so it prints only when the guard holds. Used for
   * conditional narration that reads prior state — e.g. NGT-mara's arc-landing
   * tonic line, one of three by the ENC-mara-3 grade
   * (`knows(mara_enc3_whole|half|miss)`). Ignored on lines that back-reference a
   * choice/option (those gate through the node/option instead).
   */
  conditions?: string[];
}

// "score" (added 2026-08-30) is the festival grade: an encounter option carries
// a 0.5/1.0/0 weight in `arg`, and the action adds it to the in-ink
// `festival_score` accumulator the final-sequence vignette router reads. Unlike
// the other four it writes an in-ink VAR, not an EXTERNAL — ink owns the score
// (gdd/03-core-loop.md festival scoring; ruled 2026-08-30, Roc).
// "see_spell" / "cast_learn" (added 2026-08-30) bridge a learn scene to the
// host spell system (ink has no spell concept). `see_spell` records a CLUE
// (Knowledge.see); `cast_learn` runs the real cast — consumes components, plays
// VFX, and LEARNS on a landed effect. Both emit an EXTERNAL the phaser host
// binds; `arg` is the spell_id. See gdd/04-magic-system.md (SEEN vs LEARNED) and
// the 2026-08-30 ruling (learn by casting; the cast consumes the components).
export type StateActionType =
  | "bond_event"
  | "knowledge_flag"
  | "thread_move"
  | "canon_write"
  | "score"
  | "see_spell"
  | "cast_learn";

export interface StateAction {
  type: StateActionType;
  arg: string;
}

export interface ChoiceOption {
  option_id: string;
  verb_family?: "Collect" | "Make" | "Use" | "Converse";
  player_verb?: "witness" | "ease" | "sit-with";
  player_line?: string; // content_id of the player_line slot (spoken option)
  surface_action?: string; // the diegetic deed (unspoken option)
  response_slots: string[]; // 1-3 content_ids
  state_actions: StateAction[];
  rejoin?: "gather" | "divert";
  divert_to?: string; // target choice_id when rejoin = divert
  /**
   * Per-OPTION gate (2026-08-30). Same predicate vocabulary as a node's
   * `availability_conditions`, but scoped to one option: the emitter ANDs these
   * onto that option's choice line (on top of the node guard), so ink simply
   * does not offer the option when they are false. Use for a choice that only
   * one kind of player should see — e.g. NGT-mara's doll reveal gated on
   * `talk_days(mara) >= 4`. Empty/absent = the option is always offered.
   */
  availability_conditions?: string[];
}

export interface ChoiceNode {
  choice_id: string;
  scene_id: string;
  options: ChoiceOption[];
  availability_conditions: string[];
  equal_weight_note: string;
  no_accrual_note: string;
  /**
   * A sub-conversation that plays INSIDE one option rather than after the
   * scene's last gather (ratified 2026-08-01, extends choice-node-schema.md v1).
   *
   * The node emits as a nested ink weave one level deeper than the option that
   * carries it: `**` options, `--` gather (and `***` / `---` at the second
   * level). Sub-nodes under one option emit in array order, and the LAST one
   * gathers at `g_<option_id>` — so every path through the option converges on
   * a label named for the option, which is the whole point of nesting rather
   * than gating siblings.
   *
   * Depth is capped by `graph.MAX_NESTING`; read its note before raising it.
   *
   * The flat arrays stay flat. This is a back-reference, exactly like the
   * `choice_id`/`option_id` refs on a line — not a tree in the data.
   */
  parent_option?: string;
  /**
   * content_id whose text replaces the generated "the scene continues"
   * placeholder at this node's gather. A gather is a beat: after a branch
   * converges, something is true that was not true before, and until now there
   * was nowhere to say it.
   */
  gather_line?: string;
  /**
   * Per-path prose: normal-path content_id -> the content_id to print INSTEAD
   * when this node was entered by a diverting option (`rejoin: "divert"`).
   *
   * A node can be reached two ways — falling in from the previous gather, or
   * jumped to by a divert several beats earlier — and the two entries do not
   * read the same. SC-T2-09's CH-T2-09-6 is the case that forced this: entered
   * normally Toby says "All done. Anything I can get you", but entered by the
   * divert (the player named the shelf and he changed the subject) the same
   * beat opens "Let's see, what's next...". Both were authored; only the
   * normal one had a printed slot, so half the prose never played.
   *
   * Keyed by the id that is ALREADY wired to a slot — a set-up line, a
   * response_slot, or an option's player_line — so the schema stays a flat
   * back-reference by content_id, exactly like `gather_line` and the `lines`
   * array. No new nesting, and a node with no variants is unchanged on disk.
   *
   * emitChoiceNode prints the pair as one ink conditional on the emitter's
   * divert-path flag, so both texts (and both #id tags) live in one line.
   */
  path_variants?: Record<string, string>;
}

export interface Scene {
  scene_id: string;
  soul: string; // soul_id
  screen_id: string;
  /**
   * Predicates that gate ENTERING this conversation, same vocabulary as a
   * node's `availability_conditions` (screen-spec-schema.md). Empty or absent
   * means the hub offers it whenever the soul is present.
   *
   * Entry and content are different jobs, and the thread docs say so: "Entry
   * gate is the previous conversation in this thread completing. Nothing else.
   * Completion gates the sequence; knowledge gates the content." So this field
   * normally carries one `played(<previous scene>)` term, and the knowledge
   * flags stay on the nodes inside. Without it every conversation of a thread
   * was offered at once, in any order — four shelf entries on T2, and eleven
   * "Talk to Ilsa" entries once T4 was authored.
   *
   * A false entry gate needs no fallback divert (unlike a gated node, see
   * emitChoiceNode): a hub entry is one `*` choice among several, so an
   * unavailable one is simply not offered.
   */
  entry_gate?: string[];
  lines: ContentLine[]; // flat; includes set-up lines, player lines, responses
  choice_nodes: ChoiceNode[];
}

export interface SceneGraph {
  souls: Soul[];
  scenes: Scene[];
}

// ---------- role-workplace.json ----------

export interface RoleWorkplace {
  role_tag: string;
  workplace_screens: string[];
  time_blocks: TimeBlock[];
  /**
   * The role's festival goal, prose from the shared pool (gdd/07-cast.md's
   * "The role pool" table) — "Prepares the communal feast", etc. Optional so
   * older role-workplace.json rows (or a role not yet transcribed) don't fail
   * to load; roleGoals.ts treats a missing goal as an authoring gap, not an
   * error.
   */
  goal?: string;
  /**
   * thread_ids (arc-festival-slice.md's thread table) whose thread_move
   * represents THIS role's EXTERNAL goal advancing (D7,
   * gdd/03-core-loop.md:31-41). Populated only where a real authored scene's
   * state_actions actually moves that thread for a soul dealt this role —
   * never guessed. Empty/absent = no goal content authored yet for this role,
   * which roleGoals.ts reports as a content gap, not as "goal not advanced".
   */
  goal_threads?: string[];
}

// ---------- bundled input ----------

export interface ResolverData {
  screens: ScreenSpec[];
  seams: Seam[];
  sceneGraph: SceneGraph;
  roleWorkplace: RoleWorkplace[];
}

// ---------- graph.json (pinned shape) ----------

export interface GraphVariable {
  name: string;
  declaration: string;
  readers: string[];
  writers: string[];
}

export interface GraphScreen extends ScreenSpec {
  ink_address: string;
}

export interface GraphChoiceNode extends ChoiceNode {
  ink_address: string; // weave anchor label form of choice_id
  gather_address: string; // g_-prefixed gather label
}

export interface GraphScene {
  scene_id: string;
  soul: string;
  screen_id: string;
  ink_address: string; // <soul>.<scene>
  entry_gate?: string[]; // see Scene.entry_gate
  lines: ContentLine[];
  choice_nodes: GraphChoiceNode[];
}

export interface Graph {
  screens: GraphScreen[];
  seams: Seam[];
  scenes: GraphScene[];
  variables: GraphVariable[];
  /**
   * The cast, carried so the review tool can show a person's NAME rather than
   * their id — "Toby", not "toby". The names are authored data; title-casing
   * the id in the UI would be a guess, and wrong for any name that isn't a
   * plain capitalization.
   */
  souls: Soul[];
  /**
   * Bond scoring, stamped from tuning.json at build time so the host reads it
   * from a file it already loads. The host is the "code" in "narration
   * proposes, code disposes" — ink never stores the bond, it only fires the
   * event (choice-node-schema.md), and the host mirrors the resulting band back
   * into bondLevel_<soul> for the compiled guard to read.
   */
  bond: BondTuning;
  /** day-loop shape, stamped from tuning.json so emitInk needs no extra arg. */
  day_loop: { moves_per_day: number; days_per_life: number };
  /**
   * Role-goal data (D7), carried through unchanged from role-workplace.json —
   * same precedent as `bond` above: the host reads it off the file it already
   * loads rather than fetching role-workplace.json separately. Paired with
   * `souls[].role_tag` and live thread-move state, this is what
   * roleGoals.ts's `soulRoleGoalStatus` reads; nothing else may feed the
   * festival tier (gdd/03-core-loop.md:37,41).
   */
  role_workplace: RoleWorkplace[];
}

// ---------- day.json (pinned shape) ----------

export interface SlotFill {
  screen_id: string;
  time_block: TimeBlock;
  soul: string;
}

export interface ItemRoll {
  slot_id: string;
  item: string; // an item, or the literal "empty"
}

export interface DayJson {
  seed: string;
  day: number;
  slot_fill: SlotFill[];
  item_rolls: ItemRoll[];
  live_leads: string[];
  /**
   * soul_id -> that soul's SPB-* scene ids, in one random permutation (2026-
   * 08-31). Baked per LIFE (day.ts's `resolveDay` always seeds this off day
   * 1, regardless of the day actually being resolved), so it is identical on
   * every day-N.json of the same life rather than reshuffled daily. The host
   * mirrors "the first of these not yet `completed_*`" into an ink var —
   * see `SpellBeatLedger` (phaser) / `mirrorSpellBeats` (lantern).
   */
  spell_beat_order: Record<string, string[]>;
  aliveness_band: AlivenessBand;
}

// ---------- resolveDay input ----------

export type ThreadStatus = "unstarted" | "live" | "done";

export interface ThreadState {
  thread_id: string;
  soul: string; // soul_id carrying the thread
  status: ThreadStatus;
}

export interface ScreenConstraint {
  screen_id: string;
  allowed_time_blocks: TimeBlock[]; // e.g. Tavern is evening-only
}

export interface DayInput {
  slot: number; // save slot 1-3
  life: number; // life counter, starts at 1
  day: number; // 1-5
  picked_location: string; // the location the player picked the prior evening
  threads: ThreadState[]; // host's day-end record of thread_move events
  lead_pool: string[]; // authored errand-lead ids; resolver selects, never generates
  aliveness_band: AlivenessBand;
  constraints?: ScreenConstraint[];
}

// ---------- edits.json ----------

export interface Edit {
  target: string; // content_id, or "<choice_id>.<field>" / "<option_id>.<field>"
  old_text: string;
  new_text: string;
  timestamp: string; // ISO 8601
}

export interface EditReport {
  applied: Edit[];
  rejected: { edit: Edit; reason: string; current_text: string }[];
  orphans: { edit: Edit; reason: string }[];
}
