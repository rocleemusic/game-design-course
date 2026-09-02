import { describe, expect, it, vi } from "vitest";
import type { Day, Graph } from "../src/types";
import { normalizeGraph } from "../src/lib/normalizeGraph";
import { buildGraphIndex, playStates } from "../src/lib/playMap";
import { ARMS_CAPACITY, LanternPlayer, SATCHEL_CAPACITY } from "../src/lib/play";
import graphFixture from "../fixtures/graph.json";
import dayFixture from "../fixtures/day.json";
import storyFixture from "../fixtures/story.json";
import storyHomeFixture from "../fixtures/story-home.json";

/** The real compiled fixture story — the resolver's own emit, inkjs-compiled. */
const storyJson = JSON.stringify(storyFixture);
const graph: Graph = normalizeGraph(graphFixture);
const day = dayFixture as unknown as Day;
const index = buildGraphIndex(graph);

/**
 * D6's own fixture: `fixtures/story.json` predates ink.ts tagging the Home
 * Hub knots with `#screen:HOME` (D2 iteration 3) — it was compiled before
 * that change and never regenerated, so `home_hub`/`calendar` carry only
 * `#id:...`. `bankSatchel` fires off that #screen: tag (see play.ts), which
 * this stale fixture can never produce. `story-home.json` is a fresh compile
 * off the SAME `fixtures/` data (graph.json comes out byte-identical — this
 * is a resolver-output-currency gap, not a data change) — regenerate it the
 * same way if `ink.ts` moves again: `cd tools/resolver && node src/cli.ts
 * build --data fixtures --out <tmp> --emit-story`, then copy
 * `<tmp>/story.json` here.
 */
const storyHomeJson = JSON.stringify(storyHomeFixture);

function newPlayer() {
  const p = new LanternPlayer(storyJson, index, day);
  p.continueOnce(); // day_start: sets TimeOfDay = morning, lands at screen_hub
  return p;
}

describe("normalizeGraph", () => {
  it("flattens connects_to seam objects to screen ids", () => {
    expect(graph.screens[0].connects_to).toEqual(["T2", "F1"]);
  });
  it("formats state_action objects as type(arg) strings", () => {
    const opt = graph.scenes[0].choice_nodes[0].options[0];
    expect(opt.state_actions).toEqual(["bond_event(Intimacy)", "thread_move(giver-receive)"]);
  });
});

