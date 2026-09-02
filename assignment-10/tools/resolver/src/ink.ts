// emitInk: graph.json -> the ink/ file tree (build-loop.md, file split S4).
//
//   main.ink            INCLUDEs + a minimal day-loop stub
//   state.ink           every LIST and VAR declaration, nothing else
//   world/<screen>.ink  screen = knot; examinables and time-states = stitches
//   souls/<soul>.ink    scenes = stitches in the soul's knot; choice weaves
//   system/externals.ink EXTERNAL declarations + no-op fallback functions
//
// Placeholder lines everywhere — no real prose. The resolver writes every file
// here; hand edits get clobbered on purpose.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { inkAddress } from "./ids.ts";
import { compileConditions } from "./predicates.ts";
import { compileStateActions, EXTERNAL_FUNCTIONS } from "./actions.ts";
import {
  HOME_SCREEN_ID,
  FESTIVAL_SCREEN_ID,
  VIGNETTE_SCREEN_ID,
  NIGHT_SCREEN_ID,
  FINAL_SCREEN_ID,
  VIGNETTE_QUIET_SCREEN_ID,
  VIGNETTE_WARM_SCREEN_ID,
  VIGNETTE_GRAND_SCREEN_ID,
} from "./graph.ts";
import type { ContentLine, Graph, GraphChoiceNode, GraphScene } from "./types.ts";

/** Relative POSIX path -> file content. */
export type InkFiles = Map<string, string>;

// Festival-night (T7) attendance bond gate (C1 part 2, 2026-08-30). A deep
// soul needs the "high" talk_days tier — the same >= 4 threshold already
// authored for these souls' own deepest content (scene-graph.json) — to be
// scripted into the festival-night roster at all.
const FESTIVAL_ATTENDANCE_MIN_TALK_DAYS = 4;

/**
 * Ink control glyphs escaped ANYWHERE they appear in authored prose.
 *
 * The backslash leads the class on purpose: the replace runs once, so an
 * authored `\` has to become `\\` in the same pass or it would be read as the
 * escape it is about to introduce.
 *
 *   `\`     the escape character itself
 *   `#`     starts a tag. This is the dangerous one — an unescaped `#` swallows
 *           the rest of the line INCLUDING the `#id:`/`#speaker:` tags this
 *           emitter appends after the text, which unhooks the line from its
 *           content_id with no error anywhere
 *   `[ ]`   a choice label's "only in the choice" span. `cleanText` output is
 *           interpolated straight INTO `[...]` labels (`[Go to <name>]`,
 *           `[Look at <thing>]`), so a `]` in prose closes the label early and
 *           the remainder parses as something else entirely
 *
 * DELIBERATELY NOT IN THIS SET: `{`, `}` and `|`. Ink's inline logic is a
 * markup channel this project's authored content ACTUALLY USES — `souls/*.ink`
 * carries `"...in the {TimeOfDay} and catch Ilsa..."` and the vignette prints
 * `"{player_name}"` — so escaping braces would not harden the emitter, it would
 * silently turn five live interpolations into literal text reading
 * "{TimeOfDay}" on screen. `|` rides with them because it is the separator
 * INSIDE that same construct. Their failure mode is also the acceptable one: an
 * unbalanced brace is a loud compile error ("Unresolved variable"), not the
 * silent mis-weave a stray `#` or `]` produces.
 */
const INK_CONTROL_GLYPHS = /[\\#[\]]/g;

/**
 * Glyphs that are only control characters as the FIRST thing on a line — the
 * weave and logic markers (`~` logic, `* +` choices, `-` gather, `=` stitch,
 * `->` divert, `<>` glue). Harmless mid-sentence, so they are escaped
 * positionally rather than everywhere, which leaves ordinary hyphens and
 * asterisks in prose alone.
 */
const INK_LINE_LEAD_GLYPHS = /^[~*+\-=<>]/;

/**
 * Normalise one authored string into something safe to interpolate into the
 * emitted ink — one line, and no glyph that could be silently misread as ink
 * syntax.
 *
 * B9 (2026-08-30). This used to only collapse whitespace, on the then-true
 * grounds that the emitter wrote placeholders and placeholders contain no
 * markup. Real authored prose flows through here now, and nothing between the
 * author and the compiler was checking it — a single `#` or `]` in a line of
 * dialogue compiles into a weave that quietly means something else.
 *
 * ESCAPING, not stripping or substituting: inkjs's
 * `ContentTextAllowingEscapeChar` consumes `\` + any character and emits that
 * character literally (verified against the bundled inkjs 2.3 compiler,
 * including at line-lead position), so the player reads exactly what was
 * authored. Nothing downstream sees the backslashes — they are gone by the time
 * the story is compiled, so runtime text still matches the graph strings that
 * `playMap.ts` keys its lookups on.
 */
function cleanText(text: string): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  const escaped = oneLine.replace(INK_CONTROL_GLYPHS, (g) => `\\${g}`);
  return escaped.replace(INK_LINE_LEAD_GLYPHS, (g) => `\\${g}`);
}

function lineTags(line: ContentLine, extra: string[] = []): string {
  const tags = [...extra, `#id:${line.content_id}`, `#speaker:${line.speaker_id}`];
  return tags.join(" ");
}

/**
 * The divert-path flag (ChoiceNode.path_variants).
 *
 * It is emitter-owned, not story state: nothing authored reads it, no
 * predicate compiles to it and the host never mirrors it. It exists because a
 * node reached by a divert has to print different prose than the same node
 * reached from the previous gather, and ink gives a weave point one address —
 * so the entry path has to be carried in a value rather than in a label. Set
 * on the divert itself, consumed by the target node's lines, cleared at that
 * node's gather (see emitChoiceNode), so it is only ever true for the span of
 * one node.
 */
const DIVERT_PATH_FLAG = "enteredByDivert";

/**
 * The festival-vignette tier router (RULED by Roc 2026-08-30). On the last
 * night the `festival_vignette` knot branches on `festival_score` and plays
 * exactly ONE narrator scene, then continues into `night_screen`:
 *
 *   score >= 7   → VIGG / narrator.vig_grand   (grand, 7–9)
 *   score >= 3.5 → VIGW / narrator.vig_warm    (warm, 3.5–6.5)
 *   else (0–3)   → VIGQ / narrator.vig_quiet   (quiet)
 *
 * Ordered highest threshold first: the router emits nested if/else (ink's
 * multi-line conditional takes one condition + `- else:` only — a second
 * `- cond:` reads as a switch case on the outer expression's value, see
 * emitMoveTo), so the first matching threshold wins.
 *
 * `address` is the narrator scene's ink stitch (soul "narrator" → knot
 * `narrator`; scene id `VIG-quiet` → stitch `vig_quiet`, per the address
 * rule). emitSoul emits those scenes ending `-> night_screen` (see the
 * vignette branch there), and emitInk stubs them when scene-graph.json has no
 * narrator soul yet, so the diverts always resolve.
 */
const VIGNETTE_TIERS = [
  { screenId: VIGNETTE_GRAND_SCREEN_ID, address: "narrator.vig_grand", threshold: 7 },
  { screenId: VIGNETTE_WARM_SCREEN_ID, address: "narrator.vig_warm", threshold: 3.5 },
  { screenId: VIGNETTE_QUIET_SCREEN_ID, address: "narrator.vig_quiet", threshold: 0 },
] as const;

/** The three tier screens, whose narrator scenes flow straight to night_screen. */
const VIGNETTE_TIER_SCREEN_IDS = new Set<string>(VIGNETTE_TIERS.map((t) => t.screenId));

/** The narrator soul that carries the three VIG tier scenes. */
const NARRATOR_SOUL_ID = "narrator";

/**
 * The body of the `festival_vignette` knot: nested if/else over VIGNETTE_TIERS,
 * diverting to the winning tier's narrator scene. The last tier (quiet,
 * threshold 0) is the untested `- else:` floor. See VIGNETTE_TIERS.
 */
function emitVignetteRouter(): string[] {
  const build = (i: number): string[] => {
    const tier = VIGNETTE_TIERS[i];
    if (i === VIGNETTE_TIERS.length - 1) return [`-> ${tier.address}`];
    return [
      `{ festival_score >= ${tier.threshold}:`,
      `    -> ${tier.address}`,
      "- else:",
      ...build(i + 1).map((l) => `    ${l}`),
      "}",
    ];
  };
  return build(0);
}

/**
 * TEMPORARY stub for the `narrator` soul when scene-graph.json has none yet.
 * Declares the knot + the three VIG stitches the tier router diverts into so
 * the build compiles before the real scenes are authored. Removed automatically
 * once a real narrator soul appears (emitInk skips it — emitSoul emits the real
 * file). See emitInk.
 */
