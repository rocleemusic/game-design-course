import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { ViewHost } from "../src/components/ViewHost";
import { VIEWS } from "../src/lib/views";

// Light on purpose: the host's contract is "lists every view, marks one, reports
// clicks, renders its child". Measured layout (the flex-grow that keeps a pane
// from collapsing) is CSS and untestable in jsdom.

describe("ViewHost", () => {
  it("offers every view as a tab", () => {
    render(
      <ViewHost id="centre" label="centre pane" view="dialogue" onSelect={() => {}}>
        <p>body</p>
      </ViewHost>
    );
    const strip = screen.getByRole("tablist", { name: "centre pane views" });
    const tabs = within(strip).getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual(VIEWS.map((v) => v.label));
  });

  it("marks exactly the view it was given", () => {
    render(
      <ViewHost id="right" label="right pane" view="level" onSelect={() => {}}>
        <p>body</p>
      </ViewHost>
    );
    const selected = screen
      .getAllByRole("tab")
      .filter((t) => t.getAttribute("aria-selected") === "true");
    expect(selected).toHaveLength(1);
    expect(selected[0].textContent).toBe("Level");
  });

  it("reports the clicked view id", () => {
    const onSelect = vi.fn();
    render(
      <ViewHost id="centre" label="centre pane" view="dialogue" onSelect={onSelect}>
        <p>body</p>
      </ViewHost>
    );
    fireEvent.click(screen.getByRole("tab", { name: "Stage" }));
    expect(onSelect).toHaveBeenCalledWith("stage");
    fireEvent.click(screen.getByRole("tab", { name: "Variables" }));
    expect(onSelect).toHaveBeenCalledWith("variables");
  });

  it("renders its child as the pane body", () => {
    render(
      <ViewHost id="centre" label="centre pane" view="dialogue" onSelect={() => {}}>
        <p>the dialogue graph</p>
      </ViewHost>
    );
    const body = document.querySelector(".view-body");
    expect(body?.textContent).toBe("the dialogue graph");
  });

  it("shows a hide control only when the host is hideable", () => {
    const onHide = vi.fn();
    const { rerender } = render(
      <ViewHost id="centre" label="centre pane" view="dialogue" onSelect={() => {}}>
        <p>body</p>
      </ViewHost>
    );
    expect(screen.queryByRole("button", { name: /^Hide the/ })).toBeNull();

    rerender(
      <ViewHost
        id="right"
        label="right pane"
        view="level"
        onSelect={() => {}}
        onHide={onHide}
      >
        <p>body</p>
      </ViewHost>
    );
    fireEvent.click(screen.getByRole("button", { name: "Hide the right pane" }));
    expect(onHide).toHaveBeenCalledTimes(1);
  });

  it("names itself so a splitter can point at it", () => {
    render(
      <ViewHost id="col-right" label="right pane" view="level" onSelect={() => {}}>
        <p>body</p>
      </ViewHost>
    );
    const host = screen.getByRole("region", { name: "right pane" });
    expect(host.id).toBe("col-right");
  });
});