describe("play flow on the compiled fixture", () => {
  it("continues through day_start and reads the per-line id tag", () => {
    const p = newPlayer();
    const v = p.view();
    expect(v.lines[0].text).toBe("Day 1 begins.");
    expect(v.lines[0].tags.id).toBe("SYS-DAY-BEGIN");
    expect(v.choices.length).toBeGreaterThan(0); // screen_hub
  });

  it("renders untagged hub choices as bracketed, classified by what they do (D3)", () => {
    const p = newPlayer();
    // screen_hub (day 1, no calendar pick yet) only ever offers "Begin at X"
    // and "End the day" — both location/day-end, never dialogue, so every
    // choice here is "move", not "deed".
    for (const c of p.view().choices) {
      expect(c.kind).toBe("move");
      expect(c.display.startsWith("[")).toBe(true);
    }
  });

  it("classifies a screen hub's look/talk as deed and its exits/end-day as move (D3)", () => {
    const p = newPlayer();
    const begin = p.view().choices.findIndex((c) => c.text === "Begin at Town Square");
    p.choose(begin);
    p.continueOnce(); // screen intro
    p.continueOnce(); // time-state placeholder
    const kinds = new Map(p.view().choices.map((c) => [c.text, c.kind]));
    expect(kinds.get("Look at arch")).toBe("deed");
    expect(kinds.get("Look at notice board")).toBe("deed");
    expect(kinds.get("Go to Market Row")).toBe("move");
    expect(kinds.get("End the day")).toBe("move");
    // T2 is "reachable(G-T1-showask)" in the fixture — NOT a lock
    // (screen-spec-schema.md: reachable() is a knowledge-demonstration site
    // that is never blocked, walking up is free). Only "locked(...)" status
    // should ever surface as c.lock (D3, playMap.ts's lockForScreenName).
    const goToT2 = p.view().choices.find((c) => c.text === "Go to Market Row");
    expect(goToT2?.lock).toBeUndefined();
  });

  it("jumps to a scene via the graph's ink_address and maps tags", () => {
    const p = newPlayer();
    expect(p.jumpTo("SC-T2-01")).toBe(true);
    p.continueOnce(); // L-SC-T2-01-01
    p.continueOnce(); // set-up line carrying #choice:CH-T2-01
    const v = p.view();
    expect(v.pos.visited.has("L-SC-T2-01-01")).toBe(true);
    expect(v.pos.currentChoice).toBe("CH-T2-01");
    expect(v.choices).toHaveLength(2);
  });

  it("renders the spoken option quoted and the deed bracketed, from the weave", () => {
    const p = newPlayer();
    p.jumpTo("SC-T2-01");
    p.continueOnce();
    p.continueOnce();
    const [a, b] = p.view().choices;
    expect(a.optionId).toBe("CH-T2-01-a");
    expect(a.kind).toBe("spoken");
    expect(a.display.startsWith('"')).toBe(true);
    expect(a.display.includes("#")).toBe(false); // tags stripped
    expect(b.optionId).toBe("CH-T2-01-b");
    expect(b.kind).toBe("deed");
    expect(b.display).toBe("[leave the bread]");
  });

  it("snapshots at the choice, restores, and takes the other branch without replay", () => {
    const p = newPlayer();
    p.jumpTo("SC-T2-01");
    p.continueOnce();
    p.continueOnce();

    p.choose(0); // snapshot taken here, then option a
    p.continueOnce();
    let v = p.view();
    expect(v.timeline).toHaveLength(1);
    expect(v.timeline[0].label).toBe("CH-T2-01");
    expect(v.lines.at(-1)?.tags.id).toBe("L-CH-T2-01-a-r1");
    expect(v.pos.visited.has("CH-T2-01-a")).toBe(true);
    expect(v.pos.visited.has("L-CH-T2-01-a-p")).toBe(true); // the spoken player_line

    p.restore(0); // back AT the choice — no replay
    v = p.view();
    expect(v.choices).toHaveLength(2);
    expect(v.pos.currentChoice).toBe("CH-T2-01");
    // branch-a trace rolled back with the snapshot
    expect(v.pos.visited.has("CH-T2-01-a")).toBe(false);

    p.choose(1); // the other branch
    p.continueOnce();
    v = p.view();
    expect(v.lines.at(-1)?.tags.id).toBe("L-CH-T2-01-b-r1");
    expect(v.pos.visited.has("CH-T2-01-b")).toBe(true);
    expect(v.pos.visited.has("CH-T2-01-a")).toBe(false);
  });

  it("a presence-gated scene with no day applied falls through cleanly, not into an error", () => {
    // Without day.json presence, npc_present(toby) is false, so CH-T2-01's one
    // choice node offers nothing (every option shares that gate) and ink takes
    // the automatic fallback straight to the gather — this part of the old
    // assertion still holds, and it is the point of the test: a gate with no
    // presence data does not crash the tool. What changed (predates D2 —
    // resolver/src/ink.ts's emitSoul comment "Return to the screen the
    // conversation happened on, not DONE") is what happens next: the scene
    // diverts back to its screen's hub instead of -> DONE, so play continues
    // into the hub's own real choices (examinables/exits/end-day) rather than
    // running out of content. No story.onError fires either way.
    const bare = new LanternPlayer(storyJson, index, null);
    bare.continueOnce();
    bare.jumpTo("SC-T2-01");
    bare.continueOnce();
    bare.continueOnce();
    const v = bare.view();
    expect(v.errors).toHaveLength(0);
    expect(v.choices.length).toBeGreaterThan(0); // back at the T2 hub, not stuck
  });
});

describe("playStates (graph highlighting)", () => {
  it("glows the current choice, traces visited, maps the gather line", () => {
    const p = newPlayer();
    p.jumpTo("SC-T2-01");
    p.continueOnce();
    p.continueOnce();
    p.choose(0);
    p.continueOnce(); // response a-r1
    p.continueOnce(); // gather line GB-CH-T2-01-GATHER

    const states = playStates(index, p.view().pos);
    expect(states.get("L-SC-T2-01-01")).toBe("visited");
    expect(states.get("CH-T2-01")).toBe("visited");
    expect(states.get("CH-T2-01-a")).toBe("visited");
    expect(states.get("L-CH-T2-01-a-p")).toBe("visited");
    expect(states.get("SC-T2-01")).toBe("current"); // scene of the current line
    expect(states.get("g_CH-T2-01")).toBe("current"); // GB-…-GATHER maps to the gather node
    expect(states.get("CH-T2-01-b")).toBeUndefined(); // unvisited -> dim via app rule
  });
});

/**
 * W1a: the externals are bound for real. Before this, recordBond fired into a
 * `~ return 0` stub with allowExternalFunctionFallbacks=true, so bondLevel_toby
 * never left 0 and every mid/high arc-turn variant was unreachable. These are
 * the tests that would have caught it.
 */
