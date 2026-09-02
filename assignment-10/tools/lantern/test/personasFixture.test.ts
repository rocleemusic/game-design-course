import { describe, it, expect } from "vitest";
import fs from "node:fs";
// @ts-expect-error — plain .mjs script, no type declarations
import { renderPersonas, FIXTURE } from "../scripts/gen-personas.mjs";

/**
 * GP-63 staleness gate: fixtures/personas.json is generated from cast/*.md
 * by scripts/gen-personas.mjs and is never hand-edited. If a cast card
 * changes (or a new one lands) without re-running `npm run gen:personas`,
 * this test fails.
 */
describe("fixtures/personas.json is generated, not hand-edited", () => {
  it("matches a fresh render of cast/*.md exactly", () => {
    // Normalize line endings only — the repo's auto-commit hook can check
    // the fixture back out with CRLF on Windows; that is not staleness.
    const lf = (s: string) => s.replace(/\r\n/g, "\n");
    const onDisk = fs.readFileSync(FIXTURE, "utf-8");
    expect(lf(onDisk)).toBe(lf(renderPersonas()));
  });

  it("carries both authored primal_seeds verbatim", () => {
    const personas = JSON.parse(fs.readFileSync(FIXTURE, "utf-8"));
    expect(personas.toby.essence.primal_seed).toBe(
      "The world is safe while it needs me. I have value when I am needed."
    );
    expect(personas.ilsa.essence.primal_seed).toBe(
      "Family comes before anything else in the world. Family is where you are safe."
    );
    // mara.md landed and was gated 2026-08-09 (GP-82 rescope); she is no
    // longer a placeholder.
    expect(personas.mara.authored).toBe(true);
    // finch was removed 2026-08-09 (Roc) — a fixture-only soul with no
    // counterpart in the narrative content, being emitted into the live
    // project's personas.json as if it were real. Nell and Linnet are
    // absent for a different reason: their cards are canon, but they are
    // dealt out of v01 (handoff §2), so the generator's DEALT_OUT skips them.
    expect(personas.finch).toBeUndefined();
    expect(personas.nell).toBeUndefined();
    expect(personas.linnet).toBeUndefined();
    expect(Object.keys(personas).sort()).toEqual([
      "bex",
      "ilsa",
      "juno",
      "mara",
      "pip",
      "toby",
    ]);
  });
});
