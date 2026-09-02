import { describe, expect, it, vi } from "vitest";
import {
  createHistory,
  editCommand,
  statusCommand,
  HISTORY_LIMIT,
  type Command,
  type StatusSnapshot,
} from "../src/state/commands";
import { statusOf, textOf } from "../src/store";
import type { Approvals, EditPatch } from "../src/types";

/**
 * A fake of the two append-only record files, replaying with the same rules the
 * real ones use: approvals merge by key (pending deletes), edits append and
 * replay later-wins. Undo is only proven if it works against THESE semantics —
 * that is the whole reason commands carry forward inverses.
 */
function fakeStore() {
  const approvals: Approvals = {};
  const edits: EditPatch[] = [];
  let clock = 0;
  return {
    approvals,
    edits,
    setStatus: vi.fn(async (id: string, status: string, note?: string) => {
      if (status === "pending") delete approvals[id];
      else {
        approvals[id] = {
          status: status as "approved" | "flagged" | "edited",
          timestamp: `t${clock++}`,
          ...(note ? { note } : {}),
        };
      }
    }),
    applyEdit: vi.fn(async (target: string, oldText: string, newText: string) => {
      edits.push({
        target,
        old_text: oldText,
        new_text: newText,
        timestamp: new Date(2026, 0, 1, 0, 0, clock++).toISOString(),
      });
    }),
    snapshot: (id: string): StatusSnapshot => ({
      status: statusOf(approvals, id),
      note: approvals[id]?.note,
    }),
  };
}

describe("createHistory", () => {
  const noop = (label: string, log: string[]): Command => ({
    label,
    do: async () => void log.push(`do:${label}`),
    undo: async () => void log.push(`undo:${label}`),
  });

  it("starts empty and reports nothing to undo or redo", () => {
    const h = createHistory();
    expect(h.canUndo()).toBe(false);
    expect(h.canRedo()).toBe(false);
    expect(h.labels()).toEqual({ undo: null, redo: null });
  });

  it("runs, undoes and redoes in order", async () => {
    const log: string[] = [];
    const h = createHistory();
    await h.run(noop("a", log));
    await h.run(noop("b", log));
    expect(h.labels().undo).toBe("b");

    await h.undo();
    expect(log).toEqual(["do:a", "do:b", "undo:b"]);
    expect(h.labels()).toEqual({ undo: "a", redo: "b" });

    await h.redo();
    expect(log).toEqual(["do:a", "do:b", "undo:b", "do:b"]);
    expect(h.canRedo()).toBe(false);
  });

  it("a fresh command clears the redo branch", async () => {
    const log: string[] = [];
    const h = createHistory();
    await h.run(noop("a", log));
    await h.undo();
    expect(h.canRedo()).toBe(true);
    await h.run(noop("c", log));
    expect(h.canRedo()).toBe(false);
  });

  it("undo and redo on an empty stack resolve to null and do nothing", async () => {
    const h = createHistory();
    expect(await h.undo()).toBeNull();
    expect(await h.redo()).toBeNull();
  });

  it("a command whose write throws is not recorded — no phantom undo step", async () => {
    const h = createHistory();
    const boom: Command = {
      label: "boom",
      do: async () => {
        throw new Error("write failed");
      },
      undo: async () => {},
    };
    await expect(h.run(boom)).rejects.toThrow("write failed");
    expect(h.canUndo()).toBe(false);
  });

  it("a failed undo leaves the stack where it was, so it can be retried", async () => {
    const h = createHistory();
    await h.run({
      label: "x",
      do: async () => {},
      undo: async () => {
        throw new Error("undo failed");
      },
    });
    await expect(h.undo()).rejects.toThrow("undo failed");
    expect(h.canUndo()).toBe(true);
    expect(h.canRedo()).toBe(false);
  });

  it("caps the history, dropping the oldest", async () => {
    const log: string[] = [];
    const h = createHistory(3);
    for (const label of ["a", "b", "c", "d"]) await h.run(noop(label, log));
    // d, c, b remain; a fell off
    expect((await h.undo())!.label).toBe("d");
    expect((await h.undo())!.label).toBe("c");
    expect((await h.undo())!.label).toBe("b");
    expect(await h.undo()).toBeNull();
  });

  it("defaults to a bounded limit", () => {
    expect(HISTORY_LIMIT).toBe(50);
  });

  it("clear drops both directions", async () => {
    const log: string[] = [];
    const h = createHistory();
    await h.run(noop("a", log));
    await h.undo();
    h.clear();
    expect(h.canUndo()).toBe(false);
    expect(h.canRedo()).toBe(false);
  });
});

