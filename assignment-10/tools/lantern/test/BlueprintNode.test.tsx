import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { BlueprintNode, pinOffset } from "../src/components/nodes/BlueprintNode";

describe("pinOffset", () => {
  it("centres option i inside its own 1/N slice", () => {
    expect(pinOffset(0, 1)).toBe("50%");
    expect(pinOffset(0, 2)).toBe("25%");
    expect(pinOffset(1, 2)).toBe("75%");
    expect(pinOffset(0, 4)).toBe("12.5%");
    expect(pinOffset(3, 4)).toBe("87.5%");
  });

  it("never divides by zero", () => {
    expect(pinOffset(0, 0)).toBe("50%");
  });
});

describe("BlueprintNode anatomy", () => {
  it("puts kind, id and a status dot in the head, and the text in the body", () => {
    const { container } = render(
      <BlueprintNode id="CL-1" kind="line" text="hello there" status="approved" />
    );
    const head = container.querySelector(".bp-head")!;
    expect(head.querySelector(".bp-kind")!.textContent).toBe("line");
    expect(head.querySelector(".bp-id")!.textContent).toBe("CL-1");
    expect(head.querySelector(".bp-dot")!.getAttribute("aria-label")).toBe(
      "status approved"
    );
    expect(container.querySelector(".bp-body .card-text")!.textContent).toBe(
      "hello there"
    );
  });

  it("shows a friendlier id when one is given, keeping the real id for lookups", () => {
    const { container } = render(
      <BlueprintNode id="CL-1" idLabel="line 1" kind="line" status="pending" />
    );
    expect(container.querySelector(".bp-id")!.textContent).toBe("line 1");
    expect(container.querySelector("[data-artifact-id='CL-1']")).toBeTruthy();
  });

  /**
   * The snippet clamp is CSS (.card-text, -webkit-line-clamp: 3), never a JS
   * height estimate: the canvas MEASURES cards and lays out from the truth, so
   * a guessed height here would fight the measured relayout. Nothing may set a
   * height inline.
   */
  it("reuses the CSS clamp and guesses no height", () => {
    const long = "a sentence. ".repeat(60);
    const { container } = render(
      <BlueprintNode id="CL-1" kind="line" text={long} status="pending" />
    );
    const card = container.querySelector<HTMLElement>(".bp-node")!;
    const text = container.querySelector<HTMLElement>(".card-text")!;
    expect(text.className).toContain("card-text"); // the clamped class
    expect(card.style.height).toBe("");
    expect(card.style.maxHeight).toBe("");
    expect(text.style.height).toBe("");
    expect(text.style.webkitLineClamp ?? "").toBe(""); // clamp lives in CSS
    // the full text stays reachable while clamped
    expect(text.title).toBe(long);
  });

  it("keeps the card opaque — no inline alpha, opacity or transparency", () => {
    const { container } = render(
      <BlueprintNode id="CL-1" kind="line" text="x" status="pending" />
    );
    const card = container.querySelector<HTMLElement>(".bp-node")!;
    expect(card.getAttribute("style") ?? "").not.toMatch(
      /opacity|rgba|hsla|transparent/
    );
  });

  it("scales the card with the option count through a CSS var, not a pixel width", () => {
    const { container } = render(
      <BlueprintNode
        id="CH-1"
        kind="choice"
        status="pending"
        pins={[
          { id: "CH-1-a", label: "offer", status: "pending" },
          { id: "CH-1-b", label: "leave", status: "approved" },
        ]}
      />
    );
    const card = container.querySelector<HTMLElement>(".bp-node")!;
    expect(card.style.getPropertyValue("--bp-pins")).toBe("2");
    expect(card.style.width).toBe("");
  });

  it("labels each option pin and places it over its own handle position", () => {
    const { container } = render(
      <BlueprintNode
        id="CH-1"
        kind="choice"
        status="pending"
        pins={[
          { id: "CH-1-a", label: "offer", status: "pending" },
          { id: "CH-1-b", label: "leave", status: "flagged" },
        ]}
      />
    );
    const pins = [...container.querySelectorAll<HTMLElement>(".bp-pin")];
    expect(pins.map((p) => p.textContent)).toEqual(["offer", "leave"]);
    expect(pins.map((p) => p.style.left)).toEqual(["25%", "75%"]);
    // a pin carries its option's own review state, not the choice's
    expect(pins[1].className).toContain("status-flagged");
  });

  it("renders no pins block for a node with no options", () => {
    const { container } = render(
      <BlueprintNode id="CL-1" kind="line" text="x" status="pending" />
    );
    expect(container.querySelector(".bp-pins")).toBeNull();
  });
});