function emitNarratorVignetteStub(): string {
  const out: string[] = [
    "// souls/narrator.ink — TEMPORARY STUB (ink.ts's emitNarratorVignetteStub).",
    "// scene-graph.json has no `narrator` soul yet, so the three festival-vignette",
    "// tier scenes (VIG-quiet/VIG-warm/VIG-grand) don't exist to emit. This stub",
    "// declares the knot + stitches the tier router diverts into so the build",
    "// compiles. It disappears on its own once the real narrator VIG scenes land",
    "// — emitInk emits this stub ONLY while no `narrator` soul is in the data;",
    "// after that emitSoul generates this file for real, each vig stitch ending",
    "// `-> night_screen` via its vignette branch.",
    "",
    `=== ${NARRATOR_SOUL_ID} ===`,
    "-> DONE",
    "",
  ];
  for (const tier of VIGNETTE_TIERS) {
    const stitch = tier.address.split(".")[1];
    // The grand stub prints {player_name} on purpose — it proves the brace
    // passes through unescaped and still compiles (VIG-grand's real final line
    // interpolates it; task point 4).
    const name = tier.screenId === VIGNETTE_GRAND_SCREEN_ID ? " for {player_name}" : "";
    out.push(
      `= ${stitch}`,
      `STUB: festival vignette — ${stitch}${name}. #screen:${tier.screenId} #id:GB-${tier.screenId}-STUB`,
      "-> night_screen",
      "",
    );
  }
  return out.join("\n") + "\n";
}

// ---------- state.ink ----------

function emitState(graph: Graph): string {
  const out: string[] = [
    "// state.ink — the single declaration site (build-loop.md).",
    "// A LIST or VAR declared anywhere else is a defect. Generated; do not hand-edit.",
    "",
  ];
  for (const v of graph.variables) out.push(v.declaration);
  // Declared here for the same reason as everything above it: state.ink is the
  // one declaration site, even for a flag the weave owns rather than the host.
  out.push(`VAR ${DIVERT_PATH_FLAG} = false // emitter-owned; see ink.ts`);
  // The current-hub return for global (GRT-*) greetings (pip-grove-screen-shift.md).
  // The initial value only has to be a VALID divert (any real screen hub) — it is
  // overwritten by every hub's first line before any greeting can run. Default to
  // the first start screen's hub so a jumpTo that lands in a greeting without
  // passing a hub still returns somewhere real.
  const firstStart =
    graph.screens.find((s) => s.status.startsWith("start")) ?? graph.screens[0];
  if (firstStart) {
    out.push(
      `VAR ${HUB_RETURN_VAR} = -> ${firstStart.ink_address}.${HUB_STITCH} // emitter-owned; current-hub return for global (GRT-*) scenes`,
    );
  }
  // One per scene (2026-08-31, `completed()` predicate) — see `emitSoul`'s own
  // comment on where it gets set to true, and `predicates.ts`'s `completed()`
  // for why this is a separate flag from ink's own played()/knot-visit count.
  for (const scene of graph.scenes) {
    out.push(`VAR completed_${inkAddress(scene.scene_id)} = false // emitter-owned; see ink.ts`);
  }
  // One per soul that carries any SPB-* scene (2026-08-31, `spellbeat_current()`
  // predicate) — host-mirrored, never ink-assigned; see `LanternPlayer.
  // mirrorSpellBeats` and predicates.ts's `spellbeat_current()`. Default ""
  // matches "nothing mirrored yet" until the host's first applyDay.
  const spellBeatSouls = new Set(
    graph.scenes.filter((s) => s.scene_id.startsWith("SPB-")).map((s) => s.soul),
  );
  for (const soul of [...spellBeatSouls].sort()) {
    out.push(`VAR spellbeat_current_${inkAddress(soul)} = "" // emitter-owned; see ink.ts`);
  }
  return out.join("\n") + "\n";
}

// ---------- system/externals.ink ----------

function emitExternals(): string {
  const out: string[] = [
    "// system/externals.ink — state_actions emit as EXTERNAL calls (choice-node-schema.md).",
    "// The host binds these for real; these fallbacks make the canned web build run.",
    "",
  ];
  for (const fn of EXTERNAL_FUNCTIONS) {
    const params = fn.params.join(", ");
    out.push(`EXTERNAL ${fn.name}(${params})`);
    out.push(`=== function ${fn.name}(${params})`);
    out.push("    // no-op fallback stub");
    out.push("    ~ return 0");
    out.push("");
  }
  return out.join("\n") + "\n";
}

// ---------- world/<screen>.ink ----------

/**
 * The per-screen hub stitch (W1b). Reserved: an examinable or time-state that
 * addressed to this name would silently take over the screen's navigation, so
 * addStitch refuses it.
 */
const HUB_STITCH = "hub";

/**
 * The emitter-owned divert-valued VAR that records the hub the player is
 * currently standing on (pip-grove-screen-shift.md). A global greeting
 * (GRT-*) is compiled into every screen's hub, so its scene body cannot name
 * a fixed return screen — it returns through this var, which every hub
 * rewrites to its own address on entry, so a greeting always lands back on
 * the hub it was played from rather than the soul's authored home screen.
 */
const HUB_RETURN_VAR = "hubReturn";

/**
 * A backdrop/establishing beat that swaps the screen WITHOUT printing prose
 * into the VN box: it emits ONLY the given tags (e.g. #screen:/#id:), no text.
 *
 * Used for the night_screen establishing beat (S1): unlike every other
 * placeholder establishing beat — which KEEPS its prose and rides a
 * `#placeholder:1` tag the host suppresses at the box (DialogueFeed) — this
 * one prints mid-vignette, during the drain window, where a leaked
 * "Placeholder: the town under festival night…" would sit in the box over the
 * backdrop swap. Emitting tag-only makes the backdrop change with nothing to
 * suppress.
 */
function backdropBeat(tags: string[]): string {
  return tags.join(" ");
}

/** A soul's authored name, for "Talk to Toby" rather than "Talk to toby". */
function soulLabel(graph: Graph, soulId: string): string {
  return graph.souls.find((s) => s.soul_id === soulId)?.name ?? soulId;
}

/**
 * The first day a scene can be entered WITHOUT losing a beat.
 *
 * Note this is the HIGHEST day floor across the scene's beats, not the lowest.
 * The week view and the guarantee floor use the lowest, because they answer
 * "when does this scene become available?" — a floor, so catch-up is possible.
 * This answers a different question: "when is it safe to spend the once-only
 * entry?" Entering a scene plays only the beats open right now and spends the
 * entry, so entering SC-T6-01 on day 1 permanently strands its `day >= 4` beat
 * and the `knows(tavern_tab)` beat that one unlocks. Waiting until every beat is
 * open is what makes a single entry lossless.
 */
