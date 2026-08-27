/**
 * PROBE 5 — the save file.
 *
 * `SaveStore`'s header makes a promise worth attacking: "A DEFECT IS REPORTED,
 * NEVER COERCED. A save from a different schema version, or one that will not
 * parse, comes back as a `SaveLoadDefect` and the caller decides. Restoring a
 * partially-understood save anyway is exactly how a reload quietly loses a week."
 *
 * `looksLikeSave` is a SHALLOW structural check, and says so. It confirms
 * `v.ink` is a non-null object and hands it on. So the interesting attack is not
 * garbage — garbage is caught. It is a WELL-FORMED ENVELOPE around a payload the
 * restore path cannot use, which passes the gate and fails downstream, inside
 * `restore()`, after ink has already been touched.
 *
 * Five payloads, each written straight into `localStorage` and then loaded:
 *
 *   truncated       valid JSON prefix, cut mid-object      -> expect "unreadable"
 *   version-bumped  every field right, version + 1         -> expect "version-mismatch"
 *   mode-swapped    a save claiming another mode wrote it  -> expect "mode-mismatch"
 *   hollow          shape-valid envelope, empty ink/slices -> the real attack
 *   unknown-ids     real shape, gate and item ids invented -> expect rejection
 *
 * Then one honest round trip: save, reload the whole page, load, compare.
 *
 * `reachability: "environment"`. No player types JSON into localStorage. But a
 * half-written save from a tab closed mid-write, a quota error, an extension, or
 * a schema change shipped without a version bump all produce exactly these
 * bytes — and the T13 ruling reshapes this schema into slots after the capstone,
 * which is precisely when a coercing loader starts eating weeks.
 */

const SAVE_KEY_PREFIX = "phaser-probe/save/v1/";

/** Each variant returns the raw string to plant, given a real captured save. */
const VARIANTS = {
  truncated: (real) => JSON.stringify(real).slice(0, Math.floor(JSON.stringify(real).length * 0.6)),
  "version-bumped": (real) => JSON.stringify({ ...real, version: (real.version ?? 1) + 1 }),
  "mode-swapped": (real) => JSON.stringify({ ...real, modeId: "adv-not-a-mode" }),
  hollow: (real) =>
    JSON.stringify({
      version: real.version ?? 1,
      savedAt: new Date(0).toISOString(),
      slot: real.slot,
      modeId: real.modeId,
      ink: {},
      inventory: {},
      position: {},
      clockDisplay: {},
      slices: {},
    }),
  "unknown-ids": (real) =>
    JSON.stringify({
      ...real,
      inventory: {
        ...(real.inventory ?? {}),
        heldItemIds: [...((real.inventory ?? {}).heldItemIds ?? []), "adv_item_that_does_not_exist"],
      },
      slices: Object.fromEntries(
        Object.entries(real.slices ?? {}).map(([k, v]) => [
          k,
          v && typeof v === "object" && Array.isArray(v.cleared)
            ? { ...v, cleared: [...v.cleared, "G-ADV-NOT-A-GATE"] }
            : v,
        ]),
      ),
    }),
};

/** What each variant must be refused WITH. `null` = any defect will do. */
const EXPECTED = {
  truncated: "unreadable",
  "version-bumped": "version-mismatch",
  "mode-swapped": "mode-mismatch",
  hollow: null,
  "unknown-ids": null,
};

