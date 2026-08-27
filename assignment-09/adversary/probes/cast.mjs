/**
 * PROBE 4 — casting.
 *
 * `CastPipeline.run()` is the one place a cast is resolved and its bookkeeping
 * applied. Read its steps and a question falls out: what does it REFUSE? It
 * looks up a spell by phrase, resolves, and then writes inventory, knowledge and
 * gates. It never asks whether the player knows the spell, whether the receiver
 * is on this screen, or whether the components are held — `resolveCast` decides
 * that last one from the `offered` array the CALLER supplies.
 *
 * That may be correct layering. The UI picks what to offer, so the model does
 * not need to. But it means every precondition in the casting system is held by
 * one layer, and this probe measures which ones actually hold.
 *
 * Four attacks, all through `pipeline.run` — so all `reachability: "model-only"`
 * unless the same thing turns out to be reachable through the real cast UI,
 * which the fifth check tests separately:
 *
 *   unknown-spell     cast a phrase not in the spellbook
 *   no-components     cast with `offered: []`
 *   absent-receiver   cast at a receiver this screen does not carry
 *   double-spend      cast twice with the same component, and count it after
 *   ui-offer-check    ask whether the real UI would ever offer any of the above
 */

const countOf = (arr, id) => (Array.isArray(arr) ? arr.filter((x) => x === id).length : 0);

