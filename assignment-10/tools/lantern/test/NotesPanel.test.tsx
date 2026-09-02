import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { NotesPanel } from "../src/components/NotesPanel";
import type { Note } from "../src/lib/bridge";

/**
 * D4 — the target used to be hardcoded to the app's global selection, so a
 * note could never target a line/choice/option/gather, and there was no way
 * to write a note about nothing in particular. These pin the free-text
 * target field's default-but-overridable behavior and the three shapes a
 * note can now take: selection-targeted, manually-targeted, and general.
 */
describe("NotesPanel — free target field", () => {
  it("defaults the target field to the current selection", () => {
    render(<NotesPanel notes={[]} target="SC-T2-01" onAdd={() => {}} />);
    const input = screen.getByLabelText(/note target/i) as HTMLInputElement;
    expect(input.value).toBe("SC-T2-01");
  });

  it("adds a note against the default selection when the target is left alone", () => {
    const onAdd = vi.fn();
    render(<NotesPanel notes={[]} target="SC-T2-01" onAdd={onAdd} />);
    fireEvent.change(screen.getByPlaceholderText(/not enough branches/), {
      target: { value: "needs another option" },
    });
    fireEvent.click(screen.getByText("Add note"));
    expect(onAdd).toHaveBeenCalledWith({
      target: "SC-T2-01",
      kind: "structure",
      body: "needs another option",
    });
  });

  it("lets the target be typed over to any id — a line/choice/option/gather, not just the selection", () => {
    const onAdd = vi.fn();
    render(<NotesPanel notes={[]} target="SC-T2-01" onAdd={onAdd} />);
    fireEvent.change(screen.getByLabelText(/note target/i), {
      target: { value: "L-CH-T2-01-a-r1" },
    });
    fireEvent.change(screen.getByPlaceholderText(/not enough branches/), {
      target: { value: "who says this line?" },
    });
    fireEvent.click(screen.getByText("Add note"));
    expect(onAdd).toHaveBeenCalledWith({
      target: "L-CH-T2-01-a-r1",
      kind: "structure",
      body: "who says this line?",
    });
  });

  it("adds a general note (null target) when the target field is cleared", () => {
    const onAdd = vi.fn();
    render(<NotesPanel notes={[]} target="SC-T2-01" onAdd={onAdd} />);
    fireEvent.change(screen.getByLabelText(/note target/i), { target: { value: "" } });
    fireEvent.change(screen.getByPlaceholderText(/not enough branches/), {
      target: { value: "pacing feels off across the whole week" },
    });
    fireEvent.click(screen.getByText("Add note"));
    expect(onAdd).toHaveBeenCalledWith({
      target: null,
      kind: "structure",
      body: "pacing feels off across the whole week",
    });
  });

  it("adds a note even with nothing selected at all (target starts blank)", () => {
    const onAdd = vi.fn();
    render(<NotesPanel notes={[]} target={null} onAdd={onAdd} />);
    fireEvent.change(screen.getByPlaceholderText(/not enough branches/), {
      target: { value: "general observation" },
    });
    fireEvent.click(screen.getByText("Add note"));
    expect(onAdd).toHaveBeenCalledWith({
      target: null,
      kind: "structure",
      body: "general observation",
    });
  });

  it("stops auto-following the selection once the user types a target by hand", () => {
    const { rerender } = render(<NotesPanel notes={[]} target="SC-T2-01" onAdd={() => {}} />);
    fireEvent.change(screen.getByLabelText(/note target/i), {
      target: { value: "L-CH-T2-01-a-r1" },
    });
    // selection elsewhere in the tool moves on — the typed target must survive
    rerender(<NotesPanel notes={[]} target="SC-T4-02" onAdd={() => {}} />);
    const input = screen.getByLabelText(/note target/i) as HTMLInputElement;
    expect(input.value).toBe("L-CH-T2-01-a-r1");
  });
});

describe("NotesPanel — resolved toggle", () => {
  const note = (overrides: Partial<Note> = {}): Note => ({
    target: "T1",
    kind: "structure",
    body: "needs a branch",
    resolved: false,
    timestamp: "2026-07-31T00:00:00.000Z",
    ...overrides,
  });

  it("wires the resolved toggle when onResolve is given", () => {
    const onResolve = vi.fn();
    render(<NotesPanel notes={[note()]} target={null} onAdd={() => {}} onResolve={onResolve} />);
    fireEvent.click(screen.getByText("Mark resolved"));
    expect(onResolve).toHaveBeenCalledWith(note(), true);
  });

  it("offers Reopen for an already-resolved note", () => {
    const onResolve = vi.fn();
    render(
      <NotesPanel
        notes={[note({ resolved: true })]}
        target={null}
        onAdd={() => {}}
        onResolve={onResolve}
      />
    );
    fireEvent.click(screen.getByText("Reopen"));
    expect(onResolve).toHaveBeenCalledWith(note({ resolved: true }), false);
  });

  it("renders a general note's target as (general), not blank or null", () => {
    render(<NotesPanel notes={[note({ target: null })]} target={null} onAdd={() => {}} />);
    expect(screen.getByText("(general)")).toBeTruthy();
  });

  it("omits the resolve control when onResolve is not given", () => {
    render(<NotesPanel notes={[note()]} target={null} onAdd={() => {}} />);
    expect(screen.queryByText("Mark resolved")).toBeNull();
  });
});
