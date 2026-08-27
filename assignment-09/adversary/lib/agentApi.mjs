/**
 * THE PAGE-SIDE ADAPTER — and the first of this tool's two churn seams.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS FILE EXISTS AT ALL
 * ---------------------------------------------------------------------------
 *
 * `window.__collect` (`src/render/WalkerProbe.ts`) is the sanctioned headless
 * handle, and it is the FIRST thing this adapter tries. But it publishes what a
 * coverage walker needs, not what an adversary needs: no satchel capacity, no
 * arms, no banked, no gate table, no receiver states, no display-object counts.
 * Half the invariants in `invariants.mjs` cannot be checked from it.
 *
 * So this adapter reaches past it, into the live scene's own fields. TypeScript
 * `private` is a compile-time fiction — `scene.ink`, `scene.gateEngine`,
 * `scene.inventory` are ordinary runtime properties. Reaching for them is
 * exactly the sort of thing an adversarial tester should do, and it buys the
 * one property that matters right now: **the game source needs no edit.** Three
 * build sessions are live in this package this week (Groups 1-4 of
 * `plans/2026-08-23-roc-notes-triage-plan.md`). A QA tool that required a
 * source change to install would collide with all three.
 *
 * ---------------------------------------------------------------------------
 * THE COST, STATED HONESTLY
 * ---------------------------------------------------------------------------
 *
 * Reaching into private fields is fragile by construction. A rename in
 * `CollectScene` breaks this file. That is accepted, and contained three ways:
 *
 *   1. **Every resolution is optional.** A field that will not resolve pushes a
 *      line onto `problems[]` and leaves its slice of the snapshot `null`. The
 *      adapter never throws.
 *   2. **`problems[]` is a FINDING, not a crash.** `INV-ADV-SURFACE` reports it
 *      as `error_type: "harness_degraded"`. A run that can no longer see the
 *      gate table says so in the report instead of silently passing.
 *   3. **It is ONE file.** When the build moves, this is the file to fix. No
 *      probe and no invariant names a scene field directly.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT MAY NOT DO
 * ---------------------------------------------------------------------------
 *
 * Read-only, with two deliberate exceptions the probes need and nothing else:
 * `choose`/`advance`/`pickup` (real player actions, routed through the real
 * bridge) and `raw()` (an escape hatch a probe supplies its own expression to).
 * It never writes ink vars — `setVar` appears nowhere here, and must not. Ink
 * owns the clock (`SaveCoordinator`'s header), so a tool that wrote `movesLeft`
 * would be manufacturing the very defect INV-CLOCK-* exists to catch.
 */

/**
 * Installed into the page as `window.__adv`. Evaluated as a string because the
 * game boots long after `addInitScript` would have run.
 *
 * Returns `{ ok, problems }` so the caller can record a degraded surface at
 * install time, before the first step.
 */
