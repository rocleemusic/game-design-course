import { describe, expect, it } from "vitest";
import {
  formatPlaceNote,
  parsePlaceNote,
  placeNoteWithRect,
  PLACEMENT_KINDS,
  pendingPlacements,
  placementLabel,
  type Placement,
} from "../src/lib/placeNote";

/**
 * D8 placement notes — the format is the contract between a human reading a
 * note in NotesPanel (plain text, no markdown) and the pipeline parsing it.
 *
 * The load-bearing property here is NEGATIVE: a note is a placement because
 * line 1 says `@place`, and for no other reason. Prose that happens to contain
 * a `rect:` line is prose. A false positive means the pipeline acts on
 * somebody's sentence.
 */

const rect = { x: 0.31, y: 0.44, w: 0.12, h: 0.09 };

function placement(over: Partial<Placement> = {}): Placement {
  return { id: "item_ash", kind: "item", screen: "sq_bench", rect, prose: "", ...over };
}

describe("formatPlaceNote", () => {
  it("writes the exact block: @place first, then fields, blank line, prose", () => {
    const body = formatPlaceNote(
      placement({ prose: "ash on the bench, near the forge end" })
    );
    expect(body).toBe(
      [
        "@place",
        "id: item_ash",
        "kind: item",
        "screen: sq_bench",
        "rect: 0.3100 0.4400 0.1200 0.0900",
        "",
        "ash on the bench, near the forge end",
      ].join("\n")
    );
  });

  it("writes the rect at exactly 4 decimals, matching markers.ts tidy rounding", () => {
    const body = formatPlaceNote(placement({ rect: { x: 0.5, y: 0.25, w: 0.06, h: 0.06 } }));
    expect(body).toContain("rect: 0.5000 0.2500 0.0600 0.0600");
  });

  it("general omits the id LINE entirely — no `id: null`, no empty value", () => {
    const body = formatPlaceNote(placement({ kind: "general", id: null }));
    expect(body.split("\n")[0]).toBe("@place");
    expect(body).not.toContain("id:");
    expect(body).toContain("kind: general");
  });
});

describe("parsePlaceNote round trip", () => {
  for (const kind of PLACEMENT_KINDS) {
    it(`round-trips a ${kind} placement`, () => {
      const p = placement({
        kind,
        id: kind === "general" ? null : `x_${kind.replace("-", "_")}`,
        prose: "some human context",
      });
      const back = parsePlaceNote(formatPlaceNote(p));
      expect(back).toEqual(p);
    });
  }

  it("round-trips with no prose at all", () => {
    const p = placement({ prose: "" });
    expect(parsePlaceNote(formatPlaceNote(p))).toEqual(p);
  });

  it("keeps multi-line prose whole and never parses inside it", () => {
    const p = placement({ prose: "line one\nline two" });
    const back = parsePlaceNote(formatPlaceNote(p));
    expect(back?.prose).toBe("line one\nline two");
  });
});

describe("parsePlaceNote refuses anything without the header", () => {
  it("returns null for ordinary prose that happens to contain a rect line", () => {
    const body = [
      "the crate sits about here —",
      "rect: 0.1 0.1 0.1 0.1",
      "roughly, anyway. not a placement.",
    ].join("\n");
    expect(parsePlaceNote(body)).toBeNull();
  });

  it("returns null when @place is present but not on line 1", () => {
    const body = ["about this:", "@place", "kind: general", "screen: T2", "rect: 0.1 0.1 0.1 0.1"].join(
      "\n"
    );
    expect(parsePlaceNote(body)).toBeNull();
  });

  it("returns null for a note with no header at all", () => {
    expect(parsePlaceNote("not enough branches here")).toBeNull();
    expect(parsePlaceNote("")).toBeNull();
  });

  it("returns null for a near-miss header", () => {
    expect(parsePlaceNote("@placement\nkind: general\nscreen: T2\nrect: 0.1 0.1 0.1 0.1")).toBeNull();
  });
});

describe("parsePlaceNote field handling", () => {
  it("ignores unknown keys, so the format can grow without breaking old notes", () => {
    const body = [
      "@place",
      "id: item_ash",
      "kind: item",
      "screen: sq_bench",
      "rect: 0.3100 0.4400 0.1200 0.0900",
      "tier: 2",
      "author: roc",
    ].join("\n");
    expect(parsePlaceNote(body)).toEqual(placement());
  });

  it("returns null on an unknown kind", () => {
    const body = "@place\nid: x\nkind: banana\nscreen: T2\nrect: 0.1 0.1 0.1 0.1";
    expect(parsePlaceNote(body)).toBeNull();
  });

  it("returns null on a missing or malformed rect", () => {
    expect(parsePlaceNote("@place\nkind: general\nscreen: T2")).toBeNull();
    expect(parsePlaceNote("@place\nkind: general\nscreen: T2\nrect: 0.1 0.1 0.1")).toBeNull();
    expect(parsePlaceNote("@place\nkind: general\nscreen: T2\nrect: a b c d")).toBeNull();
    // outside the unit square — the read path's own validator rejects it
    expect(parsePlaceNote("@place\nkind: general\nscreen: T2\nrect: 0.9 0.9 0.5 0.5")).toBeNull();
  });

  it("returns null when a non-general kind carries no id", () => {
    expect(parsePlaceNote("@place\nkind: item\nscreen: T2\nrect: 0.1 0.1 0.1 0.1")).toBeNull();
  });

  it("returns null on a missing screen", () => {
    expect(parsePlaceNote("@place\nkind: general\nrect: 0.1 0.1 0.1 0.1")).toBeNull();
  });

  it("reads a general note even if someone hand-typed an id", () => {
    const p = parsePlaceNote(
      "@place\nid: whatever\nkind: general\nscreen: T2\nrect: 0.1000 0.1000 0.1000 0.1000"
    );
    expect(p?.id).toBeNull();
    expect(p?.kind).toBe("general");
  });

  it("survives CRLF line endings", () => {
    const body = "@place\r\nkind: general\r\nscreen: T2\r\nrect: 0.1000 0.1000 0.1000 0.1000\r\n\r\nhere";
    expect(parsePlaceNote(body)).toEqual({
      id: null,
      kind: "general",
      screen: "T2",
      rect: { x: 0.1, y: 0.1, w: 0.1, h: 0.1 },
      prose: "here",
    });
  });
});