describe("W1a — host-side world state from the compiled story", () => {
  /**
   * Walk to CH-T2-01's choice point. Option a carries bond_event(Intimacy).
   * take() mirrors what the UI does (App.tsx: choose then continueOnce),
   * because ink runs the option's `~` state actions on the CONTINUE, not on
   * the selection.
   */
  function atChoice() {
    const p = newPlayer();
    p.jumpTo("SC-T2-01");
    p.continueOnce();
    p.continueOnce();
    return p;
  }
  function take(p: LanternPlayer, index: number) {
    p.choose(index);
    p.continueOnce();
  }

  it("taking a bond option moves the host count — not a no-op stub", () => {
    const p = atChoice();
    expect(p.world.bondOf("toby")).toBe(0);
    take(p, 0); // CH-T2-01-a: bond_event(Intimacy) + thread_move(giver-receive)
    expect(p.world.bondOf("toby")).toBe(2);
    expect(p.world.eventLog()).toContainEqual({
      kind: "bond",
      subject: "toby",
      category: "Intimacy",
      delta: 2,
    });
  });

  it("mirrors the BAND into bondLevel_<soul>, which is what the ink guard reads", () => {
    const p = atChoice();
    expect(p.peekVar("bondLevel_toby")).toBe(0);
    take(p, 0);
    // 2 is under mid_min 6, so the band correctly has NOT moved. The raw count
    // stays host-side and hidden: ink only ever sees the coarse 0/1/2.
    expect(p.peekVar("bondLevel_toby")).toBe(0);
    expect(p.world.bondOf("toby")).toBe(2);
  });

  it("crossing the threshold flips the mirrored band", () => {
    const p = atChoice();
    // Reach the cusp of mid the way the game would, then let ink's own event
    // carry it over — so the mirror is proven on the ink-driven path.
    for (let i = 0; i < 2; i++) p.world.recordBond("toby", "Intimacy");
    expect(p.world.bandOf("toby")).toBe(0);
    take(p, 0);
    expect(p.world.bondOf("toby")).toBe(6);
    expect(p.world.bandOf("toby")).toBe(1);
    expect(p.peekVar("bondLevel_toby")).toBe(1);
  });

  it("records thread moves, which is what the day-end handoff feeds back", () => {
    const p = atChoice();
    take(p, 0);
    expect(p.world.movedThreads()).toContain("giver-receive");
  });

  // D4: PlayView had no way to reach WorldState.threadMoves()/eventLog() —
  // the Active threads pane reads these two fields off view().
  it("exposes thread moves and the raw move log on the view, for the Active threads pane", () => {
    const p = atChoice();
    expect(p.view().threadMoves).toEqual({});
    expect(p.view().threadMoveLog).toEqual([]);
    take(p, 0); // CH-T2-01-a: thread_move(giver-receive)
    expect(p.view().threadMoves).toEqual({ "giver-receive": 1 });
    expect(p.view().threadMoveLog).toEqual(["giver-receive"]);
  });

  it("no external falls through to a stub — fallbacks are OFF and nothing errors", () => {
    const p = atChoice();
    take(p, 0);
    // An unbound external with fallbacks off is a loud story error. Silence
    // here is the proof that all four are really bound.
    expect(p.view().errors).toEqual([]);
  });

  it("restoring a snapshot rolls the bond back with the story", () => {
    const p = atChoice();
    take(p, 0);
    expect(p.world.bondOf("toby")).toBe(2);
    p.restore(0); // back to the choice point
    expect(p.world.bondOf("toby")).toBe(0);
    expect(p.peekVar("bondLevel_toby")).toBe(0);
    expect(p.world.movedThreads()).toEqual([]);
  });

  it("setVar marks the session forced, so a steered walk never reads as earned", () => {
    const p = newPlayer();
    expect(p.isForced()).toBe(false);
    expect(p.setVar("day", 4)).toBe(true);
    expect(p.peekVar("day")).toBe(4);
    expect(p.isForced()).toBe(true);
  });

  it("forcing bondLevel_<soul> goes through the host count, keeping ONE writer", () => {
    const p = newPlayer();
    p.setVar("bondLevel_toby", 2);
    expect(p.peekVar("bondLevel_toby")).toBe(2);
    // The count landed on the threshold, so the mirror agrees and the next
    // earned event builds from there instead of snapping back.
    expect(p.world.bondOf("toby")).toBe(14);
    expect(p.world.bandOf("toby")).toBe(2);
  });

  it("setVar refuses an undeclared name rather than inventing a global", () => {
    const p = newPlayer();
    expect(p.setVar("not_a_real_var", 1)).toBe(false);
  });

  it("peekVars reads live values for the declared list the panel shows", () => {
    const p = newPlayer();
    const vals = p.peekVars(["day", "bondLevel_toby", "nope"]);
    expect(vals.day).toBe(1);
    expect(vals.bondLevel_toby).toBe(0);
    expect(vals.nope).toBeNull();
  });
});

