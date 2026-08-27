#!/usr/bin/env node
/**
 * ADVERSARIAL QA AGENT — the deterministic half.
 *
 * Runs the game for N steps in a real headless Chromium, and spends most of
 * those steps trying to break it. Writes `findings.json` and `findings.csv`.
 *
 *     npm run adversary
 *     npm run adversary -- --steps 400 --seed 20260824
 *     npm run adversary -- --url http://localhost:5188 --headed
 *
 * ---------------------------------------------------------------------------
 * WHAT MAKES THIS AN ADVERSARY AND NOT A WALKER
 * ---------------------------------------------------------------------------
 *
 * `tools/walk.mjs` already plays the game correctly, end to end, and asserts on
 * live state. It is a good coverage walker and this does not replace it. The
 * difference is the strategy:
 *
 *   the walker  takes valid actions and checks the game kept working
 *   this        takes INVALID actions on purpose, and checks the game refused
 *
 * "Broken" is defined in exactly one place — `lib/invariants.mjs` — as a set of
 * relationships that must hold no matter what just happened. The loop checks
 * every one of them after every step, whichever probe fired. A probe's job is
 * only to create a state worth checking.
 *
 * ---------------------------------------------------------------------------
 * THE LOOP
 * ---------------------------------------------------------------------------
 *
 *   1. snapshot the world
 *   2. run every applicable invariant against it            <- the judging
 *   3. drain page errors and console errors into findings
 *   4. pick an action: usually a probe, sometimes honest play
 *   5. repeat
 *
 * Honest play is in the mix on purpose. An adversary that only ever sends bad
 * input never leaves the first screen, and a bug on day 4 is a bug it cannot
 * reach. So `explore` walks the week with a coverage bias — preferring screens
 * it has not seen, and refusing to sit on sticky examinables, which is the trap
 * `tools/walk.mjs` documents.
 *
 * Exit code: 0 when nothing NEW was found, 1 when something new was, 2 for a
 * harness failure. Known issues never fail the run — that is what they are for.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { boot } from "./lib/harness.mjs";
import { AGENT_API_SOURCE } from "./lib/agentApi.mjs";
import { makeRng } from "./lib/rng.mjs";
import { INVARIANTS, allInvariantIds } from "./lib/invariants.mjs";
import { FindingLog } from "./lib/findings.mjs";
import { loadKnownIssues, classify } from "./lib/knownIssues.mjs";
import { writeReport, printSummary } from "./lib/report.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.resolve(HERE, "..", "..");

const PROBE_FILES = ["clock.mjs", "gates.mjs", "inventory.mjs", "cast.mjs", "save.mjs", "soak.mjs"];

// ── CLI ──────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const o = {
    steps: 250,
    seed: null,
    mode: "mode5",
    url: null,
    out: null,
    viewport: "1920x1080",
    settle: 8000,
    timeout: 90000,
    headed: false,
    json: false,
    playRatio: 0.45,
  };
  const num = new Set(["steps", "seed", "settle", "timeout", "playRatio"]);
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--headed") o.headed = true;
    else if (a === "--json") o.json = true;
    else if (a === "--help" || a === "-h") {
      console.log(HELP);
      process.exit(0);
    } else if (a.startsWith("--")) {
      const k = a.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      if (!(k in o)) throw new Error(`Unknown option: ${a}`);
      o[k] = num.has(k) ? Number(argv[++i]) : argv[++i];
    } else throw new Error(`Unexpected argument: ${a}`);
  }
  // A seed is REQUIRED for a finding to be reproducible, so one is always
  // chosen and always printed — never left implicit.
  if (o.seed === null || Number.isNaN(o.seed)) o.seed = Math.floor(Math.random() * 1e9);
  o.out = o.out ? path.resolve(o.out) : path.join(PROJECT, ".adversary", `run-${o.seed}`);
  return o;
}

const HELP = `adversary — adversarial QA agent for the Phaser build

  --steps N        how many actions to take (default 250)
  --seed N         PRNG seed; the same seed replays the same run (default: random, printed)
  --mode ID        which ModeDescriptor to attack (default mode5)
  --url URL        attack an already-running dev server instead of starting one
  --out DIR        report directory (default .adversary/run-<seed>)
  --play-ratio F   fraction of steps spent playing honestly (default 0.45)
  --viewport WxH   default 1920x1080
  --settle MS      wait after page load before the first probe (default 8000)
  --headed         watch it run
  --json           print only the JSON report path`;

// ── page-side helpers ────────────────────────────────────────────────────────

const C = { dim: "\x1b[2m", cyan: "\x1b[0;36m", off: "\x1b[0m" };

async function main() {
  const opts = parseArgs(process.argv);
  const quiet = opts.json;
  const say = (m = "") => {
    if (!quiet) console.log(m);
  };

  const probes = [];
  for (const f of PROBE_FILES) {
    const mod = await import(pathToFileURL(path.join(HERE, "probes", f)).href);
    probes.push(mod.default);
  }

  const today = new Date().toISOString().slice(0, 10);
  const known = loadKnownIssues(path.join(HERE, "known-issues.json"), today);

  say(`\n${C.cyan}=== adversarial QA ===${C.off}`);
  say(`mode ${opts.mode} · seed ${opts.seed} · ${opts.steps} steps`);
  if (known.lapsed.length) {
    say(`${C.dim}${known.lapsed.length} known-issue entry(ies) have lapsed and will report as new${C.off}`);
  }
  say("");

  const session = await boot({
    projectDir: PROJECT,
    url: opts.url,
    mode: opts.mode,
    viewport: opts.viewport,
    headed: opts.headed,
    settle: opts.settle,
    timeout: opts.timeout,
  });

  const startedAt = Date.now();
  const rng = makeRng(opts.seed);
  const findings = new FindingLog({ seed: opts.seed, mode: opts.mode, steps: opts.steps });

  // Loop-owned state the invariants read but never write.
  const state = {
    step: 0,
    probe: null,
    stuckStreak: 0,
    displayHistory: {},
    tweenHighWater: 0,
    seenProblems: new Set(),
    lastForage: null,
    expectRewind: false,
    /**
     * Gate ids THIS AGENT walked the player past on purpose. An adversary that
     * counts the downstream consequences of its own cheat as fresh findings is
     * padding its own report — the bypass is one finding, and everything after
     * it happened in a world no real session reaches.
     */
    selfBypassed: new Set(),
    /**
     * Every gate id the engine has EVER reported cleared this run. Lets the
     * registry tell "the player was let through a gate that never opened" apart
     * from "a time gate opened and shut again behind them" — two different
     * findings that look identical in a single snapshot.
     */
    everCleared: new Set(),
  };
  const actionLog = [];
  const onceKeys = new Set();
  const screensVisited = new Set();
  const probesFired = Object.fromEntries(probes.map((p) => [p.id, 0]));
  probesFired.explore = 0;
  const invariantsChecked = new Set();

  // ── the context every probe receives ──────────────────────────────────────
  /**
   * Install (or reinstall) the page adapter, retrying until the game is booted.
   *
   * A reload puts the page back through `PreloadScene`, which loads every
   * backdrop before any scene with an ink handle exists. An install landing in
   * that window finds no game — so retry rather than declaring the surface
   * broken, and only report a real failure after the budget runs out.
   */
  const installApi = async (budgetMs = 30000) => {
    const deadline = Date.now() + budgetMs;
    let res = null;
    do {
      // "Execution context was destroyed" is the expected failure here, not an
      // exceptional one: the save probe reloads the page, and an evaluate racing
      // the navigation gets exactly that. Catching and retrying is the fix; the
      // budget is what turns a genuinely dead page into an honest report.
      res = await session.page.evaluate(AGENT_API_SOURCE).catch(() => null);
      if (res?.ok) return res;
      await session.page.waitForTimeout(500);
    } while (Date.now() < deadline);
    return res ?? { ok: false, problems: ["adapter never installed within budget"] };
  };

  const adv = (expr) => session.page.evaluate(expr);
  const raw = (body) => session.page.evaluate((b) => window.__adv.raw(b), body);
  // The fallback carries `scenes: []` and `choices: []` on purpose. A probe that
  // reads `snap.scenes.find(...)` must not crash just because the adapter was
  // wiped by a navigation — that is a harness failure wearing a game-bug costume.
  const DEAD_SNAP = { resolved: false, scenes: [], choices: [], problems: ["page has no adapter"] };
  // Never throws. A snapshot is taken on every step and inside every probe; one
  // that rejects mid-navigation would end the run over a condition the loop
  // already knows how to recover from.
  const snapshot = () =>
    session.page
      .evaluate(
        `window.__adv ? window.__adv.snapshot() : { resolved: false, scenes: [], choices: [], problems: ['__adv missing'] }`,
      )
      .catch(() => DEAD_SNAP);
  const interactives = (sceneKey) =>
    session.page
      .evaluate((k) => (window.__adv ? window.__adv.interactives(k) : []), sceneKey ?? null)
      .catch(() => []);

  /** Game coordinates -> CSS pixels on the canvas. Scale.FIT, fixed 1920x1080. */
  const click = async (gx, gy) => {
    // Re-query the canvas each time: a reload replaces the element, so the
    // handle captured at boot goes stale and every later click misses.
    const el = (await session.page.$("canvas")) ?? session.canvas;
    const box = await el.boundingBox().catch(() => null);
    if (!box) return;
    const x = box.x + (gx / 1920) * box.width;
    const y = box.y + (gy / 1080) * box.height;
    await session.page.mouse.click(x, y);
  };
  const press = (key) => session.page.keyboard.press(key.length === 1 ? key.toUpperCase() : key);

  /**
   * From wherever we are, get into the play scene. Used at start and after a
   * reload.
   *
   * Polls rather than sleeping a fixed time, because THREE different waits are
   * in play and only one of them is predictable: `PreloadScene` loads every
   * backdrop up front (`plans/2026-08-23-roc-notes-triage-plan.md` Group 6 flags
   * this as a first-load cost worth profiling), the entry scene fades, and the
   * play scene's `create()` runs after that. A fixed settle that is long enough
   * on a warm dev server is too short on a cold one, and a stray click landing
   * mid-fade goes to whatever is underneath.
   *
   * `snapshot().resolved` is the only signal trusted here: it is true once the
   * play scene carries its whole surface, not merely once something with an ink
   * handle exists. LocationSelectScene has an ink handle too.
   */
  // Set once the cold-boot name-entry fallback below actually names a life.
  // `enterPlay` is reused to recover from every later reload (the save probe's
  // round trip included, `probes/save.mjs`'s `roundTrip`), where a filled,
  // Resume-able column already exists. Retyping a name there wouldn't recover
  // the session under test — it would silently start an UNRELATED second life,
  // and a round-trip comparison against that life reports real drift for a
  // reason that has nothing to do with save/load. So the fallback is offered
  // at most once per run, on the assumption that only true cold boot presents
  // an all-empty board (every column's only affordance is "Begin a new life
  // here", so ANY random click there opens naming).
  let namedOnce = false;

  const enterPlay = async (budgetMs = 45000) => {
    const deadline = Date.now() + budgetMs;
    while (Date.now() < deadline) {
      if ((await snapshot()).resolved) return true;

      // FIRST, TRY BACKING OUT. The play scene is often not gone, only covered —
      // a sub-scene (Hub, Satchel, Notebook, Options) is running on top of it and
      // `getScenes(true)` no longer reports it. Clicking a random interactive in
      // that state presses buttons inside the Hub. Esc-ing out is the correct
      // move, and `HubScene`'s own Esc is a three-deep chain, so press generously.
      for (let i = 0; i < 5; i++) {
        await press("Escape");
        await session.page.waitForTimeout(150);
        if ((await snapshot()).resolved) return true;
      }

      // The entry scene's start thumbnails are `setInteractive()` rectangles.
      // Taking a random one and then checking whether play actually started is
      // more honest than matching on a label or a coordinate, and it survives
      // the relayout the HUD ruling (T14) is about to land.
      const targets = await interactives(null).catch(() => []);
      const pick = rng.pick(targets);
      if (!pick) {
        await session.page.waitForTimeout(500);
        continue;
      }
      await click(pick.x, pick.y);
      for (let waited = 0; waited < 5000 && Date.now() < deadline; waited += 250) {
        await session.page.waitForTimeout(250);
        if ((await snapshot()).resolved) return true;
      }

      // The board is the boot gate (T13 Phase 4): clicking an empty column
      // opens SaveLoadScene's own keydown-driven name field instead of
      // starting play directly. Nothing above ever types, so left alone this
      // is a dead end on cold boot — the very next loop iteration's Escape
      // sweep cancels naming straight back to the board, and a random
      // re-click can land on the same empty column forever. Detected on the
      // scene's own private `naming` field (a compile-time fiction, same
      // rationale as this file's header) rather than a new probe surface for
      // one boot-time step. See `namedOnce` above for why this is one-shot.
      if (!namedOnce) {
        const naming = await raw(
          `return game.scene.getScene("SaveLoadScene")?.naming ?? null;`,
        ).catch(() => null);
        if (naming) {
          for (const ch of "QA") await press(ch);
          await press("Enter");
          for (let waited = 0; waited < 5000 && Date.now() < deadline; waited += 250) {
            await session.page.waitForTimeout(250);
            if ((await snapshot()).resolved) {
              namedOnce = true;
              return true;
            }
          }
          namedOnce = true;
        }
      }
    }
    return false;
  };

  const ctx = {
    page: session.page,
    canvas: session.canvas,
    rng,
    adv,
    raw,
    snapshot,
    interactives,
    click,
    press,
    installApi,
    enterPlay,
    flags: state,
    note: (m) => {
      actionLog.push({ step: state.step, probe: state.probe, action: m });
      if (!quiet) console.log(`${C.dim}  ${String(state.step).padStart(4)}  ${state.probe ?? "-"}  ${m}${C.off}`);
    },
    once: (key) => {
      if (onceKeys.has(key)) return false;
      onceKeys.add(key);
      return true;
    },
    /**
     * Store the offered set TOGETHER with the `pickedSlots` it was drawn
     * against. Reading `pickedSlots` off a later snapshot compares across a
     * possible day rollover, which resets it — and reports a phantom.
     */
    setLastForage: async (offered) => {
      const s = await snapshot();
      state.lastForage = {
        offered: offered ?? [],
        pickedSlots: s.pickedSlots ?? [],
        screen: s.screen,
        day: s.day,
        timeBlock: s.timeBlock,
      };
    },
    /** The gates probe calls this when its bypass actually worked. */
    markBypassed: (gateIds) => {
      for (const g of gateIds ?? []) state.selfBypassed.add(g);
    },
    record: (invariantId, violation, snap) =>
      findings.record(invariantId, violation, snap, {
        step: state.step,
        probe: state.probe,
        actionLog,
      }),
  };

  // ── honest play, with a coverage bias ─────────────────────────────────────
  //
  // Examinables are sticky (`+` in ink), so the first choice is offered forever
  // and a naive driver loops on it. `tools/walk.mjs` hit exactly this. So: prefer
  // a move toward a screen never visited, then any move, then an unseen
  // non-move, and only then repeat something.
  const seenChoices = new Set();
  const explore = async () => {
    const snap = await snapshot();
    if (snap.ended) {
      ctx.note("story ended — clearing the finished life and starting a fresh one");
      // A fresh game starts back at day 1. Without this the very next snapshot
      // reads as day going N -> 1 "with no restore in flight" — the loop's OWN
      // restart looking like a clock bug. First run filed exactly this
      // (INV-CLOCK-DAY-MONOTONIC, step 120): a false positive from the harness,
      // not the game.
      state.expectRewind = true;
      // A finished week leaves a resumable save on the board, and enterPlay's
      // naming one-shot (`namedOnce`) is already spent from cold boot. Left as-is,
      // the loop just re-resumes an ENDED life every time and gives up after ~13
      // tries (INV-ADV-LOST-PLAY-SCENE, seed 20260826 step 106). A finished week
      // is a life boundary, so drop its save (SAVE_KEY_PREFIX in
      // src/world/save/SaveStore.ts) to bring the board up cold, and re-arm the
      // one-shot so enterPlay can name the next life. This is the story-end path
      // ONLY — the save probe's own reloads must never start a second life.
      await session.page.evaluate(`
        for (const k of Object.keys(localStorage)) {
          if (k.startsWith("phaser-probe/save/v1/")) localStorage.removeItem(k);
        }
      `);
      namedOnce = false;
      await session.page.reload({ waitUntil: "load" });
      await session.page.waitForTimeout(opts.settle);
      await installApi();
      await enterPlay();
      return;
    }
    if (snap.canContinue && rng.chance(0.7)) {
      await adv(`window.__adv.advance()`);
      ctx.note("advance");
      return;
    }
    const choices = snap.choices ?? [];
    if (choices.length === 0) return;

    const key = (c) => `${snap.screen}::${c.display}`;
    const moves = choices.filter((c) => c.kind === "move");
    const freshMoves = moves.filter((c) => {
      const m = /(?:Go to|Begin at)\s+(.+?)\]?$/.exec(c.display.replace(/^\[|\]$/g, ""));
      return m && !screensVisited.has(m[1].trim());
    });
    const freshOther = choices.filter((c) => c.kind !== "move" && !seenChoices.has(key(c)));

    const pick =
      rng.pick(freshMoves) ?? rng.pick(freshOther) ?? rng.pick(moves) ?? rng.pick(choices);
    if (!pick) return;
    seenChoices.add(key(pick));
    await adv(`window.__adv.choose(${pick.index})`);
    ctx.note(`choose(${pick.index}) "${pick.display}"`);

    // Foraging is most of what there is to do on a screen, and the inventory
    // probe needs a real offered set to attack.
    if (rng.chance(0.5)) {
      const offered = await adv(`window.__adv.forage()`);
      await ctx.setLastForage(offered);
      const slot = rng.pick(offered ?? []);
      if (slot) {
        const slotId = typeof slot === "string" ? slot : (slot.slot_id ?? slot.slotId ?? slot.id);
        const item =
          typeof slot === "string" ? null : (slot.item ?? slot.item_id ?? slot.itemId ?? slot.pool);
        if (slotId && item) {
          await adv(`window.__adv.pickup(${JSON.stringify(slotId)}, ${JSON.stringify(item)})`);
          ctx.note(`pickup("${slotId}", "${item}")`);
        }
      }
    }
  };

  // ── go ────────────────────────────────────────────────────────────────────
  let harnessError = null;
  try {
    const install = await installApi();
    if (!install?.ok) {
      throw new Error(`could not install the page adapter: ${(install?.problems ?? []).join(", ")}`);
    }
    if (!(await enterPlay())) {
      throw new Error("could not reach the play scene from the entry screen");
    }

    const mode = await adv(`window.__adv.mode()`);
    say(`${C.dim}mode descriptor: gates=${mode?.gates.source}/${mode?.gates.enforce ? "enforced" : "advisory"} · save=${mode?.save?.slot ?? "none"} · systems=${mode?.systems.length}${C.off}\n`);

    let prev = null;
    let errCursor = 0;
    let consoleCursor = 0;
    let unresolvedStreak = 0;

    for (state.step = 1; state.step <= opts.steps; state.step++) {
      const snap = await snapshot();

      // ── 1. judge ──────────────────────────────────────────────────────────
      if (snap.screen) {
        screensVisited.add(snap.screen);
        const scene = snap.scenes?.find((s) => s.key === snap.sceneKey);
        if (scene) {
          (state.displayHistory[snap.screen] ??= []).push(scene.displayList);
        }
      }
      state.stuckStreak =
        !snap.ended && (snap.choices ?? []).length === 0 && snap.canContinue === false
          ? state.stuckStreak + 1
          : 0;
      // Accumulated BEFORE the checks run, so an invariant asking "was this gate
      // ever open?" sees this step's answer and not last step's.
      for (const g of snap.gates?.cleared ?? []) state.everCleared.add(g);
      for (const g of snap.graphGates?.cleared ?? []) state.everCleared.add(g);

      for (const inv of INVARIANTS) {
        let applies = false;
        try {
          applies = inv.appliesTo(mode);
        } catch {
          applies = false;
        }
        if (!applies) continue;
        // An unresolved snapshot carries no day, no timeBlock, no satchel. An
        // invariant reading one of those against `undefined` reports the
        // harness's own blind spot as a game bug — 239 times, in the first run.
        if (inv.needsResolved !== false && !snap.resolved) continue;
        invariantsChecked.add(inv.id);
        try {
          const violation = inv.check(snap, prev, state);
          if (violation) ctx.record(inv.id, violation, snap);
        } catch (e) {
          ctx.record(
            "INV-ADV-CHECK-THREW",
            {
              summary: `invariant ${inv.id} threw while checking: ${e.message}`,
              reachability: "environment",
              location: { system: "harness", file: "phaser/tools/adversary/lib/invariants.mjs" },
            },
            snap,
          );
        }
      }
      state.expectRewind = false;
      state.lastForage = null;

      // ── 2. drain what the browser saw ────────────────────────────────────
      for (; errCursor < session.pageErrors.length; errCursor++) {
        const e = session.pageErrors[errCursor];
        ctx.record(
          "INV-PAGE-UNCAUGHT-EXCEPTION",
          {
            summary: `uncaught exception: ${e.message}`,
            reachability: "player",
            location: { screen: snap.screen, system: "flow" },
            context: { stack: e.stack, lastActions: actionLog.slice(-6) },
          },
          snap,
        );
      }
      for (; consoleCursor < session.consoleErrors.length; consoleCursor++) {
        const e = session.consoleErrors[consoleCursor];
        ctx.record(
          "INV-PAGE-CONSOLE-ERROR",
          {
            summary: `console error: ${e.text}`,
            reachability: "player",
            location: { screen: snap.screen, system: "flow", file: e.location?.url ?? null, line: e.location?.lineNumber ?? null },
            context: { lastActions: actionLog.slice(-6) },
          },
          snap,
        );
      }

      // ── 3. act ────────────────────────────────────────────────────────────
      const eligible = probes.filter((p) => {
        try {
          return p.canFire(snap, mode);
        } catch {
          return false;
        }
      });
      const playing = eligible.length === 0 || rng.chance(opts.playRatio);

      try {
        if (playing) {
          state.probe = "explore";
          probesFired.explore += 1;
          await explore();
        } else {
          const chosen = rng.weighted(eligible);
          state.probe = chosen.id;
          probesFired[chosen.id] += 1;
          await chosen.fire(ctx);
        }
      } catch (e) {
        // A probe that throws is a harness bug, not a game bug. Say so plainly
        // and keep going — losing 250 steps to one bad probe helps nobody.
        ctx.record(
          "INV-ADV-CHECK-THREW",
          {
            summary: `probe "${state.probe}" threw: ${e.message}`,
            reachability: "environment",
            location: { system: "harness", file: `phaser/tools/adversary/probes/${state.probe}.mjs` },
            context: { stack: String(e.stack ?? "").split("\n").slice(0, 5) },
          },
          snap,
        );
      }

      // ── 4. keep hold of the play scene, or stop ──────────────────────────
      //
      // The save probe reloads the page on purpose, and a reload can land badly.
      // A run that quietly measures nothing for the remaining 240 steps is worse
      // than one that stops: it reports "few findings" from a loop that never
      // played. So recover twice, then abort and SAY the run is short.
      const alive = await session.page.evaluate(`typeof window.__adv !== 'undefined'`).catch(() => false);
      if (!alive) await installApi();

      if (!(await snapshot()).resolved) {
        unresolvedStreak += 1;
        if (unresolvedStreak === 3 || unresolvedStreak === 8) {
          await installApi();
          await enterPlay();
        }
        if (unresolvedStreak > 12) {
          ctx.record(
            "INV-ADV-LOST-PLAY-SCENE",
            {
              summary:
                `the run lost the play scene at step ${state.step - unresolvedStreak} and could not get back ` +
                `after ${unresolvedStreak} attempts. Stopping here rather than spending the remaining ` +
                `${opts.steps - state.step} steps measuring nothing.`,
              reachability: "environment",
              location: { system: "harness", file: "phaser/tools/adversary/run.mjs" },
              context: { lastActions: actionLog.slice(-8) },
            },
            snap,
          );
          break;
        }
      } else {
        unresolvedStreak = 0;
      }

      prev = snap;
      state.tweenHighWater = Math.max(
        state.tweenHighWater,
        (snap.scenes ?? []).reduce((s, x) => s + (x.tweens ?? 0), 0),
      );
    }
  } catch (e) {
    harnessError = e;
  } finally {
    await session.close();
  }

  // ── report ────────────────────────────────────────────────────────────────
  const classified = findings.all().map((f) => classify(f, known));

  const notReached = [
    ...probes.filter((p) => probesFired[p.id] === 0).map((p) => `probe:${p.id}`),
    ...allInvariantIds()
      .filter((id) => !invariantsChecked.has(id) && !classified.some((f) => f.invariant === id))
      .map((id) => `invariant:${id}`),
  ];

  const report = {
    run: {
      tool: "phaser/tools/adversary",
      mode: opts.mode,
      seed: opts.seed,
      steps: state.step - 1,
      requestedSteps: opts.steps,
      startedAt: new Date(startedAt).toISOString(),
      durationMs: Date.now() - startedAt,
      url: session.url,
      playRatio: opts.playRatio,
      harnessError: harnessError ? String(harnessError.message ?? harnessError) : null,
    },
    summary: {
      new: classified.filter((f) => f.status === "new").length,
      known: classified.filter((f) => f.status === "known").length,
      blocking: classified.filter((f) => f.status === "new" && f.severity === "blocking").length,
      material: classified.filter((f) => f.status === "new" && f.severity === "material").length,
      note: classified.filter((f) => f.status === "new" && f.severity === "note").length,
      playerReachable: classified.filter((f) => f.status === "new" && f.reachability === "player").length,
    },
    coverage: {
      screensVisited: [...screensVisited].sort(),
      probesFired,
      invariantsChecked: [...invariantsChecked].sort(),
      // Stated as plainly as what WAS reached. A report with no findings and no
      // coverage block cannot be told apart from a report that never ran.
      notReached,
      knownIssueEntries: known.entries.length,
      lapsedKnownIssueEntries: known.lapsed.map((e) => ({ invariant: e.invariant, expired: e.expires, ref: e.ref })),
    },
    findings: classified,
  };

  const { jsonPath, csvPath } = writeReport(opts.out, report);
  if (quiet) {
    console.log(jsonPath);
  } else {
    printSummary(report, say);
    say(`\n${path.relative(process.cwd(), jsonPath)}`);
    say(`${path.relative(process.cwd(), csvPath)}`);
  }

  if (harnessError) {
    console.error(`\nharness error: ${harnessError.message}`);
    process.exit(2);
  }
  process.exit(report.summary.new > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e?.stack ?? String(e));
  process.exit(2);
});
