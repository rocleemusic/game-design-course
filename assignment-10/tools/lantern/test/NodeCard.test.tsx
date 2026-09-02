import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { NodeCard } from "../src/components/NodeCard";

describe("NodeCard", () => {
  it("renders id, status badge, and text", () => {
    render(
      <NodeCard id="CL-1" kind="line" text="hello there" status="approved" />
    );
    expect(screen.getByText("CL-1")).toBeTruthy();
    expect(screen.getByText("approved")).toBeTruthy();
    expect(screen.getByText("hello there")).toBeTruthy();
  });

  it("approves on `a` while the card has focus", () => {
    const approve = vi.fn();
    render(
      <NodeCard id="CL-1" kind="line" text="x" status="pending" onApprove={approve} />
    );
    const card = screen.getByRole("group");
    card.focus();
    fireEvent.keyDown(card, { key: "a" });
    expect(approve).toHaveBeenCalledWith("CL-1");
  });

  it("does NOT approve on `a` while a text field is open", () => {
    const approve = vi.fn();
    const save = vi.fn();
    render(
      <NodeCard
        id="CL-1"
        kind="line"
        text="original"
        editTarget="CL-1"
        status="pending"
        onApprove={approve}
        onSaveEdit={save}
      />
    );
    fireEvent.click(screen.getByText("original")); // opens the edit
    const area = screen.getByLabelText("edit CL-1") as HTMLTextAreaElement;
    fireEvent.keyDown(area, { key: "a" });
    expect(approve).not.toHaveBeenCalled();
  });

  it("saves an edit and reports old and new text", () => {
    const save = vi.fn();
    render(
      <NodeCard
        id="CL-1"
        kind="line"
        text="original"
        editTarget="CL-1"
        status="pending"
        onApprove={() => {}}
        onSaveEdit={save}
      />
    );
    fireEvent.click(screen.getByText("original"));
    const area = screen.getByLabelText("edit CL-1") as HTMLTextAreaElement;
    fireEvent.change(area, { target: { value: "rewritten" } });
    fireEvent.click(screen.getByText("Save"));
    expect(save).toHaveBeenCalledWith("CL-1", "original", "rewritten");
  });

  it("opens the edit with the cursor at the end of the text", () => {
    render(
      <NodeCard
        id="CL-1"
        kind="line"
        text="original"
        editTarget="CL-1"
        status="pending"
        onApprove={() => {}}
        onSaveEdit={() => {}}
      />
    );
    fireEvent.click(screen.getByText("original"));
    const area = screen.getByLabelText("edit CL-1") as HTMLTextAreaElement;
    expect(area.selectionStart).toBe("original".length);
    expect(area.selectionEnd).toBe("original".length);
  });

  it("opens on Enter when openable", () => {
    const open = vi.fn();
    render(
      <NodeCard id="T1" kind="screen" title="Town Square" status="pending" onOpen={open} />
    );
    const card = screen.getByRole("group");
    fireEvent.keyDown(card, { key: "Enter" });
    expect(open).toHaveBeenCalled();
  });

  it("brackets an unspoken deed", () => {
    render(
      <NodeCard
        id="CH-1-b"
        kind="option"
        text="leave the bread"
        bracketed
        status="pending"
      />
    );
    expect(screen.getByText("[leave the bread]")).toBeTruthy();
  });

  // Bug 1: the note was stored in approvals.json and rendered nowhere, so a
  // flag note could be written but never read back.
  it("renders the review note on a flagged card", () => {
    render(
      <NodeCard
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
      <NodeCard id="CH-1" kind="choice" text="x" status="flagged" />
    );
    expect(container.querySelector(".card-note")).toBeNull();
  });

  // Bug 3: nothing could return a reviewed card to unreviewed.
  it("offers Clear once the card carries a status, and calls back with the id", () => {
    const clear = vi.fn();
    render(
      <NodeCard
        id="CH-1"
        kind="choice"
        text="x"
        status="flagged"
        onApprove={vi.fn()}
        onClearStatus={clear}
      />
    );
    fireEvent.click(screen.getByLabelText("clear review status of CH-1"));
    expect(clear).toHaveBeenCalledWith("CH-1");
  });

  it("hides Clear on a pending card — there is nothing to clear", () => {
    render(
      <NodeCard
        id="CH-1"
        kind="choice"
        text="x"
        status="pending"
        onApprove={vi.fn()}
        onClearStatus={vi.fn()}
      />
    );
    expect(screen.queryByLabelText("clear review status of CH-1")).toBeNull();
  });

  // Bug 7: chips were keyed by their own text, so a node carrying the same
  // state_action twice produced duplicate React keys.
  it("renders repeated chips without collapsing them", () => {
    render(
      <NodeCard
        id="CH-1"
        kind="choice"
        text="x"
        status="pending"
        chips={["thread_move", "thread_move", "bond_event"]}
      />
    );
    expect(screen.getAllByText("thread_move")).toHaveLength(2);
    expect(screen.getAllByText("bond_event")).toHaveLength(1);
  });
});

/**
 * L5's off-the-card ruling, applied to the LAST card that still broke it.
 *
 * BlueprintNode moved approve/flag off the dialogue cards, but the scene-picker
 * strip still used NodeCard with the buttons on, so one view showed two
 * contradictory review grammars and the "hit by accident" defect was only half
 * retired. `hideActions` drops the buttons and keeps the handlers, because the
 * other half of the ruling is that a hidden control must never make approving
 * unreachable.
 */
describe("hideActions", () => {
  it("drops the review buttons", () => {
    const { container } = render(
      <NodeCard id="SC-A" kind="scene" status="pending" onApprove={() => {}} onFlag={() => {}} hideActions />
    );
    expect(screen.queryByText("Approve")).toBeNull();
    expect(screen.queryByText("Flag")).toBeNull();
    expect(container.querySelector(".pill-primary")).toBeNull();
    expect(container.querySelector(".pill-flag")).toBeNull();
  });

  it("KEEPS the keyboard path, so approving is still reachable", () => {
    const onApprove = vi.fn();
    render(
      <NodeCard id="SC-A" kind="scene" status="pending" onApprove={onApprove} hideActions />
    );
    fireEvent.keyDown(screen.getByRole("group"), { key: "a" });
    expect(onApprove).toHaveBeenCalledWith("SC-A");
  });

  it("still shows the buttons when the flag is absent, so nothing else changed", () => {
    render(<NodeCard id="SC-A" kind="scene" status="pending" onApprove={() => {}} />);
    expect(screen.getByText("Approve")).toBeTruthy();
  });

  // D4: Jump used to live inside the hideActions-gated block, so the scene
  // picker card — which sets hideActions — lost the button even though it
  // passes its own onJump. Jump is not a review action; it must survive.
  it("keeps the Jump button visible even with hideActions, unlike Approve/Flag", () => {
    const onJump = vi.fn();
    render(
      <NodeCard
        id="SC-A"
        kind="scene"
        status="pending"
        onApprove={() => {}}
        onFlag={() => {}}
        onJump={onJump}
        hideActions
      />
    );
    const jumpButton = screen.getByLabelText("jump to SC-A");
    expect(jumpButton).toBeTruthy();
    fireEvent.click(jumpButton);
    expect(onJump).toHaveBeenCalled();
    expect(screen.queryByText("Approve")).toBeNull();
  });
});