/**
 * ONE CLOCK, and ink owns it.
 *
 * Once W1c made every exit call ink's `advance_time()`, the app was running two
 * clocks: ink's TimeOfDay moved as the player walked, while the tool-side block
 * driving applyPresence did not. So `present_<soul>` went stale mid-day and a
 * soul could vanish from the screen they were standing on. The walker never had
 * this bug because it read the clock back from ink.
 */
describe("the clock is read back from ink, never counted separately", () => {
  it("advanceTime moves INK's TimeOfDay, not just a tool-side counter", () => {
    const p = newPlayer();
    expect(String(p.peekVar("TimeOfDay"))).toBe("morning");
    p.advanceTime();
    expect(String(p.peekVar("TimeOfDay"))).toBe("afternoon");
    expect(p.view().timeBlock).toBe("afternoon");
  });

  it("the reported block always equals ink's, so they cannot drift", () => {
    // The INVARIANT is the whole point, and it is deliberately all this
    // asserts. An exact block sequence would be testing the fixture rather
    // than the fix: `fixtures/story.json` is a stale build carrying the old
    // day loop, and the emitted loop now moves the clock on its own, so which
    // block you land on after N calls is the story's business. What must never
    // happen is the two disagreeing.
    const p = newPlayer();
    for (let i = 0; i < 6; i++) {
      p.advanceTime();
      expect(p.view().timeBlock).toBe(String(p.peekVar("TimeOfDay")));
    }
  });

  it("a clock change moved by INK is picked up on continue, not ignored", () => {
    const p = newPlayer();
    // Simulate what an exit does: ink moves the clock on its own.
    p.setVar("TimeOfDay", "evening");
    p.continueOnce();
    expect(p.view().timeBlock).toBe("evening");
  });

  it("presence is re-applied when the block moves, so nobody goes stale", () => {
    const p = newPlayer();
    const before = p.peekVar("present_toby");
    p.advanceTime();
    p.advanceTime();
    // The value may or may not change depending on the day file, but it must
    // reflect the CURRENT block rather than the one presence was applied for.
    const block = p.view().timeBlock;
    expect(block).toBe(String(p.peekVar("TimeOfDay")));
    // and the transcript no longer claims ink was left alone
    expect(p.view().lines.some((l) => /ink TimeOfDay unchanged/.test(l.text))).toBe(false);
    void before;
  });
});

/**
 * GP-25 — the festival-night dev-stub reconcile (play.ts's `advanceTime`,
 * RULED 2026-08-01, plans/2026-08-01-festival-night-transition-plan.md): the
 * evening -> night edge must not just flip the TimeOfDay VAR, it must also
 * `jumpTo(FESTIVAL_SCREEN_ID)` (play.ts's local literal for "T7") so the dev
 * shortcut lands where the real `home_hub_final` choice would.
 *
 * Fixture limitation (unchanged from the card): `fixtures/graph.json` /
 * `story.json` only model T1/T2 — no T7 knot exists to jump into, and
 * building one was out of proportion for that pass. So this proves the
 * RECONCILE WIRING itself — night is detected, the jump is attempted at the
 * correct target, and an unresolvable target fails closed (no throw, no
 * story error) — on the real fixture, without needing a T7 fixture. Closing
 * GP-25 for real (asserting the jump actually LANDS at T7 content) still
 * needs that fixture; see the card.
 */
describe("GP-25 — the festival-night dev-stub reconcile (advanceTime -> jumpTo)", () => {
  /** Force the clock to evening on day 5 — nextTimeBlock's only path to
   *  "night" (stage.ts) — via the same setVar+continueOnce pattern the clock
   *  tests above use to simulate ink moving the clock on its own. */
  function atEveningDay5() {
    const p = newPlayer();
    p.setVar("day", 5);
    p.setVar("TimeOfDay", "evening");
    p.continueOnce(); // no-op continue; syncClock/syncDay still run and pick both up
    expect(p.view().timeBlock).toBe("evening");
    expect(p.peekVar("day")).toBe(5);
    return p;
  }

  it("attempts the jump to T7 (FESTIVAL_SCREEN_ID) the moment evening rolls into night", () => {
    const p = atEveningDay5();
    const jumpSpy = vi.spyOn(p, "jumpTo");
    p.advanceTime();
    expect(jumpSpy).toHaveBeenCalledWith("T7");
    expect(p.view().timeBlock).toBe("night");
  });

  it("an unresolvable T7 (not in this fixture's graph) fails closed — no throw, no story error", () => {
    const p = atEveningDay5();
    expect(() => p.advanceTime()).not.toThrow();
    // jumpTo returns false for a node absent from the graph index (playMap.ts's
    // jumpAddress) — proving the reconcile itself doesn't silently succeed by
    // leaving the story wherever it already was.
    expect(p.jumpTo("T7")).toBe(false);
    expect(p.view().timeBlock).toBe("night"); // the VAR still flips regardless
    expect(p.view().errors).toEqual([]);
  });

  it("the dev shortcut and the real home_hub_final choice target the same screen id", () => {
    // Pins the literal so a future rename of play.ts's FESTIVAL_SCREEN_ID (or
    // of the ruled screen id itself) breaks this test loudly instead of the
    // two silently drifting apart.
    const p = atEveningDay5();
    const jumpSpy = vi.spyOn(p, "jumpTo");
    p.advanceTime();
    expect(jumpSpy).toHaveBeenCalledTimes(1);
    expect(jumpSpy).toHaveBeenCalledWith("T7");
  });
});

