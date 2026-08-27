/**
 * PROBE 3 — pickup, drop, and the two vocabularies.
 *
 * `SaveCoordinator`'s header spells out the seam this probe attacks: forage
 * speaks POOL NAMES, the host speaks ITEM IDS, and the join between them is
 * many-to-one and therefore not invertible. Anywhere one pickup crosses that
 * join twice, an item is minted from nothing. That is the classic exploit in
 * this codebase's shape, and it is silent — nothing tells the player, and the
 * count only looks wrong to someone counting.
 *
 * (The reconcile in `_handoffs/2026-08-23-forage-reconcile-and-spread-handoff.md`
 * collapses the two vocabularies into one. This probe reads both sides off the
 * live snapshot and never names a pool or an item, so it keeps working through
 * that change without an edit.)
 *
 * Four attacks:
 *   double-pick     the same slot, the same item, twice
 *   unoffered-item  a slot that exists, holding an item it never offered
 *   fake-slot       a slot id no screen has
 *   drop            drop a held item and count what is left, in both vocabularies
 */

const slotIdOf = (s) => (typeof s === "string" ? s : s && (s.slot_id ?? s.slotId ?? s.id ?? null));
const itemOf = (s) =>
  typeof s === "string"
    ? null
    : s && (s.item ?? s.item_id ?? s.itemId ?? s.pool ?? (Array.isArray(s.items) ? s.items[0] : null));

const countOf = (arr, id) => (Array.isArray(arr) ? arr.filter((x) => x === id).length : 0);

