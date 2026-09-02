// buildGraph: data JSONs -> graph.json (the pinned shape in
// resources/review-tool-spec_draft.md). Screens gain ink_address; scenes carry
// lines and choice_nodes inline with both ID and address forms; variables[]
// lists every state.ink declaration with readers/writers derived from
// availability_conditions and state_actions.

import { inkAddress, sceneInkAddress, gatherAddress, mintIds } from "./ids.ts";
import { compileConditions } from "./predicates.ts";
import { compileStateActions } from "./actions.ts";
import { archPromoteCondition, DEFAULT_TUNING } from "./tuning.ts";
import type { Tuning } from "./tuning.ts";
import type {
  Graph,
  GraphChoiceNode,
  GraphScene,
  GraphScreen,
  GraphVariable,
  ResolverData,
} from "./types.ts";

// Sentinel writer/reader ids for state written outside the story:
// present_* and slot_* are written by the day-start resolver; bondLevel_* is
// mirrored in by the host persistence engine (mirror in, event out);
// pickedLocation and pickedStartScreen are both written by the Home Hub's
// calendar (ink.ts's emitMain), from the SAME choice. pickedLocation is read
// back by the day-start resolver on the NEXT call — the resolver's
// DayInput.picked_location contract (types.ts): "the location the player
// picked the prior evening" — a LOCATION region ("town"/"forest"/"farm"),
// never a screen id (day.ts's guarantee floor compares it against
// ScreenSpec.location). pickedStartScreen is the exact screen's ink_address,
// consumed only inside the story itself (day_start's start_from_calendar) to
// know precisely where to place the player; nothing outside the story reads it.
export const DAY_START_WRITER = "day-start-resolver";
export const HOST_MIRROR_WRITER = "host-mirror";
export const HOME_HUB_WRITER = "home-hub";

/**
 * The Home Hub's own screen_id (GDD 08-levels.md:24-29; D2 iteration 3).
 *
 * A real ScreenSpec entry (data/screen-specs.json), status "hub" — never
 * "start" (screen_hub/the calendar both filter on `status.startsWith("start")`,
 * ink.ts) and never a location a player can pick (location "home", which
 * DayInput.picked_location — town/forest/farm only — never equals). It exists
 * so main.ink's hand-authored home_hub/calendar knots (ink.ts's emitMain) have
 * a real screen for their #screen: tag to name: without an entry here,
 * play.ts's currentScreen tracking has nothing to resolve the tag against, and
 * the stage pane is left showing whatever real screen the player stood on
 * last, all through the Home Hub. ink.ts excludes this id from the generic
 * per-screen world-file loop (emitScreen) — the Home Hub's flow is hand
 * -authored in main.ink, not generated — so this screen mints no world/*.ink
 * file of its own.
 */
export const HOME_SCREEN_ID = "HOME";

/**
 * The Festival Grounds' screen_id (data/screen-specs.json). Hardcoded here,
 * same precedent as HOME_SCREEN_ID: main.ink's hand-authored `home_hub_final`
 * knot (ink.ts's emitMain, festival-night-transition-plan.md section C)
 * diverts here directly when the player chooses to go to Festival night — it
 * is the ONLY screen the final sequence's night ever reaches (RULED
 * 2026-08-01: "no move budget at night, T7 is the only screen").
 */
export const FESTIVAL_SCREEN_ID = "T7";

/**
 * The two screens the final sequence ends on (festival-night-transition-plan.md
 * section B), both hand-authored in emitMain like HOME_SCREEN_ID — real
 * ScreenSpec entries so Lantern can review them, but minting no generic
 * world/*.ink file of their own (emitInk excludes all three ids from
 * emitScreen's generic per-screen loop).
 */
export const VIGNETTE_SCREEN_ID = "T9";
export const FINAL_SCREEN_ID = "FS";