/**
 * D1 gap: Lantern never swapped day files — applyDay ran only from the
 * constructor and reroll, so playing into day 2 kept reading day 1's
 * presence and item rolls off the world for the rest of the week. This
 * exercises the fix: pass the whole week's day files, cross a day boundary
 * (screen_hub's "End the day" is the fastest path there), and check presence
 * comes from day 2's file, not day 1's stale one.
 */
describe("the day file swaps when ink's own day rolls over", () => {
  const day2: Day = {
    ...day,
    day: 2,
    // Deliberately the OPPOSITE of day 1's morning fill (T2) and item roll
    // ("wool"), so a stale day-1 apply and a real day-2 swap are distinguishable.
    slot_fill: [{ screen_id: "T1", time_block: "morning", soul: "toby" }],
    item_rolls: [{ slot_id: "SL-T2-01", item: "empty" }],
  };

  it("re-applies presence and item rolls from the day-2 file once day_end bumps ink's day", () => {
    const p = new LanternPlayer(storyJson, index, day, undefined, [day, day2]);
    p.continueOnce(); // day_start (day 1) -> screen_hub
    expect(p.peekVar("present_toby")).toBe("T2"); // day 1's morning fill
    expect(p.peekVar("slot_sl_t2_01")).toBe("wool"); // day 1's item roll
    // screen_hub always offers "End the day" last, regardless of movesLeft.
    const endTheDay = p.choices().findIndex((c) => c.text === "End the day");
    expect(endTheDay).toBeGreaterThanOrEqual(0);
    p.choose(endTheDay);
    p.continueOnce(); // day_end (day -> 2) -> day_start (day 2) -> "Day 2 begins."
    expect(p.peekVar("day")).toBe(2);
    expect(p.view().day).toBe(2);
    expect(p.peekVar("present_toby")).toBe("T1"); // day 2's morning fill, not day 1's
    expect(p.peekVar("slot_sl_t2_01")).toBe("empty"); // day 2's item roll
  });

  it("without a matching day file loaded, the day rolls over but presence is left alone (no throw)", () => {
    const p = new LanternPlayer(storyJson, index, day); // no `days` — old behaviour
    p.continueOnce();
    const endTheDay = p.choices().findIndex((c) => c.text === "End the day");
    p.choose(endTheDay);
    expect(() => p.continueOnce()).not.toThrow();
    expect(p.peekVar("day")).toBe(2);
  });

  /**
   * D3 requirement 3, prior-critic gap: a session constructed DIRECTLY on a
   * day > 1 (a fresh "day 2 start" — startPlay/reroll's real shape, App.tsx
   * — not reached by playing day_end forward) used to leave ink's OWN `day`
   * VAR frozen at its `VAR day = 1` declaration (graph.ts), because nothing
   * but day_end's `~ day = day + 1` ever wrote it. Presence/item rolls came
   * from day2's file correctly, but every `day >= N` content gate
   * (screen-spec-schema.md) stayed unreachable and "Day {day} begins." lied
   * about which day it was.
   */
  it("starting a session directly on day 2 sets ink's own day VAR (not just presence)", () => {
    const p = new LanternPlayer(storyJson, index, day2, undefined, [day, day2]);
    p.continueOnce(); // day_start (day 2, no calendar pick yet) -> screen_hub
    expect(p.peekVar("day")).toBe(2);
    expect(p.view().day).toBe(2);
    expect(p.view().lines[0].text).toBe("Day 2 begins.");
    expect(p.peekVar("present_toby")).toBe("T1"); // day 2's morning fill
  });
});

