import { describe, expect, it } from "vitest";
import type { BondTuning } from "../src/types";
import { bondBandOf, bondDelta, DEFAULT_BOND_TUNING, WorldState } from "../src/lib/world";

/**
 * Host-side world state (W1a). These tests pin the SHAPE of the bond rule as
 * hard as the numbers, because the shape is a guardrail: ONE hidden count per
 * soul, with the four categories acting only as weights on a single delta.
 */

const tuning: BondTuning = {
  category_weights: { Trust: 2, Intimacy: 2, Recognition: 3, Respect: 2 },
  trait_coefficients: { _default: 1.0, ilsa: 0.7 },
  band_thresholds: { mid_min: 6, high_min: 14 },
  demo_multiplier: 1.0,
};

describe("bond scoring", () => {
  it("bands on inclusive minimums, using the values predicates.ts compiles against", () => {
    expect(bondBandOf(0, tuning)).toBe(0);
    expect(bondBandOf(5, tuning)).toBe(0);
    expect(bondBandOf(6, tuning)).toBe(1);
    expect(bondBandOf(13, tuning)).toBe(1);
    expect(bondBandOf(14, tuning)).toBe(2);
  });

  it("weights the delta by category and scales it by the soul's trait coefficient", () => {
    expect(bondDelta("Intimacy", "toby", tuning)).toBe(2);
    expect(bondDelta("Recognition", "toby", tuning)).toBe(3);
    expect(bondDelta("Intimacy", "ilsa", tuning)).toBeCloseTo(1.4);
    expect(bondDelta("Intimacy", "nobody", tuning)).toBe(2); // _default
    expect(bondDelta("Flattery", "toby", tuning)).toBe(0); // outside the closed enum
  });

  it("demo_multiplier scales the delta, never the thresholds", () => {
    const demo = { ...tuning, demo_multiplier: 2 };
    expect(bondDelta("Intimacy", "toby", demo)).toBe(4);
    expect(demo.band_thresholds).toEqual(tuning.band_thresholds);
  });
});

describe("WorldState", () => {
  it("accumulates ONE count per soul — never a per-category score", () => {
    const w = new WorldState(tuning);
    w.recordBond("toby", "Intimacy");
    w.recordBond("toby", "Recognition");
    expect(w.bondOf("toby")).toBe(5);
    // The guardrail, asserted structurally: the only per-soul number this class
    // exposes is the single count. If a per-category getter ever appears, this
    // is the test that should have to be deleted first — guardrails.md check 2
    // calls a second stored bond number the quantified-emotion model the
    // pipeline refuses.
    expect(Object.keys(w as unknown as object)).not.toContain("byCategory");
    const perSoul = w.scoredSouls().map((s) => typeof w.bondOf(s));
    expect(perSoul).toEqual(["number"]);
  });

  it("keeps souls independent", () => {
    const w = new WorldState(tuning);
    w.recordBond("toby", "Intimacy");
    expect(w.bondOf("ilsa")).toBe(0);
    expect(w.bandOf("ilsa")).toBe(0);
  });

  it("moves a band once the count crosses, and reaches high in two lives", () => {
    const w = new WorldState(tuning);
    // An attentive life on the slice's content: 4 Intimacy beats = 8.
    for (let i = 0; i < 4; i++) w.recordBond("toby", "Intimacy");
    expect(w.bondOf("toby")).toBe(8);
    expect(w.bandOf("toby")).toBe(1); // RULED: one life earns mid
    for (let i = 0; i < 4; i++) w.recordBond("toby", "Intimacy");
    expect(w.bandOf("toby")).toBe(2); // RULED: a second life reaches high
  });

  it("counts thread moves and lists the moved ones for the day-end handoff", () => {
    const w = new WorldState(tuning);
    w.recordThreadMove("giver-receive");
    w.recordThreadMove("giver-receive");
    w.recordThreadMove("kinbound-absence");
    expect(w.threadMoves()).toEqual({ "giver-receive": 2, "kinbound-absence": 1 });
    expect(w.movedThreads().sort()).toEqual(["giver-receive", "kinbound-absence"]);
  });

  it("tracks the event-log index each thread last moved at, not just a count", () => {
    const w = new WorldState(tuning);
    w.recordBond("toby", "Intimacy"); // event 0
    w.recordThreadMove("giver-receive"); // event 1 -> last moved at 1
    w.recordBond("toby", "Intimacy"); // event 2
    w.recordBond("toby", "Intimacy"); // event 3
    w.recordThreadMove("kinbound-absence"); // event 4 -> last moved at 4
    w.recordThreadMove("giver-receive"); // event 5 -> last moved at 5 (overwritten)
    expect(w.threadLastMovedIndex()).toEqual({
      "giver-receive": 5,
      "kinbound-absence": 4,
    });
  });

  it("computes staleness as events elapsed since a thread's last move", () => {
    const w = new WorldState(tuning);
    w.recordThreadMove("giver-receive"); // event 0
    w.recordBond("toby", "Intimacy"); // event 1
    w.recordBond("toby", "Recognition"); // event 2
    expect(w.threadStaleness("giver-receive")).toBe(3); // 3 events since it moved (log length 3, last-moved index 0)
    expect(w.threadStaleness("kinbound-absence")).toBe(3); // never moved: full log length
  });

  it("round-trips last-moved indices through snapshot/restore", () => {
    const w = new WorldState(tuning);
    w.recordThreadMove("giver-receive");
    const snap = w.snapshot();
    w.recordBond("toby", "Intimacy");
    w.recordThreadMove("giver-receive");
    w.restore(snap);
    expect(w.threadLastMovedIndex()).toEqual({ "giver-receive": 0 });
  });

  it("records knowledge and canon without claiming to own them", () => {
    const w = new WorldState(tuning);
    w.recordKnowledge("saw_apron");
    w.recordCanonWrite("bram is not coming");
    expect(w.knownPhrases()).toEqual(["saw_apron"]);
    expect(w.canonWrites()).toEqual(["bram is not coming"]);
  });

  it("logs why a number is what it is, without storing a second score", () => {
    const w = new WorldState(tuning);
    w.recordBond("toby", "Recognition");
    expect(w.eventLog()).toEqual([
      { kind: "bond", subject: "toby", category: "Recognition", delta: 3 },
    ]);
  });

  it("round-trips through snapshot/restore", () => {
    const w = new WorldState(tuning);
    w.recordBond("toby", "Intimacy");
    w.recordThreadMove("giver-receive");
    const snap = w.snapshot();
    w.recordBond("toby", "Intimacy");
    w.recordThreadMove("giver-receive");
    expect(w.bondOf("toby")).toBe(4);
    w.restore(snap);
    expect(w.bondOf("toby")).toBe(2);
    expect(w.threadMoves()).toEqual({ "giver-receive": 1 });
  });

  it("setBond forces a count and logs it without a category, so it reads as forced", () => {
    const w = new WorldState(tuning);
    w.setBond("ilsa", 14);
    expect(w.bandOf("ilsa")).toBe(2);
    expect(w.eventLog()[0].category).toBeUndefined();
  });

  it("defaults are usable standalone, for a graph.json built before W1a", () => {
    const w = new WorldState(DEFAULT_BOND_TUNING);
    w.recordBond("toby", "Intimacy");
    expect(w.bondOf("toby")).toBe(2);
  });
});
