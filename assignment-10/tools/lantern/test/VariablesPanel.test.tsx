import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { VariablesPanel } from "../src/components/VariablesPanel";
import type { Variable } from "../src/types";

/**
 * L5a — the variables panel gains live values and an override.
 *
 * Before this the panel was 36 lines and read-only: name, declaration,
 * readers, writers. Mid-play there was no way to see what state you were in,
 * which also made SC-T7-*'s three bond_band variants unreviewable.
 */

const variables: Variable[] = [
  { name: "day", declaration: "VAR day = 1", readers: ["CH-T6-01-1"], writers: [] },
  {
    name: "bondLevel_toby",
    declaration: "VAR bondLevel_toby = 0",
    readers: ["CH-T7-toby-2"],
    writers: ["host-mirror"],
  },
];

describe("VariablesPanel", () => {
  it("lists declarations, readers and writers with no session running", () => {
    render(<VariablesPanel variables={variables} selected={null} onSelect={() => {}} />);
    expect(screen.getByText("day")).toBeTruthy();
    expect(screen.getByText("VAR bondLevel_toby = 0")).toBeTruthy();
    expect(screen.getByText(/readers: CH-T6-01-1/)).toBeTruthy();
  });

  it("says why values are missing rather than showing a blank column", () => {
    render(<VariablesPanel variables={variables} selected={null} onSelect={() => {}} />);
    expect(screen.getByText(/Start play to read live values/)).toBeTruthy();
    expect(screen.queryByLabelText("Set day")).toBeNull();
  });

  it("shows live values once a session is running", () => {
    render(
      <VariablesPanel
        variables={variables}
        selected={null}
        onSelect={() => {}}
        values={{ day: 4, bondLevel_toby: 1 }}
      />
    );
    expect(screen.getByTestId("value-day").textContent).toContain("4");
    expect(screen.getByTestId("value-bondLevel_toby").textContent).toContain("1");
  });

  it("renders an undeclared value as a dash, not as 'undefined'", () => {
    render(
      <VariablesPanel
        variables={variables}
        selected={null}
        onSelect={() => {}}
        values={{ day: null, bondLevel_toby: 0 }}
      />
    );
    expect(screen.getByTestId("value-day").textContent).toContain("—");
  });

  it("sets a variable through the callback", () => {
    const onSet = vi.fn();
    render(
      <VariablesPanel
        variables={variables}
        selected={null}
        onSelect={() => {}}
        values={{ day: 1, bondLevel_toby: 0 }}
        onSet={onSet}
      />
    );
    fireEvent.change(screen.getByLabelText("Set day"), { target: { value: "4" } });
    fireEvent.click(screen.getAllByText("Set")[0]);
    expect(onSet).toHaveBeenCalledWith("day", "4");
  });

  it("an empty set is a no-op — blur or a stray Enter must not write", () => {
    const onSet = vi.fn();
    render(
      <VariablesPanel
        variables={variables}
        selected={null}
        onSelect={() => {}}
        values={{ day: 1, bondLevel_toby: 0 }}
        onSet={onSet}
      />
    );
    fireEvent.click(screen.getAllByText("Set")[0]);
    expect(onSet).not.toHaveBeenCalled();
  });

  it("announces a forced session, so a steered run is never read as earned", () => {
    render(
      <VariablesPanel
        variables={variables}
        selected={null}
        onSelect={() => {}}
        values={{ day: 1, bondLevel_toby: 0 }}
        forced
      />
    );
    expect(screen.getByRole("status").textContent).toMatch(/steered, not earned/);
  });

  it("selection toggles, so clicking the active row clears it", () => {
    const onSelect = vi.fn();
    render(<VariablesPanel variables={variables} selected="day" onSelect={onSelect} />);
    fireEvent.click(screen.getByText("day"));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it("renders a LIST value readably instead of [object Object]", () => {
    render(
      <VariablesPanel
        variables={[{ name: "KnownPhrases", declaration: "LIST KnownPhrases = a, b", readers: [], writers: [] }]}
        selected={null}
        onSelect={() => {}}
        values={{ KnownPhrases: { a: 1 } }}
      />
    );
    expect(screen.getByTestId("value-KnownPhrases").textContent).not.toContain("[object Object]");
  });
});