export default {
  id: "cast",
  title: "cast preconditions and component spend",
  weight: 4,

  canFire: (snap, mode) => snap.resolved && !!snap.screen && !!mode && mode.systems.includes("cast"),

  async fire(ctx) {
    const snap = await ctx.snapshot();

    // Everything below is discovered from the live content, never hard-coded —
    // spell ids and receiver ids are both being edited this week.
    const facts = await ctx.raw(`
      const spells = scene.magic.spells.map((s) => ({
        id: s.spell_id, phrase: s.phrase, components: [...s.components],
        receivers: (s.receivers ?? []).map((r) => r.receiver_id ?? r.id).filter(Boolean),
      }));
      return { spells, screen: scene.ink.view().pos.currentScreen };
    `);
    if (!facts || !facts.spells?.length) return;

    const known = new Set(snap.spellbook ?? []);
    const variant = ctx.rng.pick(["unknown-spell", "no-components", "absent-receiver", "double-spend"]);

    // ── does the player know it? ──────────────────────────────────────────
    if (variant === "unknown-spell") {
      const unknown = facts.spells.filter((s) => !known.has(s.id));
      const spell = ctx.rng.pick(unknown);
      const receiver = spell && ctx.rng.pick(spell.receivers);
      if (!spell || !receiver) return;
      if (!ctx.once(`cast:unknown:${spell.id}`)) return;

      ctx.note(`cast "${spell.phrase}" (NOT in the spellbook) on ${receiver}`);
      const report = await ctx.raw(`
        return scene.pipeline.run({
          phrase: ${JSON.stringify(spell.phrase)},
          offered: ${JSON.stringify(spell.components)},
          receiverId: ${JSON.stringify(receiver)},
          screenId: scene.ink.view().pos.currentScreen,
        });
      `);
      const after = await ctx.snapshot();
      if (report?.landed) {
        ctx.record(
          "INV-CAST-REQUIRES-KNOWN-SPELL",
          {
            summary:
              `"${spell.phrase}" (${spell.id}) landed on ${receiver} while it was NOT in the spellbook. ` +
              `CastPipeline.run reads Knowledge to WRITE it (step 3) and never reads it as a precondition — ` +
              `the spellbook is a UI filter, not a rule.`,
            reachability: "model-only",
            location: { screen: snap.screen, system: "cast", file: "phaser/src/world/CastPipeline.ts", line: 200 },
            context: { spell: spell.id, receiver, spellbookBefore: [...known] },
          },
          after,
        );
      }
      return;
    }

    // ── does it need its components? ──────────────────────────────────────
    if (variant === "no-components") {
      const spell = ctx.rng.pick(facts.spells.filter((s) => s.components.length > 0 && s.receivers.length > 0));
      const receiver = spell && ctx.rng.pick(spell.receivers);
      if (!spell || !receiver) return;
      if (!ctx.once(`cast:nocomp:${spell.id}`)) return;

      ctx.note(`cast "${spell.phrase}" on ${receiver} with NO components offered`);
      const report = await ctx.raw(`
        return scene.pipeline.run({
          phrase: ${JSON.stringify(spell.phrase)},
          offered: [],
          receiverId: ${JSON.stringify(receiver)},
          screenId: scene.ink.view().pos.currentScreen,
        });
      `);
      const after = await ctx.snapshot();
      if (report?.landed) {
        ctx.record(
          "INV-CAST-REQUIRES-COMPONENTS",
          {
            summary:
              `"${spell.phrase}" landed with an empty component set, though it requires ` +
              `[${spell.components.join(", ")}]. A spell is a phrase PLUS components (README, "Content rules ` +
              `the code enforces") — here the phrase alone was enough.`,
            reachability: "model-only",
            location: { screen: snap.screen, system: "cast", file: "phaser/src/magic/CastResolver.ts" },
            context: { spell: spell.id, requires: spell.components, offered: [] },
          },
          after,
        );
      }
      return;
    }

    // ── must the receiver be here? ────────────────────────────────────────
    if (variant === "absent-receiver") {
      const present = new Set(
        (await ctx.adv(`window.__adv.castTargets()`)).map((t) => t.soul ?? t.id ?? t).filter(Boolean),
      );
      const spell = ctx.rng.pick(facts.spells.filter((s) => s.receivers.length > 0));
      const receiver = spell && ctx.rng.pick(spell.receivers.filter((r) => !present.has(r)));
      if (!spell || !receiver) return;
      if (!ctx.once(`cast:absent:${spell.id}:${receiver}`)) return;

      ctx.note(`cast "${spell.phrase}" on ${receiver}, which is not on ${facts.screen}`);
      const report = await ctx.raw(`
        return scene.pipeline.run({
          phrase: ${JSON.stringify(spell.phrase)},
          offered: ${JSON.stringify(spell.components)},
          receiverId: ${JSON.stringify(receiver)},
          screenId: scene.ink.view().pos.currentScreen,
        });
      `);
      const after = await ctx.snapshot();
      if (report?.landed) {
        ctx.record(
          "INV-CAST-RECEIVER-MUST-BE-PRESENT",
          {
            summary:
              `"${spell.phrase}" landed on receiver "${receiver}" while standing on ${facts.screen}. ` +
              `Nothing maps a receiver to a screen (GAPS.md G2), so the pipeline cannot check presence and ` +
              `does not try — the screen the cast names is carried through as data, not as a constraint.`,
            reachability: "model-only",
            location: { screen: snap.screen, system: "cast", file: "phaser/src/world/CastPipeline.ts" },
            context: { spell: spell.id, receiver, standingOn: facts.screen, clearedNow: report.clearedNow ?? [] },
          },
          after,
        );
      }
      return;
    }

    // ── can one component be spent twice? ─────────────────────────────────
    const castable = facts.spells.filter(
      (s) => s.receivers.length > 0 && s.components.length > 0 && s.components.every((c) => (snap.held ?? []).includes(c)),
    );
    const spell = ctx.rng.pick(castable);
    const receiver = spell && ctx.rng.pick(spell.receivers);
    if (!spell || !receiver) return;

    const before = await ctx.snapshot();
    ctx.note(`cast "${spell.phrase}" on ${receiver} twice, counting components`);
    const first = await ctx.raw(`
      return scene.pipeline.run({
        phrase: ${JSON.stringify(spell.phrase)}, offered: ${JSON.stringify(spell.components)},
        receiverId: ${JSON.stringify(receiver)}, screenId: scene.ink.view().pos.currentScreen });
    `);
    const mid = await ctx.snapshot();
    const second = await ctx.raw(`
      return scene.pipeline.run({
        phrase: ${JSON.stringify(spell.phrase)}, offered: ${JSON.stringify(spell.components)},
        receiverId: ${JSON.stringify(receiver)}, screenId: scene.ink.view().pos.currentScreen });
    `);
    const after = await ctx.snapshot();

    // A component the FIRST cast consumed must not be available to the second.
    const consumed = first?.result?.consumed ?? [];
    for (const c of consumed) {
      const had = countOf(before.held, c);
      const midCount = countOf(mid.held, c);
      const now = countOf(after.held, c);
      if (midCount < had && second?.landed && now === midCount) {
        ctx.record(
          "INV-CAST-CONSUMED-ONCE",
          {
            summary:
              `"${c}" was consumed by the first cast of "${spell.phrase}" (held ${had} -> ${midCount}) and the ` +
              `second cast landed anyway without spending anything (still ${now}). One component paid for two casts.`,
            reachability: "model-only",
            location: { screen: before.screen, system: "cast", file: "phaser/src/world/Inventory.ts" },
            context: { spell: spell.id, receiver, component: c, before: had, afterFirst: midCount, afterSecond: now },
          },
          after,
        );
        break;
      }
    }
  },
};