/**
 * The three festival-vignette TIER screens (RULED by Roc 2026-08-30). The
 * final-sequence `festival_vignette` router (ink.ts's emitMain) branches on
 * `festival_score` and plays exactly one of them: 0–3 → VIGQ (quiet), 3.5–6.5
 * → VIGW (warm), 7–9 → VIGG (grand). Each is a `narrator`-soul scene
 * (VIG-quiet/VIG-warm/VIG-grand in scene-graph.json) whose content ends
 * `-> night_screen`, so the one-way final sequence continues on into TN.
 *
 * Same hand-authored/non-generated treatment as T9/TN/FS: real ScreenSpec
 * entries so Lantern can review them, but excluded from emitScreen's generic
 * per-screen world loop (they carry no hub — the narrator scene is played
 * straight through, not entered from a hub). BLACK placeholders on purpose:
 * no manifest art.
 */
export const VIGNETTE_QUIET_SCREEN_ID = "VIGQ";
export const VIGNETTE_WARM_SCREEN_ID = "VIGW";
export const VIGNETTE_GRAND_SCREEN_ID = "VIGG";

/**
 * The night-version screen (GP-51, Roc's playtest note 2026-08-02: "needs a
 * Night time screen that shows night version before the Final Screen").
 * Sits between the vignette (T9) and the Final Screen (FS) in the final
 * sequence — same hand-authored/non-generated treatment as the other two
 * (real ScreenSpec entry so Lantern can review it; no generic world/*.ink
 * file of its own).
 */
export const NIGHT_SCREEN_ID = "TN";

/**
 * The non-diegetic narrator/priest voice (scene-graph.json soul "narrator",
 * added 2026-08-30). It carries ONLY the festival-vignette tier scenes
 * (VIG-quiet/warm/grand), reached by the `festival_vignette` router and never
 * by a screen hub. It has NO role_tag and must NEVER be placed as an NPC on a
 * screen — the day resolver's roster (day.ts), the walker's presence roster
 * (walk.ts) and the emitter's [Talk to X] offering (ink.ts emitScreen) all
 * exclude it. Last-night ruling: the narrator stays an inferred heuristic (a
 * line with no speaker reads as narrator), so it is an identity for authoring
 * and rendering, not a cast member the world places.
 */
export const NARRATOR_SOUL_ID = "narrator";

/**
 * How many levels a sub-conversation may nest inside an option
 * (`choice_node.parent_option`). A top-level node is depth 0.
 *
 * **This is a policy number, not a mechanical one.** Nothing breaks at 3 — the
 * mechanical limit is `SearchOptions.maxScenePaths` (4000 complete option
 * sequences per scene visit), and the deepest authored scene sits at ~672. The
 * limit exists because a scene's path count is the PRODUCT of its nodes'
 * branching, so nesting one option multiplies the whole scene, not just the
 * branch: SC-T4-02 went 192 -> 672 for a single nested option. Raising this
 * means re-running the reachability search and confirming `bounds.hit` is
 * still false — past the cap, "unreachable" silently means "not found within
 * budget" rather than "proven unreachable", and the traversal proof stops
 * being a proof.
 *
 * Raised 1 -> 2 on 2026-08-01 (Roc), after measuring the above.
 */
export const MAX_NESTING = 2;

interface VarEntry {
  declaration: string;
  readers: Set<string>;
  writers: Set<string>;
  order: number;
}