describe("statusCommand", () => {
  it("approve then undo issues a pending write — the record is gone, not stored as pending", async () => {
    const s = fakeStore();
    const h = createHistory();
    const before = s.snapshot("T2"); // { status: "pending" }

    await h.run(
      statusCommand(s.setStatus, "T2", { status: "approved" }, before, "approve T2")
    );
    expect(statusOf(s.approvals, "T2")).toBe("approved");

    await h.undo();
    expect(statusOf(s.approvals, "T2")).toBe("pending");
    expect("T2" in s.approvals).toBe(false);
  });

  it("undo restores the PREVIOUS status and its note, not just pending", async () => {
    const s = fakeStore();
    const h = createHistory();
    await s.setStatus("T2", "flagged", "needs another option");

    const before = s.snapshot("T2");
    await h.run(
      statusCommand(s.setStatus, "T2", { status: "approved" }, before, "approve T2")
    );
    expect(statusOf(s.approvals, "T2")).toBe("approved");
    expect(s.approvals.T2.note).toBeUndefined();

    await h.undo();
    expect(statusOf(s.approvals, "T2")).toBe("flagged");
    expect(s.approvals.T2.note).toBe("needs another option");
  });

  it("redo re-applies the same forward write", async () => {
    const s = fakeStore();
    const h = createHistory();
    const before = s.snapshot("T2");
    await h.run(
      statusCommand(s.setStatus, "T2", { status: "flagged", note: "thin" }, before, "flag T2")
    );
    await h.undo();
    await h.redo();
    expect(statusOf(s.approvals, "T2")).toBe("flagged");
    expect(s.approvals.T2.note).toBe("thin");
  });
});

describe("editCommand", () => {
  // The assertion the plan calls the highest-value one: undo must be provable
  // through textOf() against the append-only patch list, not just by counting
  // writes. If replay-order ever changed, this is what would catch it.
  it("edit then undo, and textOf() returns the original text", async () => {
    const s = fakeStore();
    const h = createHistory();
    const target = "CH-T2-04-a.player_line";
    const original = "Let me carry the trays at least.";
    const rewritten = "I'll take the trays.";

    await h.run(
      editCommand(
        s.applyEdit,
        s.setStatus,
        {
          target,
          artifactId: "CH-T2-04-a",
          oldText: original,
          newText: rewritten,
          before: s.snapshot("CH-T2-04-a"),
        },
        "edit CH-T2-04-a"
      )
    );
    expect(textOf(s.edits, target, original)).toBe(rewritten);
    expect(statusOf(s.approvals, "CH-T2-04-a")).toBe("edited");

    await h.undo();
    expect(textOf(s.edits, target, original)).toBe(original);
    // and the card no longer claims it was changed
    expect(statusOf(s.approvals, "CH-T2-04-a")).toBe("pending");
    // the inverse is an APPEND, never a deletion — the trail is intact
    expect(s.edits).toHaveLength(2);
  });

  it("undoing an edit restores a status the artifact already had", async () => {
    const s = fakeStore();
    const h = createHistory();
    await s.setStatus("CH-1-a", "approved");

    await h.run(
      editCommand(
        s.applyEdit,
        s.setStatus,
        {
          target: "CH-1-a.surface_action",
          artifactId: "CH-1-a",
          oldText: "leave the bread",
          newText: "take the bread",
          before: s.snapshot("CH-1-a"),
        },
        "edit CH-1-a"
      )
    );
    expect(statusOf(s.approvals, "CH-1-a")).toBe("edited");

    await h.undo();
    expect(statusOf(s.approvals, "CH-1-a")).toBe("approved");
  });

  it("redo after undo lands the rewritten text again", async () => {
    const s = fakeStore();
    const h = createHistory();
    const target = "CL-1";
    await h.run(
      editCommand(
        s.applyEdit,
        s.setStatus,
        {
          target,
          artifactId: "CL-1",
          oldText: "one",
          newText: "two",
          before: s.snapshot("CL-1"),
        },
        "edit CL-1"
      )
    );
    await h.undo();
    await h.redo();
    expect(textOf(s.edits, target, "one")).toBe("two");
  });
});
