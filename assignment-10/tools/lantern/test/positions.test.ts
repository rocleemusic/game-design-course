import { beforeEach, describe, expect, it } from "vitest";
import {
  applyPositions,
  clearPositions,
  positionScope,
  readPositions,
  writePosition,
} from "../src/lib/positions";

describe("positions", () => {
  beforeEach(() => window.localStorage.clear());

  const scope = positionScope("fixtures", "scene", "SC-T2-04|TB");

  it("reads nothing before anything is dragged", () => {
    expect(readPositions(scope)).toEqual({});
  });

  it("remembers a dragged node and reads it back", () => {
    writePosition(scope, "CH-T2-04", { x: 120, y: 40 });
    expect(readPositions(scope)).toEqual({ "CH-T2-04": { x: 120, y: 40 } });
  });

  it("keeps scopes apart, so one layout never inherits another's coordinates", () => {
    const tb = positionScope("fixtures", "scene", "SC-T2-04|TB");
    const lr = positionScope("fixtures", "scene", "SC-T2-04|LR");
    const other = positionScope("../resolver/out-calib", "scene", "SC-T2-04|TB");
    writePosition(tb, "n1", { x: 1, y: 1 });
    expect(readPositions(lr)).toEqual({});
    expect(readPositions(other)).toEqual({});
    expect(readPositions(tb)).toEqual({ n1: { x: 1, y: 1 } });
  });

  it("clears one scope and leaves the others alone", () => {
    const a = positionScope("d", "scene", "A");
    const b = positionScope("d", "scene", "B");
    writePosition(a, "n1", { x: 1, y: 1 });
    writePosition(b, "n1", { x: 2, y: 2 });
    clearPositions(a);
    expect(readPositions(a)).toEqual({});
    expect(readPositions(b)).toEqual({ n1: { x: 2, y: 2 } });
  });

  it("survives a corrupt blob rather than throwing", () => {
    window.localStorage.setItem("lantern-positions-v1", "{not json");
    expect(readPositions(scope)).toEqual({});
    writePosition(scope, "n1", { x: 5, y: 6 });
    expect(readPositions(scope)).toEqual({ n1: { x: 5, y: 6 } });
  });

  it("drops entries that are not real points", () => {
    window.localStorage.setItem(
      "lantern-positions-v1",
      JSON.stringify({ [scope]: { ok: { x: 1, y: 2 }, bad: { x: "1", y: 2 }, nan: { x: NaN, y: 0 } } })
    );
    expect(readPositions(scope)).toEqual({ ok: { x: 1, y: 2 } });
  });

  describe("applyPositions", () => {
    const nodes = [
      { id: "a", position: { x: 0, y: 0 } },
      { id: "b", position: { x: 10, y: 10 } },
    ];

    it("returns the computed layout untouched when nothing is saved", () => {
      expect(applyPositions(nodes, {})).toBe(nodes);
    });

    it("overlays only the nodes that were dragged", () => {
      const out = applyPositions(nodes, { a: { x: 99, y: 99 } });
      expect(out[0].position).toEqual({ x: 99, y: 99 });
      // a beat added after you arranged the scene keeps its computed spot
      expect(out[1].position).toEqual({ x: 10, y: 10 });
    });
  });
});
