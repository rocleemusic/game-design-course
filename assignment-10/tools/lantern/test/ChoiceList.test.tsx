import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ChoiceList } from "../src/components/PlayPane";
import type { PlayChoice } from "../src/lib/play";

const spoken: PlayChoice = {
  index: 0,
  text: '"Let me carry the trays at least."',
  optionId: "CH-T2-04-a",
  kind: "spoken",
  display: '"Let me carry the trays at least."',
};

const deed: PlayChoice = {
  index: 1,
  text: "leave the bread on the rack",
  optionId: "CH-T2-04-b",
  kind: "deed",
  display: "[leave the bread on the rack]",
};

describe("ChoiceList (spec: spoken quoted, deed bracketed)", () => {
  it("renders the spoken option as its quoted player_line", () => {
    render(<ChoiceList choices={[spoken, deed]} onChoose={() => {}} />);
    const btn = screen.getByText('"Let me carry the trays at least."');
    expect(btn.className).toContain("choice-spoken");
  });

  it("renders the unspoken option as its bracketed deed", () => {
    render(<ChoiceList choices={[spoken, deed]} onChoose={() => {}} />);
    const btn = screen.getByText("[leave the bread on the rack]");
    expect(btn.className).toContain("choice-deed");
  });

  it("reports the chosen index", () => {
    const choose = vi.fn();
    render(<ChoiceList choices={[spoken, deed]} onChoose={choose} />);
    fireEvent.click(screen.getByText("[leave the bread on the rack]"));
    expect(choose).toHaveBeenCalledWith(1);
  });

  it("renders nothing while the story can continue (no choices)", () => {
    const { container } = render(<ChoiceList choices={[]} onChoose={() => {}} />);
    expect(container.innerHTML).toBe("");
  });
});