/**
 * RULED 2026-08-01 (the card-head review): the status dot carries the same
 * icon NodeCard's medallion already uses, once reviewed — pending stays a
 * plain dashed ring, "one glance, no word to read" still holds there.
 */
describe("BlueprintNode status dot: icon-flagged once reviewed", () => {
  it("pending carries no icon", () => {
    const { container } = render(
      <BlueprintNode id="CL-1" kind="line" text="x" status="pending" />
    );
    expect(container.querySelector(".bp-dot svg")).toBeNull();
  });

  it("approved carries the same Check icon as NodeCard's medallion", () => {
    const { container } = render(
      <BlueprintNode id="CL-1" kind="line" text="x" status="approved" />
    );
    expect(container.querySelector(".bp-dot .lucide-check")).not.toBeNull();
  });

  it("edited carries the same Pencil icon as NodeCard's medallion", () => {
    const { container } = render(
      <BlueprintNode id="CL-1" kind="line" text="x" status="edited" />
    );
    expect(container.querySelector(".bp-dot .lucide-pencil")).not.toBeNull();
  });

  it("flagged carries the same Flag icon as NodeCard's medallion", () => {
    const { container } = render(
      <BlueprintNode id="CL-1" kind="line" text="x" status="flagged" />
    );
    expect(container.querySelector(".bp-dot .lucide-flag")).not.toBeNull();
  });

  it("the dot icon is decorative — aria-label on the dot itself still carries the status", () => {
    const { container } = render(
      <BlueprintNode id="CL-1" kind="line" text="x" status="approved" />
    );
    const svg = container.querySelector(".bp-dot svg")!;
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelector(".bp-dot")!.getAttribute("aria-label")).toBe(
      "status approved"
    );
  });
});

/**
 * The ruling: Approve and Flag sat inside the card's click target and were
 * being hit by accident. They are gone from the card — but the ABILITY must
 * survive on the keyboard, or hiding the toolbar makes review unreachable.
 */
describe("BlueprintNode review: off the card, on the keyboard", () => {
  const handlers = () => ({
    onApprove: vi.fn(),
    onFlag: vi.fn(),
    onClearStatus: vi.fn(),
  });

  it("renders no approve or flag control", () => {
    const h = handlers();
    const { container } = render(
      <BlueprintNode id="CH-1" kind="choice" text="x" status="flagged" {...h} />
    );
    expect(container.querySelector("button")).toBeNull();
    expect(screen.queryByLabelText("approve CH-1")).toBeNull();
    expect(screen.queryByLabelText("flag CH-1")).toBeNull();
    expect(container.textContent).not.toMatch(/Approve|Flag|Clear/);
  });

  it("approves on `a`, flags on `f`, clears on `c`", () => {
    const h = handlers();
    render(
      <BlueprintNode id="CH-1" kind="choice" text="x" status="flagged" {...h} />
    );
    const card = screen.getByRole("group");
    fireEvent.keyDown(card, { key: "a" });
    fireEvent.keyDown(card, { key: "f" });
    fireEvent.keyDown(card, { key: "c" });
    expect(h.onApprove).toHaveBeenCalledWith("CH-1");
    expect(h.onFlag).toHaveBeenCalledWith("CH-1");
    expect(h.onClearStatus).toHaveBeenCalledWith("CH-1");
  });

  it("does not clear a pending node — there is nothing to clear", () => {
    const h = handlers();
    render(
      <BlueprintNode id="CH-1" kind="choice" text="x" status="pending" {...h} />
    );
    fireEvent.keyDown(screen.getByRole("group"), { key: "c" });
    expect(h.onClearStatus).not.toHaveBeenCalled();
  });

  it("advertises the shortcuts, so an invisible path is still a findable one", () => {
    const h = handlers();
    render(
      <BlueprintNode id="CH-1" kind="choice" text="x" status="pending" {...h} />
    );
    const card = screen.getByRole("group");
    expect(card.getAttribute("aria-keyshortcuts")).toContain("a");
    expect(card.getAttribute("aria-keyshortcuts")).toContain("f");
    expect(card.title).toMatch(/a approves/);
  });

  it("treats every key as text while an edit is open", () => {
    const h = handlers();
    render(
      <BlueprintNode
        id="CL-1"
        kind="line"
        text="original"
        editTarget="CL-1"
        status="pending"
        onSaveEdit={vi.fn()}
        {...h}
      />
    );
    fireEvent.click(screen.getByText("original"));
    const area = screen.getByLabelText("edit CL-1");
    fireEvent.keyDown(area, { key: "a" });
    fireEvent.keyDown(area, { key: "f" });
    expect(h.onApprove).not.toHaveBeenCalled();
    expect(h.onFlag).not.toHaveBeenCalled();
  });
});

