/**
 * Pinned v1 shapes from review-tool-spec_draft.md.
 * The resolver writes graph.json / day.json; this tool only reads them.
 * The tool's own two record files (approvals.json / edits.json) are at the bottom.
 */

export interface Region {
  region_id: string;
  shape: unknown;
}

export interface Gate {
  gate_id: string;
  archetype: string; // Knowledge | Cascade | Signpost | Landmark | Traveler | Proof
  five_field_ref?: string;
  preview?: boolean;
}

export interface Screen {
  screen_id: string;
  // "home" is the Home Hub only (resolver graph.ts's HOME_SCREEN_ID, D2) —
  // never a DayInput.picked_location value.
  location: "town" | "forest" | "farm" | "home";
  name: string;
  status: string; // start | locked(gate_id) | reachable(gate_id)
  vibe?: string;
  gates: Gate[];
  // knowledge_flag (GP-111): the phrase examining this thing records. Carried
  // through from graph.json so the tool can show a pickup as what it is —
  // the world-side writer of a flag no conversation may be able to set.
  examinables?: { id: string; clue_tier: string; region: string; knowledge_flag?: string }[];
  // Castable targets authored directly on the screen (F8: river_stone,
  // heated_stone, stone_wall) — `ReceiverHotspots` unions this with whatever
  // `Inventory.worldItemsOn` finds, so a minted product is castable too.
  receivers?: string[];
  forage?: string[];
  npc_slots?: { time_block: string; count: number }[];
  item_slots?: {
    slot_id: string;
    region: string;
    bucket: { item: string; weight: number }[];
    respawn_rule?: string;
    conditions?: string[];
  }[];
  time_states?: string[];
  connects_to: string[];
  regions?: Region[];
  ink_address: string;
}

export interface Seam {
  from: string;
  to: string;
  name: string;
}

export interface Line {
  content_id: string;
  slot_type: string; // dialogue | player_line | ...
  speaker_id: string;
  text: string;
  /** present on resolver-emitted graphs: which choice/option owns this line */
  choice_id?: string;
  option_id?: string;
}

export interface ChoiceOption {
  option_id: string;
  verb_family: string;
  player_verb: string;
  /** content_id of the player_line slot — spoken option. Exactly one of player_line / surface_action. */
  player_line?: string;
  /** the diegetic deed, rendered bracketed — unspoken option. */
  surface_action?: string;
  response_slots: string[]; // content_ids
  state_actions: string[]; // e.g. "bond_event(Intimacy)"
  rejoin: "gather" | "divert";
  /** target choice_id when rejoin = divert — field name matches resolver's graph.json (types.ts:141). */
  divert_to?: string;
}

export interface ChoiceNode {
  choice_id: string;
  scene_id: string;
  availability_conditions: string[];
  equal_weight_note: string;
  no_accrual_note: string;
  options: ChoiceOption[];
  /** resolver-emitted: derived ink identifiers (build-loop.md address rule) */
  ink_address?: string;
  gather_address?: string;
  /**
   * Set when this node is a sub-conversation playing INSIDE the named option
   * rather than after the scene's previous gather. The last sub-node under one
   * option carries that option's own gather_address, so every path through the
   * option converges there.
   */
  parent_option?: string;
  /** content_id whose text stands at this node's gather instead of a placeholder. */
  gather_line?: string;
}

export interface Scene {
  scene_id: string;
  soul: string;
  screen_id: string;
  ink_address: string;
  lines: Line[];
  choice_nodes: ChoiceNode[];
}

export interface Variable {
  name: string;
  declaration: string;
  readers: string[];
  writers: string[];
}

export interface Soul {
  soul_id: string;
  /** the person's name as authored — "Toby", not "toby" */
  name?: string;
  role_tag?: string;
  home_screen?: string;
  deep?: boolean;
}

/**
 * Bond scoring, stamped into graph.json by the resolver from tuning.json.
 * ONE hidden count per soul — Trust/Intimacy/Recognition/Respect are weights on
 * a single delta, never stored dimensions (guardrails.md check 2). Optional
 * because a graph.json built before W1a has no bond block.
 */
export interface BondTuning {
  category_weights: Record<string, number>;
  trait_coefficients: Record<string, number>;
  band_thresholds: { mid_min: number; high_min: number };
  demo_multiplier: number;
}

/**
 * A role's workplace + festival goal (D7, resolver's role-workplace.json,
 * carried into graph.json the same way `bond` is). `goal_threads` names the
 * thread_id(s) whose thread_move represents THIS role's EXTERNAL goal
 * advancing — the only thing that may move the festival tier
 * (gdd/03-core-loop.md:37,41). Empty/absent = no goal content authored yet
 * for this role; lib/roleGoals.ts treats that as a content gap, never as
 * "not advanced".
 */
export interface RoleWorkplace {
  role_tag: string;
  workplace_screens: string[];
  time_blocks: string[];
  goal?: string;
  goal_threads?: string[];
}

export interface Graph {
  screens: Screen[];
  seams: Seam[];
  scenes: Scene[];
  variables: Variable[];
  /** the cast; absent in older graph.json files, so always guard */
  souls?: Soul[];
  /** bond scoring; absent in graph.json files built before W1a, so always guard */
  bond?: BondTuning;
  /** day-loop shape; absent in graph.json files built before W1c, so always guard */
  day_loop?: { moves_per_day: number; days_per_life: number };
  /** role goals (D7); absent in graph.json files built before D7, so always guard */
  role_workplace?: RoleWorkplace[];
}

export interface Day {
  seed: number | string;
  day: number;
  slot_fill: { screen_id: string; time_block: string; soul: string }[];
  item_rolls: { slot_id: string; item: string }[];
  live_leads: string[];
  /** soul_id -> that soul's SPB-* scene ids in one random per-life order
   * (resolver's `day.ts`) — absent in a day.json built before this field
   * existed, so always guard. See `LanternPlayer.mirrorSpellBeats`. */
  spell_beat_order?: Record<string, string[]>;
  aliveness_band: string;
}

/* ---- the tool's two record files ---- */

export type ReviewStatus = "approved" | "flagged" | "edited";

export interface ApprovalRecord {
  status: ReviewStatus;
  note?: string;
  timestamp: string;
}

/** approvals.json: artifact_id -> record. approved and edited both pass the gate. */
export type Approvals = Record<string, ApprovalRecord>;

/** edits.json entry. Target is a content_id or "<id>.<field>". */
export interface EditPatch {
  target: string;
  old_text: string;
  new_text: string;
  timestamp: string;
}

/* ---- view model ---- */

export type PlayState = "current" | "visited" | "dim" | null;

export type NodeKind = "screen" | "scene" | "choice" | "option" | "line" | "gather";
