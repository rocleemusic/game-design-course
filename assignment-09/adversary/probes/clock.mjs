/**
 * PROBE 1 — the clock and the choice index.
 *
 * `InkBridge`'s contract is that ink owns `movesLeft`, `TimeOfDay` and `day`,
 * and the host only reads them. That contract is held by convention, not by the
 * type system: `LanternPlayer.setVar` is public and would appear to work. So the
 * attack is to find an input the host mishandles badly enough to spend, skip or
 * rewind a move.
 *
 * Three attacks, in rising order of how much a real player could do them:
 *
 *   out-of-range   choose(9999) / choose(-1). No player can send this. It tests
 *                  that a bad index is REFUSED rather than obeyed — and that the
 *                  refusal does not leave the clock somewhere new.
 *
 *   stale-index    capture a choice, change the world underneath it, then take
 *                  the captured index. This IS player-reachable: a pill is drawn
 *                  from one view and clicked against a later one, and an autosave
 *                  or a time rollover can land in between. The registry judges
 *                  where it lands; this probe only creates the condition.
 *
 *   double-click   the same traversal pill, twice, faster than a re-render. The
 *                  classic way one move costs two.
 */

const MOVE_LIKE = (c) => c.kind === "move";

export default {
  id: "clock",
  title: "clock and choice-index abuse",
  weight: 4,

  canFire: (snap) => snap.resolved && Array.isArray(snap.choices) && snap.choices.length > 0,

  async fire(ctx) {
    const snap = await ctx.snapshot();
    const variant = ctx.rng.pick(["out-of-range", "stale-index", "double-click"]);

    if (variant === "out-of-range") {
      const bad = ctx.rng.pick([9999, -1, snap.choices.length, Number.NaN]);
      ctx.note(`choose(${bad})`);
      const res = await ctx.adv(`window.__adv.choose(${JSON.stringify(bad)})`);
      const after = await ctx.snapshot();

      const moved =
        after.screen !== snap.screen ||
        after.day !== snap.day ||
        after.timeBlock !== snap.timeBlock ||
        after.movesLeft !== snap.movesLeft;

      if (moved) {
        ctx.record(
          "INV-CLOCK-CHOICE-INDEX-SAFE",
          {
            summary:
              `choose(${bad}) — an index no choice carries — changed the world: ` +
              `screen ${snap.screen}->${after.screen}, day ${snap.day}->${after.day}, ` +
              `block ${snap.timeBlock}->${after.timeBlock}, moves ${snap.movesLeft}->${after.movesLeft}.`,
            reachability: "model-only",
            location: { system: "ink", file: "phaser/src/ink/InkBridge.ts" },
            context: { index: bad, threw: !!res?.threw, why: res?.why ?? null, before: snap.choices.map((c) => c.display) },
          },
          after,
        );
      }
      return;
    }

    if (variant === "stale-index") {
      const target = ctx.rng.pick(snap.choices);
      if (!target) return;

      // Change the world without using the captured index.
      if (snap.canContinue) {
        await ctx.adv(`window.__adv.advance()`);
        ctx.note("advance (to stale the index)");
      } else {
        const other = snap.choices.filter((c) => c.index !== target.index);
        const pick = ctx.rng.pick(other);
        if (!pick) return;
        await ctx.adv(`window.__adv.choose(${pick.index})`);
        ctx.note(`choose(${pick.index}) "${pick.display}" (to stale the index)`);
      }

      const mid = await ctx.snapshot();
      const stillOffered = (mid.choices ?? []).some(
        (c) => c.index === target.index && c.display === target.display,
      );
      if (stillOffered) return; // nothing went stale; not an attack

      ctx.note(`stale choose(${target.index}) captured as "${target.display}"`);
      await ctx.adv(`window.__adv.choose(${target.index})`);
      // The global registry does the judging: INV-GATE-STANDING-SOMEWHERE-LOCKED,
      // INV-CLOCK-MOVES-NONNEG, INV-FLOW-* all run on the next loop tick.
      return;
    }

    // double-click: two clicks on one traversal pill, no re-render between them.
    const moves = snap.choices.filter(MOVE_LIKE);
    const move = ctx.rng.pick(moves);
    if (!move) return;

    const pills = await ctx.interactives(snap.sceneKey);
    const label = move.display.replace(/^\[|\]$/g, "");
    const pill = pills.find((p) => p.label && label.includes(p.label.slice(0, 12)));
    if (!pill) return; // could not locate the real control; not worth a fake click

    ctx.note(`double-click "${label}" at (${Math.round(pill.x)},${Math.round(pill.y)})`);
    const before = snap;
    await ctx.click(pill.x, pill.y);
    await ctx.click(pill.x, pill.y);
    await ctx.page.waitForTimeout(250);
    const after = await ctx.snapshot();

    // One move costs one move. Two clicks landing two moves is the bug; two
    // clicks landing one, or none, is correct.
    const spent = (before.movesLeft ?? 0) - (after.movesLeft ?? 0);
    const sameBlock = before.timeBlock === after.timeBlock && before.day === after.day;
    if (sameBlock && spent > 1) {
      ctx.record(
        "INV-CLOCK-NO-DOUBLE-SPEND",
        {
          summary:
            `two clicks on one traversal pill ("${label}") spent ${spent} moves inside one time block ` +
            `(${before.movesLeft} -> ${after.movesLeft}).`,
          reachability: "player",
          location: { screen: before.screen, system: "traversal", file: "phaser/src/render/TraversalRow.ts" },
          context: { pill: label, movesBefore: before.movesLeft, movesAfter: after.movesLeft },
        },
        after,
      );
    }
  },
};