export default {
  id: "inventory",
  title: "pickup / drop duplication",
  weight: 5,

  canFire: (snap) => snap.resolved && !!snap.screen,

  async fire(ctx) {
    const offered = await ctx.adv(`window.__adv.forage()`);
    await ctx.setLastForage(offered);

    const variant = ctx.rng.pick(
      offered.length > 0 ? ["double-pick", "unoffered-item", "fake-slot", "drop"] : ["fake-slot", "drop"],
    );

    if (variant === "fake-slot") {
      const before = await ctx.snapshot();
      const fake = `adv_slot_${ctx.rng.int(1e6)}`;
      ctx.note(`pickup("${fake}", <invented item>)`);
      const res = await ctx.adv(
        `window.__adv.pickup(${JSON.stringify(fake)}, ${JSON.stringify(`adv_item_${ctx.rng.int(1e6)}`)})`,
      );
      const after = await ctx.snapshot();
      if (res?.accepted || (after.satchel?.length ?? 0) > (before.satchel?.length ?? 0)) {
        ctx.record(
          "INV-INV-UNOFFERED-PICKUP-REFUSED",
          {
            summary:
              `pickup accepted slot "${fake}", which no screen in the graph offers. ` +
              `The satchel went ${before.satchel?.length} -> ${after.satchel?.length}.`,
            reachability: "model-only",
            location: { screen: before.screen, system: "forage", file: "tools/lantern/src/lib/play.ts" },
            context: { slot: fake, accepted: res?.accepted ?? null },
          },
          after,
        );
      }
      return;
    }

    if (variant === "drop") {
      const before = await ctx.snapshot();
      const heldItem = ctx.rng.pick(before.held ?? []);
      if (!heldItem) return;

      ctx.note(`drop("${heldItem}") on ${before.screen}`);
      const res = await ctx.raw(
        `return scene.inventory.drop(${JSON.stringify(heldItem)}, scene.ink.view().pos.currentScreen);`,
      );
      await ctx.raw(`scene.ink.refresh(); return true;`);
      const after = await ctx.snapshot();

      const heldBefore = countOf(before.held, heldItem);
      const heldAfter = countOf(after.held, heldItem);
      const inWorld = (after.droppedHere ?? []).includes(heldItem);
      const stillCarried = countOf(after.satchel, heldItem);

      // A drop must do BOTH halves: leave the carry, arrive in the world. Doing
      // neither is a no-op; doing one is the duplication.
      if (res && heldAfter >= heldBefore) {
        ctx.record(
          "INV-INV-DROP-REMOVES",
          {
            summary:
              `drop("${heldItem}") returned true but the item is still held (${heldBefore} -> ${heldAfter}). ` +
              (inWorld
                ? `It is ALSO in the world on ${after.screen} — one item now exists twice.`
                : `It did not land in the world either, so the drop did nothing.`),
            reachability: "player",
            location: { screen: before.screen, system: "satchel", file: "phaser/src/world/Inventory.ts" },
            context: { item: heldItem, heldBefore, heldAfter, inWorld, stillInSatchel: stillCarried },
          },
          after,
        );
      } else if (res && stillCarried > 0 && inWorld) {
        ctx.record(
          "INV-INV-DROP-REMOVES",
          {
            summary:
              `after drop("${heldItem}") the item is in the world on ${after.screen} AND still in the satchel ` +
              `(${stillCarried}x). The two vocabularies disagree, and picking it back up mints a second copy.`,
            reachability: "player",
            location: { screen: before.screen, system: "satchel", file: "phaser/src/world/Inventory.ts" },
            context: { item: heldItem, satchel: after.satchel, droppedHere: after.droppedHere },
          },
          after,
        );
      }
      return;
    }

    // ── the two real forage attacks ───────────────────────────────────────
    const slot = ctx.rng.pick(offered);
    const slotId = slotIdOf(slot);
    if (!slotId) return;

    if (variant === "unoffered-item") {
      const before = await ctx.snapshot();
      const bogus = `adv_item_${ctx.rng.int(1e6)}`;
      ctx.note(`pickup("${slotId}", "${bogus}") — real slot, item it never offered`);
      const res = await ctx.adv(`window.__adv.pickup(${JSON.stringify(slotId)}, ${JSON.stringify(bogus)})`);
      const after = await ctx.snapshot();
      if (res?.accepted && countOf(after.satchel, bogus) > 0) {
        ctx.record(
          "INV-INV-UNOFFERED-PICKUP-REFUSED",
          {
            summary:
              `slot "${slotId}" accepted item "${bogus}", which it never offered. ` +
              `pickup() stores whatever string it is handed, so the offered set is the only thing ` +
              `standing between the player and an invented item.`,
            reachability: "model-only",
            location: { screen: before.screen, system: "forage", file: "tools/lantern/src/lib/play.ts", line: 506 },
            context: { slot: slotId, item: bogus, satchel: after.satchel },
          },
          after,
        );
      }
      return;
    }

    // double-pick
    const item = itemOf(slot);
    if (!item) return;
    const before = await ctx.snapshot();
    const had = countOf(before.satchel, item);

    ctx.note(`pickup("${slotId}", "${item}") x2`);
    const first = await ctx.adv(`window.__adv.pickup(${JSON.stringify(slotId)}, ${JSON.stringify(item)})`);
    const second = await ctx.adv(`window.__adv.pickup(${JSON.stringify(slotId)}, ${JSON.stringify(item)})`);
    const after = await ctx.snapshot();
    const now = countOf(after.satchel, item);

    if (first?.accepted && second?.accepted && now > had + 1) {
      ctx.record(
        "INV-INV-NO-PICKUP-DUPLICATION",
        {
          summary:
            `slot "${slotId}" gave "${item}" twice — the satchel went ${had} -> ${now} from one forage slot. ` +
            `pickedSlots should have closed it after the first take.`,
          reachability: "player",
          location: { screen: before.screen, system: "forage", file: "phaser/src/render/HotspotSystem.ts" },
          context: { slot: slotId, item, before: had, after: now, pickedSlots: after.pickedSlots },
        },
        after,
      );
    }

    await ctx.setLastForage(await ctx.adv(`window.__adv.forage()`));
  },
};
