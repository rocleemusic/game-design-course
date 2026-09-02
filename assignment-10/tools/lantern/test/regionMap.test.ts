import { describe, expect, it } from "vitest";
import {
  deletePendingRegionEntry,
  mergeRegionEntry,
  overlayRegions,
  pendingRegionGet,
  regionMapGet,
  setPendingRegionEntry,
  type PendingRegionMap,
  type RegionMap,
} from "../src/lib/regionMap";
import type { Graph } from "../src/types";

function graph(): Graph {
  return {
    screens: [
      {
        screen_id: "T1",
        location: "town",
        name: "T1",
        status: "start",
        gates: [],
        connects_to: [],
        ink_address: "T1",
        regions: [
          { region_id: "r_board", shape: null },
          { region_id: "r_crates", shape: { rect: { x: 0.1, y: 0.1, w: 0.2, h: 0.2 } } },
        ],
      },
      {
        screen_id: "T2",
        location: "town",
        name: "T2",
        status: "start",
        gates: [],
        connects_to: [],
        ink_address: "T2",
        regions: [{ region_id: "r_board", shape: null }],
      },
    ],
    seams: [],
    scenes: [],
    variables: [],
  };
}

describe("overlayRegions", () => {
  it("patches a matching screen+region with the map's rect", () => {
    const map: RegionMap = { screens: { T1: { r_board: { x: 0.4, y: 0.3, w: 0.1, h: 0.1 } } } };
    const patched = overlayRegions(graph(), map);
    const region = patched.screens[0].regions!.find((r) => r.region_id === "r_board");
    expect(region!.shape).toEqual({ rect: { x: 0.4, y: 0.3, w: 0.1, h: 0.1 } });
  });

  it("ignores an orphan entry for an unknown screen or region", () => {
    const map: RegionMap = {
      screens: {
        GHOST_SCREEN: { r_board: { x: 0, y: 0, w: 0.1, h: 0.1 } },
        T1: { ghost_region: { x: 0, y: 0, w: 0.1, h: 0.1 } },
      },
    };
    const patched = overlayRegions(graph(), map);
    // T1's real regions are untouched — no throw, no spurious patch.
    expect(patched.screens[0].regions).toEqual(graph().screens[0].regions);
  });

  it("the same region_id on two different screens does not collide", () => {
    const map: RegionMap = {
      screens: {
        T1: { r_board: { x: 0.1, y: 0.1, w: 0.1, h: 0.1 } },
        T2: { r_board: { x: 0.5, y: 0.5, w: 0.1, h: 0.1 } },
      },
    };
    const patched = overlayRegions(graph(), map);
    const t1 = patched.screens[0].regions!.find((r) => r.region_id === "r_board");
    const t2 = patched.screens[1].regions!.find((r) => r.region_id === "r_board");
    expect(t1!.shape).toEqual({ rect: map.screens.T1.r_board });
    expect(t2!.shape).toEqual({ rect: map.screens.T2.r_board });
  });

  it("does not mutate the input graph or map", () => {
    const g = graph();
    const gCopy = JSON.parse(JSON.stringify(g));
    const map: RegionMap = { screens: { T1: { r_board: { x: 0.4, y: 0.3, w: 0.1, h: 0.1 } } } };
    const mapCopy = JSON.parse(JSON.stringify(map));
    overlayRegions(g, map);
    expect(g).toEqual(gCopy);
    expect(map).toEqual(mapCopy);
  });

  it("leaves a screen with no regions array alone", () => {
    const g: Graph = {
      screens: [{ screen_id: "T3", location: "town", name: "T3", status: "start", gates: [], connects_to: [], ink_address: "T3" }],
      seams: [],
      scenes: [],
      variables: [],
    };
    const map: RegionMap = { screens: { T3: { r_x: { x: 0, y: 0, w: 0.1, h: 0.1 } } } };
    expect(() => overlayRegions(g, map)).not.toThrow();
    expect(overlayRegions(g, map).screens[0].regions).toBeUndefined();
  });
});

