/**
 * THE INVARIANT REGISTRY — the second and more important of the two churn seams.
 *
 * ---------------------------------------------------------------------------
 * WHY A REGISTRY AND NOT ASSERTIONS INSIDE THE PROBES
 * ---------------------------------------------------------------------------
 *
 * A probe knows how to ATTACK. It should not also own the definition of what
 * "broken" means, for two reasons.
 *
 * First, most invariants are worth checking after EVERY step, whichever probe
 * fired. `movesLeft >= 0` can break from a cast, a move, a pickup or a restore.
 * Six probes each carrying their own copy of that rule is six places to update
 * and five places to forget.
 *
 * Second, and this is the reason Roc asked for: **this package is being rebuilt
 * underneath the tool.** Groups 1-4 of `plans/2026-08-23-roc-notes-triage-plan.md`
 * are in flight right now, plus the forage vocabulary reconcile
 * (`_handoffs/2026-08-23-forage-reconcile-and-spread-handoff.md`) and the T13
 * save-slot reshape (`_handoffs/2026-08-23-group5-rulings-handoff.md`). When a
 * rule changes, THIS is the file to edit. One entry in, one entry out. No probe
 * and no report writer needs to know.
 *
 * ---------------------------------------------------------------------------
 * HOW TO WRITE ONE
 * ---------------------------------------------------------------------------
 *
 *   {
 *     id:       'INV-AREA-SHORT-NAME',   // stable; the report and known-issues.json both key on it
 *     title:    'one line, present tense, states what MUST hold',
 *     system:   'clock' | 'carry' | 'gates' | 'cast' | 'flow' | 'render' | 'save' | 'harness',
 *     severity: 'blocking' | 'material' | 'note',   // GAPS.md's own three bands
 *     errorType: one of ERROR_TYPES below,
 *     appliesTo: (mode) => boolean,       // read the LIVE descriptor, never a hard-coded mode id
 *     check:    (snap, prev, ctx) => null | { summary, location?, context? }
 *   }
 *
 * `check` returns null for "holds". Anything else is a violation. It must be
 * pure and must not throw — a registry entry that throws is itself reported, as
 * INV-ADV-CHECK-THREW, rather than killing the run.
 *
 * `needsResolved` defaults to TRUE and almost never wants changing. An entry is
 * only checked while the play scene is fully constructed, because an unresolved
 * snapshot has no `day`, no `timeBlock` and no `satchel` — and an invariant that
 * reads one of those against `undefined` reports the harness's own blind spot as
 * a game bug. The first 250-step run filed that finding 239 times after a page
 * reload it never recovered from. Only `system: "harness"` entries opt out.
 *
 * ---------------------------------------------------------------------------
 * THE RULE ABOUT IDS
 * ---------------------------------------------------------------------------
 *
 * NEVER hard-code a screen id, item id, spell id, gate id or pool name in this
 * file. Every one of those is being edited this week. Invariants are about
 * RELATIONSHIPS between facts the snapshot already carries — "the compacted
 * satchel matches its slots", "a refused gate is never cleared" — and those
 * survive a rename. `item_berry` replacing `herbs` must change nothing here.
 */

/** The report's `error_type` vocabulary. Closed set, so the CSV is groupable. */
export const ERROR_TYPES = {
  STATE_INVARIANT: "state_invariant_violation",
  DUPLICATION: "resource_duplication",
  GATE_BYPASS: "gate_bypass",
  SOFTLOCK: "softlock",
  RESOURCE_LEAK: "resource_leak",
  UNCAUGHT_EXCEPTION: "uncaught_exception",
  CONSOLE_ERROR: "console_error",
  SAVE_CORRUPTION: "save_corruption",
  CONTRACT_VIOLATION: "contract_violation",
  MODEL_UI_DISAGREEMENT: "model_ui_disagreement",
  HARNESS_DEGRADED: "harness_degraded",
};

const held = (snap) => (Array.isArray(snap.held) ? snap.held : []);
const count = (arr, id) => arr.filter((x) => x === id).length;

/**
 * Invariants checked after EVERY step, whichever probe fired.
 *
 * Probe-specific checks (a save that restores wrong, a gate that a click walked
 * through) live in the probe that sets up the conditions, and reference their id
 * from here so the report keys stay in one vocabulary. Those ids are listed in
 * `PROBE_OWNED_IDS` at the bottom so nothing goes unregistered.
 */
