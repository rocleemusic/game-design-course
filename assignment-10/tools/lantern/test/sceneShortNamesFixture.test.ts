import { describe, it, expect } from "vitest";
import fs from "node:fs";
// @ts-expect-error — plain .mjs script, no type declarations
import { renderSceneShortNames, FIXTURE } from "../scripts/gen-scene-short-names.mjs";
import { sceneShortName, sceneRailLabel } from "../src/lib/sceneShortNames";

/**
 * GP-96 staleness gate, mirroring threadProseFixture.test.ts's pattern:
 * src/lib/sceneShortNames.json is derived from the line files' H1 by
 * scripts/gen-scene-short-names.mjs and is never hand-edited. If a line file
 * is added, renamed or re-addressed without re-running
 * `npm run gen:scene-short-names`, this fails.
 */
describe("src/lib/sceneShortNames.json is generated, not hand-edited", () => {
  it("matches a fresh render of the line files exactly", () => {
    const lf = (s: string) => s.replace(/\r\n/g, "\n");
    const onDisk = fs.readFileSync(FIXTURE, "utf-8");
    expect(lf(onDisk)).toBe(lf(renderSceneShortNames()));
  });

  it("has one entry per authored line file, and every value is thread-C#", () => {
    const map = JSON.parse(fs.readFileSync(FIXTURE, "utf-8"));
    expect(Object.keys(map).length).toBe(30);
    for (const short of Object.values(map)) {
      expect(short).toMatch(/^[a-z0-9-]+-C\d+$/);
    }
  });

  it("maps no scene id twice — two line files claiming one scene is drift", () => {
    const map = JSON.parse(fs.readFileSync(FIXTURE, "utf-8"));
    expect(new Set(Object.values(map)).size).toBe(Object.keys(map).length);
  });
});

describe("sceneShortName", () => {
  it("names the-shelf's four conversations at their scene addresses", () => {
    expect(sceneShortName("SC-T2-08")).toBe("toby-the-shelf-C1");
    expect(sceneShortName("SC-T2-11")).toBe("toby-the-shelf-C4");
  });

  it("follows a conversation across screens — mara-tonic-frost C2 sits on F1", () => {
    // the short name is the thread's, not the screen's: C1 and C3 are on T2
    // and C2 is on F1, which is exactly the jump the rail should make legible
    expect(sceneShortName("SC-F1-03")).toBe("mara-tonic-frost-C2");
  });

  it("returns null for a scene no line file claims", () => {
    // SC-T2-04 is the ratified standalone beat; the SC-T7-* pair is festival
    expect(sceneShortName("SC-T2-04")).toBeNull();
    expect(sceneShortName("SC-T7-toby")).toBeNull();
  });
});

describe("sceneRailLabel", () => {
  it("shows the address AND the short name for a mapped scene", () => {
    expect(sceneRailLabel("SC-T2-11")).toBe("SC-T2-11 · toby-the-shelf-C4");
  });

  it("falls back to the bare address, never a blank or an invented name", () => {
    expect(sceneRailLabel("SC-T2-04")).toBe("SC-T2-04");
    expect(sceneRailLabel("SC-NOPE-99")).toBe("SC-NOPE-99");
  });
});
