import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SettingsDrawer } from "../src/components/SettingsDrawer";

/**
 * The styleEpoch signal (L3).
 *
 * Card heights are MEASURED, and the graph relayouts once per
 * (scene, direction, styleEpoch). Changing base text size reflows every card,
 * so without this callback the graph keeps stale measurements and the nodes
 * overlap — the exact loop the old `nodeHeight()` comment admitted it could
 * not close.
 *
 * The relayout itself is deliberately untested: test/setup.ts no-ops
 * ResizeObserver and jsdom returns zero rects, so such a test would pass for
 * the wrong reason. What is testable, and what matters, is that the signal
 * fires at all.
 */
describe("SettingsDrawer — the style-change signal", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  function open(onStyleChange = vi.fn()) {
    render(<SettingsDrawer onStyleChange={onStyleChange} />);
    fireEvent.click(screen.getByText(/Tokens/));
    return onStyleChange;
  }

  it("fires when the base text size changes — the one that moves card geometry", () => {
    const onStyleChange = open();
    fireEvent.change(screen.getByLabelText("base text size"), {
      target: { value: "20" },
    });
    expect(onStyleChange).toHaveBeenCalled();
  });

  it("fires when the card radius changes", () => {
    const onStyleChange = open();
    // must differ from CARD_RADIUS_PX (12) — a controlled input fires no
    // change event when the value it is set to is the value it already has
    fireEvent.change(screen.getByLabelText("card corner radius"), {
      target: { value: "16" },
    });
    expect(onStyleChange).toHaveBeenCalled();
  });

  it("fires on Reset, which restores every default at once", () => {
    const onStyleChange = open();
    fireEvent.change(screen.getByLabelText("base text size"), {
      target: { value: "20" },
    });
    onStyleChange.mockClear();
    fireEvent.click(screen.getByText("Reset"));
    expect(onStyleChange).toHaveBeenCalled();
  });

  it("works without the callback — it stays optional", () => {
    render(<SettingsDrawer />);
    fireEvent.click(screen.getByText(/Tokens/));
    expect(() =>
      fireEvent.change(screen.getByLabelText("base text size"), {
        target: { value: "18" },
      })
    ).not.toThrow();
  });
});