export const INVARIANTS = [
  // ─── clock ───────────────────────────────────────────────────────────────
  // Ink owns `movesLeft`, `TimeOfDay` and `day` (InkBridge's contract 2, and
  // SaveCoordinator's "INK OWNS THE CLOCK" header). The host reads them. These
  // three catch a host that started writing, and ink arithmetic that underflows.
  {
    id: "INV-CLOCK-MOVES-NONNEG",
    title: "the block's move budget never goes negative",
    system: "clock",
    severity: "blocking",
    errorType: ERROR_TYPES.STATE_INVARIANT,
    appliesTo: () => true,
    check: (snap) => {
      if (typeof snap.movesLeft !== "number") return null;
      if (snap.movesLeft >= 0) return null;
      return {
        summary: `movesLeft is ${snap.movesLeft}. The move budget underflowed — ink's \`= hub\` weave decremented past zero.`,
        location: { system: "day-loop", file: "lantern-projects/v01/ink/world/t1.ink" },
      };
    },
  },
  {
    id: "INV-CLOCK-DAY-MONOTONIC",
    title: "the day never runs backwards inside one life",
    system: "clock",
    severity: "blocking",
    errorType: ERROR_TYPES.STATE_INVARIANT,
    appliesTo: () => true,
    check: (snap, prev, ctx) => {
      if (!prev || typeof snap.day !== "number" || typeof prev.day !== "number") return null;
      // A deliberate restore rewinds the clock on purpose. The save probe sets
      // this flag for exactly one step around a load.
      if (ctx.expectRewind) return null;
      if (snap.day >= prev.day) return null;
      return {
        summary: `day went ${prev.day} -> ${snap.day} with no restore in flight.`,
        location: { system: "day-loop" },
      };
    },
  },
  {
    id: "INV-CLOCK-BLOCK-IS-REAL",
    title: "the time block is always a non-empty label ink declared",
    system: "clock",
    severity: "material",
    errorType: ERROR_TYPES.STATE_INVARIANT,
    appliesTo: () => true,
    check: (snap) => {
      if (snap.timeBlock === null) return null; // not resolved; INV-ADV-SURFACE owns that
      if (typeof snap.timeBlock === "string" && snap.timeBlock.trim().length > 0) return null;
      return {
        summary: `timeBlock is ${JSON.stringify(snap.timeBlock)} — the HUD and every time-gated rule read this.`,
        location: { system: "day-loop" },
      };
    },
  },

  // ─── carry ───────────────────────────────────────────────────────────────
  // The satchel became a fixed-length, gap-holding array for the drop/move
  // track (2026-08-22). `satchel` is its compaction. Two representations of one
  // fact is exactly where a duplication bug hides, so measure that they agree.
  {
    id: "INV-CARRY-WITHIN-CAPACITY",
    title: "the satchel never holds more than its capacity",
    system: "carry",
    severity: "blocking",
    errorType: ERROR_TYPES.STATE_INVARIANT,
    appliesTo: () => true,
    check: (snap) => {
      if (!Array.isArray(snap.satchel) || typeof snap.satchelCapacity !== "number") return null;
      if (snap.satchel.length <= snap.satchelCapacity) return null;
      return {
        summary: `satchel holds ${snap.satchel.length} with a capacity of ${snap.satchelCapacity}: ${snap.satchel.join(", ")}`,
        location: { system: "satchel", file: "tools/lantern/src/lib/play.ts" },
      };
    },
  },
  {
    id: "INV-CARRY-ARMS-WITHIN-CAPACITY",
    title: "arms-carry never holds more than its capacity",
    system: "carry",
    severity: "material",
    errorType: ERROR_TYPES.STATE_INVARIANT,
    appliesTo: () => true,
    check: (snap) => {
      if (!Array.isArray(snap.arms) || typeof snap.armsCapacity !== "number") return null;
      if (snap.arms.length <= snap.armsCapacity) return null;
      return {
        summary: `arms hold ${snap.arms.length} with a capacity of ${snap.armsCapacity}.`,
        location: { system: "satchel", file: "tools/lantern/src/lib/play.ts" },
      };
    },
  },
  {
    id: "INV-CARRY-SLOTS-MATCH-COMPACTION",
    title: "the compacted satchel is exactly its non-empty pockets",
    system: "carry",
    severity: "material",
    errorType: ERROR_TYPES.DUPLICATION,
    appliesTo: () => true,
    check: (snap) => {
      if (!Array.isArray(snap.satchel) || !Array.isArray(snap.satchelSlots)) return null;
      const fromSlots = snap.satchelSlots.filter((x) => x !== null && x !== undefined);
      if (fromSlots.length !== snap.satchel.length) {
        return {
          summary:
            `satchel reports ${snap.satchel.length} item(s) but ${fromSlots.length} pocket(s) are full. ` +
            `The two views of one fact disagree, which is how an item gets counted twice.`,
          location: { system: "satchel", file: "tools/lantern/src/lib/play.ts" },
          context: { satchel: snap.satchel, satchelSlots: snap.satchelSlots },
        };
      }
      for (const id of new Set(fromSlots)) {
        if (count(fromSlots, id) !== count(snap.satchel, id)) {
          return {
            summary: `"${id}" appears ${count(fromSlots, id)}x in pockets but ${count(snap.satchel, id)}x in the compacted satchel.`,
            location: { system: "satchel", file: "tools/lantern/src/lib/play.ts" },
            context: { satchel: snap.satchel, satchelSlots: snap.satchelSlots },
          };
        }
      }
      return null;
    },
  },
  {
    id: "INV-CARRY-PICKED-SLOT-NOT-REOFFERED",
    title: "a forage slot already emptied today is not offered again",
    system: "carry",
    severity: "material",
    errorType: ERROR_TYPES.DUPLICATION,
    appliesTo: () => true,
    check: (snap, prev, ctx) => {
      // PAIRED CAPTURE, not "the offered set from before against the snapshot
      // from now". `pickedSlots` resets at every day start, so comparing an
      // offered set to a `pickedSlots` read one step later reports a phantom
      // every time a day rolls over between the two. `ctx.lastForage` carries
      // both halves, read in the same instant.
      const cap = ctx.lastForage;
      if (!cap || !Array.isArray(cap.offered) || !Array.isArray(cap.pickedSlots)) return null;
      const reoffered = cap.offered
        .map((s) => (typeof s === "string" ? s : s && (s.slot_id ?? s.slotId ?? s.id)))
        .filter((id) => id && cap.pickedSlots.includes(id));
      if (reoffered.length === 0) return null;
      return {
        summary:
          `on ${cap.screen} (day ${cap.day}, ${cap.timeBlock}) forage offered slot(s) already emptied today: ` +
          `${reoffered.join(", ")}. Re-picking one mints a second copy of the same material.`,
        location: { screen: cap.screen, system: "forage", file: "phaser/src/render/HotspotSystem.ts" },
        context: { pickedSlots: cap.pickedSlots, offered: cap.offered, day: cap.day, timeBlock: cap.timeBlock },
      };
    },
  },

  // ─── gates ───────────────────────────────────────────────────────────────
  // Mode 5 declares `gates: { source: "authored", enforce: true }`. These
  // measure whether that claim survives contact.
  {
    id: "INV-GATE-REFUSED-NEVER-CLEARS",
    title: "a gate the engine refused at load never enters the cleared set",
    system: "gates",
    severity: "blocking",
    errorType: ERROR_TYPES.GATE_BYPASS,
    appliesTo: (mode) => !!mode && mode.gates.source === "authored",
    check: (snap) => {
      const g = snap.gates;
      if (!g) return null;
      const leaked = g.cleared.filter((id) => g.refused.includes(id));
      if (leaked.length === 0) return null;
      return {
        summary:
          `refused gate(s) ${leaked.join(", ")} are marked cleared. GateEngine refuses a rule it cannot ` +
          `validate; a refused gate has no rule, so nothing should ever be able to satisfy it.`,
        location: { system: "gates", file: "phaser/src/world/gates/GateEngine.ts" },
        context: { refused: g.refused, cleared: g.cleared },
      };
    },
  },
  {
    id: "INV-GATE-NO-PHANTOM-CLEAR",
    title: "every cleared gate is one the engine actually loaded",
    system: "gates",
    severity: "material",
    errorType: ERROR_TYPES.GATE_BYPASS,
    appliesTo: (mode) => !!mode && mode.gates.source === "authored",
    check: (snap) => {
      const g = snap.gates;
      if (!g) return null;
      const phantom = g.cleared.filter((id) => !g.loaded.includes(id));
      if (phantom.length === 0) return null;
      return {
        summary: `cleared gate(s) ${phantom.join(", ")} are not in the engine's loaded rule table.`,
        location: { system: "gates", file: "phaser/src/world/gates/GateEngine.ts" },
        context: { loaded: g.loaded, cleared: g.cleared },
      };
    },
  },
  {
    id: "INV-GATE-TWO-CLEARED-SETS-AGREE",
    title: "the graph's cleared set and the engine's cleared set hold the same fact",
    system: "gates",
    severity: "material",
    errorType: ERROR_TYPES.MODEL_UI_DISAGREEMENT,
    appliesTo: (mode) => !!mode && mode.gates.source === "authored",
    check: (snap) => {
      // TWO WRITERS, ONE FACT. `Gates` (the graph parse) keeps its own cleared
      // set, written by `CastPipeline` and `GatesSlice`. `GateEngine` keeps a
      // second one. `Gates.blockingForMoveText` reads the first;
      // `TraversalRow.blockingGatesFor` reads the second. If they drift, the
      // hover text and the click veto disagree about the same door.
      const g = snap.gates;
      const gg = snap.graphGates;
      if (!g || !gg) return null;
      const engine = new Set(g.cleared);
      const graph = new Set(gg.cleared);
      const onlyEngine = [...engine].filter((x) => !graph.has(x));
      const onlyGraph = [...graph].filter((x) => !engine.has(x));
      if (onlyEngine.length === 0 && onlyGraph.length === 0) return null;
      return {
        summary:
          `cleared-gate sets disagree — engine only: [${onlyEngine.join(", ")}], graph only: [${onlyGraph.join(", ")}]. ` +
          `Two writers hold one fact, so which door is open depends on who you ask.`,
        // `screen: null` ON PURPOSE. The disagreement is global state, not a
        // property of wherever the player happens to be standing when it is
        // noticed — leaving the screen in the location key filed the same one
        // defect ten times, once per room walked through.
        location: { screen: null, system: "gates", file: "phaser/src/world/Gates.ts" },
        context: { engineCleared: g.cleared, graphCleared: gg.cleared },
      };
    },
  },
  {
    id: "INV-GATE-STANDING-SOMEWHERE-LOCKED",
    title: "the player never stands on a screen whose gates are still blocking",
    system: "gates",
    severity: "blocking",
    errorType: ERROR_TYPES.GATE_BYPASS,
    appliesTo: (mode) => !!mode && mode.gates.source === "authored" && mode.gates.enforce,
    check: (snap, prev, ctx) => {
      const gg = snap.graphGates;
      const g = snap.gates;
      if (!gg || !g || !snap.screen) return null;
      const req = gg.requirements.find((r) => r.screenId === snap.screen);
      if (!req) return null;
      const cleared = new Set([...g.cleared, ...gg.cleared]);
      let standing = req.gateIds.filter((id) => !cleared.has(id));
      if (standing.length === 0) return null;

      // DO NOT REPORT THE AGENT'S OWN DOING. The gates probe's model-veto attack
      // deliberately walks the player past a gate, and every step after that is
      // taken from a world no real session could reach. Re-reporting it here as
      // an independent bug is how an adversarial tester fools itself and pads a
      // report — the bypass is ONE finding, INV-GATE-MODEL-VETO, already filed.
      standing = standing.filter((id) => !ctx.selfBypassed.has(id));
      if (standing.length === 0) return null;

      // A TIME GATE THAT SHUT BEHIND THE PLAYER IS NOT A BYPASS. `GateRefresh`
      // reports `closed` as well as `cleared` on purpose — an evening gate opens
      // at dusk and shuts at dawn with the player still inside. That is the
      // engine working. It is reported separately, as a design question, at
      // note severity.
      standing = standing.filter((id) => !ctx.everCleared.has(id));
      if (standing.length === 0) return null;

      return {
        summary:
          `standing on ${snap.screen} with gate(s) ${standing.join(", ")} still blocking it, and none of them ` +
          `was ever cleared this session or bypassed by this agent. The mode declares gates enforced; ` +
          `something let the player through.`,
        location: { screen: snap.screen, system: "traversal", file: "phaser/src/render/TraversalRow.ts" },
        context: { required: req.gateIds, cleared: [...cleared], everCleared: [...ctx.everCleared] },
      };
    },
  },

  {
    id: "INV-GATE-RECLOSED-BEHIND-PLAYER",
    title: "a gate that shuts while the player is past it leaves them somewhere they could not now enter",
    system: "gates",
    severity: "note",
    errorType: ERROR_TYPES.STATE_INVARIANT,
    appliesTo: (mode) => !!mode && mode.gates.source === "authored" && mode.gates.enforce,
    check: (snap, prev, ctx) => {
      // Split out of INV-GATE-STANDING-SOMEWHERE-LOCKED so the two do not share
      // a severity. This one is the engine working as designed — `GateRefresh`
      // reports `closed` as deliberately as `cleared`. It is filed as a NOTE
      // because it is a design question nobody has ruled on: is the player meant
      // to be shut in, walked out, or warned?
      const gg = snap.graphGates;
      const g = snap.gates;
      if (!gg || !g || !snap.screen) return null;
      const req = gg.requirements.find((r) => r.screenId === snap.screen);
      if (!req) return null;
      const cleared = new Set([...g.cleared, ...gg.cleared]);
      const shut = req.gateIds.filter(
        (id) => !cleared.has(id) && ctx.everCleared.has(id) && !ctx.selfBypassed.has(id),
      );
      if (shut.length === 0) return null;
      return {
        summary:
          `${snap.screen} is gated by ${shut.join(", ")}, which opened earlier this session and has since shut ` +
          `with the player still on the screen (day ${snap.day}, ${snap.timeBlock}). Nothing walks them out or ` +
          `warns them, and the way back in is now closed.`,
        location: { screen: snap.screen, system: "gates", file: "phaser/src/world/gates/GateEngine.ts" },
        context: { gates: shut, day: snap.day, timeBlock: snap.timeBlock },
      };
    },
  },

  // ─── flow ────────────────────────────────────────────────────────────────
  {
    id: "INV-FLOW-NOT-SOFTLOCKED",
    title: "the story always offers a way forward until it ends",
    system: "flow",
    severity: "blocking",
    errorType: ERROR_TYPES.SOFTLOCK,
    appliesTo: () => true,
    check: (snap, prev, ctx) => {
      if (snap.ended) return null;
      if (!Array.isArray(snap.choices)) return null;
      const stuck = snap.choices.length === 0 && snap.canContinue === false;
      if (!stuck) return null;
      // One frame with nothing on offer is a transition. Three consecutive is a
      // dead end — the loop keeps the counter, this only reads it.
      if ((ctx.stuckStreak ?? 0) < 3) return null;
      return {
        summary:
          `no choices, cannot continue, story not ended — held for ${ctx.stuckStreak} consecutive steps on ${snap.screen}.`,
        location: { screen: snap.screen, system: "day-loop" },
        context: { day: snap.day, timeBlock: snap.timeBlock, movesLeft: snap.movesLeft },
      };
    },
  },
  {
    id: "INV-FLOW-INK-REPORTS-NO-ERRORS",
    title: "ink surfaces no story errors during play",
    system: "flow",
    severity: "blocking",
    errorType: ERROR_TYPES.CONTRACT_VIOLATION,
    appliesTo: () => true,
    check: (snap, prev) => {
      if (!Array.isArray(snap.inkErrors) || snap.inkErrors.length === 0) return null;
      const before = prev && Array.isArray(prev.inkErrors) ? prev.inkErrors.length : 0;
      if (snap.inkErrors.length <= before) return null; // already reported
      const fresh = snap.inkErrors.slice(before);
      return {
        summary: `ink reported: ${fresh.join(" | ")}`,
        location: { screen: snap.screen, system: "ink" },
        context: { errors: fresh },
      };
    },
  },

  // ─── render ──────────────────────────────────────────────────────────────
  {
    id: "INV-RENDER-DISPLAY-LIST-BOUNDED",
    title: "revisiting a screen does not grow its display list without bound",
    system: "render",
    severity: "material",
    errorType: ERROR_TYPES.RESOURCE_LEAK,
    appliesTo: () => true,
    check: (snap, prev, ctx) => {
      // The scrim-alpha leak (README's "The walker" section) shipped because it
      // only existed on the rendered canvas across a long session. This is the
      // cheap always-on version of that watch: per screen, first sample vs
      // latest, with a wide margin so an honest redraw does not trip it.
      const hist = ctx.displayHistory?.[snap.screen];
      if (!hist || hist.length < 3) return null;
      const first = hist[0];
      const last = hist[hist.length - 1];
      if (last - first <= 80) return null;
      return {
        summary:
          `${snap.screen}'s display list grew ${first} -> ${last} across ${hist.length} visits without being torn down.`,
        location: { screen: snap.screen, system: "render", file: "phaser/src/scenes/CollectScene.ts" },
        context: { samples: hist },
      };
    },
  },
  {
    id: "INV-RENDER-TWEENS-BOUNDED",
    title: "active tweens do not accumulate across a session",
    system: "render",
    severity: "note",
    errorType: ERROR_TYPES.RESOURCE_LEAK,
    appliesTo: () => true,
    check: (snap, prev, ctx) => {
      const total = (snap.scenes ?? []).reduce((s, x) => s + (x.tweens ?? 0), 0);
      if (total <= 120) return null;
      if ((ctx.tweenHighWater ?? 0) >= total) return null;
      return {
        summary: `${total} tweens active at once across ${(snap.scenes ?? []).length} live scene(s).`,
        location: { system: "render" },
        context: { scenes: snap.scenes },
      };
    },
  },

  // ─── harness ─────────────────────────────────────────────────────────────
  {
    id: "INV-ADV-SURFACE",
    title: "the adapter can still see every part of the game it claims to check",
    system: "harness",
    severity: "note",
    errorType: ERROR_TYPES.HARNESS_DEGRADED,
    // The one entry that runs while the play scene is gone — reporting that it
    // is gone is its whole job.
    needsResolved: false,
    appliesTo: () => true,
    check: (snap, prev, ctx) => {
      const probs = snap.problems ?? [];
      if (probs.length === 0) return null;
      // Report each distinct problem once per run, not once per step.
      const fresh = probs.filter((p) => !ctx.seenProblems.has(p));
      if (fresh.length === 0) return null;
      for (const p of fresh) ctx.seenProblems.add(p);
      return {
        summary:
          `the page adapter could not resolve: ${fresh.join(" | ")}. ` +
          `Invariants depending on those fields did NOT run — treat this run's coverage as partial.`,
        location: { system: "harness", file: "phaser/tools/adversary/lib/agentApi.mjs" },
        context: { problems: fresh },
      };
    },
  },
];

