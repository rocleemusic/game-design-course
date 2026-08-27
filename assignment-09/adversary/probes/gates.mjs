/**
 * PROBE 2 — gated traversal.
 *
 * Mode 5 declares `gates: { source: "authored", enforce: true }`. This probe
 * asks whether that word "enforce" is true of the MODEL or only of the BUTTON.
 *
 * Two attacks, and the difference between them is the whole finding:
 *
 *   locked-pill    Find a move the engine says is blocked, locate its real pill,
 *                  and CLICK IT. If the player moves, the gate is not enforced at
 *                  all. `reachability: "player"`, blocking.
 *
 *   model-veto     Take the same blocked move through the story layer instead of
 *                  the pill. If that works, enforcement lives entirely in
 *                  `TraversalRow`'s decision about pill interactivity, and the
 *                  model has no veto. `reachability: "model-only"`, material —
 *                  no player can do it today, but every future input path
 *                  (keyboard traversal, a controller map, a restore landing
 *                  mid-choice) inherits the hole.
 *
 * Fires the model-veto attack AT MOST ONCE per run. It succeeds by moving the
 * player somewhere they should not be, and every step after that is taken from a
 * world state no real session could reach. Once is a finding; forty times is a
 * run that measured nothing else.
 */

export default {
  id: "gates",
  title: "gated traversal bypass",
  weight: 3,

  canFire: (snap, mode) =>
    snap.resolved &&
    !!mode &&
    mode.gates.source === "authored" &&
    (snap.choices ?? []).some((c) => c.kind === "move"),

  async fire(ctx) {
    const snap = await ctx.snapshot();
    const moves = (snap.choices ?? []).filter((c) => c.kind === "move");

    // Ask the MODEL which of these are blocked — never the pill's own label.
    const blocked = [];
    for (const m of moves) {
      const verdict = await ctx.adv(`window.__adv.gateVerdictFor(${JSON.stringify(m.display)})`);
      if (verdict && verdict.screenId && (verdict.engineBlocking ?? verdict.graphGates ?? []).length > 0) {
        blocked.push({ choice: m, verdict });
      }
    }
    if (blocked.length === 0) return;

    const pickTarget = ctx.rng.pick(blocked);
    const label = pickTarget.choice.display.replace(/^\[|\]$/g, "");
    const gateIds = pickTarget.verdict.engineBlocking ?? pickTarget.verdict.graphGates;

    // ── attack A: click the real pill ─────────────────────────────────────
    const pills = await ctx.interactives(snap.sceneKey);
    const targetName = /(?:Go to|Begin at)\s+(.+)$/.exec(label)?.[1]?.trim() ?? label;
    const pill = pills.find((p) => p.label && p.label.includes(targetName.slice(0, 14)));
    if (pill) {
      ctx.note(`click LOCKED pill "${targetName}" (blocked by ${gateIds.join(", ")})`);
      await ctx.click(pill.x, pill.y);
      await ctx.page.waitForTimeout(250);
      const after = await ctx.snapshot();
      if (after.screen === pickTarget.verdict.screenId) {
        ctx.markBypassed(gateIds);
        ctx.record(
          "INV-GATE-LOCKED-PILL-INERT",
          {
            summary:
              `clicking the locked pill for "${targetName}" moved the player onto ${after.screen}, ` +
              `which gate(s) ${gateIds.join(", ")} still block.`,
            reachability: "player",
            location: { screen: snap.screen, system: "traversal", file: "phaser/src/render/TraversalRow.ts" },
            context: { target: after.screen, blockingGates: gateIds },
          },
          after,
        );
        return; // already through; the model-veto attack would prove nothing more
      }
      // A blocked click should open the "something blocks the way" prompt. Close it.
      if (after.modalOpen) await ctx.press("Escape");
    }

    // ── attack B: the same move, through the story layer ──────────────────
    if (!ctx.once("gates:model-veto")) return;

    ctx.note(`model-veto: choose(${pickTarget.choice.index}) past ${gateIds.join(", ")}`);
    const res = await ctx.adv(`window.__adv.choose(${pickTarget.choice.index})`);
    await ctx.page.waitForTimeout(200);
    const after = await ctx.snapshot();

    if (after.screen === pickTarget.verdict.screenId) {
      // Tell the loop this is OUR doing, so the always-on standing-somewhere-
      // locked check does not re-file the consequence as a second bug.
      ctx.markBypassed(gateIds);
      ctx.record(
        "INV-GATE-MODEL-VETO",
        {
          summary:
            `the move onto ${after.screen} is blocked by gate(s) ${gateIds.join(", ")}, and going through the ` +
            `story layer instead of the pill walked straight past it. Enforcement lives in TraversalRow's ` +
            `decision about which pill is interactive — GateEngine is consulted, but never asked to veto. ` +
            `No shipping input path does this today; any second one would inherit the hole.`,
          reachability: "model-only",
          location: { screen: snap.screen, system: "gates", file: "phaser/src/render/TraversalRow.ts", line: 147 },
          context: { target: after.screen, blockingGates: gateIds, choose: res },
        },
        after,
      );
    }
  },
};