export default {
  id: "save",
  title: "save-file corruption and round trip",
  weight: 2,

  canFire: (snap, mode) => snap.resolved && !!mode && !!mode.save,

  async fire(ctx) {
    const info = await ctx.adv(`window.__adv.saveInfo()`);
    if (!info?.hasCoordinator || !info.slot) return;
    const key = SAVE_KEY_PREFIX + info.slot;

    // Capture a REAL save first. Every payload below is a mutation of something
    // the game itself wrote, so a rejection cannot be blamed on a hand-made file.
    const real = await ctx.raw(`return scene.saveCoordinator.capture();`);
    if (!real) return;

    const variant = ctx.rng.pick(Object.keys(VARIANTS).filter((v) => ctx.once(`save:${v}`)));
    if (!variant) {
      // Every corruption already fired. Spend the slot on the round trip instead.
      return this.roundTrip(ctx, key, real);
    }

    const payload = VARIANTS[variant](real);
    ctx.note(`plant a ${variant} save at ${key} and load it`);

    const before = await ctx.snapshot();
    await ctx.page.evaluate(
      ([k, v]) => window.localStorage.setItem(k, v),
      [key, payload],
    );

    let report;
    let threw = null;
    try {
      report = await ctx.raw(`return scene.saveCoordinator.load();`);
    } catch (e) {
      threw = String(e.message ?? e);
    }
    const after = await ctx.snapshot();

    const want = EXPECTED[variant];
    const refused = !threw && report && report.loaded === false && !!report.defect;
    const reason = report?.defect?.reason ?? null;

    if (threw) {
      ctx.record(
        "INV-SAVE-DEFECT-NOT-COERCED",
        {
          summary:
            `a ${variant} save threw out of load() instead of returning a defect: ${threw}. ` +
            `CollectScene calls saveCoordinator.load() unguarded during create(), so this exception ` +
            `escapes into scene start — the game does not come up at all.`,
          reachability: "environment",
          location: { system: "save", file: "phaser/src/scenes/CollectScene.ts", line: 909 },
          context: { variant, key, threw },
        },
        after,
      );
    } else if (report?.loaded === true) {
      ctx.record(
        variant === "version-bumped"
          ? "INV-SAVE-VERSION-REFUSED"
          : variant === "unknown-ids"
            ? "INV-SAVE-UNKNOWN-IDS-REJECTED"
            : "INV-SAVE-DEFECT-NOT-COERCED",
        {
          summary:
            `a ${variant} save LOADED. SaveStore's contract is that a save it does not fully understand ` +
            `comes back as a defect and the caller decides — this one was applied to the live world.`,
          reachability: "environment",
          location: { system: "save", file: "phaser/src/world/save/SaveStore.ts" },
          context: { variant, key, report, worldBefore: before.screen, worldAfter: after.screen },
        },
        after,
      );
    } else if (refused && want && reason !== want) {
      ctx.record(
        "INV-SAVE-DEFECT-NOT-COERCED",
        {
          summary:
            `a ${variant} save was refused as "${reason}" rather than "${want}". It is refused, which is ` +
            `the important half — but the reason is what a slot picker shows the player, and this one is wrong.`,
          reachability: "environment",
          location: { system: "save", file: "phaser/src/world/save/SaveStore.ts" },
          context: { variant, expected: want, got: reason },
        },
        after,
      );
    }

    // Put the real save back so the rest of the run is not played against a
    // planted world.
    await ctx.page.evaluate(([k, v]) => window.localStorage.setItem(k, v), [key, JSON.stringify(real)]);
    ctx.flags.expectRewind = true;
    await ctx.raw(`return scene.saveCoordinator.load();`);
  },

  /** Save, reload the whole page, load, and compare the world to itself. */
  async roundTrip(ctx, key, real) {
    if (!ctx.once("save:roundtrip")) return;
    ctx.note("round trip: save -> full page reload -> load -> compare");

    const before = await ctx.snapshot();
    await ctx.raw(`scene.saveCoordinator.save(); return true;`);

    await ctx.page.reload({ waitUntil: "load" });
    // `installApi` polls until the game is booted — PreloadScene loads every
    // backdrop first, so a fixed sleep here is a coin flip on a cold server.
    await ctx.installApi();
    const entered = await ctx.enterPlay();
    if (!entered) {
      ctx.note("round trip: could not re-enter play after reload — round trip NOT measured");
      ctx.record(
        "INV-ADV-CHECK-THREW",
        {
          summary:
            "the save round trip could not be measured: after a full page reload the run never got " +
            "back into the play scene, so save-then-restore went unchecked this run.",
          reachability: "environment",
          location: { system: "harness", file: "phaser/tools/adversary/probes/save.mjs" },
        },
        await ctx.snapshot(),
      );
      return;
    }

    ctx.flags.expectRewind = true;
    const after = await ctx.snapshot();

    const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
    const drift = [];
    if (before.day !== after.day) drift.push(`day ${before.day} -> ${after.day}`);
    if (before.timeBlock !== after.timeBlock) drift.push(`block ${before.timeBlock} -> ${after.timeBlock}`);
    if (before.screen !== after.screen) drift.push(`screen ${before.screen} -> ${after.screen}`);
    if (!same([...(before.satchel ?? [])].sort(), [...(after.satchel ?? [])].sort()))
      drift.push(`satchel ${JSON.stringify(before.satchel)} -> ${JSON.stringify(after.satchel)}`);
    if (!same([...(before.spellbook ?? [])].sort(), [...(after.spellbook ?? [])].sort()))
      drift.push(`spellbook ${JSON.stringify(before.spellbook)} -> ${JSON.stringify(after.spellbook)}`);
    if (!same([...(before.gates?.cleared ?? [])].sort(), [...(after.gates?.cleared ?? [])].sort()))
      drift.push(`cleared gates ${JSON.stringify(before.gates?.cleared)} -> ${JSON.stringify(after.gates?.cleared)}`);

    if (drift.length > 0) {
      ctx.record(
        "INV-SAVE-ROUNDTRIP-STABLE",
        {
          summary:
            `save, reload, load returned a different world: ${drift.join(" · ")}. ` +
            `"Save and restore (close, reopen, resume)" is item one of the amended Definition of Done.`,
          reachability: "player",
          location: { system: "save", file: "phaser/src/world/save/SaveCoordinator.ts" },
          context: { drift, before: { day: before.day, screen: before.screen, satchel: before.satchel } },
        },
        after,
      );
    }
  },
};
