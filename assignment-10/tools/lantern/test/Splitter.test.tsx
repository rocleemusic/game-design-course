import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Splitter } from "../src/components/Splitter";

// Pointer-drag geometry is deliberately untested: jsdom's getBoundingClientRect
// returns zeros, so a drag would assert against the wrong numbers. Keyboard and
// aria are the real contract here.

function renderVertical() {
  return render(
    <Splitter
      orientation="vertical"
      cssVar="--side-w"
      storageKey="test-side-w"
      min={200}
      max={500}
      defaultSize={340}
      invert
      label="Resize context panel"
      controls="col-side"
    />
  );
}

describe("Splitter", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => window.localStorage.clear());

  it("exposes full separator aria", () => {
    renderVertical();
    const sep = screen.getByRole("separator");
    expect(sep.getAttribute("aria-orientation")).toBe("vertical");
    expect(sep.getAttribute("aria-label")).toBe("Resize context panel");
    expect(sep.getAttribute("aria-controls")).toBe("col-side");
    expect(sep.getAttribute("aria-valuemin")).toBe("200");
    expect(sep.getAttribute("aria-valuemax")).toBe("500");
    expect(sep.getAttribute("tabindex")).toBe("0");
  });

  it("seeds aria-valuenow and the CSS var from the default before paint", () => {
    renderVertical();
    const sep = screen.getByRole("separator");
    expect(sep.getAttribute("aria-valuenow")).toBe("340");
    expect(sep.parentElement!.style.getPropertyValue("--side-w")).toBe("340px");
  });

  it("ArrowRight grows by 2% of the range and writes the var", () => {
    renderVertical();
    const sep = screen.getByRole("separator");
    fireEvent.keyDown(sep, { key: "ArrowRight" }); // +2% of 300 = +6
    expect(sep.getAttribute("aria-valuenow")).toBe("346");
    expect(sep.parentElement!.style.getPropertyValue("--side-w")).toBe("346px");
  });

  it("Shift+ArrowLeft shrinks by 10% of the range", () => {
    renderVertical();
    const sep = screen.getByRole("separator");
    fireEvent.keyDown(sep, { key: "ArrowLeft", shiftKey: true }); // -10% of 300 = -30
    expect(sep.getAttribute("aria-valuenow")).toBe("310");
  });

  it("Home/End jump to min/max", () => {
    renderVertical();
    const sep = screen.getByRole("separator");
    fireEvent.keyDown(sep, { key: "End" });
    expect(sep.getAttribute("aria-valuenow")).toBe("500");
    fireEvent.keyDown(sep, { key: "Home" });
    expect(sep.getAttribute("aria-valuenow")).toBe("200");
  });

  it("Enter collapses to min, then restores the previous size", () => {
    renderVertical();
    const sep = screen.getByRole("separator");
    fireEvent.keyDown(sep, { key: "ArrowRight" }); // 346
    fireEvent.keyDown(sep, { key: "Enter" }); // collapse -> 200
    expect(sep.getAttribute("aria-valuenow")).toBe("200");
    fireEvent.keyDown(sep, { key: "Enter" }); // restore -> 346
    expect(sep.getAttribute("aria-valuenow")).toBe("346");
  });

  // With no `max` prop the ceiling is measured off the container. jsdom reports
  // a zero rect, so these cover the unmeasured branch: no wall, fixed-span steps.
  function renderDynamic() {
    return render(
      <Splitter
        orientation="vertical"
        cssVar="--side-w"
        storageKey="test-dyn-w"
        min={240}
        reserve={400}
        defaultSize={340}
        invert
        label="Resize context panel"
        controls="col-side"
      />
    );
  }

  it("declares no ceiling while the container is unmeasured", () => {
    renderDynamic();
    const sep = screen.getByRole("separator");
    expect(sep.getAttribute("aria-valuemax")).toBeNull();
    expect(sep.getAttribute("aria-valuemin")).toBe("240");
    expect(sep.getAttribute("aria-valuenow")).toBe("340");
  });

  it("keeps stepping past the old hard-coded wall", () => {
    renderDynamic();
    const sep = screen.getByRole("separator");
    // +10% of the 400px fallback span, repeatedly — 560 would have been past
    // the previous max of 560 on the old side splitter
    for (let i = 0; i < 8; i++) fireEvent.keyDown(sep, { key: "ArrowRight", shiftKey: true });
    expect(Number(sep.getAttribute("aria-valuenow"))).toBe(660);
    expect(sep.parentElement!.style.getPropertyValue("--side-w")).toBe("660px");
  });

  it("still holds the floor when shrinking", () => {
    renderDynamic();
    const sep = screen.getByRole("separator");
    for (let i = 0; i < 8; i++) fireEvent.keyDown(sep, { key: "ArrowLeft", shiftKey: true });
    expect(sep.getAttribute("aria-valuenow")).toBe("240");
  });

  it("persists the committed size to localStorage", () => {
    renderVertical();
    const sep = screen.getByRole("separator");
    fireEvent.keyDown(sep, { key: "End" });
    expect(JSON.parse(window.localStorage.getItem("lantern-panes-v1")!)).toMatchObject({
      "test-side-w": 500,
    });
  });
});
