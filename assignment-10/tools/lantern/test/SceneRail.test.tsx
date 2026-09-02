import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { Graph, Scene, Screen } from "../src/types";
import { SceneRail } from "../src/components/SceneRail";
import type { ReviewApi } from "../src/components/reviewApi";

function screenOf(id: string, name = id): Screen {
  return {
    screen_id: id,
    location: "town",
    name,
    status: "start",
    gates: [],
    connects_to: [],
    ink_address: id,
  };
}

function sceneOf(scene_id: string, screen_id: string): Scene {
  return {
    scene_id,
    soul: "Toby",
    screen_id,
    ink_address: scene_id,
    lines: [],
    choice_nodes: [],
  };
}

const graph: Graph = {
  screens: [screenOf("T1", "Town Square"), screenOf("T2", "Market Row"), screenOf("F1", "Clearing")],
  seams: [],
  scenes: [sceneOf("SC-T2-04", "T2"), sceneOf("SC-T2-07", "T2"), sceneOf("SC-F1-02", "F1")],
  variables: [],
};

const api = {
  statusOf: () => "pending",
} as unknown as ReviewApi;

function renderRail(overrides: Partial<Parameters<typeof SceneRail>[0]> = {}) {
  const onOpenScreen = vi.fn();
  const onOpenScene = vi.fn();
  const onToggleCollapsed = vi.fn();
  const view = render(
    <SceneRail
      graph={graph}
      api={api}
      activeScreenId={null}
      activeSceneId={null}
      collapsed={new Set()}
      onToggleCollapsed={onToggleCollapsed}
      onOpenScreen={onOpenScreen}
      onOpenScene={onOpenScene}
      {...overrides}
    />
  );
  return { onOpenScreen, onOpenScene, onToggleCollapsed, view };
}

describe("SceneRail", () => {
  it("lists only screens with scenes, and each of their scenes", () => {
    renderRail();
    // populated screens present, empty screen absent
    expect(screen.getByText("Market Row")).toBeTruthy();
    expect(screen.getByText("Clearing")).toBeTruthy();
    expect(screen.queryByText("Town Square")).toBeNull();
    // every scene row shows
    expect(screen.getByText("SC-T2-04")).toBeTruthy();
    expect(screen.getByText("SC-T2-07")).toBeTruthy();
    expect(screen.getByText("SC-F1-02")).toBeTruthy();
  });

  it("shows a scene count on each screen header", () => {
    renderRail();
    // T2 has 2 scenes, F1 has 1
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();
  });

  it("clicking a scene row calls openScene with both ids", () => {
    const { onOpenScene } = renderRail();
    fireEvent.click(screen.getByText("SC-T2-07"));
    expect(onOpenScene).toHaveBeenCalledWith("T2", "SC-T2-07");
  });

  it("clicking a screen header calls openScreen", () => {
    const { onOpenScreen } = renderRail();
    fireEvent.click(screen.getByText("Market Row"));
    expect(onOpenScreen).toHaveBeenCalledWith("T2");
  });

  it("marks the active scene row", () => {
    renderRail({ activeScreenId: "T2", activeSceneId: "SC-T2-07" });
    const active = document.querySelector(".rail-scene.active");
    expect(active?.textContent).toContain("SC-T2-07");
  });

  it("renders an empty hint when no screen has scenes", () => {
    renderRail({ graph: { ...graph, scenes: [] } });
    expect(screen.getByText(/No scenes authored/)).toBeTruthy();
  });

  it("starts every group open", () => {
    renderRail();
    const twisties = screen.getAllByRole("button", { name: /^Collapse / });
    expect(twisties).toHaveLength(2); // T2 and F1
    for (const t of twisties) expect(t.getAttribute("aria-expanded")).toBe("true");
  });

  it("reports a twisty click without collapsing anything itself", () => {
    const { onToggleCollapsed } = renderRail();
    fireEvent.click(screen.getByRole("button", { name: "Collapse Market Row scenes" }));
    expect(onToggleCollapsed).toHaveBeenCalledWith("T2");
    // still open — the parent owns the state
    expect(screen.getByText("SC-T2-07")).toBeTruthy();
  });

  it("hides only the collapsed group's scenes, and flips its control", () => {
    renderRail({ collapsed: new Set(["T2"]) });
    const t2 = screen.getByRole("button", { name: "Expand Market Row scenes" });
    expect(t2.getAttribute("aria-expanded")).toBe("false");
    // T2's scenes are hidden from the accessibility tree, F1's are not
    expect(screen.queryByText("SC-T2-07")).toBeNull();
    expect(screen.queryByText("SC-T2-04")).toBeNull();
    expect(screen.getByText("SC-F1-02")).toBeTruthy();
    // the screen row itself stays reachable
    expect(screen.getByText("Market Row")).toBeTruthy();
  });

  it("keeps the twisty separate from opening the screen", () => {
    const { onOpenScreen, onToggleCollapsed } = renderRail();
    fireEvent.click(screen.getByRole("button", { name: "Collapse Clearing scenes" }));
    expect(onToggleCollapsed).toHaveBeenCalledWith("F1");
    expect(onOpenScreen).not.toHaveBeenCalled();
  });
});
