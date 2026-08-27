/**
 * PROBE 6 — soak: panel thrash and input mashing.
 *
 * This one exists because of a bug this project already paid for. From the
 * README: the scrim was re-added on every screen change and never destroyed, so
 * alphas compounded (`0.55^10` is about 0.002) and the backdrops faded to black
 * after roughly ten moves. No unit test could see it. It only existed on the
 * rendered canvas, across a long session.
 *
 * That is the shape of every leak in a Phaser scene: correct on frame one,
 * wrong on frame four hundred. So this probe does the thing a bored player does
 * and a scripted test never does — opens and closes the same panel twenty times
 * and counts what is left behind.
 *
 * Two attacks:
 *
 *   modal-cycle   open and close one panel N times via its REAL keyboard
 *                 shortcut, and compare the play scene's display list before
 *                 and after. A clean open/close leaves it where it started.
 *
 *   key-mash      fire a random burst of the scene's real keys, including
 *                 combinations the UI never intends — open the satchel while
 *                 the notebook is open, Escape with nothing to escape. The
 *                 harness's own uncaught-exception watch is the assertion.
 *
 * Both are `reachability: "player"`. Every key used here is one `CollectScene`
 * or a sub-scene binds itself.
 */

/**
 * Panels reached by a single key, and what it takes to close them again.
 *
 * `closePresses` is not padding. `HubScene`'s Esc is a nested back-out chain —
 * cancel an armed click-hold, then reset the zoom, then close — so one press
 * leaves the Hub open. Cycling it 20 times with one press each left twenty Hubs
 * stacked and the run lost the play scene entirely (first 250-step run, step 85).
 * Getting this wrong turns a leak probe into a harness failure.
 */
const PANELS = [
  { name: "satchel", open: "s", close: "Escape", closePresses: 1 },
  { name: "notebook", open: "n", close: "Escape", closePresses: 1 },
  { name: "calendar", open: "l", close: "Escape", closePresses: 1 },
  { name: "options", open: "o", close: "Escape", closePresses: 1 },
  { name: "hub", open: "h", close: "Escape", closePresses: 3 },
];

const MASH_KEYS = ["s", "n", "l", "o", "h", "e", "Escape", "Delete", "f", "m", "d", "c"];

export default {
  id: "soak",
  title: "panel thrash and input mashing",
  weight: 3,

  canFire: (snap) => snap.resolved && !snap.modalOpen,

  async fire(ctx) {
    const variant = ctx.rng.chance(0.6) ? "modal-cycle" : "key-mash";

    if (variant === "modal-cycle") {
      const panel = ctx.rng.pick(PANELS);
      const cycles = 20;

      const before = await ctx.snapshot();
      const baseline = (before.scenes ?? []).find((s) => s.key === before.sceneKey)?.displayList ?? null;
      if (baseline === null) return;

      ctx.note(`open/close "${panel.name}" x${cycles} via ${panel.open.toUpperCase()}`);
      for (let i = 0; i < cycles; i++) {
        await ctx.press(panel.open);
        await ctx.page.waitForTimeout(60);
        for (let p = 0; p < (panel.closePresses ?? 1); p++) {
          await ctx.press(panel.close);
          await ctx.page.waitForTimeout(60);
        }
        // If the panel did not close, stop rather than stack another one. A
        // panel that will not close is its own finding — not a licence to open
        // nineteen more and lose the play scene.
        if (i % 5 === 4 && !(await ctx.snapshot()).resolved) {
          ctx.note(`"${panel.name}" would not close after ${i + 1} cycles — stopping the soak`);
          break;
        }
      }
      // Let any teardown tween finish before counting.
      await ctx.page.waitForTimeout(400);

      const after = await ctx.snapshot();
      // If a panel got stuck open, close it before judging — a live sub-scene is
      // a different finding, and it is the one below.
      if (after.sceneKey !== before.sceneKey || after.modalOpen) {
        await ctx.press("Escape");
        await ctx.page.waitForTimeout(200);
      }
      const settled = await ctx.snapshot();
      const now = (settled.scenes ?? []).find((s) => s.key === before.sceneKey)?.displayList ?? null;
      if (now === null) return;

      // 20 cycles leaving 2 objects behind is 40 by cycle 400. The margin is
      // deliberately small — this is the check the scrim leak would have failed.
      const leaked = now - baseline;
      if (leaked > 10) {
        ctx.record(
          "INV-SOAK-MODAL-CYCLE-CLEAN",
          {
            summary:
              `opening and closing "${panel.name}" ${cycles} times left ${leaked} extra display object(s) on ` +
              `${before.sceneKey} (${baseline} -> ${now}). That is ~${(leaked / cycles).toFixed(1)} per cycle, ` +
              `so a long session compounds it.`,
            reachability: "player",
            location: { screen: before.screen, system: "render", file: "phaser/src/scenes/CollectScene.ts" },
            context: { panel: panel.name, cycles, baseline, after: now, perCycle: leaked / cycles },
          },
          settled,
        );
      }
      return;
    }

    // key-mash
    const burst = 14;
    const keys = [];
    for (let i = 0; i < burst; i++) keys.push(ctx.rng.pick(MASH_KEYS));
    ctx.note(`key mash: ${keys.join(" ")}`);
    for (const k of keys) {
      await ctx.press(k);
      await ctx.page.waitForTimeout(30);
    }
    // Unwind whatever is open so the next probe starts from the play scene.
    for (let i = 0; i < 4; i++) {
      await ctx.press("Escape");
      await ctx.page.waitForTimeout(60);
    }
    await ctx.page.waitForTimeout(200);

    const after = await ctx.snapshot();
    if (!after.resolved) {
      ctx.record(
        "INV-SOAK-NO-UNCAUGHT",
        {
          summary:
            `after mashing [${keys.join(" ")}] the play scene is no longer running — live scenes are ` +
            `[${(after.scenes ?? []).map((s) => s.key).join(", ")}]. Four Escapes did not get back.`,
          reachability: "player",
          location: { system: "flow", file: "phaser/src/scenes/CollectScene.ts" },
          context: { keys, liveScenes: (after.scenes ?? []).map((s) => s.key) },
        },
        after,
      );
    }
  },
};