function sceneEntryDay(scene: GraphScene): number {
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

/**
 * scene_id -> ink address, for compiling an entry_gate's played() terms.
 * GraphScene already carries ink_address, so this is a lookup, not a derivation.
 * Cached per graph because emitScreen runs once per screen and the map is the
 * same every time.
 */
const sceneAddressCache = new WeakMap<Graph, Map<string, string>>();
function sceneAddresses(graph: Graph): Map<string, string> {
  let m = sceneAddressCache.get(graph);
  if (!m) {
    m = new Map(graph.scenes.map((s) => [s.scene_id, s.ink_address]));
    sceneAddressCache.set(graph, m);
  }
  return m;
}

/** stall_goods -> "stall goods", for a placeholder examinable label. */
function readable(id: string): string {
  return id.replace(/[_-]+/g, " ");
}

/**
 * The shared move-spend body for a location choice (RULED 2026-08-01): 3
 * moves per BLOCK, not per day. Used both by a screen's exits and by
 * day_start's screen_hub — picking the day's opening screen spends move 1
 * exactly like any other move, so a block still visits `moves_per_day` (the
 * per-block budget) locations in total.
 *
 * A move on its own must NOT advance the clock. Only a spent budget does —
 * and it advances the BLOCK, not the day. Evening is the day's last block, so
 * spending it out sends the player home (day_end) instead of trying to
 * advance into a fourth block that doesn't exist. This replaces the old
 * "every move calls advance_time()" model, which advanced the clock once per
 * move regardless of the budget.
 */
function emitMoveTo(target: string, indent: string): string[] {
  // Nested if/else, not a `-` chain: ink's multi-line conditional only
  // accepts ONE condition plus an `- else:` — a second `- condition:` reads
  // as a switch case on the outer expression's VALUE, not a second boolean
  // test ("Expected an '- else:' clause here rather than an extra condition").
  return [
    `${indent}~ movesLeft = movesLeft - 1`,
    `${indent}{ movesLeft > 0:`,
    `${indent}    -> ${target}`,
    `${indent}- else:`,
    `${indent}    { TimeOfDay == evening:`,
    `${indent}        -> day_end`,
    `${indent}    - else:`,
    `${indent}        ~ advance_time()`,
    `${indent}        -> ${target}`,
    `${indent}    }`,
    `${indent}}`,
  ];
}

/**
 * The conversation-spend body for returning from a scene (GP-93 rule 1,
 * RULED — including the softened Roc 2026-08-06 ruling that a quiet beat
 * costs the same slot as one that moves a thread, i.e. this applies to every
 * REAL conversation, not only thread-moving ones): a conversation advances
 * the clock UNCONDITIONALLY, not once a move budget empties. Unlike
 * emitMoveTo this never touches movesLeft — advance_time() already resets
 * it, and "spends a full time slot" means the whole block, not one move
 * unit.
 *
 * At night this is a no-op transition (advance_time() only cycles
 * morning->afternoon->evening — see its own comment), so multiple night
 * scenes remain playable back to back exactly as before GP-93 — night is
 * already its own single slot, not subdivided further by this rule.
 *
 * This one mechanism is also what makes rule 2 ("a thread can be entered at
 * most once per time slot") hold without any separate per-thread lock: once
 * any conversation ends, the slot is gone before the hub is offered again, so
 * nothing --thread-bearing or not-- can be entered twice in it.
 *
 * NOT called for a non-ENC- scene (see `spendsTimeSlot` below) — see
 * `emitFreeReturn` for those.
 */
function emitConversationReturn(target: string, indent: string): string[] {
  return [
    `${indent}{ TimeOfDay == evening:`,
    `${indent}    -> day_end`,
    `${indent}- else:`,
    `${indent}    ~ advance_time()`,
    `${indent}    -> ${target}`,
    `${indent}}`,
  ];
}

/**
 * Anything that is not an ENC- conversation does not spend the block (Roc,
 * 2026-09-01): the clock never moves and movesLeft is untouched, so the hub
 * re-offers itself exactly as it was — a soul can be greeted, then have a real
 * conversation, in the SAME visit. GP-93 rule 1 ("a conversation spends the
 * whole slot") only ever meant a REAL conversation; a greeting has no content
 * of its own to spend a slot on, a spell-beat is a glimpse, not a scene, and a
 * night scene sits inside festival night, which is one indivisible block
 * already (see advance_time()'s own no-op-at-night note).
 */
function emitFreeReturn(target: string, indent: string): string[] {
  return [`${indent}-> ${target}`];
}

/**
 * Whether a scene's return costs the whole time block (GP-93 rule 1) or is
 * free (Roc, 2026-09-01): ONLY an ENC- scene spends the slot. Everything else
 * — GRT- (a greeting), SPB- (a spell-beat glimpse), NGT- (a night scene) — is
 * free. Read off the scene_id's own authored prefix, the same convention
 * day.ts's spell_beat_order and predicates.ts's completed() comments already
 * use to mean "this kind of scene".
 *
 * STATED AS AN ALLOW-LIST, NOT A DENY-LIST, ON PURPOSE. The previous form
 * (`!GRT- && !SPB-`) was a deny-list, so NGT- spent the slot purely because
 * nobody had added it — and a new prefix would silently inherit "spends the
 * slot" too. Roc's rule is "only ENC conversations advance time," which is an
 * allow-list sentence; writing it as one makes the default for any future
 * prefix "free", which is the safe direction: a scene that wrongly spends the
 * slot silently eats a third of the player's day.
 */
function spendsTimeSlot(sceneId: string): boolean {
  return sceneId.startsWith("ENC-");
}

/**
 * A screen is a knot that OFFERS what is on it (W1b).
 *
 * Before this, a screen knot printed its intro line and hit `-> DONE`, so the
 * flow ended on arrival and every scene was reachable only through the tool's
 * own jumpTo. There was no organic path from the day loop into any dialogue at
 * all, which is why a week could never be played.
 *
 * Now: intro -> the matching time-state -> a hub offering this screen's scenes,
 * its examinables, its exits (each spending a move against the current
 * block's budget — see emitMoveTo), and End the day. Everything is sticky;
 * see the scene loop for why that matters.
 */
function emitScreen(graph: Graph, screenId: string): string {
  const screen = graph.screens.find((s) => s.screen_id === screenId);
  if (!screen) throw new Error(`emitScreen: unknown screen ${screenId}`);
  const knot = screen.ink_address;
  const out: string[] = [
    `// world/${knot}.ink — generated from screen_spec ${screen.screen_id}. Do not hand-edit.`,
    "",
    `=== ${knot} ===`,
    // The screen's establishing beat keeps its placeholder prose but rides a
    // `#placeholder:1` tag the host suppresses at the VN box (DialogueFeed) —
    // keep-prose-tag-suppress, so the walker's continue-run length is
    // unchanged (walk.test.ts) while the box shows nothing unauthored.
    `Placeholder: ${cleanText(screen.name)}. #screen:${screen.screen_id} #id:GB-${screen.screen_id}-INTRO #placeholder:1`,
  ];

  // Show the time-state that matches the clock, then fall through to the hub.
  // Separate conditionals rather than a switch: the first match diverts, and a
  // screen with no state for this block simply falls past them all.
  for (const ts of screen.time_states ?? []) {
    out.push(`{ TimeOfDay == ${inkAddress(ts)}: -> ts_${inkAddress(ts)} }`);
  }
  out.push(`-> ${HUB_STITCH}`, "");

  const stitchNames = new Set<string>([HUB_STITCH]);
  const addStitch = (name: string, lines: string[]) => {
    if (stitchNames.has(name)) {
      throw new Error(`emitScreen: stitch name clash "${name}" on screen ${screen.screen_id}`);
    }
    stitchNames.add(name);
    // Return to the hub, not DONE: a look that ends the day is not a look.
    out.push(`= ${name}`, ...lines, `-> ${HUB_STITCH}`, "");
  };

  // ---- the hub ----
  out.push(`= ${HUB_STITCH}`);

  // Record the hub the player is standing on, so a global greeting (GRT-*)
  // returns HERE rather than to the soul's authored home screen
  // (pip-grove-screen-shift.md). This runs every time any hub is displayed,
  // so hubReturn always names the hub actually on screen — the first line of
  // the stitch, before any choice can divert into a greeting.
  out.push(`~ ${HUB_RETURN_VAR} = -> ${knot}.${HUB_STITCH}`);

  // The Festival Grounds' old auto-divert into the vignette (fired once every
  // night scene here was spent) is RETIRED (festival-night-rules.md RULING 3,
  // Roc 2026-09-02): the vignette is PILL-ONLY. The "Begin the festival
  // vignette" choice below is the sole forward path off T7 at night.

  // Scenes on this screen. Once-only (`*`), because a conversation is a beat you
  // have rather than a room you re-enter — and because a sticky entry would let
  // a walker (or a bored player) re-open a spent scene forever.
  //
  // But once-only makes EARLY entry destructive: entering plays only the beats
  // open right now and still spends the entry, so a scene whose beats span days
  // silently loses the later ones. Greeting Ilsa at the festival on day 1 used
  // to cost her whole arc turn, and entering SC-T6-01 on day 1 stranded its
  // `day >= 4` beat. So the entry is guarded on `sceneEntryDay` — the day every
  // beat is open — which makes one entry lossless.
  //
  // Guarded on the soul standing here AND on that day.
  //
  // The roster is this screen's own scenes PLUS every GRT-* greeting authored
  // for a DIFFERENT screen (Roc, 2026-09-01: a greeting is offered wherever
  // the soul actually stands, not only on its authored home screen — gated at
  // runtime by presence, and returned through hubReturn so it lands back on
  // THIS hub, not the soul's home). The narrator identity is NEVER an NPC
  // (S1): its festival-vignette scenes are diverted into by the router, never
  // offered as a [Talk to X] choice, so it is filtered out of every roster.
  const onScreen = graph.scenes.filter(
    (s) => s.screen_id === screenId && s.soul !== NARRATOR_SOUL_ID,
  );
  const greetingsElsewhere = graph.scenes.filter(
    (s) =>
      s.scene_id.startsWith("GRT-") && s.screen_id !== screenId && s.soul !== NARRATOR_SOUL_ID,
  );
  let here = [...onScreen, ...greetingsElsewhere];
  // Festival Grounds roster is DEEP-only (festival-night-rules.md RULING 2,
  // Roc 2026-09-02): keep the deep souls' authored night scenes (NGT-*) AND
  // their greeting tiers (GRT-*), and drop every non-deep soul. A non-deep
  // soul carries no talk_days tier convention that means anything at the
  // festival, so it is excluded from the roster rather than gated.
  if (screenId === FESTIVAL_SCREEN_ID) {
    here = here.filter((s) => graph.souls.some((soul) => soul.soul_id === s.soul && soul.deep));
  }
  for (const scene of here) {
    const presence = `present_${inkAddress(scene.soul)} == "${screen.screen_id}"`;
    // Festival-night attendance is bond-gated (C1 part 2, Roc-confirmed real
    // feature, 2026-08-30): being scheduled onto T7 by the day resolver is not
    // enough to be scripted into the vignette roster — a deep soul the player
    // never got close to should not be waiting there. Reuses the same
    // talk_days(soul) tier convention already authored elsewhere for these
    // three souls (0 / 1-3 / 4+, see scene-graph.json's GRT/greeting tiers and
    // NGT-mara's own >= 4 doll-reveal gate): >= 4 is the "high" tier, so
    // festival attendance requires the deepest band, not just "some talking".
    const isDeepSoul = graph.souls.some((s) => s.soul_id === scene.soul && s.deep);
    const bondGate =
      screenId === FESTIVAL_SCREEN_ID && isDeepSoul
        ? compileConditions([`talk_days(${scene.soul}) >= ${FESTIVAL_ATTENDANCE_MIN_TALK_DAYS}`])
        : undefined;
    const bondGuard = bondGate && bondGate.guard !== "" ? ` && ${bondGate.guard}` : "";
    const entryDay = sceneEntryDay(scene);
    const dayGuard = entryDay > 1 ? ` && day >= ${entryDay}` : "";
    // The scene's own entry gate — normally played(previous conversation), so a
    // thread's conversations are offered in order instead of all at once. No
    // fallback divert is needed for a false gate here (unlike a gated node,
    // which would dead-end mid-scene): this is one `*` choice among several, so
    // an unavailable entry is simply not offered.
    const entry = compileConditions(scene.entry_gate, {
      screen_id: screen.screen_id,
      scene_addresses: sceneAddresses(graph),
    });
    const entryGuard = entry.guard === "" ? "" : ` && ${entry.guard}`;
    // A greeting is once-only ACROSS screens. hubReturn lets the same GRT-*
    // scene be compiled into (and offered on) every screen the soul visits, so
    // ink's per-knot `*` once-only is not enough — a greeting taken at screen
    // A is still a fresh `*` at screen B. Guarding on the scene's own read
    // count (`<addr> == 0`, a stitch name evaluates to its visit count) retires
    // it everywhere the moment it is taken anywhere.
    const onceGuard = scene.scene_id.startsWith("GRT-") ? ` && ${scene.ink_address} == 0` : "";
    // GP-93 rule 3's morning-reserved-for-the-festival-arc guard is retired
    // (Roc, 2026-08-31) — conversations are no longer gated by time of day.
    // Two scenes for one soul on one screen would both read "Talk to Toby",
    // and only the tag would tell them apart — unreadable in review. Suffix the
    // scene id only where the ambiguity actually exists, so the common case
    // stays clean. Order is authored order, so the arc's beats come in sequence.
    const ambiguous = here.filter((s) => s.soul === scene.soul).length > 1;
    const label = cleanText(soulLabel(graph, scene.soul)) + (ambiguous ? ` (${scene.scene_id})` : "");
    out.push(
      `* {${presence}${bondGuard}${dayGuard}${entryGuard}${onceGuard}} [Talk to ${label}] #scene:${scene.scene_id} -> ${scene.ink_address}`,
    );
  }

  for (const ex of screen.examinables ?? []) {
    out.push(`+ [Look at ${cleanText(readable(ex.id))}] -> ${inkAddress(ex.id)}`);
  }

  // Exits. NOTE: status locks are NOT enforced here, and that is deliberate.
  // A gate carries an archetype and a prose five_field_ref but no
  // machine-readable condition, so there is nothing to compile. Guarding on the
  // literal status string would strand T4 and T6 — Ilsa's whole arc and
  // SC-T6-01 — and make the week unplayable. The lock rides as a tag so the
  // tool can show it (a display-only advisory, nothing here enforces it).
  //
  // Only status "locked(gate_id[, gate_id])" is a lock — screen-spec-schema.md
  // is explicit that "reachable(gate_id)" is NOT one ("a knowledge-demonstration
  // site that is never blocked... walking up is free, the demonstration is the
  // gate"). Tagging every non-"start" status (as this used to) put a #lock: on
  // reachable() exits too and made the tool's lock badge lie about them.
  //
  // Connections are UNDIRECTED. `connects_to` is declared on one side only, but
  // it models a path between two places, not a one-way door — and computeHealth
  // has always flooded it undirected. Emitting only the declared direction left
  // T6, T7, T8, F6, F7 and F8 with exits and no entrances: each one declares an
  // outward connection and nothing declares one back, so the player could leave
  // them but never arrive. That stranded SC-T6-01 and both festival-night arc
  // turns. Walking the edge from either end is what the data already meant.
  const neighbours = new Set<string>();
  for (const c of screen.connects_to ?? []) {
    neighbours.add(typeof c === "string" ? c : c.screen_id);
  }
  for (const other of graph.screens) {
    for (const c of other.connects_to ?? []) {
      const to = typeof c === "string" ? c : c.screen_id;
      if (to === screen.screen_id) neighbours.add(other.screen_id);
    }
  }
  for (const targetId of [...neighbours].sort()) {
    const target = graph.screens.find((s) => s.screen_id === targetId);
    // A connection to a screen this graph does not contain is skipped rather
    // than thrown: the test fixtures are a deliberate subset (fixture T1
    // connects to F1, which the fixture set omits), and emitting an exit to a
    // knot that does not exist would be an ink compile error either way.
    // Reporting a genuinely dangling connection is W2's job: `conditions.ts`
    // for what is decidable statically, `walk.ts` for what needs a real walk.
    // Either can tell a partial fixture from a broken map; the emitter cannot.
    if (!target) continue;
    const lockTag = target.status.startsWith("locked(") ? ` #lock:${target.status}` : "";
    // No move budget at night, and T7 is the only screen the final sequence
    // ever reaches (RULED 2026-08-01) — suppress every ordinary exit once
    // TimeOfDay is night, same guard style as a day-gated scene entry above.
    out.push(`+ {movesLeft > 0 && TimeOfDay != night} [Go to ${cleanText(target.name)}]${lockTag}`);
    out.push(...emitMoveTo(target.ink_address, "    "));
  }

  if (screenId === FESTIVAL_SCREEN_ID) {
    // Always available at night (RULED 2026-08-01): the player may start the
    // vignette early, before every NPC scene here is spent.
    out.push(`+ {TimeOfDay == night} [Begin the festival vignette] -> festival_vignette`);
  }

  // Wait (T8, RULED by Roc 2026-08-24): stay put and let time pass. The day
  // clock only ever advances through ink — a host-side setVar shortcut is not
  // a legal way to move it — so waiting has to be a real choice here, and it
  // costs a move like every other time-consuming action.
  //
  // It is an exit that leads back to this same screen: emitMoveTo spends one
  // move and only calls advance_time() once the block's budget is empty, so a
  // single Wait either just eats a move or rolls the clock to the next block,
  // exactly matching how every "Go to X" already behaves. Same guard as those
  // exits — no move budget at night, and nothing to wait for once the final
  // sequence is running.
  out.push(`+ {movesLeft > 0 && TimeOfDay != night} [Wait]`);
  out.push(...emitMoveTo(screen.ink_address, "    "));

  out.push("+ [End the day] -> day_end", "");

  for (const ex of screen.examinables ?? []) {
    const body = [
      `Placeholder examinable: ${ex.id} (${ex.clue_tier}). #id:GB-${screen.screen_id}-EX-${ex.id} #placeholder:1`,
    ];
    // R5's pickup path: examining the thing records the knowledge, so a player
    // who closed the conversational route can still pick the fact up off the
    // world. Same two lines a `knowledge_flag` state_action compiles to
    // (actions.ts), wrapped in a not-already-known guard.
    //
    // The guard is what lets the hub entry stay STICKY (`+`) without
    // double-recording: the look is repeatable forever — a thing on a shelf
    // does not vanish once seen — but recordKnowledge fires on the first look
    // only, so no host-side counter can key off re-looking (guardrails check 2
    // bars exactly that).
    if (ex.knowledge_flag) {
      const phrase = inkAddress(ex.knowledge_flag);
      body.push(
        `{ not (KnownPhrases ? ${phrase}):`,
        `    ~ KnownPhrases += ${phrase}`,
        `    ~ recordKnowledge("${ex.knowledge_flag}")`,
        `}`,
      );
    }
    addStitch(inkAddress(ex.id), body);
  }
  // ts_ prefix: a bare time-state stitch name would collide with the
  // TimeOfDay LIST elements (ink identifiers share one global namespace).
  for (const ts of screen.time_states ?? []) {
    addStitch(`ts_${inkAddress(ts)}`, [
      `Placeholder time-state: ${screen.screen_id} at ${ts}. #id:GB-${screen.screen_id}-TS-${ts} #placeholder:1`,
    ]);
  }
  return out.join("\n") + "\n";
}

// ---------- souls/<soul>.ink ----------

function lineById(scene: GraphScene, contentId: string): ContentLine {
  const line = scene.lines.find((l) => l.content_id === contentId);
  if (!line) {
    throw new Error(`Scene ${scene.scene_id}: content_id "${contentId}" not found in lines`);
  }
  return line;
}

/** Does this node carry per-path prose at all? Most nodes do not. */
function hasPathVariants(node: GraphChoiceNode): boolean {
  return Object.keys(node.path_variants ?? {}).length > 0;
}

/**
 * The printable body for a slot, honouring `path_variants`.
 *
 * With no variant the body is what it always was. With one, both bodies go out
 * as a single ink conditional on DIVERT_PATH_FLAG — text AND tags, so the
 * #id tag names the line that actually printed and QA's tag stream stays
 * truthful on both paths. `{cond:a|b}` binds tags to the branch that runs
 * (verified against inkjs), which is why this can be one line rather than two
 * guarded ones.
 */
function pathBody(
  scene: GraphScene,
  node: GraphChoiceNode,
  line: ContentLine,
  extraTags: string[] = [],
): string {
  const normal = `${cleanText(line.text)} ${lineTags(line, extraTags)}`;
  const divertId = node.path_variants?.[line.content_id];
  if (!divertId) return normal;
  const divert = lineById(scene, divertId);
  return `{${DIVERT_PATH_FLAG}:${cleanText(divert.text)} ${lineTags(divert, extraTags)}|${normal}}`;
}

/**
 * Emit one choice node as an ink weave.
 *
 * `depth` is the weave level: 1 is the scene's own line (`*` / `-`), 2 is a
 * sub-conversation nested inside an option (`**` / `--`). ink counts nesting by
 * marker repetition, so depth is the only thing that changes between the two —
 * the body is identical, which is the reason this is a parameter rather than a
 * second emitter.
 */
function emitChoiceNode(
  graph: Graph,
  scene: GraphScene,
  node: GraphChoiceNode,
  depth = 1,
): string[] {
  const out: string[] = [];
  const compiled = compileConditions(node.availability_conditions, { screen_id: scene.screen_id });
  const guard = compiled.guard === "" ? "" : `{${compiled.guard}} `;
  // ink counts nesting by marker repetition, not whitespace, so the indent is
  // purely for the human reading the generated file — and Roc does read it.
  const lead = "    ".repeat(depth - 1);
  const bullet = `${lead}${"*".repeat(depth)}`;
  const rule = `${lead}${"-".repeat(depth)}`;
  // Body lines sit one step in from their bullet; at depth 1 that is the
  // 4-space indent the emitter has always used.
  const pad = "    ".repeat(depth);
  // Sub-nodes are emitted by their parent option, not by the scene loop.
  const subNodes = (parentOptionId: string) =>
    scene.choice_nodes.filter((n) => n.parent_option === parentOptionId);

  // Set-up line: the flat-array line back-referencing this choice with no
  // option_id. A gather_line matches that description too — it belongs to the
  // node and names no option — so it is excluded by id, or a node whose only
  // unoptioned line is its gather would print that line as its set-up and then
  // again at the gather.
  // A divert-path variant of the set-up (path_variants) matches that
  // description too — same choice_id, no option_id — so it is excluded by id
  // as well. Excluding by VALUE rather than by array order is what keeps the
  // normal-path line the set-up regardless of which of the pair is authored
  // first in `lines`.
  const variantTargets = new Set(Object.values(node.path_variants ?? {}));
  const setup = scene.lines.find(
    (l) =>
      l.choice_id === node.choice_id &&
      !l.option_id &&
      l.content_id !== node.gather_line &&
      !variantTargets.has(l.content_id),
  );
  // Anchor this node with its OWN address (node.ink_address — "weave anchor
  // label form of choice_id", types.ts) as a labelled gather-dash line, not a
  // plain content line. ink only makes a point cross-referenceable when it is
  // declared with a gather "-", so this is what lets divert_to (below) land on
  // the actual node instead of replaying the scene from its top.
  const anchor = `${rule} (${node.ink_address})`;
  let choiceTagPlaced = false;
  if (setup) {
    const body = pathBody(scene, node, setup, [`#choice:${node.choice_id}`]);
    // A gated node must gate its OWN set-up line, not just its options — a
    // player who never met the node's condition should never read the line
    // that presumes they did (live bug: CH-T4-02-3's set-up printed ungated).
    out.push(compiled.guard ? `${anchor} { ${compiled.guard}: ${body} }` : `${anchor} ${body}`);
    choiceTagPlaced = true;
  } else {
    // No separate set-up line — still anchor the node so a cross-scene
    // divert_to (or a future jump-to-node feature) has a real address.
    out.push(anchor);
  }

  for (const opt of node.options) {
    // #choice: rides the first option line when the node has no set-up line.
    const choiceTag = choiceTagPlaced ? "" : ` #choice:${node.choice_id}`;
    choiceTagPlaced = true;

    // Per-option gate (2026-08-30): a second {} guard on this option's line,
    // ANDed with the node guard. ink drops the option when it is false, so no
    // fallback is needed — an unoffered option simply is not there.
    const optCompiled = compileConditions(opt.availability_conditions, { screen_id: scene.screen_id });
    const optGuard = optCompiled.guard === "" ? "" : `{${optCompiled.guard}} `;

    let label: string;
    let labelIdTag: string;
    if (opt.player_line) {
      const pl = lineById(scene, opt.player_line);
      // A player_line can have a divert-path variant too — what the player has
      // room to say depends on how the beat opened. The conditional sits inside
      // the quotes (text) and inside the tag value (id) rather than wrapping
      // the whole option, so the option stays ONE choice on both paths.
      const plDivert = node.path_variants?.[pl.content_id];
      if (plDivert) {
        const div = lineById(scene, plDivert);
        label = `"{${DIVERT_PATH_FLAG}:${cleanText(div.text)}|${cleanText(pl.text)}}"`;
        // The whole tag alternates, not the value inside it: a conditional in
        // the tag VALUE comes back as "#id: L-..." (ink keeps the space), and
        // every id consumer reads "#id:" with no space.
        labelIdTag = ` {${DIVERT_PATH_FLAG}:#id:${div.content_id}|#id:${pl.content_id}}`;
      } else {
        label = `"${cleanText(pl.text)}"`;
        labelIdTag = ` #id:${pl.content_id}`;
      }
    } else if (opt.surface_action) {
      label = cleanText(opt.surface_action);
      labelIdTag = "";
    } else {
      throw new Error(`Option ${opt.option_id}: needs exactly one of player_line / surface_action`);
    }
    out.push(`${bullet} ${guard}${optGuard}[${label}] #opt:${opt.option_id}${choiceTag}${labelIdTag}`);

    const acts = compileStateActions(opt.state_actions, scene.soul);
    for (const l of acts.inkLines) out.push(`${pad}${l}`);
    for (const slotId of opt.response_slots ?? []) {
      const resp = lineById(scene, slotId);
      out.push(`${pad}${pathBody(scene, node, resp)}`);
    }

    // The sub-conversation, if this option carries one. It emits INSIDE the
    // option at the next weave level, and its last node gathers at this
    // option's own label (graph.ts assigns that address), so every path
    // through the option converges before the parent gather takes over.
    const subs = subNodes(opt.option_id);
    if (subs.length > 0) {
      if (opt.rejoin === "divert") {
        throw new Error(
          `Option ${opt.option_id}: carries a sub-conversation and rejoin "divert". ` +
            `A diverting option leaves the scene, so its sub-nodes could never play.`,
        );
      }
      for (const sub of subs) out.push(...emitChoiceNode(graph, scene, sub, depth + 1));
      continue;
    }

    if (opt.rejoin === "divert") {
      // Bug fix: this used to divert to the SCENE containing the target node
      // (target.ink_address alone) rather than the node itself, so a diverting
      // option landed back at the top of the scene — a replay loop — instead
      // of at the beat it actually names. The node's own address (anchored
      // above as a gather-dash label) is what makes the target addressable;
      // qualify it with the owning scene's address so a divert can cross
      // scenes (divert_to is not scoped to the current scene).
      const targetScene = graph.scenes.find((s) =>
        s.choice_nodes.some((n) => n.choice_id === opt.divert_to),
      );
      const targetNode = targetScene?.choice_nodes.find((n) => n.choice_id === opt.divert_to);
      if (!targetScene || !targetNode) {
        throw new Error(`Option ${opt.option_id}: divert_to "${opt.divert_to}" not found`);
      }
      // Tell the target which door it was entered by, when the answer matters:
      // either the target prints per-path prose, or this node does and the flag
      // may still be true from the divert that brought us in. Assigned rather
      // than only set, so a chain of diverts always leaves it correct for the
      // node about to run.
      if (hasPathVariants(targetNode) || hasPathVariants(node)) {
        out.push(`${pad}~ ${DIVERT_PATH_FLAG} = ${hasPathVariants(targetNode)}`);
      }
      out.push(`${pad}-> ${targetScene.ink_address}.${targetNode.ink_address}`);
    }
  }

  // A gated node guards every option with the same availability condition, so
  // when the gate is false the choice point has no available option. Ink would
  // stop there — the scene cannot reach its gather and dead-ends. A fallback
  // choice (no text, just a divert) fires automatically only when no normal
  // option is available, skipping the beat to the gather. So a failed gate
  // never blocks the scene from ending.
  if (node.availability_conditions.length > 0) {
    out.push(`${bullet} -> ${node.gather_address}`);
  }

  // gather point — rejoin-by-default keeps QA's walk linear in choice count.
  // A gather is a beat: `gather_line` names the content slot that says what is
  // true now that the branch has converged. Without one it keeps the generated
  // placeholder, so an unauthored gather is visible rather than silent.
  const gatherLine = node.gather_line ? lineById(scene, node.gather_line) : undefined;
  const gatherText = gatherLine
    ? pathBody(scene, node, gatherLine)
    : `Placeholder: the scene continues. #id:GB-${node.choice_id}-GATHER #placeholder:1`;
  out.push(`${rule} (${node.gather_address}) ${gatherText}`);
  // Every path through this node has converged here and every variant slot has
  // printed, so the divert-path flag has done its job. Clearing it at the
  // gather is what keeps it scoped to one node — a later NORMAL entry to this
  // same node must not inherit a divert from earlier in the life.
  if (hasPathVariants(node)) out.push(`${pad}~ ${DIVERT_PATH_FLAG} = false`);
  return out;
}

function emitSoul(graph: Graph, soulId: string): string {
  const knot = inkAddress(soulId);
  const scenes = graph.scenes.filter((s) => s.soul === soulId);
  const out: string[] = [
    `// souls/${knot}.ink — generated. A soul file reads as the person. Do not hand-edit.`,
    "",
    `=== ${knot} ===`,
    "-> DONE",
    "",
  ];
  for (const scene of scenes) {
    const stitch = scene.ink_address.split(".")[1];
    out.push(`= ${stitch}`);
    // A festival-vignette tier scene (VIGQ/VIGW/VIGG) is diverted into
    // directly by the tier router, never through a [Talk to X] choice — the
    // ONLY place emitScreen ever writes a `#scene:` tag. Without one, the
    // walker's own entry tracking (walk.ts's `ingestTags`, which reads the
    // tag off ANY line during a normal Continue(), not only a choice's) has
    // no way to ever see this scene as entered, even on a run that
    // genuinely plays all the way through it. One bare tag line as the
    // stitch's first line gives it the same signal a Talk-choice entry
    // already carries everywhere else.
    if (VIGNETTE_TIER_SCREEN_IDS.has(scene.screen_id)) {
      out.push(`# scene:${scene.scene_id}`);
    }
    // Emit free-standing lines and top-level choice nodes INTERLEAVED in authored
    // `lines` order. A scene's closing beats are free-standing lines that sit
    // AFTER the choice in `lines`, so they must print after the choice, not
    // before it — emitting every free-standing line first (the old behaviour)
    // scrambled any scene with a shared close. A top-level node is emitted once,
    // at the first line that back-references it (its own set-up/option/response
    // lines are emitted from inside emitChoiceNode). Sub-conversation nodes
    // (parent_option set) are emitted by their parent option, never here.
    const topNodeByChoiceId = new Map(
      scene.choice_nodes.filter((n) => !n.parent_option).map((n) => [n.choice_id, n]),
    );
    const emittedNodes = new Set<string>();
    const emitLine = (line: ContentLine) => {
      const body = `${cleanText(line.text)} ${lineTags(line)}`;
      // A free-standing line may carry its own gate (ContentLine.conditions) —
      // conditional narration that reads prior state. Wrap it so it prints only
      // when the guard holds; an ungated line is unchanged.
      const lp = compileConditions(line.conditions, { screen_id: scene.screen_id });
      out.push(lp.guard ? `{ ${lp.guard}: ${body} }` : body);
    };
    for (const line of scene.lines) {
      if (line.choice_id || line.option_id) {
        const node = topNodeByChoiceId.get(line.choice_id ?? "");
        if (node && !emittedNodes.has(node.choice_id)) {
          out.push(...emitChoiceNode(graph, scene, node));
          emittedNodes.add(node.choice_id);
        }
        continue;
      }
      emitLine(line);
    }
    // Safety net: a top-level node no line back-references directly still emits,
    // in array order, so nesting-only or line-less nodes are never dropped.
    for (const node of scene.choice_nodes) {
      if (node.parent_option || emittedNodes.has(node.choice_id)) continue;
      out.push(...emitChoiceNode(graph, scene, node));
      emittedNodes.add(node.choice_id);
    }
    // A festival-vignette tier scene (VIGQ/VIGW/VIGG) is not entered from a
    // world hub — the `festival_vignette` router diverts straight into it
    // (see VIGNETTE_TIERS) and those screens mint no hub. So it continues the
    // one-way final sequence into night_screen rather than returning anywhere.
    if (VIGNETTE_TIER_SCREEN_IDS.has(scene.screen_id)) {
      out.push("-> night_screen", "");
      continue;
    }
    // Return to the screen the conversation happened on, not DONE (W1b).
    // `-> DONE` ended the whole flow, so a scene entered from the world ended
    // the day. Diverting back also fixes jumpTo, which used to dead-end.
    // A tunnel (`-> scene ->` / `->->`) would be more idiomatic ink, but
    // ChoosePathString straight into a scene would then hit `->->` with an
    // empty tunnel stack and throw — and jumping into a scene is a shipped
    // feature of the tool.
    const screen = graph.screens.find((s) => s.screen_id === scene.screen_id);
    if (!screen) {
      throw new Error(`emitSoul: scene ${scene.scene_id} names unknown screen ${scene.screen_id}`);
    }
    // completed(scene_id)'s ONE writer (2026-08-31; see predicates.ts). Every
    // path through this scene that does not take an early `rejoin: divert`
    // option falls through to here, so this is the scene's real ending —
    // unlike played()'s knot-visit count, an early-exit branch never reaches
    // this line and the flag stays false.
    out.push(`~ completed_${inkAddress(scene.scene_id)} = true`);
    // A global greeting (GRT-*) is offered on every screen the soul visits, so
    // it returns through hubReturn to the hub the player is actually standing
    // on, not to its authored home screen (pip-grove-screen-shift.md — this is
    // what fixes the Pip/Grove screen-shift and the festival vignette-pill
    // drop). ENC-/SPB-/NGT-/VIG- keep their authored-screen return: they are
    // structurally filtered to their own screen, so authored hub == current
    // hub already, and the smaller blast radius is the point.
    const isGlobalGreeting = scene.scene_id.startsWith("GRT-");
    const returnTarget = isGlobalGreeting ? HUB_RETURN_VAR : `${screen.ink_address}.${HUB_STITCH}`;
    const returnBody = spendsTimeSlot(scene.scene_id) ? emitConversationReturn : emitFreeReturn;
    out.push(...returnBody(returnTarget, ""), "");
  }
  return out.join("\n") + "\n";
}

// ---------- main.ink ----------

/**
 * The day loop (W1c, extended for the Home Hub — D2). What this replaced was
 * a stub in three ways: it offered `graph.screens[0]` and literally nothing
 * else, so exactly one screen in the world was reachable; `movesLeft` was
 * hard-coded to 3; and the clock never moved, so a `day >= 4` gate could not
 * open in play and SC-T6-01's gated half was unwalkable.
 *
 * Now day_start puts the player at a start screen — either the one picked at
 * the PRIOR evening's Home Hub calendar, or (day 1, which has no prior
 * evening) one the player chooses by hand at screen_hub. Movement between
 * screens spends a move and advances the clock. day_end always returns to
 * the Home Hub (GDD 08-levels.md; 03-core-loop.md; 06-world-and-progression.md
 * "return home... pick the next day's location"), where the calendar sets
 * `pickedStartScreen`/`pickedLocation` for tomorrow, then rolls the day over
 * until the life ends.
 *
 * Two VARs come out of one calendar pick, for two different readers:
 *   `pickedStartScreen` — the exact screen's ink_address. day_start reads
 *     this back (start_from_calendar) to know exactly where to place the
 *     player, same as before D2 iteration 2. Screen-local, this tool only.
 *   `pickedLocation` — the screen's LOCATION region ("town"/"forest"/"farm").
 *     graph.ts's HOME_HUB_WRITER comment and types.ts's DayInput.picked_location
 *     both document this as "the location the player picked the prior
 *     evening", and day.ts's guarantee floor compares it against
 *     ScreenSpec.location directly — a screen id compares equal to nothing
 *     there, which is the exact bug iteration 1 shipped (a "t1" pick can
 *     never match a screen whose location is "town", so the floor's own
 *     `collectOpenings` always came back empty and resolveDay threw). Keeping
 *     the calendar at one choice per SCREEN (not per location) preserves the
 *     walk/search machinery's existing "Go to <screen name>" route-matching
 *     (walk.ts's plannedStrategy) untouched; only the WRITTEN VALUE changes.
 *
 * home_hub and calendar both carry `#screen:${HOME_SCREEN_ID}` (D2 iteration
 * 3) — graph.ts's HOME_SCREEN_ID is a real ScreenSpec entry (status "hub",
 * excluded above from emitScreen's generic loop) that exists FOR this tag.
 * Before this, neither knot carried a #screen: tag at all, so play.ts's
 * currentScreen tracking never changed while the player stood in the Home
 * Hub — the stage pane kept showing whatever real screen was visited last,
 * for the whole Home Hub visit.
 */
function emitMain(
  graph: Graph,
  worldFiles: string[],
  soulFiles: string[],
  dayLoop: { moves_per_day: number; days_per_life: number },
): string {
  const includes = ["state.ink", "system/externals.ink", ...worldFiles, ...soulFiles];
  // Every screen the data marks "start" — the calendar and the day-1 manual
  // fallback both offer exactly this set. Festival Grounds carries status
  // "reachable" instead (screen-specs.json note, RULED 2026-07-30: "open by
  // default, but not a main screen"), so it is walkable but never a start
  // option here — GDD 08-levels.md calls it "the final screen".
  const starts = graph.screens.filter((s) => s.status.startsWith("start"));
  const festivalScreen = graph.screens.find((s) => s.screen_id === FESTIVAL_SCREEN_ID);
  if (!festivalScreen) {
    throw new Error(`emitMain: FESTIVAL_SCREEN_ID "${FESTIVAL_SCREEN_ID}" not found in graph.screens`);
  }
  const out: string[] = [
    "// main.ink — INCLUDEs + the day loop (build-loop.md piece 4). Generated.",
    "",
    ...includes.map((f) => `INCLUDE ${f}`),
    "",
    "-> day_start",
    "",
    "=== day_start ===",
    "~ TimeOfDay = morning",
    `~ movesLeft = ${dayLoop.moves_per_day}`,
    "Day {day} begins. #id:SYS-DAY-BEGIN",
    "// pickedStartScreen is set at the PRIOR evening's Home Hub calendar (below).",
    "// Day 1 has no prior evening, so it stays \"none\" and screen_hub covers it.",
    '{ pickedStartScreen != "none":',
    "    -> start_from_calendar",
    "- else:",
    "    -> screen_hub",
    "}",
    "",
    "// Arriving at the calendar's pick spends move 1 of the fresh morning",
    "// budget — the same cost as picking a start screen by hand at screen_hub",
    "// (RULED 2026-08-01: picking the start location spends move 1).",
    "=== start_from_calendar ===",
    "~ temp dest = pickedStartScreen",
    '~ pickedStartScreen = "none"',
    "{ dest:",
  ];
  for (const s of starts) {
    out.push(`- "${s.ink_address}":`);
    out.push(...emitMoveTo(s.ink_address, "    "));
  }
  out.push(
    "- else:",
    "    -> screen_hub",
    "}",
    "",
    "// Manual fallback: day 1 (no calendar pick exists yet) and a safety net",
    "// if the switch above ever misses. Choosing an opening position spends",
    "// move 1 of morning's budget, same as any other move (RULED 2026-08-01).",
    "=== screen_hub ===",
  );
  for (const s of starts) {
    out.push(`+ {movesLeft > 0} [Begin at ${cleanText(s.name)}]`);
    out.push(...emitMoveTo(s.ink_address, "    "));
  }
  out.push(
    "+ [End the day] -> day_end",
    "",
    "// The final sequence (GDD 03-core-loop.md day-5 exception; RULED",
    "// 2026-08-01) intercepts BEFORE the day increments below — on the life's",
    "// last day, evening's exhausted budget goes home to home_hub_final, not",
    "// the ordinary calendar, and day never advances past it. The old",
    "// day-overrun ending (retired: it used to fire once day exceeded",
    "// days_per_life) is gone — with the intercept here, day can never exceed",
    "// days_per_life, and the final screen is now the only way a life ends.",
    "=== day_end ===",
    `{ day == ${dayLoop.days_per_life}:`,
    "    -> home_hub_final",
    "}",
    "~ day = day + 1",
    "-> home_hub",
    "",
    "// The Home Hub (GDD 08-levels.md): day's end always returns here",
    "// (03-core-loop.md, 06-world-and-progression.md). It resets empty each",
    "// life in the shipped game. Bank/decorate/satchel-triage are D6's build",
    "// (out of D2's scope — a niceness-meter of half-built systems is worse",
    "// than an honest placeholder), but the hub offers a real choice of its",
    "// own rather than a single line that auto-advances into the calendar:",
    "// look around (flavor, once) or start the next day. The calendar NEVER",
    "// opens on its own (GP-52, playtest 2026-08-02: \"let player open the",
    "// calendar\") — looking around returns to the hub, same stitch pattern as",
    "// home_hub_final below, and only the explicit \"Start the Next Day\" pick",
    "// moves on. Renamed from \"Open the calendar\" per Roc's 2026-08-23 ruling",
    "// (the knot is still named `calendar`; only the choice label changed). A",
    "// bare day-loop walk spends one extra step here per evening, plus one more",
    "// the single time the once-only look-around is available (walk.test.ts).",
    "=== home_hub ===",
    `You're home for the night. #screen:${HOME_SCREEN_ID} #id:SYS-HOME-HUB`,
    "-> hub_night",
    "",
    "= hub_night",
    "* [Look around your home]",
    "    Bank what fits the satchel, and decorate it — placeholder for D6's carry model. #id:SYS-HOME-LOOK",
    "    -> hub_night",
    "+ [Start the Next Day] -> calendar",
    "",
    "// \"When ready to move on, you open the calendar and pick the next day's",
    "// location\" (03-core-loop.md). Sets pickedStartScreen (exact screen, for",
    "// day_start's routing) AND pickedLocation (that screen's region, for the",
    "// resolver's DayInput.picked_location contract — types.ts: \"the location",
    "// the player picked the prior evening\") — see the emitMain doc comment.",
    "=== calendar ===",
    `Pick tomorrow's destination. #screen:${HOME_SCREEN_ID} #id:SYS-CALENDAR`,
  );
  for (const s of starts) {
    out.push(`+ [Go to ${cleanText(s.name)}]`);
    out.push(`    ~ pickedStartScreen = "${s.ink_address}"`);
    out.push(`    ~ pickedLocation = "${s.location}"`);
    out.push("    -> day_start");
  }
  out.push(
    "",
    "// The final sequence (GDD 03-core-loop.md day-5 exception; RULED",
    "// 2026-08-01, RATIFIED as \"final sequence\"): no calendar — there is no",
    "// day 6 to plan. The Festival is the only place left to be, and this knot",
    "// is the ONLY place `night` ever enters the clock (advance_time() below",
    "// still never reaches it). One-way: nothing diverts from here back into",
    "// the ordinary day cycle.",
    "//",
    "// A4 (Roc, 2026-08-30 playtest): day 5's end no longer STOPS here. The",
    "// old hub_final stitch made the player click through a Home Hub screen",
    "// between the last evening and festival night — a detour with no decision",
    "// in it, since the Festival was the only option. It is now a single",
    "// automatic pass-through: the last-night line still prints (it is the beat",
    "// that hands the week over to the festival), but it carries NO #screen tag",
    "// and offers NO choice, so the same continue-run lands the player on the",
    "// Festival Grounds without ever rendering the hub.",
    "=== home_hub_final ===",
    "You're home for the last night. Tomorrow there is no cycle left — only the festival. #id:SYS-HOME-HUB-FINAL",
    "~ TimeOfDay = night",
    `-> ${festivalScreen.ink_address}`,
    "",
    "// The vignette router (RULED by Roc 2026-08-30). The night version is no",
    "// longer one flat placeholder screen (T9): festival_score picks one of",
    "// three narrator TIER scenes — VIGG grand (7–9), VIGW warm (3.5–6.5),",
    "// VIGQ quiet (0–3) — each of which plays its own content and then",
    "// continues into night_screen (emitSoul's vignette branch appends that",
    "// divert). This knot only ROUTES: it prints no prose and carries no",
    "// #screen tag; each VIG scene carries its own #screen:VIGQ|VIGW|VIGG. The",
    "// tier screens are hand-authored/non-generated like T9/TN/FS (graph.ts's",
    "// VIGNETTE_*_SCREEN_ID; excluded from emitScreen's generic loop).",
    "//",
    "// Nested if/else, not a `- cond:` chain: ink's multi-line conditional",
    "// takes one condition plus `- else:` only (see emitMoveTo). Highest",
    "// threshold first, so the first match wins.",
    `=== festival_vignette ===`,
    ...emitVignetteRouter(),
    "",
    "// The night-version screen (GP-51, Roc's playtest note 2026-08-02:",
    '// "needs a Night time screen that shows night version before the Final',
    '// Screen"). Holds the night view of the town between the vignette and',
    "// the results; its single forward choice keeps the play paused here so",
    "// the screen is actually seen, instead of falling straight through.",
    `=== night_screen ===`,
    // TAG-ONLY (S1): this establishing beat swaps the backdrop mid-vignette,
    // during the drain window, so it must NOT print prose into the VN box —
    // emit only its #screen:/#id: tags. Every other placeholder establishing
    // beat keeps its prose and rides #placeholder:1 instead (see emitScreen);
    // this one is the exception because it prints over an already-open box.
    backdropBeat([`#screen:${NIGHT_SCREEN_ID}`, "#id:SYS-NIGHT-SCREEN"]),
    "+ [Go to the results] -> final_screen",
    "",
    "// The results slot stopped being a placeholder on 2026-08-24 (T9, Roc's",
    "// festival-scoring ruling of 2026-08-23). The HOST reads the score and",
    "// draws what the week came to — the tier as the festival's own look, the",
    "// souls who turned out, the town work that got finished. Ink states the",
    "// frame and nothing else, for two reasons: the counters are host-side",
    "// (per-NPC daily talk count; festival goals completed) and ink stores",
    "// none of them, and NEVER A SCORE SHOWN (03-core-loop.md) means there is",
    "// no number for ink to interpolate here even if it had one.",
    `=== final_screen ===`,
    `The lanterns are down, and the square keeps whatever the week made of it. #screen:${FINAL_SCREEN_ID} #id:SYS-FINAL-SUMMARY`,
    "There is still more to find, whenever you're ready to look. #id:SYS-FINAL-RESTART",
    "-> END",
    "",
    "// Year-loop saves (T13, 2026-08-23 ruling): the story resets its own",
    "// clock. HOST-DIVERT-ONLY — nothing above diverts here and no choice",
    "// ever offers it; the host (LanternPlayer.jumpToAddress) is the only way",
    "// in, from final_screen's parked END, once the player picks \"continue\"",
    "// on the rollover screen (Phase 5). That is why walk.ts and the week-walk",
    "// test suite never need to see this knot — it is unreachable by any ink",
    "// choice, on purpose. day_start already resets TimeOfDay and movesLeft",
    "// (see above), so this knot resets only what day_start doesn't.",
    "=== begin_new_year ===",
    "~ year = year + 1",
    "~ day = 1",
    '~ pickedStartScreen = "none"',
    "-> day_start",
    "",
    "// Advances the block, NOT called per move (emitMoveTo only calls this",
    "// once a block's move budget is exhausted) — and (GP-93) called",
    "// unconditionally on returning from every conversation, quiet or not",
    "// (emitConversationReturn). Either caller only ever reaches this from",
    "// morning or afternoon; an exhausted evening/evening-ending-conversation",
    "// diverts straight to day_end instead, so this never needs to produce",
    "// `night`. At night it is a harmless no-op (no `was == night` branch",
    "// below), which is what lets multiple night scenes still play back to",
    "// back — night is festival night, the final sequence (see home_hub_final",
    "// above), not a normal block. A temp holds the block being left, so a",
    "// single call cannot cascade two steps.",
    "=== function advance_time() ===",
    "~ temp was = TimeOfDay",
  );
  // Multi-line conditionals: ink rejects a `~` inside a one-line `{ c: ~ x }`
  // ("tildas are for logic that's on its own line").
  const blocks = ["morning", "afternoon", "evening"];
  for (let i = 0; i < blocks.length - 1; i++) {
    out.push(`{ was == ${blocks[i]}:`, `    ~ TimeOfDay = ${blocks[i + 1]}`, "}");
  }
  // A fresh block starts with a fresh budget — reset here so every caller
  // (screen_hub's start pick included) gets it for free.
  out.push(`~ movesLeft = ${dayLoop.moves_per_day}`, "");
  return out.join("\n") + "\n";
}

// ---------- entry ----------

export function emitInk(graph: Graph): InkFiles {
  const files: InkFiles = new Map();
  files.set("state.ink", emitState(graph));
  files.set("system/externals.ink", emitExternals());

  // Four screens are hand-authored in emitMain, not generated by emitScreen's
  // generic per-screen pipeline: the Home Hub (HOME_SCREEN_ID — home_hub/
  // calendar/home_hub_final) and the final sequence's three screens
  // (VIGNETTE_SCREEN_ID/NIGHT_SCREEN_ID/FINAL_SCREEN_ID —
  // festival_vignette/night_screen/final_screen).
  // Running any of them through emitScreen too would mint a second,
  // unreachable world/*.ink knot that nothing diverts into — dead generated
  // code, not a second real screen.
  // The three VIG tier screens (VIGQ/VIGW/VIGG) join the list: their narrator
  // scenes are played straight through by the tier router and end
  // `-> night_screen`, so they mint no hub — running them through emitScreen
  // would only make dead world/vig*.ink knots nothing diverts into.
  const HAND_AUTHORED_SCREEN_IDS = new Set([
    HOME_SCREEN_ID,
    VIGNETTE_SCREEN_ID,
    NIGHT_SCREEN_ID,
    FINAL_SCREEN_ID,
    VIGNETTE_QUIET_SCREEN_ID,
    VIGNETTE_WARM_SCREEN_ID,
    VIGNETTE_GRAND_SCREEN_ID,
  ]);

  const worldFiles: string[] = [];
  for (const screen of [...graph.screens].sort((a, b) => a.screen_id.localeCompare(b.screen_id))) {
    if (HAND_AUTHORED_SCREEN_IDS.has(screen.screen_id)) continue;
    const rel = `world/${screen.ink_address}.ink`;
    files.set(rel, emitScreen(graph, screen.screen_id));
    worldFiles.push(rel);
  }

  const soulIds = [...new Set(graph.scenes.map((s) => s.soul))].sort();
  const soulFiles: string[] = [];
  for (const soulId of soulIds) {
    const rel = `souls/${inkAddress(soulId)}.ink`;
    files.set(rel, emitSoul(graph, soulId));
    soulFiles.push(rel);
  }

  // The festival-vignette tier router diverts into narrator.vig_* stitches. If
  // the `narrator` soul (which carries the three VIG tier scenes) isn't authored
  // in scene-graph.json yet, emit a temporary stub so those diverts resolve and
  // the build compiles. Skipped the moment a real narrator soul exists.
  if (!soulIds.includes(NARRATOR_SOUL_ID)) {
    const rel = `souls/${inkAddress(NARRATOR_SOUL_ID)}.ink`;
    files.set(rel, emitNarratorVignetteStub());
    soulFiles.push(rel);
  }

  // day_loop rides the graph (stamped from tuning.json by buildGraph), so
  // emitInk keeps its one-argument signature. A graph built before W1c has no
  // block, and the fallback is exactly the values the loop was hard-coded to.
  const dayLoop = graph.day_loop ?? { moves_per_day: 3, days_per_life: 5 };
  files.set("main.ink", emitMain(graph, worldFiles, soulFiles, dayLoop));
  return files;
}

export function writeInk(files: InkFiles, outDir: string): void {
  for (const [rel, content] of files) {
    const abs = join(outDir, ...rel.split("/"));
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content, "utf8");
  }
}