describe("mergeRegionEntry", () => {
  it("adds a new entry", () => {
    const map: RegionMap = { screens: {} };
    const next = mergeRegionEntry(map, "T1", "r_board", { x: 0.1, y: 0.1, w: 0.1, h: 0.1 });
    expect(regionMapGet(next, "T1", "r_board")).toEqual({ x: 0.1, y: 0.1, w: 0.1, h: 0.1 });
    // input untouched
    expect(map.screens).toEqual({});
  });

  it("overwrites an existing entry", () => {
    const map: RegionMap = { screens: { T1: { r_board: { x: 0, y: 0, w: 0.1, h: 0.1 } } } };
    const next = mergeRegionEntry(map, "T1", "r_board", { x: 0.5, y: 0.5, w: 0.2, h: 0.2 });
    expect(regionMapGet(next, "T1", "r_board")).toEqual({ x: 0.5, y: 0.5, w: 0.2, h: 0.2 });
  });

  it("null deletes the key and prunes an emptied screen object", () => {
    const map: RegionMap = { screens: { T1: { r_board: { x: 0, y: 0, w: 0.1, h: 0.1 } } } };
    const next = mergeRegionEntry(map, "T1", "r_board", null);
    expect(regionMapGet(next, "T1", "r_board")).toBeNull();
    expect(next.screens.T1).toBeUndefined();
  });

  it("null on one region of many leaves the screen and siblings intact", () => {
    const map: RegionMap = {
      screens: {
        T1: {
          r_board: { x: 0, y: 0, w: 0.1, h: 0.1 },
          r_crates: { x: 0.2, y: 0.2, w: 0.1, h: 0.1 },
        },
      },
    };
    const next = mergeRegionEntry(map, "T1", "r_board", null);
    expect(regionMapGet(next, "T1", "r_board")).toBeNull();
    expect(regionMapGet(next, "T1", "r_crates")).toEqual({ x: 0.2, y: 0.2, w: 0.1, h: 0.1 });
  });

  it("null on an already-absent key is a no-op", () => {
    const map: RegionMap = { screens: { T1: { r_crates: { x: 0, y: 0, w: 0.1, h: 0.1 } } } };
    const next = mergeRegionEntry(map, "T1", "r_board", null);
    expect(next.screens.T1).toEqual({ r_crates: { x: 0, y: 0, w: 0.1, h: 0.1 } });
  });

  it("does not mutate the input map", () => {
    const map: RegionMap = { screens: { T1: { r_board: { x: 0, y: 0, w: 0.1, h: 0.1 } } } };
    const before = JSON.parse(JSON.stringify(map));
    mergeRegionEntry(map, "T1", "r_board", { x: 0.9, y: 0.9, w: 0.05, h: 0.05 });
    expect(map).toEqual(before);
  });
});

describe("regionMapGet", () => {
  it("returns null for an unset screen or region", () => {
    const map: RegionMap = { screens: { T1: { r_board: { x: 0, y: 0, w: 0.1, h: 0.1 } } } };
    expect(regionMapGet(map, "GHOST", "r_board")).toBeNull();
    expect(regionMapGet(map, "T1", "ghost")).toBeNull();
  });
});

// D1 — pendingRegions (App.tsx) needs to represent a PENDING DELETE, which
// RegionMap cannot: on disk a key is either a Rect or absent, never a stored
// null. PendingRegionMap's values are `Rect | null`, where null is a
// tombstone ("delete this key on Apply").
describe("pendingRegionGet / setPendingRegionEntry / deletePendingRegionEntry", () => {
  it("pendingRegionGet returns undefined for a key with no pending edit at all", () => {
    const map: PendingRegionMap = { screens: {} };
    expect(pendingRegionGet(map, "T1", "r_board")).toBeUndefined();
  });

  it("setPendingRegionEntry stores a rect and pendingRegionGet reads it back", () => {
    const map: PendingRegionMap = { screens: {} };
    const next = setPendingRegionEntry(map, "T1", "r_board", { x: 0.1, y: 0.1, w: 0.2, h: 0.2 });
    expect(pendingRegionGet(next, "T1", "r_board")).toEqual({ x: 0.1, y: 0.1, w: 0.2, h: 0.2 });
    // input untouched
    expect(map.screens).toEqual({});
  });

  it("setPendingRegionEntry with null stores a real tombstone, distinct from absent", () => {
    const map: PendingRegionMap = { screens: {} };
    const next = setPendingRegionEntry(map, "T1", "r_board", null);
    // The key IS present (a tombstone), not absent.
    expect(pendingRegionGet(next, "T1", "r_board")).toBeNull();
    expect(next.screens.T1).toEqual({ r_board: null });
  });

  it("deletePendingRegionEntry removes the key entirely and prunes an emptied screen", () => {
    const map: PendingRegionMap = { screens: { T1: { r_board: null } } };
    const next = deletePendingRegionEntry(map, "T1", "r_board");
    expect(pendingRegionGet(next, "T1", "r_board")).toBeUndefined();
    expect(next.screens.T1).toBeUndefined();
  });

  it("deletePendingRegionEntry on an already-absent key is a no-op", () => {
    const map: PendingRegionMap = { screens: { T1: { r_crates: { x: 0, y: 0, w: 0.1, h: 0.1 } } } };
    const next = deletePendingRegionEntry(map, "T1", "r_board");
    expect(next.screens.T1).toEqual({ r_crates: { x: 0, y: 0, w: 0.1, h: 0.1 } });
  });
});