describe("BlueprintNode editing", () => {
  it("saves an edit, reporting old and new text", () => {
    const save = vi.fn();
    render(
      <BlueprintNode
        id="CL-1"
        kind="line"
        text="original"
        editTarget="CL-1"
        status="pending"
        onSaveEdit={save}
      />
    );
    fireEvent.click(screen.getByText("original"));
    const area = screen.getByLabelText("edit CL-1") as HTMLTextAreaElement;
    // cursor lands at the end: edits here are touch-ups, not rewrites
    expect(area.selectionStart).toBe("original".length);
    fireEvent.change(area, { target: { value: "rewritten" } });
    fireEvent.click(screen.getByText("Save"));
    expect(save).toHaveBeenCalledWith("CL-1", "original", "rewritten");
  });

  it("opens the edit on `e` when there is a field but no text to click", () => {
    const save = vi.fn();
    render(
      <BlueprintNode
        id="CH-1-b"
        kind="option"
        text=""
        bracketed
        editTarget="CH-1-b.surface_action"
        status="pending"
        onSaveEdit={save}
      />
    );
    fireEvent.keyDown(screen.getByRole("group"), { key: "e" });
    expect(screen.getByLabelText("edit CH-1-b.surface_action")).toBeTruthy();
  });

  it("Esc abandons the edit and writes nothing", () => {
    const save = vi.fn();
    render(
      <BlueprintNode
        id="CL-1"
        kind="line"
        text="original"
        editTarget="CL-1"
        status="pending"
        onSaveEdit={save}
      />
    );
    fireEvent.click(screen.getByText("original"));
    const area = screen.getByLabelText("edit CL-1");
    fireEvent.change(area, { target: { value: "throwaway" } });
    fireEvent.keyDown(area, { key: "Escape" });
    expect(save).not.toHaveBeenCalled();
    expect(screen.getByText("original")).toBeTruthy();
  });

  it("brackets an unspoken deed", () => {
    render(
      <BlueprintNode
        id="CH-1-b"
        kind="option"
        text="leave the bread"
        bracketed
        status="pending"
      />
    );
    expect(screen.getByText("[leave the bread]")).toBeTruthy();
  });
});

describe("BlueprintNode marks", () => {
  // Bug 1: the note went to approvals.json and was rendered nowhere, so a flag
  // note could be written and never read back.
  it("renders the review note on a flagged card", () => {
    render(
      <BlueprintNode
        id="CH-1"
        kind="choice"
        text="x"
        status="flagged"
        note="needs a third option"
      />
    );
    expect(screen.getByText("needs a third option")).toBeTruthy();
  });

  it("renders no note element when there is no note", () => {
    const { container } = render(
      <BlueprintNode id="CH-1" kind="choice" text="x" status="flagged" />
    );
    expect(container.querySelector(".card-note")).toBeNull();
  });

  // Two facts, two marks: the option's own review, and its player_line's edit.
  it("shows a line-edited mark alongside the status, never folded into it", () => {
    const { container } = render(
      <BlueprintNode
        id="CH-1-a"
        kind="option"
        text="x"
        status="approved"
        lineEdited
      />
    );
    expect(container.querySelector(".line-edited-badge")).toBeTruthy();
    expect(container.querySelector(".bp-dot")!.getAttribute("aria-label")).toBe(
      "status approved"
    );
  });

  // Bug 7: chips keyed by their own text collided when a node carried the same
  // state_action twice.
  it("renders repeated chips without collapsing them", () => {
    render(
      <BlueprintNode
        id="CH-1"
        kind="choice"
        text="x"
        status="pending"
        chips={["thread_move", "thread_move", "bond_event"]}
      />
    );
    expect(screen.getAllByText("thread_move")).toHaveLength(2);
  });

  it("drops the foot entirely when there is nothing to put in it", () => {
    const { container } = render(
      <BlueprintNode id="CL-1" kind="line" text="x" status="pending" />
    );
    expect(container.querySelector(".bp-foot")).toBeNull();
  });
});
