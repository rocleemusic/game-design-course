// L8 — regions.json is a compact per-run-folder geometry overlay applied to
// the INPUT specs before buildGraph. No journal, no replay, no conflict
// detection: last write wins because there is only one entry per key.

import { test } from "node:test";
import assert from "node:assert/strict";
import { applyRegionMap, parseRect, type RegionMap } from "../src/regions.ts";
import type { ScreenSpec } from "../src/types.ts";

const rect = (x: number, y: number, w: number, h: number) => ({ x, y, w, h });

const screens = (): ScreenSpec[] => [
  {
    screen_id: "T1",
    location: "town",
    name: "Square",
    status: "start",
    regions: [
      { region_id: "r_board", shape: null as never },
      { region_id: "r_well", shape: { rect: rect(0.1, 0.1, 0.2, 0.2) } },
    ],
  },
  {
    screen_id: "T2",
    location: "town",
    name: "Alley",
    status: "start",
    regions: [{ region_id: "r_board", shape: null as never }],
  },
];

test("applies a rect to a declared region", () => {
  const s = screens();
  const map: RegionMap = { screens: { T1: { r_board: rect(0.4, 0.3, 0.16, 0.22) } } };
  const report = applyRegionMap(s, map);
  assert.equal(report.applied, 1);
  assert.equal(report.orphans.length, 0);
  assert.deepEqual(s[0].regions![0].shape, { rect: rect(0.4, 0.3, 0.16, 0.22) });
});

test("unknown screen -> orphan, other entries still apply", () => {
  const s = screens();
  const map: RegionMap = {
    screens: {
      T9: { r_board: rect(0.4, 0.3, 0.16, 0.22) },
      T1: { r_board: rect(0.4, 0.3, 0.16, 0.22) },
    },
  };
  const report = applyRegionMap(s, map);
  assert.equal(report.applied, 1);
  assert.equal(report.orphans.length, 1);
  assert.match(report.orphans[0], /T9/);
  assert.deepEqual(s[0].regions![0].shape, { rect: rect(0.4, 0.3, 0.16, 0.22) });
});

test("unknown region -> orphan", () => {
  const s = screens();
  const map: RegionMap = { screens: { T1: { r_nope: rect(0.4, 0.3, 0.16, 0.22) } } };
  const report = applyRegionMap(s, map);
  assert.equal(report.applied, 0);
  assert.equal(report.orphans.length, 1);
  assert.match(report.orphans[0], /r_nope/);
  assert.match(report.orphans[0], /T1/);
});

test("an invalid rect is skipped and reported as an orphan", () => {
  const s = screens();
  for (const bad of [
    rect(-0.1, 0, 0.2, 0.2), // off the left edge
    rect(0.9, 0, 0.2, 0.2), // runs past the right edge
    rect(0, 0, 0, 0.2), // zero width
    { x: 0, y: 0, w: "wide", h: 0.2 } as unknown as ReturnType<typeof rect>,
  ]) {
    const map: RegionMap = { screens: { T1: { r_board: bad } } };
    const report = applyRegionMap(s, map);
    assert.equal(report.applied, 0, `should skip ${JSON.stringify(bad)}`);
    assert.equal(report.orphans.length, 1);
  }
  assert.equal(s[0].regions![0].shape, null, "nothing was written");
});

test("empty map is a no-op", () => {
  const s = screens();
  const report = applyRegionMap(s, { screens: {} });
  assert.equal(report.applied, 0);
  assert.equal(report.orphans.length, 0);
  assert.equal(s[0].regions![0].shape, null);
});

test("screen+region keying: same region_id on two screens does not collide", () => {
  const s = screens();
  const map: RegionMap = {
    screens: {
      T1: { r_board: rect(0.1, 0.1, 0.1, 0.1) },
      T2: { r_board: rect(0.5, 0.5, 0.1, 0.1) },
    },
  };
  const report = applyRegionMap(s, map);
  assert.equal(report.applied, 2);
  assert.deepEqual(s[0].regions![0].shape, { rect: rect(0.1, 0.1, 0.1, 0.1) });
  assert.deepEqual(s[1].regions![0].shape, { rect: rect(0.5, 0.5, 0.1, 0.1) });
});

test("parseRect accepts the boundary case: a rect filling the whole image", () => {
  assert.deepEqual(parseRect({ rect: rect(0, 0, 1, 1) }), rect(0, 0, 1, 1));
});

test("parseRect rejects non-object and missing rect", () => {
  assert.equal(parseRect(null), null);
  assert.equal(parseRect({}), null);
});
