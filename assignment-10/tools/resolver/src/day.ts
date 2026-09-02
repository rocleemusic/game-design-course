// resolveDay: one seeded, deterministic day -> day.json (pinned shape).
// Rules from resources/permutation-design_draft.md (RULED, Roc 2026-07-29):
//   - seed = SHA-256("slot|life|day"); same seed in = identical output
//   - NPC fill: weighted pool (role anchor, evening home, constraints) into
//     declared capacities; a soul stands in at most one slot per time block
//   - guarantee floor: every deep soul with a live thread is placed on at
//     least one screen in the location the player picked for that day
//   - item rolls: per-slot weighted buckets with explicit {empty, weight};
//     aliveness bands gate rare entries (selection weights, never new systems)
//   - live leads: selection from the authored pool, never generation

import { daySeed, prngFromSeed, weightedPick, sample } from "./seed.ts";
import { DEFAULT_TUNING } from "./tuning.ts";
import type { Tuning } from "./tuning.ts";
import { FESTIVAL_SCREEN_ID } from "./graph.ts";
import { ALIVENESS_ORDER, TIME_BLOCKS } from "./types.ts";
import type {
  DayInput,
  DayJson,
  ItemRoll,
  ResolverData,
  ScreenSpec,
  SlotFill,
  Soul,
  TimeBlock,
} from "./types.ts";

// Weights and knobs live in tuning.json (loadTuning); DEFAULT_TUNING mirrors
// the original constants (role_anchor 5, home_evening 4, base 1, leads 2-3,
// multiplier 1.0), so calling without tuning is byte-identical to before.