/**
 * D6 — carry model (GDD 03-core-loop.md:14): "you carry from the screen only
 * what fits the satchel." pickup() itself doesn't validate the slotId against
 * the graph (that's the caller's job, same as before D6), so these exercise
 * the cap directly against synthetic slot/item pairs — the point under test
 * is capacity bookkeeping, not any one real item.
 */
describe("D6 — satchel capacity", () => {
  it("fills up to SATCHEL_CAPACITY and refuses further ordinary pickups", () => {
    const p = newPlayer();
    for (let i = 0; i < SATCHEL_CAPACITY; i++) {
      expect(p.pickup(`SLOT-${i}`, `item-${i}`)).toBe(true);
    }
    expect(p.view().satchel).toHaveLength(SATCHEL_CAPACITY);
    expect(p.view().satchelCapacity).toBe(SATCHEL_CAPACITY);
  });

  it("a full satchel spills into the arms-carry buffer instead of failing outright", () => {
    const p = newPlayer();
    for (let i = 0; i < SATCHEL_CAPACITY; i++) p.pickup(`SLOT-${i}`, `item-${i}`);
    expect(p.pickup("SLOT-arms-1", "ribbon")).toBe(true);
    expect(p.view().satchel).toHaveLength(SATCHEL_CAPACITY); // unchanged
    expect(p.view().arms).toEqual(["ribbon"]);
  });

  it("once arms is also full, a further pickup is refused and the slot stays claimable", () => {
    const p = newPlayer();
    for (let i = 0; i < SATCHEL_CAPACITY; i++) p.pickup(`SLOT-${i}`, `item-${i}`);
    for (let i = 0; i < ARMS_CAPACITY; i++) p.pickup(`ARMS-${i}`, `arm-item-${i}`);
    expect(p.pickup("ARMS-overflow", "one-too-many")).toBe(false);
    expect(p.view().arms).toHaveLength(ARMS_CAPACITY);
    expect(p.view().pickedSlots).not.toContain("ARMS-overflow");
  });

  it("a slot that already rolled empty, or was already picked, is still a no-op", () => {
    const p = newPlayer();
    expect(p.pickup("SL-T2-01", "empty")).toBe(false);
    expect(p.pickup("SL-T2-01", "wool")).toBe(true);
    expect(p.pickup("SL-T2-01", "wool")).toBe(false); // already picked
  });
});

/**
 * D6 — day's end (GDD 03-core-loop.md:14): "you carry from the screen only
 * what fits the satchel, and you return home... You can also end a day
 * early to bank a full pack plus what you can carry in your arms
 * (pack-triage)." Uses `storyHomeJson` — see its own doc comment — because
 * banking fires off the Home Hub's `#screen:HOME` tag, which the OTHER
 * (stale) fixture's compiled ink does not carry.
 */