/**
 * The pending-placement derivation (D8 follow-up). Pure and DOM-free on
 * purpose: the marker layer draws whatever this returns, so the rules about
 * WHICH notes count belong here where they can be pinned by a unit test.
 */
describe("pendingPlacements", () => {
  const note = (body: string, resolved = false) => ({ body, resolved });
  const place = (screen: string, id = "item_ash", kind = "item") =>
    `@place
id: ${id}
kind: ${kind}
screen: ${screen}
rect: 0.1000 0.2000 0.1000 0.1000`;

  it("picks up placement notes for the given screen", () => {
    const out = pendingPlacements([note(place("sq_bench"))], "sq_bench");
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("item_ash");
    expect(out[0].rect).toEqual({ x: 0.1, y: 0.2, w: 0.1, h: 0.1 });
  });

  it("ignores ordinary notes", () => {
    expect(pendingPlacements([note("the bench feels empty here")], "sq_bench")).toEqual([]);
  });

  it("ignores placement notes for another screen", () => {
    expect(pendingPlacements([note(place("sq_forge"))], "sq_bench")).toEqual([]);
  });

  it("drops a resolved placement — the layer is a worklist of what is outstanding", () => {
    expect(pendingPlacements([note(place("sq_bench"), true)], "sq_bench")).toEqual([]);
  });

  it("tolerates a malformed body without throwing", () => {
    expect(() =>
      pendingPlacements(
        [note(`@place\nkind: nonsense\nrect: not numbers`), note("")],
        "sq_bench"
      )
    ).not.toThrow();
    expect(pendingPlacements([note(`@place\nkind: nonsense`)], "sq_bench")).toEqual([]);
  });

  it("returns nothing without notes or without a screen", () => {
    expect(pendingPlacements(null, "sq_bench")).toEqual([]);
    expect(pendingPlacements([note(place("sq_bench"))], null)).toEqual([]);
  });

  it("labels a general placement honestly instead of showing an empty id", () => {
    const general = `@place
kind: general
screen: sq_bench
rect: 0.5000 0.5000 0.1000 0.1000`;
    const out = pendingPlacements([note(general)], "sq_bench");
    expect(placementLabel(out[0])).toBe("(general)");
    expect(placementLabel({ ...out[0], id: "item_ash" })).toBe("item_ash");
  });

  it("threads source (target, timestamp, body) through when both are given", () => {
    const body = place("sq_bench");
    const out = pendingPlacements(
      [{ body, resolved: false, target: "note-123", timestamp: "2026-08-05T00:00:00Z" }],
      "sq_bench"
    );
    expect(out[0].source).toEqual({ target: "note-123", timestamp: "2026-08-05T00:00:00Z", body });
  });

  it("omits source when target/timestamp are not both given", () => {
    const out = pendingPlacements([note(place("sq_bench"))], "sq_bench");
    expect(out[0].source).toBeUndefined();
  });
});

describe("placeNoteWithRect", () => {
  it("replaces the rect line at 4 decimals, preserving prose/id/kind/screen", () => {
    const body = formatPlaceNote(placement({ prose: "ash on the bench" }));
    const next = placeNoteWithRect(body, { x: 0.5, y: 0.25, w: 0.06, h: 0.06 });
    expect(parsePlaceNote(next)).toEqual(
      placement({ prose: "ash on the bench", rect: { x: 0.5, y: 0.25, w: 0.06, h: 0.06 } })
    );
    expect(next).toContain("rect: 0.5000 0.2500 0.0600 0.0600");
  });

  it("keeps a general placement id-less", () => {
    const body = formatPlaceNote(placement({ kind: "general", id: null }));
    const next = placeNoteWithRect(body, { x: 0.2, y: 0.2, w: 0.1, h: 0.1 });
    expect(next).not.toContain("id:");
    expect(parsePlaceNote(next)?.kind).toBe("general");
  });

  it("returns the body unchanged when it is not a placement note", () => {
    const body = "just some ordinary note text";
    expect(placeNoteWithRect(body, { x: 0.1, y: 0.1, w: 0.1, h: 0.1 })).toBe(body);
  });
});
