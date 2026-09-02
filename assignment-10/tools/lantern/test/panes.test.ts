import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  UNBOUNDED,
  clamp,
  dynamicMax,
  paneSize,
  readPaneSizes,
  stepValue,
  writePaneSize,
} from "../src/lib/panes";

describe("panes.clamp", () => {
  it("bounds a value into [min,max]", () => {
    expect(clamp(50, 100, 500)).toBe(100);
    expect(clamp(999, 100, 500)).toBe(500);
    expect(clamp(300, 100, 500)).toBe(300);
  });
  it("returns min for non-finite input (garbage guard)", () => {
    expect(clamp(NaN, 100, 500)).toBe(100);
    expect(clamp(Infinity, 100, 500)).toBe(100);
  });
});

describe("panes.stepValue", () => {
  it("moves by a percent of the range, clamped", () => {
    // range 400; +2% = +8px
    expect(stepValue(300, 2, 100, 500)).toBe(308);
    // -10% = -40px
    expect(stepValue(300, -10, 100, 500)).toBe(260);
  });
  it("clamps at the bounds", () => {
    expect(stepValue(495, 10, 100, 500)).toBe(500);
    expect(stepValue(105, -10, 100, 500)).toBe(100);
  });
  it("steps a fixed span when the ceiling is UNBOUNDED", () => {
    // no range to take a percent of — fall back to 400px
    expect(stepValue(300, 2, 100, UNBOUNDED)).toBe(308);
    expect(stepValue(300, -10, 100, UNBOUNDED)).toBe(260);
    // still respects the floor
    expect(stepValue(105, -10, 100, UNBOUNDED)).toBe(100);
  });
});

describe("panes.dynamicMax", () => {
  it("gives a pane everything but the neighbours' reserve", () => {
    expect(dynamicMax(1600, 400, 180)).toBe(1200);
    expect(dynamicMax(3000, 400, 180)).toBe(2600);
  });

  it("never falls below the floor, however cramped the container", () => {
    expect(dynamicMax(500, 400, 180)).toBe(180);
    expect(dynamicMax(300, 400, 180)).toBe(180);
  });

  it("is UNBOUNDED when the container has not been measured", () => {
    // jsdom and pre-layout both report zero — don't fence the user in
    expect(dynamicMax(0, 400, 180)).toBe(UNBOUNDED);
    expect(dynamicMax(NaN, 400, 180)).toBe(UNBOUNDED);
    expect(dynamicMax(-10, 400, 180)).toBe(UNBOUNDED);
  });

  it("clamping against UNBOUNDED leaves the value alone", () => {
    expect(clamp(5000, 180, dynamicMax(0, 400, 180))).toBe(5000);
  });
});

describe("panes storage", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => window.localStorage.clear());

  it("defaults to {} when unset, and paneSize returns the fallback", () => {
    expect(readPaneSizes()).toEqual({});
    expect(paneSize("rail-w", 340)).toBe(340);
  });

  it("round-trips a written size", () => {
    writePaneSize("rail-w", 420);
    expect(readPaneSizes()["rail-w"]).toBe(420);
    expect(paneSize("rail-w", 340)).toBe(420);
  });

  it("defaults on garbage JSON", () => {
    window.localStorage.setItem("lantern-panes-v1", "{not json");
    expect(readPaneSizes()).toEqual({});
    expect(paneSize("rail-w", 340)).toBe(340);
  });

  it("drops non-number values", () => {
    window.localStorage.setItem(
      "lantern-panes-v1",
      JSON.stringify({ "rail-w": "wide", "side-w": 300 })
    );
    expect(readPaneSizes()).toEqual({ "side-w": 300 });
  });
});