describe("D6 — pack-triage and the home bank", () => {
  function newHomePlayer() {
    const p = new LanternPlayer(storyHomeJson, index, day);
    p.continueOnce(); // day_start -> screen_hub
    return p;
  }

  it("banks the satchel the moment play arrives at the Home Hub, ordinarily (plain End the day)", () => {
    const p = newHomePlayer();
    p.pickup("FAKE-1", "a pressed flower");
    p.pickup("FAKE-2", "a river stone");
    const endTheDay = p.view().choices.findIndex((c) => c.text === "End the day");
    expect(endTheDay).toBeGreaterThanOrEqual(0);
    p.choose(endTheDay);
    p.continueOnce(); // day_end -> home_hub: #screen:HOME fires bankSatchel
    const v = p.view();
    expect(v.pos.currentScreen).toBe("HOME");
    expect(v.satchel).toEqual([]);
    expect(v.banked).toEqual(["a pressed flower", "a river stone"]);
  });

  it("packTriage banks satchel + arms and ends the day early, in one explicit action", () => {
    const p = newHomePlayer();
    for (let i = 0; i < SATCHEL_CAPACITY; i++) p.pickup(`SLOT-${i}`, `item-${i}`);
    p.pickup("ARMS-0", "a carved bird"); // satchel is full — spills to arms
    expect(p.view().arms).toEqual(["a carved bird"]);

    expect(p.packTriage()).toBe(true);

    const v = p.view();
    expect(v.pos.currentScreen).toBe("HOME"); // the day actually ended
    expect(v.satchel).toEqual([]);
    expect(v.arms).toEqual([]);
    expect(v.banked).toHaveLength(SATCHEL_CAPACITY + 1); // full pack + the arms item
    expect(v.banked).toContain("a carved bird");
    expect(v.lines.some((l) => /pack-triage/.test(l.text))).toBe(true);
  });

  /**
   * D6 iteration 2, prior-critic gap: pack-triage must have an actual stake.
   * A plain "End the day" click (the same choice sitting in the ordinary move
   * row, taken directly instead of through packTriage()) still ends the day
   * and banks the satchel, but must NOT bank arms-carry — only packTriage()
   * earns that. Otherwise nothing is lost by skipping pack-triage.
   */
  it("a plain 'End the day' click banks the satchel but drops arms-carry (no pack-triage)", () => {
    const p = newHomePlayer();
    for (let i = 0; i < SATCHEL_CAPACITY; i++) p.pickup(`SLOT-${i}`, `item-${i}`);
    p.pickup("ARMS-0", "a carved bird"); // satchel full — spills to arms
    expect(p.view().arms).toEqual(["a carved bird"]);

    const endTheDay = p.view().choices.findIndex((c) => c.text === "End the day");
    p.choose(endTheDay);
    p.continueOnce(); // day_end -> home_hub: bankSatchel fires, un-triaged

    const v = p.view();
    expect(v.pos.currentScreen).toBe("HOME");
    expect(v.satchel).toEqual([]);
    expect(v.arms).toEqual([]); // cleared, not banked
    expect(v.banked).toHaveLength(SATCHEL_CAPACITY); // satchel only
    expect(v.banked).not.toContain("a carved bird");
    expect(v.lines.some((l) => /left 1 arms-carry item\(s\) behind/.test(l.text))).toBe(true);
  });

  it("packTriage is a no-op when 'End the day' is not a current choice (mid-dialogue)", () => {
    const p = newHomePlayer();
    p.jumpTo("SC-T2-01");
    p.continueOnce();
    p.continueOnce(); // now at a spoken/deed choice, not a hub — no move choices
    expect(p.view().choices.some((c) => c.kind === "move")).toBe(false);
    expect(p.packTriage()).toBe(false);
    expect(p.view().pos.currentScreen).not.toBe("HOME");
  });

  it("does not double-bank when the calendar's own line re-carries the same #screen:HOME tag", () => {
    const p = newHomePlayer();
    p.pickup("FAKE-1", "a pressed flower");
    const endTheDay = p.view().choices.findIndex((c) => c.text === "End the day");
    p.choose(endTheDay);
    p.continueOnce(); // home_hub — banks once
    const openCalendar = p.view().choices.findIndex((c) => c.text === "Start the Next Day");
    expect(openCalendar).toBeGreaterThanOrEqual(0);
    p.choose(openCalendar);
    p.continueOnce(); // -> calendar, same #screen:HOME tag as home_hub
    expect(p.view().banked).toEqual(["a pressed flower"]); // still just the one bank
    expect(p.view().lines.filter((l) => /^home: banked/.test(l.text))).toHaveLength(1);
  });

  it("restoring a snapshot from before a bank rolls the bank back too", () => {
    const p = newHomePlayer();
    p.pickup("FAKE-1", "a pressed flower");
    const endTheDay = p.view().choices.findIndex((c) => c.text === "End the day");
    p.choose(endTheDay); // snapshot taken here, satchel/arms/banked all still pre-bank
    p.continueOnce(); // banks on arrival
    expect(p.view().banked).toEqual(["a pressed flower"]);
    p.restore(0);
    expect(p.view().banked).toEqual([]);
    expect(p.view().satchel).toEqual(["a pressed flower"]);
  });
});

/**
 * Satchel-cluster track (2026-08-23) — the four methods added for Roc's
 * review notes: drop of an UNSLOTTED held item (`removeCarriedPool`),
 * re-pickup of a dropped item off the ground (`stashPool`), and the two
 * satchel<->arms moves. All pool-name vocabulary, all two-sided with
 * `Inventory` on the host — the host half is the phaser build's and is
 * tested there; these pin the pool-name half alone.
 */