/**
 * Ids raised by a probe rather than by the always-on registry, listed here so
 * `known-issues.json` and the report share one vocabulary and nothing can name
 * an id that does not exist. `run.mjs` asserts every recorded finding's
 * invariant id appears either here or in INVARIANTS.
 */
export const PROBE_OWNED_IDS = {
  "INV-CLOCK-CHOICE-INDEX-SAFE": {
    title: "an out-of-range or stale choice index is refused, not obeyed",
    system: "clock", severity: "material", errorType: ERROR_TYPES.CONTRACT_VIOLATION,
  },
  "INV-CLOCK-NO-DOUBLE-SPEND": {
    title: "one move costs one move, however fast the input arrives",
    system: "clock", severity: "blocking", errorType: ERROR_TYPES.STATE_INVARIANT,
  },
  "INV-SAVE-DEFECT-NOT-COERCED": {
    title: "a save that will not parse is reported as a defect, never half-restored",
    system: "save", severity: "blocking", errorType: ERROR_TYPES.SAVE_CORRUPTION,
  },
  "INV-SAVE-VERSION-REFUSED": {
    title: "a save from another schema version is refused, not read anyway",
    system: "save", severity: "blocking", errorType: ERROR_TYPES.SAVE_CORRUPTION,
  },
  "INV-SAVE-UNKNOWN-IDS-REJECTED": {
    title: "a save naming items, gates or spells the build does not have is rejected",
    system: "save", severity: "material", errorType: ERROR_TYPES.SAVE_CORRUPTION,
  },
  "INV-SAVE-ROUNDTRIP-STABLE": {
    title: "save then load returns the same world, not a nearby one",
    system: "save", severity: "blocking", errorType: ERROR_TYPES.STATE_INVARIANT,
  },
  "INV-GATE-MODEL-VETO": {
    title: "the gate is enforced by the model, not only by the button",
    system: "gates", severity: "material", errorType: ERROR_TYPES.GATE_BYPASS,
  },
  "INV-GATE-LOCKED-PILL-INERT": {
    title: "clicking a locked traversal pill does not move the player",
    system: "gates", severity: "blocking", errorType: ERROR_TYPES.GATE_BYPASS,
  },
  "INV-INV-NO-PICKUP-DUPLICATION": {
    title: "picking the same slot twice yields one item, not two",
    system: "carry", severity: "blocking", errorType: ERROR_TYPES.DUPLICATION,
  },
  "INV-INV-UNOFFERED-PICKUP-REFUSED": {
    title: "an item the screen never offered cannot be picked up",
    system: "carry", severity: "material", errorType: ERROR_TYPES.CONTRACT_VIOLATION,
  },
  "INV-INV-DROP-REMOVES": {
    title: "a dropped item leaves the satchel and lands in the world exactly once",
    system: "carry", severity: "blocking", errorType: ERROR_TYPES.DUPLICATION,
  },
  "INV-CAST-REQUIRES-KNOWN-SPELL": {
    title: "a spell not in the spellbook cannot be cast",
    system: "cast", severity: "material", errorType: ERROR_TYPES.CONTRACT_VIOLATION,
  },
  "INV-CAST-REQUIRES-COMPONENTS": {
    title: "a cast without its components does not land",
    system: "cast", severity: "material", errorType: ERROR_TYPES.CONTRACT_VIOLATION,
  },
  "INV-CAST-RECEIVER-MUST-BE-PRESENT": {
    title: "a receiver absent from this screen cannot be cast on",
    system: "cast", severity: "material", errorType: ERROR_TYPES.CONTRACT_VIOLATION,
  },
  "INV-CAST-CONSUMED-ONCE": {
    title: "a component consumed by a cast cannot be spent a second time",
    system: "cast", severity: "blocking", errorType: ERROR_TYPES.DUPLICATION,
  },
  "INV-SOAK-MODAL-CYCLE-CLEAN": {
    title: "opening and closing a panel N times leaves the display list where it started",
    system: "render", severity: "material", errorType: ERROR_TYPES.RESOURCE_LEAK,
  },
  "INV-SOAK-NO-UNCAUGHT": {
    title: "no input sequence produces an uncaught exception",
    system: "flow", severity: "blocking", errorType: ERROR_TYPES.UNCAUGHT_EXCEPTION,
  },
  "INV-ADV-LOST-PLAY-SCENE": {
    title: "the run keeps hold of the play scene, or stops and says it did not",
    system: "harness", severity: "note", errorType: ERROR_TYPES.HARNESS_DEGRADED,
  },
  "INV-ADV-CHECK-THREW": {
    title: "an invariant check must not throw",
    system: "harness", severity: "note", errorType: ERROR_TYPES.HARNESS_DEGRADED,
  },
  "INV-PAGE-UNCAUGHT-EXCEPTION": {
    title: "the page raises no uncaught exception during the run",
    system: "flow", severity: "blocking", errorType: ERROR_TYPES.UNCAUGHT_EXCEPTION,
  },
  "INV-PAGE-CONSOLE-ERROR": {
    title: "the page logs no console error during the run",
    system: "flow", severity: "material", errorType: ERROR_TYPES.CONSOLE_ERROR,
  },
};

/** Metadata for any id, from either source. Used by the finding builder. */
export function invariantMeta(id) {
  const reg = INVARIANTS.find((i) => i.id === id);
  if (reg) return { id, title: reg.title, system: reg.system, severity: reg.severity, errorType: reg.errorType };
  const probe = PROBE_OWNED_IDS[id];
  if (probe) return { id, ...probe };
  return null;
}

/** Every id this build knows about — the report's own spell-check. */
export function allInvariantIds() {
  return [...INVARIANTS.map((i) => i.id), ...Object.keys(PROBE_OWNED_IDS)].sort();
}