export function buildGraph(data: ResolverData, tuning: Tuning = DEFAULT_TUNING): Graph {
  const sceneGraph = mintIds(data.sceneGraph);
  const vars = new Map<string, VarEntry>();
  let orderCounter = 0;

  const declare = (name: string, declaration: string): VarEntry => {
    let e = vars.get(name);
    if (!e) {
      e = { declaration, readers: new Set(), writers: new Set(), order: orderCounter++ };
      vars.set(name, e);
    }
    return e;
  };

  // --- collect LIST members from the data ---
  const phrases = new Set<string>();
  const items = new Set<string>();
  const collectPredArgs = (conds: string[] | undefined) => {
    for (const c of conds ?? []) {
      let m = c.match(/^knows\(([^)]+)\)$/);
      if (m) phrases.add(inkAddress(m[1]));
      m = c.match(/^item_held\(([^)]+)\)$/);
      if (m) items.add(inkAddress(m[1]));
    }
  };
  for (const screen of data.screens) {
    for (const f of screen.forage ?? []) items.add(inkAddress(f));
    // An examinable's knowledge_flag is a KnownPhrases member exactly like a
    // choice's knowledge_flag state_action. Collected here so the phrase is
    // declared even when no choice anywhere sets it — which is the whole point
    // of a pickup: the thing on the shelf is the ONLY writer of that flag for a
    // player who closed the conversational path (R5).
    for (const ex of screen.examinables ?? []) {
      if (ex.knowledge_flag) phrases.add(inkAddress(ex.knowledge_flag));
    }
    for (const slot of screen.item_slots ?? []) {
      collectPredArgs(slot.conditions);
      for (const b of slot.bucket) {
        if (b.item !== "empty") items.add(inkAddress(b.item));
      }
    }
  }
  for (const scene of sceneGraph.scenes) {
    for (const node of scene.choice_nodes) {
      collectPredArgs(node.availability_conditions);
      for (const opt of node.options) {
        for (const a of opt.state_actions ?? []) {
          if (a.type === "knowledge_flag") phrases.add(inkAddress(a.arg));
        }
      }
    }
  }
  if (phrases.size === 0) phrases.add("placeholder_phrase");
  if (items.size === 0) items.add("placeholder_item");

  // --- base declarations (build-loop.md: state.ink is the single declaration site) ---
  // GDD naming wins over ink's original "midday" (03-core-loop.md,
  // 06-world-and-progression.md: "morning -> afternoon -> evening"). "night"
  // stays declared — it is festival night, the ratified "final sequence"
  // (03-core-loop.md's day-5 exception), reachable only by the player's
  // choice from `home_hub_final` on the life's last day, never a normal
  // daily block (ink.ts's day loop no longer cycles evening -> night on its
  // own; see emitMain).
  declare("TimeOfDay", "LIST TimeOfDay = morning, afternoon, evening, night");
  declare("day", "VAR day = 1");
  // Year-loop saves (T13, 2026-08-23 ruling): the story resets its own clock
  // via a host-divert-only `begin_new_year` knot (ink.ts emitMain). Declared
  // beside `day` so it rides `graph.variables` into state.ink the same way.
  declare("year", "VAR year = 1");
  // "movesLeft" now spends against a PER-BLOCK budget (3 moves per block —
  // morning/afternoon/evening — not once per day). day_loop.moves_per_day is
  // the field name on disk (tuning.json); its value is the per-block budget.
  declare("movesLeft", "VAR movesLeft = 3");
  // The festival grade accumulator (D-scoring, ruled 2026-08-30). Ink owns it:
  // encounter options add their 0.5/1.0 grade via a `score` state_action, the
  // final-sequence vignette router branches on it (0-3 quiet / 3.5-6.5 warm /
  // 7-9 grand), and the host reads it read-only (peekVar) for the results
  // panel. Rides state.ink like `day`, so it survives save/load with no host
  // storage.
  declare("festival_score", "VAR festival_score = 0");
  // The name the player chose at the intro, set once by the host at story start
  // (InkBridge) from ChosenLife.playerName; printed by VIG-grand's final line.
  // Default is a safe fallback for an unnamed life.
  declare('player_name', 'VAR player_name = "traveler"').writers.add(HOST_MIRROR_WRITER);
  // The calendar's pick (Home Hub, GDD 08-levels.md), read back by the host
  // between days. "none" until the first evening the player reaches the Home
  // Hub — day 1 has no prior evening, so day 1's start is still the manual
  // screen_hub pick (emitMain).
  declare('pickedLocation', 'VAR pickedLocation = "none"').writers.add(HOME_HUB_WRITER);
  // The same calendar pick's exact screen, consumed only inside the story
  // (day_start's start_from_calendar) to route the player precisely — see
  // this file's header comment for why this is a second VAR, not a reuse of
  // pickedLocation.
  declare('pickedStartScreen', 'VAR pickedStartScreen = "none"').writers.add(HOME_HUB_WRITER);
  declare("KnownPhrases", `LIST KnownPhrases = ${[...phrases].sort().join(", ")}`);
  declare("Satchel", `LIST Satchel = ${[...items].sort().join(", ")}`);

  for (const soul of sceneGraph.souls) {
    const s = inkAddress(soul.soul_id);
    declare(`present_${s}`, `VAR present_${s} = "none"`).writers.add(DAY_START_WRITER);
    declare(`bondLevel_${s}`, `VAR bondLevel_${s} = 0`).writers.add(HOST_MIRROR_WRITER);
    // Cumulative distinct-days-talked count, mirrored in by the host (continuous
    // across years, per save slot). Read by the talk_days(soul) predicate that
    // gates greetings and NGT-mara's doll reveal (2026-08-30). Same mirror-in
    // posture as bondLevel_.
    declare(`talkDays_${s}`, `VAR talkDays_${s} = 0`).writers.add(HOST_MIRROR_WRITER);
  }
  for (const screen of data.screens) {
    for (const slot of screen.item_slots ?? []) {
      declare(`slot_${inkAddress(slot.slot_id)}`, `VAR slot_${inkAddress(slot.slot_id)} = "empty"`)
        .writers.add(DAY_START_WRITER);
    }
  }

  const addReads = (names: string[], readerId: string) => {
    for (const n of names) vars.get(n)?.readers.add(readerId);
  };
  const addWrites = (names: string[], writerId: string) => {
    for (const n of names) vars.get(n)?.writers.add(writerId);
  };

  // --- screens ---
  // The Arch's promotes_to condition gets the tuned thresholds stamped in
  // (tuning.json arch_promote), replacing the prose pointer at the proposal.
  // arch-promote-proposal.json itself stays the human-gated record, unread here.
  const screens: GraphScreen[] = data.screens.map((s) => {
    for (const slot of s.item_slots ?? []) {
      const p = compileConditions(slot.conditions, { screen_id: s.screen_id });
      addReads(p.reads, slot.slot_id);
    }
    // The examinable is a real writer of KnownPhrases, so it has to appear in
    // the variable's writers[] — that list is what the review tool and QA read
    // to answer "what can set this flag?", and a pickup missing from it reads
    // as an unreachable path.
    for (const ex of s.examinables ?? []) {
      if (ex.knowledge_flag) addWrites(["KnownPhrases"], ex.id);
    }
    const out: GraphScreen = { ...s, ink_address: inkAddress(s.screen_id) };
    if ((s.examinables ?? []).some((e) => e.id === "arch" && e.promotes_to)) {
      out.examinables = s.examinables!.map((e) =>
        e.id === "arch" && e.promotes_to
          ? { ...e, promotes_to: { ...e.promotes_to, condition: archPromoteCondition(tuning.arch_promote) } }
          : e,
      );
    }
    return out;
  });

  // --- scenes with choice nodes inline ---
  const soulIds = new Set(sceneGraph.souls.map((s) => s.soul_id));
  // Built before the map below because an entry_gate's played() names ANOTHER
  // scene — usually the previous conversation in the thread — so every address
  // has to be resolvable before the first gate compiles.
  const sceneAddresses = new Map(
    sceneGraph.scenes.map((s) => [s.scene_id, sceneInkAddress(s.soul, s.scene_id)]),
  );
  const scenes: GraphScene[] = sceneGraph.scenes.map((scene) => {
    if (!soulIds.has(scene.soul)) {
      throw new Error(`Scene ${scene.scene_id} names unknown soul "${scene.soul}"`);
    }
    // A parent_option must name an option in THIS scene, and the chain of
    // parents must not run deeper than MAX_NESTING. Caught here rather than at
    // emit time so a bad reference fails the build, not the compile.
    const optionOwner = new Map<string, string>(); // option_id -> choice_id
    for (const node of scene.choice_nodes) {
      for (const opt of node.options) optionOwner.set(opt.option_id, node.choice_id);
    }
    const nodeById = new Map(scene.choice_nodes.map((n) => [n.choice_id, n]));
    for (const node of scene.choice_nodes) {
      if (!node.parent_option) continue;
      // Walk up the parent chain, counting hops. The `seen` set is not
      // paranoia: authored data can name a cycle, and without it this loops
      // forever instead of reporting the mistake.
      const seen = new Set<string>([node.choice_id]);
      let depth = 0;
      let current = node;
      while (current.parent_option) {
        const ownerId = optionOwner.get(current.parent_option);
        if (!ownerId) {
          throw new Error(
            `Scene ${scene.scene_id}: node ${current.choice_id} names parent_option ` +
              `"${current.parent_option}", which is not an option in this scene`,
          );
        }
        depth += 1;
        if (depth > MAX_NESTING) {
          throw new Error(
            `Scene ${scene.scene_id}: node ${node.choice_id} nests ${depth} levels deep; ` +
              `the limit is ${MAX_NESTING}. Each level multiplies the scene's path count, ` +
              `and the reachability search's per-scene budget is what pays for it.`,
          );
        }
        if (seen.has(ownerId)) {
          throw new Error(
            `Scene ${scene.scene_id}: node ${node.choice_id} sits in a parent_option cycle`,
          );
        }
        seen.add(ownerId);
        current = nodeById.get(ownerId)!;
      }
    }

    // The LAST sub-node under an option gathers at the OPTION's label, so every
    // path through that option converges on one named point. Computed here
    // rather than in the emitter because `walk.ts`, the review tool and the
    // ink all have to agree on the label, and the graph is where they agree.
    const lastSubNode = new Map<string, string>(); // option_id -> choice_id
    for (const node of scene.choice_nodes) {
      if (node.parent_option) lastSubNode.set(node.parent_option, node.choice_id);
    }
    const convergence = new Map<string, string>(); // choice_id -> option_id
    for (const [optionId, choiceId] of lastSubNode) convergence.set(choiceId, optionId);

    const choice_nodes: GraphChoiceNode[] = scene.choice_nodes.map((node) => {
      const p = compileConditions(node.availability_conditions, { screen_id: scene.screen_id });
      addReads(p.reads, node.choice_id);
      for (const opt of node.options) {
        const acts = compileStateActions(opt.state_actions, scene.soul);
        addWrites(acts.writes, opt.option_id);
        // Per-option gate predicates are variable readers too, and compiling
        // them here validates the vocabulary before emit (same as the node
        // conditions above).
        const optPred = compileConditions(opt.availability_conditions, { screen_id: scene.screen_id });
        addReads(optPred.reads, opt.option_id);
      }
      const convergesFor = convergence.get(node.choice_id);
      return {
        ...node,
        ink_address: inkAddress(node.choice_id),
        gather_address: gatherAddress(convergesFor ?? node.choice_id),
      };
    });
    // The entry gate's predicates are variable readers like any other, and
    // compiling them here doubles as validation: a term outside the vocabulary
    // throws before a line of ink is emitted, same as the node conditions above.
    const entry = compileConditions(scene.entry_gate, {
      screen_id: scene.screen_id,
      scene_addresses: sceneAddresses,
    });
    addReads(entry.reads, scene.scene_id);

    // NOTE: this literal is a whitelist, not a spread — screens (above) and
    // choice nodes (above) spread, scenes do not. A new Scene field that is not
    // named here is dropped silently: it survives loadData, never reaches
    // graph.json, emitInk or walk.ts, and TypeScript stays quiet because an
    // absent optional property is not a type error. Add new fields here too.
    return {
      scene_id: scene.scene_id,
      soul: scene.soul,
      screen_id: scene.screen_id,
      ink_address: sceneInkAddress(scene.soul, scene.scene_id),
      entry_gate: scene.entry_gate,
      lines: scene.lines,
      choice_nodes,
    };
  });

  const variables: GraphVariable[] = [...vars.entries()]
    .sort((a, b) => a[1].order - b[1].order)
    .map(([name, e]) => ({
      name,
      declaration: e.declaration,
      readers: [...e.readers].sort(),
      writers: [...e.writers].sort(),
    }));

  // Bond tuning rides the graph so the host reads it from a file it already
  // loads — same precedent as the Arch's stamped promote condition above. The
  // alternative was teaching Lantern to fetch tuning.json, which would put a
  // second reader on the single-home file for no gain.
  return {
    screens,
    seams: data.seams,
    scenes,
    variables,
    souls: sceneGraph.souls,
    bond: structuredClone(tuning.bond),
    day_loop: { ...tuning.day_loop },
    // D7: role-workplace.json was loaded into ResolverData (day.ts's
    // role_anchor weighting already reads it) but never reached the graph —
    // the host had no way to read a role's goal or its goal_threads. Wired
    // through here, same pass-through precedent as `souls`/`bond` above.
    role_workplace: structuredClone(data.roleWorkplace),
  };
}
