import { describe, it, expect } from "vitest";
import fs from "node:fs";
// @ts-expect-error — plain .mjs script, no type declarations
import { renderThreadProse, FIXTURE } from "../scripts/gen-thread-prose.mjs";
import { threadProse } from "../src/lib/threadProse";

/**
 * GP-96 staleness gate, mirroring personasFixture.test.ts's pattern for
 * fixtures/personas.json: src/lib/threadProse.json is generated from the
 * per-soul thread registries (cast/[soul]-[role]-threads.md) by
 * scripts/gen-thread-prose.mjs and is never hand-edited. If a registry
 * changes without re-running `npm run gen:thread-prose`, this fails.
 */
describe("src/lib/threadProse.json is generated, not hand-edited", () => {
  it("matches a fresh render of the thread registries exactly", () => {
    const lf = (s: string) => s.replace(/\r\n/g, "\n");
    const onDisk = fs.readFileSync(FIXTURE, "utf-8");
    expect(lf(onDisk)).toBe(lf(renderThreadProse()));
  });

  it("has exactly the nine live ratified thread ids, three per deep soul", () => {
    const map = JSON.parse(fs.readFileSync(FIXTURE, "utf-8"));
    expect(Object.keys(map).sort()).toEqual(
      [
        "ilsa-forge-short",
        "ilsa-kin-no-show",
        "ilsa-not-family",
        "mara-said-out-loud",
        "mara-set-for-two",
        "mara-tonic-frost",
        "toby-feast-short",
        "toby-kept-and-returned",
        "toby-the-shelf",
      ].sort()
    );
  });

  it("does NOT carry the two ids Roc deferred 2026-08-09", () => {
    const map = JSON.parse(fs.readFileSync(FIXTURE, "utf-8"));
    expect(map["ilsa-whose-table"]).toBeUndefined();
    expect(map["mara-shelf-room"]).toBeUndefined();
  });
});

describe("threadProse fallback", () => {
  it("maps a live ratified id to its open-question prose", () => {
    expect(threadProse("ilsa-kin-no-show")).toBe("What does she do with an absence?");
  });

  it("falls back to the raw id for a retired id still emitted by v01 content (GP-90)", () => {
    // giver-receive is RETIRED in the registry (not a ratified row), so it
    // must not be in the map — the runtime firing it anyway is exactly the
    // drift the id column exists to expose, and it must stay visible.
    expect(threadProse("giver-receive")).toBe("giver-receive");
  });

  it("falls back to the raw id for any id no registry authorises", () => {
    expect(threadProse("some-unknown-thread-id")).toBe("some-unknown-thread-id");
  });
});