export const AGENT_API_SOURCE = `(() => {
  const problems = [];
  const soft = (label, fn, fallback = null) => {
    try {
      const v = fn();
      return v === undefined ? fallback : v;
    } catch (e) {
      problems.push(label + ': ' + (e && e.message ? e.message : String(e)));
      return fallback;
    }
  };

  const findGame = () => {
    const looks = (o) => !!o && typeof o === 'object'
      && o.scene && o.loop && o.renderer && o.config && typeof o.isBooted === 'boolean';
    for (const k of ['__PHASER_GAME__', 'game', 'phaserGame', '__game']) {
      try { if (looks(window[k])) return window[k]; } catch {}
    }
    for (const k of Object.getOwnPropertyNames(window)) {
      let v; try { v = window[k]; } catch { continue; }
      if (looks(v)) return v;
    }
    return null;
  };

  const game = findGame();
  if (!game) {
    // STUBS, not a bare flag. A page reload puts the game back through
    // PreloadScene (it loads every backdrop up front), so an install landing in
    // that window finds nothing. The caller retries — but any probe that calls
    // \`snapshot()\` before the retry lands must get an answer, not a
    // TypeError on an object that exists and has no methods.
    const dead = { resolved: false, sceneKey: null, scenes: [], choices: [], problems: ['no Phaser.Game instance on window yet'] };
    window.__adv = {
      ok: false,
      problems: dead.problems,
      snapshot: () => dead,
      interactives: () => [],
      scene: () => null,
      ready: () => false,
      raw: () => null,
      mode: () => null,
      saveInfo: () => null,
      forage: () => [],
      castTargets: () => [],
      gateVerdictFor: () => null,
      choose: () => ({ ok: false, why: 'game not booted' }),
      advance: () => ({ ok: false, why: 'game not booted' }),
      pickup: () => ({ ok: false, why: 'game not booted' }),
    };
    return { ok: false, problems: dead.problems };
  }

  /**
   * The play scene, whatever it is called.
   *
   * SCORED, not first-match. LocationSelectScene also owns an \`ink\` — it takes
   * the day's opening choice itself — so "the scene with an InkBridge" picked it
   * during the transition and every inventory/knowledge/cast read came back
   * undefined for the whole run. Matching on the key 'CollectScene' instead
   * would work today and break the moment the mode5 plan renames it, which it
   * contemplates. So: score every live scene by how much of the play surface it
   * actually carries, and take the richest.
   */
  const PLAY_FIELDS = ['inventory', 'knowledge', 'cast', 'pipeline', 'gates', 'hotspotSys'];
  const playScene = () => {
    const live = game.scene.getScenes(true).filter((s) => s && s.ink && typeof s.ink.view === 'function');
    if (live.length === 0) return null;
    let best = null, bestScore = -1;
    for (const s of live) {
      let score = 0;
      for (const f of PLAY_FIELDS) { try { if (s[f]) score++; } catch {} }
      if (score > bestScore) { best = s; bestScore = score; }
    }
    return best;
  };

  /** True once the scene carries the whole play surface, not just an ink handle. */
  const playReady = () => {
    const s = playScene();
    if (!s) return false;
    return PLAY_FIELDS.filter((f) => { try { return !!s[f]; } catch { return false; } }).length >= 4;
  };

  const sceneStack = () => game.scene.getScenes(true).map((s) => ({
    key: s.scene.key,
    displayList: s.children ? s.children.length : 0,
    tweens: (() => { try { return s.tweens.getTweens().length; } catch { return 0; } })(),
    timers: (() => { try { return s.time.getOverallProgress !== undefined ? (s.time._active ?? 0) : 0; } catch { return 0; } })(),
  }));

  window.__adv = {
    version: 1,
    ok: true,
    problems,

    /** The live play scene, or null. Probes use this only through helpers. */
    scene: playScene,

    /** Whether the play scene is fully constructed, not mid-transition. */
    ready: playReady,

    /** Escape hatch: a probe supplies its own page expression. */
    raw: (fnBody) => {
      // eslint-disable-next-line no-new-func
      return new Function('game', 'scene', 'adv', fnBody)(game, playScene(), window.__adv);
    },

    /**
     * THE snapshot. Every slice is independently optional — a null slice means
     * "this adapter could not see it", never "the game has none".
     */
    snapshot: () => {
      const s = playReady() ? playScene() : null;
      const walker = window.__collect ?? null;
      const probeSnap = walker ? soft('walker.snapshot', () => walker.snapshot()) : null;
      if (!s) {
        return {
          resolved: false,
          sceneKey: game.scene.getScenes(true).map((x) => x.scene.key).join('+') || null,
          scenes: sceneStack(),
          walker: probeSnap,
          problems: problems.slice(),
        };
      }

      const view = soft('ink.view', () => s.ink.view());
      const gates = soft('gates', () => {
        const g = s.gateEngine;
        if (!g) return null;
        return {
          loaded: g.loadedGateIds(),
          refused: g.refusedGateIds(),
          cleared: g.clearedGates(),
          defects: (g.defects ?? []).map((d) => ({ kind: d.kind, gateId: d.gateId, why: d.why ?? d.reason ?? null })),
        };
      });
      const graphGates = soft('graphGates', () => {
        const gg = s.gates;
        if (!gg) return null;
        const reqs = [];
        for (const [screenId, req] of gg.requirements) {
          reqs.push({ screenId, gateIds: [...(req.gateIds ?? [])] });
        }
        return { requirements: reqs, cleared: gg.clearedGates() };
      });

      return {
        resolved: true,
        sceneKey: s.scene.key,
        scenes: sceneStack(),

        // --- clock (ink owns it; we only ever read) -------------------------
        day: view ? view.day : null,
        timeBlock: view ? view.timeBlock : null,
        movesLeft: view ? view.movesLeft : null,

        // --- position ------------------------------------------------------
        screen: view ? view.pos.currentScreen : null,
        drawnScreen: soft('drawnScreen', () => s.currentScreen ?? null),

        // --- story ---------------------------------------------------------
        choices: view
          ? view.choices.map((c) => ({ index: c.index, kind: c.kind, display: c.display, lock: c.lock ?? null }))
          : [],
        canContinue: view ? view.canContinue : null,
        ended: view ? view.ended : null,
        inkErrors: view ? view.errors.slice() : [],

        // --- carry ---------------------------------------------------------
        satchel: view ? view.satchel.slice() : null,
        satchelCapacity: view ? view.satchelCapacity : null,
        satchelSlots: view && view.satchelSlots ? [...view.satchelSlots] : null,
        arms: view && view.arms ? view.arms.slice() : null,
        armsCapacity: view ? (view.armsCapacity ?? null) : null,
        banked: view && view.banked ? view.banked.slice() : null,
        pickedSlots: view ? view.pickedSlots.slice() : null,

        // --- host-side inventory (the OTHER vocabulary) ---------------------
        held: soft('inventory.availableOn', () => s.inventory.availableOn(null)),
        discovered: soft('inventory.discoveredIds', () => s.inventory.discoveredIds()),
        droppedHere: soft('inventory.droppedOn', () => {
          const sc = s.ink.view().pos.currentScreen;
          return sc ? [...s.inventory.droppedOn(sc)] : [];
        }, []),

        // --- knowledge -----------------------------------------------------
        spellbook: soft('knowledge.spellbook', () => s.knowledge.spellbook()),
        clues: soft('knowledge.clues', () => s.knowledge.clues()),

        // --- gates ---------------------------------------------------------
        gates,
        graphGates,

        // --- receiver state ------------------------------------------------
        receiverStates: soft('receiverStates.snapshot', () => {
          const rs = s.receiverStates;
          return rs ? rs.snapshot() : null;
        }),

        // --- UI ------------------------------------------------------------
        modalOpen: soft('modalSys.isOpen', () => !!(s.modalSys && s.modalSys.isOpen), false),

        problems: problems.slice(),
      };
    },

    // --- actions: real ones, through the real bridge ----------------------

    /** Select an option and run its body — \`InkBridge.choose\`'s own contract. */
    choose: (i) => {
      const s = playScene();
      if (!s) return { ok: false, why: 'no play scene' };
      try {
        s.ink.choose(i);
        s.ink.runToChoice();
        return { ok: true };
      } catch (e) {
        return { ok: false, why: e && e.message ? e.message : String(e), threw: true };
      }
    },

    advance: () => {
      const s = playScene();
      if (!s) return { ok: false, why: 'no play scene' };
      try { s.ink.advance(); return { ok: true }; }
      catch (e) { return { ok: false, why: e && e.message ? e.message : String(e), threw: true }; }
    },

    /** Forage slots offered on the current screen right now. */
    forage: () => {
      const s = playScene();
      if (!s) return [];
      try {
        const v = s.ink.view();
        const sc = v.pos.currentScreen;
        if (!sc) return [];
        return s.hotspotSys.offeredSlots(sc, v.day, v.timeBlock, v.pickedSlots);
      } catch { return []; }
    },

    pickup: (slotId, item) => {
      const s = playScene();
      if (!s) return { ok: false, why: 'no play scene' };
      try {
        const ok = s.ink.player.pickup(slotId, item);
        s.ink.refresh();
        return { ok: true, accepted: !!ok };
      } catch (e) {
        return { ok: false, why: e && e.message ? e.message : String(e), threw: true };
      }
    },

    /** Receivers the cast system believes are present here. */
    castTargets: () => {
      const s = playScene();
      if (!s) return [];
      try {
        const v = s.ink.view();
        const sc = v.pos.currentScreen;
        if (!sc) return [];
        return s.cast.presentOn(sc, s.ink.player.peekVars(s.cast.souls.map((x) => 'present_' + x)));
      } catch { return []; }
    },

    /**
     * Ask the model — not the pill — whether a destination is gated.
     *
     * This is the question INV-GATE-MODEL-VETO exists to ask. \`TraversalRow\`
     * computes the same thing to decide pill interactivity; if the two ever
     * disagree, the UI is the only thing holding the gate.
     */
    gateVerdictFor: (moveDisplay) => {
      const s = playScene();
      if (!s || !s.gates) return null;
      try {
        const hit = s.gates.blockingForMoveText(moveDisplay);
        if (!hit) return { screenId: null, graphGates: [], engineBlocking: [] };
        const engine = s.gateEngine;
        return {
          screenId: hit.screenId,
          graphGates: hit.gates,
          engineBlocking: engine ? engine.blocking(hit.gates) : null,
        };
      } catch (e) {
        return { error: e && e.message ? e.message : String(e) };
      }
    },

    /** Save-layer handles, for the save probe. Null when the mode has no save. */
    saveInfo: () => {
      const s = playScene();
      if (!s) return null;
      return {
        hasCoordinator: !!s.saveCoordinator,
        // THE LIVE SLOT, not the descriptor's list. Since T13 Phase 3
        // (2026-08-24) a mode declares a SET of slots and the scene owns
        // exactly one of them, so \`mode.save\` can no longer answer "which file
        // is this session writing" — \`CollectScene.saveSlot\` is the resolved
        // answer. The \`slots[0]\` fallback matches the scene's own Phase-3 stub.
        slot: soft('saveSlot', () =>
          s.saveSlot ?? (s.mode && s.mode.save ? s.mode.save.slots[0] : null),
        ),
        autosaveOn: soft('mode.save.autosaveOn', () => (s.mode && s.mode.save ? [...s.mode.save.autosaveOn] : null)),
      };
    },

    /**
     * Every input-enabled object on a live scene, with its GAME-space centre.
     *
     * This is what lets a probe fire a REAL mouse click instead of calling a
     * handler. The distinction decides a finding's severity: a bypass reachable
     * by clicking is player-reachable, a bypass reachable only through
     * \`__collect\` is a debug surface. Reporting those two at the same severity
     * would be dishonest.
     *
     * \`label\` is best-effort — the object's own text, or the first text child
     * of a container. It is for matching a pill, never for asserting on copy.
     */
    interactives: (sceneKey) => {
      const scenes = game.scene.getScenes(true).filter((s) => !sceneKey || s.scene.key === sceneKey);
      const out = [];
      for (const s of scenes) {
        const walk = (obj, depth) => {
          if (!obj || depth > 4) return;
          if (obj.input && obj.input.enabled !== false && obj.visible !== false) {
            let label = null;
            try {
              if (typeof obj.text === 'string') label = obj.text;
              else if (obj.list) {
                const t = obj.list.find((c) => typeof c.text === 'string' && c.text.trim());
                label = t ? t.text : null;
              }
            } catch {}
            let x = obj.x, y = obj.y;
            try {
              const m = obj.getWorldTransformMatrix ? obj.getWorldTransformMatrix() : null;
              if (m) { x = m.tx; y = m.ty; }
            } catch {}
            out.push({
              scene: s.scene.key,
              type: obj.type ?? null,
              label: label ? String(label).slice(0, 80) : null,
              x, y,
              depth: obj.depth ?? 0,
            });
          }
          if (obj.list) for (const c of obj.list) walk(c, depth + 1);
        };
        for (const child of s.children.list) walk(child, 0);
      }
      return out;
    },

    /** Descriptor, read live — the probes gate themselves on this, not on a flag. */
    mode: () => {
      const s = playScene();
      if (!s || !s.mode) return null;
      const m = s.mode;
      return {
        id: m.id,
        systems: [...m.systems],
        gates: { source: m.gates.source, enforce: m.gates.enforce },
        receiverStates: m.receiverStates,
        dialogue: m.dialogue,
        // \`slots\`, plural, since T13 Phase 3 (2026-08-24) — the descriptor
        // lists every slot the mode offers. Which one is LIVE is \`saveInfo()\`.
        save: m.save ? { slots: [...m.save.slots], autosaveOn: [...m.save.autosaveOn] } : null,
      };
    },
  };

  return { ok: true, problems: problems.slice() };
})()`;