export function resolveDay(
  data: ResolverData,
  input: DayInput,
  tuning: Tuning = DEFAULT_TUNING,
): DayJson {
  const seed = daySeed(input.slot, input.life, input.day);
  const rng = prngFromSeed(seed);
  const weights = tuning.availability_weights;

  const screens = [...data.screens].sort((a, b) => a.screen_id.localeCompare(b.screen_id));
  const souls = [...data.sceneGraph.souls].sort((a, b) => a.soul_id.localeCompare(b.soul_id));
  const constraints = new Map(
    (input.constraints ?? []).map((c) => [c.screen_id, new Set(c.allowed_time_blocks)]),
  );

  const blockAllowed = (screenId: string, block: TimeBlock): boolean => {
    const allowed = constraints.get(screenId);
    return !allowed || allowed.has(block);
  };

  // GLOBAL RULING: "night" is not an ordinary daily block — it is festival
  // night, the terminal beat of day 5 only. Every TIME_BLOCKS walk in this
  // file must go through this so day-start placement never seats an NPC or
  // rolls an item into "night" on days 1-4.
  const dayBlocks: TimeBlock[] = input.day >= 5 ? TIME_BLOCKS : TIME_BLOCKS.filter((b) => b !== "night");

  // Remaining capacity per (screen, block); placements per block to keep one
  // soul from standing in two places at once. Declared counts scale by the
  // global busyness multiplier (round half-up, floor at 0).
  const multiplier = tuning.npc_slot_defaults.per_block_multiplier;
  const scaleCount = (count: number): number => Math.max(0, Math.round(count * multiplier));
  const capacity = new Map<string, number>();
  const key = (s: string, b: TimeBlock) => `${s}|${b}`;
  for (const screen of screens) {
    for (const slot of screen.npc_slots ?? []) {
      if (slot.time_block === "night" && input.day < 5) continue; // festival night is day 5 only
      if (!blockAllowed(screen.screen_id, slot.time_block)) continue;
      capacity.set(key(screen.screen_id, slot.time_block), scaleCount(slot.count));
    }
  }
  const placedInBlock = new Map<TimeBlock, Set<string>>(TIME_BLOCKS.map((b) => [b, new Set()]));
  const slot_fill: SlotFill[] = [];

  const place = (screenId: string, block: TimeBlock, soulId: string) => {
    slot_fill.push({ screen_id: screenId, time_block: block, soul: soulId });
    capacity.set(key(screenId, block), (capacity.get(key(screenId, block)) ?? 0) - 1);
    placedInBlock.get(block)!.add(soulId);
  };

  const soulWeight = (soul: Soul, screen: ScreenSpec, block: TimeBlock): number => {
    let w = weights.base;
    const anchor = data.roleWorkplace.find((r) => r.role_tag === soul.role_tag);
    if (
      anchor &&
      anchor.workplace_screens.includes(screen.screen_id) &&
      anchor.time_blocks.includes(block)
    ) {
      w += weights.role_anchor;
    }
    if (soul.home_screen === screen.screen_id && block === "evening") {
      w += weights.home_evening;
    }
    return w;
  };

  // --- Fixed placement, before anything probabilistic even runs (Roc,
  // 2026-08-31: "Mara always on Market Row", "Ilsa always in the Workshop",
  // "Toby always at Town Square"). A soul with `fixed_placement` for this
  // block stands there UNCONDITIONALLY — no weighting, no competing with
  // anyone else for the slot, no location filter (a fixed screen already
  // says where). `place()` still runs the ordinary bookkeeping (capacity
  // decrements, `placedInBlock`), so the guarantee floor and the ordinary
  // draw below both correctly see this soul as already seated for this
  // block and never try to seat them twice. A block this soul's map does
  // not name (Ilsa's morning, Mara/Toby's evening) is left open for
  // whichever mechanism below would otherwise have placed them — the pin
  // narrows, it does not replace, the rest of the day.
  for (const soul of souls) {
    for (const block of dayBlocks) {
      const screenId = soul.fixed_placement?.[block];
      if (screenId) place(screenId, block, soul.soul_id);
    }
  }

  // --- Guarantee floor first, so it holds by construction. Every deep soul
  // with a live thread lands on a screen in the player's picked location.
  // With floor.prefer_unlocked_screens = true, the floor draw restricts to
  // screens the player can actually reach (status start/reachable), falling
  // back to any location screen if none qualify. null/false = no restriction.
  const preferUnlocked = tuning.floor.prefer_unlocked_screens === true;
  const isUnlocked = (screen: ScreenSpec): boolean =>
    screen.status === "start" || screen.status.startsWith("reachable");

  // Screens where a soul actually has an authored scene. A guarantee floor that
  // lands a soul somewhere the player can hold no conversation guarantees
  // nothing — it was putting Toby on forest screens while every Toby scene sits
  // on T2, T6 and F1, so the arc was unreachable in play. Off by default
  // (null/false) so existing seeds reproduce byte-identically; the shipped
  // tuning.json turns it on.
  const preferSceneScreens = tuning.floor.prefer_scene_screens === true;

  // A scene's earliest day, derived from its lowest `day >= N` — availability
  // is a floor, not a pin, and within one beat every condition must hold while
  // across beats any one opening is enough. Same derivation the week view uses.
  const sceneFloor = (scene: { choice_nodes: { availability_conditions: string[] }[] }): number => {
    if (scene.choice_nodes.length === 0) return 1;
    return Math.min(
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
  };

  /** Screens where this soul has a scene that can open TODAY. */
  const sceneScreensOn = (soulId: string, day: number): Set<string> => {
    const out = new Set<string>();
    for (const scene of data.sceneGraph.scenes) {
      if (scene.soul !== soulId) continue;
      if (sceneFloor(scene) > day) continue;
      out.add(scene.screen_id);
    }
    return out;
  };

  const sceneScreens = new Map<string, Set<string>>();
  for (const scene of data.sceneGraph.scenes) {
    let set = sceneScreens.get(scene.soul);
    if (!set) sceneScreens.set(scene.soul, (set = new Set()));
    set.add(scene.screen_id);
  }

  const liveSouls = new Set(
    input.threads.filter((t) => t.status === "live").map((t) => t.soul),
  );
  const floorSouls = souls.filter((s) => s.deep && liveSouls.has(s.soul_id));
  for (const soul of floorSouls) {
    const collectOpenings = (
      unlockedOnly: boolean,
      sceneOnly: boolean,
    ): [[string, TimeBlock], number][] => {
      const wanted = sceneScreens.get(soul.soul_id);
      const openings: [[string, TimeBlock], number][] = [];
      for (const screen of screens) {
        // Festival Grounds (T7) is a mandatory day-5 destination regardless of
        // where the player started day 5 — bypass the picked_location filter
        // for it specifically so a forest-start day 5 doesn't strand deep souls
        // off the festival roster (C1 part 1). Scoped to day >= 5 only: T7 is
        // still an ordinary town screen on days 1-4, and letting it leak into
        // the location filter on those days pulled the day-2 guarantee floor
        // onto it for a forest-picked day, leaving that day's forest placement
        // empty (test/tuning.test.ts's prefer_unlocked_screens coverage).
        const isFestivalDay = input.day >= 5 && screen.screen_id === FESTIVAL_SCREEN_ID;
        if (screen.location !== input.picked_location && !isFestivalDay) continue;
        if (unlockedOnly && !isUnlocked(screen)) continue;
        if (sceneOnly && !wanted?.has(screen.screen_id)) continue;
        for (const block of dayBlocks) {
          // Festival Grounds day-5 placement must land on "night" — an evening
          // seating there leaves present_toby/present_ilsa true only during
          // evening, so the night-gated T7 scene (`day >= 5`) never opens and
          // the vignette's auto-divert never fires. See
          // plans/2026-08-11-session-handoff.md finding #3.
          if (screen.screen_id === FESTIVAL_SCREEN_ID && input.day >= 5 && block !== "night") continue;
          if ((capacity.get(key(screen.screen_id, block)) ?? 0) <= 0) continue;
          if (placedInBlock.get(block)!.has(soul.soul_id)) continue;
          openings.push([[screen.screen_id, block], soulWeight(soul, screen, block)]);
        }
      }
      return openings;
    };
    // Narrowest first, widening only when nothing qualifies, so a soul with no
    // authored scenes (or none in this location) behaves exactly as before.
    //
    // The scene-screen pass deliberately does NOT also require unlocked. A
    // soul's own scene screen is where they belong whether or not it carries a
    // lock, and requiring both stranded Ilsa: every Ilsa scene sits on T4,
    // which is locked, so the narrow pass found nothing and the draw fell
    // through to an unlocked screen where she has nothing to say. Locks are not
    // enforced on movement anyway (see emitScreen), so the player can reach her.
    //
    // The guarantee places a soul ONCE per day, so with several scene screens
    // a weighted draw can miss one for a whole life — Ilsa has scenes on T1, T4
    // and T7, and five draws never landed on T4, leaving two authored scenes
    // unreachable. So the guarantee ROTATES: across a life a soul cycles
    // through the places they have something to say. Still seeded and
    // deterministic, and it degrades to the plain draw when the rotated screen
    // has no opening today.
    let openings: [[string, TimeBlock], number][] = [];
    if (preferSceneScreens) {
      // Only screens whose scene can open TODAY. A festival-night turn is the
      // case that matters: SC-T7-toby is gated `day >= 5`, so on day 5 Toby
      // belongs at the festival and on days 1-4 T7 is not a candidate at all.
      // Rotating over a soul's whole scene list without this put him at the
      // bakery on festival night and left his arc turn unplayable.
      const mine = [...sceneScreensOn(soul.soul_id, input.day)]
        .filter((id) => screens.some((s) => s.screen_id === id && s.location === input.picked_location))
        .sort();
      if (mine.length > 0) {
        // Prefer a screen carrying a scene that opens EXACTLY today (an arc
        // turn on its night), else rotate so a life covers the rest.
        const opensToday = mine.filter((id) =>
          data.sceneGraph.scenes.some(
            (sc) => sc.soul === soul.soul_id && sc.screen_id === id && sceneFloor(sc) === input.day,
          ),
        );
        const order = opensToday.length > 0 ? opensToday : [mine[(input.day - 1) % mine.length]];
        for (const wanted of order) {
          openings = collectOpenings(false, true).filter(([[screenId]]) => screenId === wanted);
          if (openings.length > 0) break;
        }
      }
      if (openings.length === 0) openings = collectOpenings(false, true);
    }
    if (openings.length === 0) openings = collectOpenings(preferUnlocked, false);
    if (preferUnlocked && openings.length === 0) openings = collectOpenings(false, false);
    const pick = weightedPick(rng, openings);
    if (!pick) {
      throw new Error(
        `Guarantee floor unsatisfiable: no open slot in "${input.picked_location}" for ${soul.soul_id}`,
      );
    }
    place(pick[0], pick[1], soul.soul_id);
  }

  // --- Ordinary weighted draw fills the remaining capacity.
  //
  // `confined_location` (Roc, 2026-08-31 — "Juno always in town") drops a
  // soul from the pool for any screen outside their one allowed location,
  // WHICH screen within it still comes from the ordinary weighted draw
  // exactly as before — this confines, it does not pin (contrast
  // `fixed_placement` above, which names an exact screen).
  for (const screen of screens) {
    for (const block of dayBlocks) {
      let remaining = capacity.get(key(screen.screen_id, block)) ?? 0;
      while (remaining > 0) {
        const pool: [string, number][] = souls
          .filter((s) => !placedInBlock.get(block)!.has(s.soul_id))
          .filter((s) => !s.confined_location || s.confined_location === screen.location)
          .map((s) => [s.soul_id, soulWeight(s, screen, block)]);
        const soulId = weightedPick(rng, pool);
        if (!soulId) break; // fewer souls than capacity: slot stays open
        place(screen.screen_id, block, soulId);
        remaining -= 1;
      }
    }
  }

  // --- Item rolls: per-slot weighted bucket, empty entries explicit,
  // aliveness bands as selection weights (min_band gates rare entries).
  const bandRank = ALIVENESS_ORDER.indexOf(input.aliveness_band);
  const item_rolls: ItemRoll[] = [];
  for (const screen of screens) {
    for (const slot of screen.item_slots ?? []) {
      if (!slotConditionsPass(slot.conditions, input.day)) {
        item_rolls.push({ slot_id: slot.slot_id, item: "empty" });
        continue;
      }
      const pool: [string, number][] = slot.bucket
        .filter((b) => !b.min_band || ALIVENESS_ORDER.indexOf(b.min_band) <= bandRank)
        .map((b) => [b.item, b.weight]);
      item_rolls.push({ slot_id: slot.slot_id, item: weightedPick(rng, pool) ?? "empty" });
    }
  }

  // --- Live leads: pick min..max from the authored pool (selection, never
  // generation). One rng draw picks the count; with the default 2..3 range
  // this is the original coin flip (rng() < 0.5 ? 2 : 3), same rng stream.
  const span = Math.max(0, tuning.live_leads.max - tuning.live_leads.min);
  const leadCount = Math.min(
    input.lead_pool.length,
    tuning.live_leads.min + Math.floor(rng() * (span + 1)),
  );
  const live_leads = sample(rng, [...input.lead_pool].sort(), leadCount);

  // --- Spell-beat order: one random permutation per soul, PER LIFE, not per
  // day (2026-08-31, Roc — "possible to get temper before ignite"). A
  // dedicated seed always keyed to day 1, regardless of `input.day`, so the
  // same (slot, life) produces the identical order on every call — stable
  // across the whole week rather than reshuffled daily. A separate rng
  // stream from `rng` above: sharing one would make the shuffle depend on
  // how many presence/item/lead draws happened first, for no reason.
  const lifeRng = prngFromSeed(daySeed(input.slot, input.life, 1));
  const spell_beat_order: Record<string, string[]> = {};
  for (const soul of souls) {
    const ids = data.sceneGraph.scenes
      .filter((s) => s.soul === soul.soul_id && s.scene_id.startsWith("SPB-"))
      .map((s) => s.scene_id)
      .sort();
    if (ids.length === 0) continue;
    spell_beat_order[soul.soul_id] = sample(lifeRng, ids, ids.length);
  }

  return {
    seed,
    day: input.day,
    slot_fill,
    item_rolls,
    live_leads,
    spell_beat_order,
    aliveness_band: input.aliveness_band,
  };
}

/**
 * Slot conditions the resolver can settle at day-start: day predicates gate an
 * authored appearance (permutation Q3: "a slot's conditions can gate an
 * authored appearance (day >= 4)"). Predicates about play-time state (knows,
 * item_held...) are runtime guards, not day-start facts — passed through here.
 */
function slotConditionsPass(conditions: string[] | undefined, day: number): boolean {
  for (const cond of conditions ?? []) {
    const m = cond.trim().match(/^day\s*(>=|<=|==|=|>|<)\s*(\d+)$/);
    if (!m) continue;
    const n = Number(m[2]);
    const op = m[1] === "=" ? "==" : m[1];
    const pass =
      (op === ">=" && day >= n) ||
      (op === "<=" && day <= n) ||
      (op === "==" && day === n) ||
      (op === ">" && day > n) ||
      (op === "<" && day < n);
    if (!pass) return false;
  }
  return true;
}