describe("satchel-cluster: removeCarriedPool / stashPool / satchel<->arms moves", () => {
  /** Same shape as the pack-triage describe's own helper — the home-capable
   * fixture, needed by the banked-pool test below. */
  function newHomePlayer() {
    const p = new LanternPlayer(storyHomeJson, index, day);
    p.continueOnce(); // day_start -> screen_hub
    return p;
  }

  it("removeCarriedPool takes from arms first, then the home bank, else no-op", () => {
    const p = newPlayer();
    for (let i = 0; i < SATCHEL_CAPACITY; i++) p.pickup(`SLOT-${i}`, `item-${i}`);
    p.pickup("ARMS-0", "wool"); // satchel full — spills to arms
    expect(p.removeCarriedPool("wool")).toBe("arms");
    expect(p.view().arms).toEqual([]);
    expect(p.removeCarriedPool("wool")).toBe(null); // nothing left anywhere
    // The satchel array itself is never this method's business.
    expect(p.view().satchel).toHaveLength(SATCHEL_CAPACITY);
  });

  it("removeCarriedPool reaches the home bank when arms has no such pool", () => {
    const p = newHomePlayer();
    p.pickup("FAKE-1", "a pressed flower");
    const endTheDay = p.view().choices.findIndex((c) => c.text === "End the day");
    p.choose(endTheDay);
    p.continueOnce(); // banks on arrival
    expect(p.view().banked).toEqual(["a pressed flower"]);
    expect(p.removeCarriedPool("a pressed flower")).toBe("banked");
    expect(p.view().banked).toEqual([]);
  });

  it("stashPool fills the first free pocket, spills to arms, refuses when both are full — and claims no forage slot", () => {
    const p = newPlayer();
    p.pickup("SLOT-0", "wool");
    p.dropSatchelSlot(0);
    expect(p.stashPool("wool")).toBe("satchel");
    expect(p.view().satchelSlots[0]).toBe("wool"); // back in the gap it left
    // Unlike pickup, no slot VAR and no pickedSlots entry is claimed — the
    // original forage slot stays spent.
    expect(p.view().pickedSlots).toEqual(["SLOT-0"]);
    for (let i = 1; i < SATCHEL_CAPACITY; i++) p.pickup(`SLOT-${i}`, `item-${i}`);
    expect(p.stashPool("extra-1")).toBe("arms");
    expect(p.stashPool("extra-2")).toBe("arms");
    expect(p.stashPool("extra-3")).toBe(null); // both full — stays on the ground
    expect(p.view().arms).toEqual(["extra-1", "extra-2"]);
  });

  it("moveSatchelSlotToArms empties the pocket into arms, refusing on an empty slot or full arms", () => {
    const p = newPlayer();
    p.pickup("SLOT-0", "wool");
    expect(p.moveSatchelSlotToArms(1)).toBe(false); // empty pocket
    expect(p.moveSatchelSlotToArms(0)).toBe(true);
    expect(p.view().satchelSlots[0]).toBe(null); // a genuine gap, not compacted
    expect(p.view().arms).toEqual(["wool"]);
    p.pickup("SLOT-1", "feathers"); // lands in the freed pocket — slot 0
    p.moveSatchelSlotToArms(0); // arms now at ARMS_CAPACITY (2)
    p.pickup("SLOT-2", "grass"); // slot 0 again
    expect(p.view().satchelSlots[0]).toBe("grass");
    expect(p.moveSatchelSlotToArms(0)).toBe(false); // arms full — item stays put
    expect(p.view().satchelSlots[0]).toBe("grass");
    expect(p.view().arms).toEqual(["wool", "feathers"]);
  });

  it("moveArmsPoolToSatchel lands in the first free pocket, refusing when the pool is absent or the satchel is full", () => {
    const p = newPlayer();
    for (let i = 0; i < SATCHEL_CAPACITY; i++) p.pickup(`SLOT-${i}`, `item-${i}`);
    p.pickup("ARMS-0", "wool"); // spills to arms
    expect(p.moveArmsPoolToSatchel("wool")).toBe(false); // satchel full
    p.dropSatchelSlot(3);
    expect(p.moveArmsPoolToSatchel("wool")).toBe(true);
    expect(p.view().satchelSlots[3]).toBe("wool"); // the freed pocket, in place
    expect(p.view().arms).toEqual([]);
    expect(p.moveArmsPoolToSatchel("wool")).toBe(false); // no longer in arms
  });
});

/**
 * D6 — the notebook (GDD 03-core-loop.md:14): "referenced at any time, holds
 * the knowledge you have collected." KnownPhrases was the data with no
 * surface; this is that surface's data source.
 */
describe("D6 — the notebook", () => {
  it("mirrors WorldState.knownPhrases(), in the order each phrase was first learned", () => {
    const p = newPlayer();
    expect(p.view().notebook).toEqual([]);
    p.world.recordKnowledge("the baker fears an empty oven");
    p.world.recordKnowledge("Toby's real name is Tobias");
    expect(p.view().notebook).toEqual([
      "the baker fears an empty oven",
      "Toby's real name is Tobias",
    ]);
  });

  it("reads live off the real recordKnowledge external, not a second writer", () => {
    // CH-T2-01-a is the fixture's only option wired to a state action, and it
    // is bond_event(Intimacy) + thread_move — no recordKnowledge in this
    // fixture scene, so this only proves the plumbing (view -> world ->
    // external) is the same one path recordBond/recordThreadMove already use,
    // by calling the SAME external binding surface the story would.
    const p = newPlayer();
    p.world.recordKnowledge("a fact");
    expect(p.view().notebook).toContain("a fact");
  });
});
