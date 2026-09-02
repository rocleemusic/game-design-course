import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ListRow } from "../src/components/ListRow";
import { SweepPanel } from "../src/components/SweepPanel";
import type { Graph } from "../src/types";

describe("ListRow", () => {
  it("renders kind, label and status in the .sweep-item grammar", () => {
    const { container } = render(
      <ListRow kind="scene" label="SC-T2-01" status="flagged" />
    );
    const row = container.querySelector("button.sweep-item")!;
    expect(row.querySelector(".sweep-label")!.textContent).toBe("SC-T2-01");
    expect([...row.querySelectorAll(".card-id")].map((s) => s.textContent)).toEqual([
      "scene",
      "flagged",
    ]);
  });

  it("omits the trailing slot when there is no status to show", () => {
    const { container } = render(<ListRow kind="scene" label="SC-T2-01" />);
    expect(container.querySelectorAll(".card-id")).toHaveLength(1);
  });

  it("marks the active row for assistive tech, not just visually", () => {
    const { container } = render(<ListRow kind="scene" label="x" active />);
    const row = container.querySelector("button")!;
    expect(row.className).toContain("active");
    expect(row.getAttribute("aria-current")).toBe("true");
  });

  it("leaves aria-current off an inactive row", () => {
    const { container } = render(<ListRow kind="scene" label="x" />);
    expect(container.querySelector("button")!.getAttribute("aria-current")).toBeNull();
  });

  it("calls back on click", () => {
    const onClick = vi.fn();
    render(<ListRow kind="scene" label="SC-1" onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  /**
   * The reason ListRow exists. A row is for navigating; approving from one was
   * how a status got changed while you were only trying to look at something.
   * Review lives on the card and its toolbar.
   */
  it("carries no review control at all", () => {
    const { container } = render(
      <ListRow kind="scene" label="SC-1" status="pending" />
    );
    expect(container.querySelectorAll("button")).toHaveLength(1); // the row itself
    expect(container.textContent).not.toMatch(/Approve|Flag/);
  });
});

const emptyGraph: Graph = {
  screens: [],
  scenes: [],
  souls: [],
  variables: [],
  story: null,
  day: null,
} as unknown as Graph;

describe("SweepPanel rides ListRow", () => {
  it("renders no rows for an empty sweep and still says the count", () => {
    const { container } = render(
      <SweepPanel
        graph={emptyGraph}
        approvals={{}}
        enabled={false}
        onToggle={() => {}}
        onJump={() => {}}
      />
    );
    expect(container.querySelectorAll(".sweep-item")).toHaveLength(0);
    expect(screen.getByText(/0 unreviewed or flagged/)).toBeTruthy();
  });
});
