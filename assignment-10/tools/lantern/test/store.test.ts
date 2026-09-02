import { describe, expect, it } from "vitest";
import { noteOf, statusOf, sweepList, textOf } from "../src/store";
import type { Approvals, EditPatch, Graph } from "../src/types";
import graphFixture from "../fixtures-review/graph.json";

const graph = graphFixture as unknown as Graph;

describe("noteOf", () => {
  it("reads the note stored with a review", () => {
    const a: Approvals = { T1: { status: "flagged", timestamp: "t", note: "thin" } };
    expect(noteOf(a, "T1")).toBe("thin");
  });
  it("is undefined for an unknown id, a record with no note, or a blank one", () => {
    expect(noteOf({}, "T1")).toBeUndefined();
    expect(noteOf({ T1: { status: "approved", timestamp: "t" } }, "T1")).toBeUndefined();
    expect(
      noteOf({ T1: { status: "flagged", timestamp: "t", note: "  " } }, "T1")
    ).toBeUndefined();
  });
});

describe("statusOf", () => {
  it("defaults to pending", () => {
    expect(statusOf({}, "T1")).toBe("pending");
  });
  it("reads approvals.json records", () => {
    const a: Approvals = { T1: { status: "flagged", timestamp: "t" } };
    expect(statusOf(a, "T1")).toBe("flagged");
  });
});

describe("textOf", () => {
  it("returns the original with no patches", () => {
    expect(textOf([], "CL-1", "hello")).toBe("hello");
  });
  it("applies patches in order — later wins", () => {
    const edits: EditPatch[] = [
      { target: "CL-1", old_text: "hello", new_text: "first", timestamp: "1" },
      { target: "CL-1", old_text: "first", new_text: "second", timestamp: "2" },
      { target: "CL-2", old_text: "x", new_text: "other", timestamp: "3" },
    ];
    expect(textOf(edits, "CL-1", "hello")).toBe("second");
  });
  it("replays in timestamp order even when file order disagrees (matches the resolver)", () => {
    const edits: EditPatch[] = [
      {
        target: "CL-1",
        old_text: "first",
        new_text: "second",
        timestamp: "2026-01-02T00:00:00.000Z",
      },
      {
        target: "CL-1",
        old_text: "hello",
        new_text: "first",
        timestamp: "2026-01-01T00:00:00.000Z",
      },
    ];
    expect(textOf(edits, "CL-1", "hello")).toBe("second");
  });
  it("keeps file order on timestamp ties (stable sort)", () => {
    const t = "2026-01-01T00:00:00.000Z";
    const edits: EditPatch[] = [
      { target: "CL-1", old_text: "hello", new_text: "first", timestamp: t },
      { target: "CL-1", old_text: "first", new_text: "second", timestamp: t },
    ];
    expect(textOf(edits, "CL-1", "hello")).toBe("second");
  });
  it("does not mutate the given edits array", () => {
    const edits: EditPatch[] = [
      { target: "CL-1", old_text: "a", new_text: "late", timestamp: "2026-01-02T00:00:00.000Z" },
      { target: "CL-1", old_text: "x", new_text: "early", timestamp: "2026-01-01T00:00:00.000Z" },
    ];
    textOf(edits, "CL-1", "x");
    expect(edits[0].new_text).toBe("late"); // file order untouched
  });
});

describe("sweepList", () => {
  it("lists every artifact when nothing is reviewed", () => {
    const items = sweepList(graph, {});
    const ids = items.map((i) => i.id);
    expect(ids).toContain("T1");
    expect(ids).toContain("SC-T2-01");
    expect(ids).toContain("CH-T2-04");
    expect(ids).toContain("CH-T2-04-b");
    expect(ids).toContain("CL-T2-01-01");
  });

  it("drops approved and edited (both pass the gate), keeps flagged", () => {
    const approvals: Approvals = {
      T1: { status: "approved", timestamp: "t" },
      "CL-T2-01-01": { status: "edited", timestamp: "t" },
      "CH-T2-04": { status: "flagged", timestamp: "t" },
    };
    const ids = sweepList(graph, approvals).map((i) => i.id);
    expect(ids).not.toContain("T1");
    expect(ids).not.toContain("CL-T2-01-01");
    expect(ids).toContain("CH-T2-04");
  });
});
