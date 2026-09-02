import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { BlueprintNode } from "../src/components/nodes/BlueprintNode";
import { NodeCard } from "../src/components/NodeCard";

/**
 * THE KEYBOARD-ONLY PASS from the S5 acceptance script.
 *
 * The script has always ended "...and complete one pass from the keyboard only",
 * and it had never been run. It became load-bearing when L5 moved approve and
 * flag OFF the card: a hidden control that has no keyboard path does not move an
 * action out of the way, it removes it. So this is the test that says the
 * trade-off was honoured.
 *
 * Component-level rather than a full App drive, because the acceptance question
 * is "can every review action be reached without a mouse", and that is a
 * property of the card. Pointer-driven geometry stays untested by design —
 * jsdom returns zero rects, as test/setup.ts says itself.
 */

function props(over: Record<string, unknown> = {}) {
  return {
    id: "CH-T2-04",
    kind: "choice" as const,
    status: "pending" as const,
    ...over,
  };
}

describe("keyboard-only review pass — BlueprintNode (the dialogue canvas)", () => {
  it("the card is a tab stop, so it can be reached at all", () => {
    render(<BlueprintNode {...props()} />);
    expect(screen.getByRole("group").getAttribute("tabindex")).toBe("0");
  });

  it("approve is reachable with `a`", () => {
    const onApprove = vi.fn();
    render(<BlueprintNode {...props({ onApprove })} />);
    fireEvent.keyDown(screen.getByRole("group"), { key: "a" });
    expect(onApprove).toHaveBeenCalledWith("CH-T2-04");
  });

  it("flag is reachable with `f`", () => {
    const onFlag = vi.fn();
    render(<BlueprintNode {...props({ onFlag })} />);
    fireEvent.keyDown(screen.getByRole("group"), { key: "f" });
    expect(onFlag).toHaveBeenCalledWith("CH-T2-04");
  });

  it("clear is reachable with `c`, and only once there is a status to clear", () => {
    const onClearStatus = vi.fn();
    const { unmount } = render(
      <BlueprintNode {...props({ status: "pending", onClearStatus })} />
    );
    fireEvent.keyDown(screen.getByRole("group"), { key: "c" });
    expect(onClearStatus).not.toHaveBeenCalled();
    unmount();

    render(<BlueprintNode {...props({ status: "flagged", onClearStatus })} />);
    fireEvent.keyDown(screen.getByRole("group"), { key: "c" });
    expect(onClearStatus).toHaveBeenCalledWith("CH-T2-04");
  });

  it("an edit opens with `e` and saves with Ctrl+Enter — no mouse anywhere", () => {
    const onSaveEdit = vi.fn();
    render(
      <BlueprintNode
        {...props({ text: "old line", editTarget: "L-CH-T2-04-a-p", onSaveEdit })}
      />
    );
    fireEvent.keyDown(screen.getByRole("group"), { key: "e" });
    const area = screen.getByLabelText("edit L-CH-T2-04-a-p");
    fireEvent.change(area, { target: { value: "new line" } });
    fireEvent.keyDown(area, { key: "Enter", ctrlKey: true });
    expect(onSaveEdit).toHaveBeenCalledWith("L-CH-T2-04-a-p", "old line", "new line");
  });

  it("Escape abandons an edit without writing — a cancel must write nothing", () => {
    const onSaveEdit = vi.fn();
    render(
      <BlueprintNode
        {...props({ text: "old line", editTarget: "L-x", onSaveEdit })}
      />
    );
    fireEvent.keyDown(screen.getByRole("group"), { key: "e" });
    const area = screen.getByLabelText("edit L-x");
    fireEvent.change(area, { target: { value: "typed then abandoned" } });
    fireEvent.keyDown(area, { key: "Escape" });
    expect(onSaveEdit).not.toHaveBeenCalled();
  });

  it("inside an edit every key is text — `a` must not approve mid-sentence", () => {
    const onApprove = vi.fn();
    render(
      <BlueprintNode
        {...props({ text: "x", editTarget: "L-x", onSaveEdit: () => {}, onApprove })}
      />
    );
    fireEvent.keyDown(screen.getByRole("group"), { key: "e" });
    fireEvent.keyDown(screen.getByLabelText("edit L-x"), { key: "a" });
    expect(onApprove).not.toHaveBeenCalled();
  });

  it("jump is reachable with `j`, so play mode is keyboard-drivable too", () => {
    const onJump = vi.fn();
    render(<BlueprintNode {...props({ onJump })} />);
    fireEvent.keyDown(screen.getByRole("group"), { key: "j" });
    expect(onJump).toHaveBeenCalled();
  });
});

describe("keyboard-only review pass — NodeCard (the scene strip and lists)", () => {
  it("approve is reachable with `a` even with the buttons hidden", () => {
    // This is the pair that matters: L5c hid the strip's buttons, so the
    // keyboard is now the ONLY path there. If this breaks, that view has no
    // way to approve at all.
    const onApprove = vi.fn();
    render(
      <NodeCard id="SC-T2-04" kind="scene" status="pending" onApprove={onApprove} hideActions />
    );
    fireEvent.keyDown(screen.getByRole("group"), { key: "a" });
    expect(onApprove).toHaveBeenCalledWith("SC-T2-04");
  });

  it("Enter drills in, which is how a keyboard user navigates the strip", () => {
    const onOpen = vi.fn();
    render(<NodeCard id="SC-T2-04" kind="scene" status="pending" onOpen={onOpen} />);
    fireEvent.keyDown(screen.getByRole("group"), { key: "Enter" });
    expect(onOpen).toHaveBeenCalled();
  });
});
