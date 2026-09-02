import { describe, expect, it } from "vitest";
import type { Graph, Scene, Screen } from "../src/types";
import { sceneCountOf, sceneIndex, screensWithScenes } from "../src/lib/sceneIndex";

function screen(id: string, name = id, location = "town"): Screen {
  return {
    screen_id: id,
    location: location as Screen["location"],
    name,
    status: "start",
    gates: [],
    connects_to: [],
    ink_address: id,
  };
}

function scene(scene_id: string, screen_id: string): Scene {
  return {
    scene_id,
    soul: "Toby",
    screen_id,
    ink_address: scene_id,
    lines: [],
    choice_nodes: [],
  };
}

function graph(screens: Screen[], scenes: Scene[]): Graph {
  return { screens, seams: [], scenes, variables: [] };
}

describe("sceneIndex", () => {
  it("groups scenes by screen_id, preserving order", () => {
    const g = graph(
      [screen("T2"), screen("T4"), screen("F1")],
      [scene("SC-T2-04", "T2"), scene("SC-T2-07", "T2"), scene("SC-F1-02", "F1")]
    );
    const idx = sceneIndex(g);
    expect(idx.get("T2")).toEqual(["SC-T2-04", "SC-T2-07"]);
    expect(idx.get("F1")).toEqual(["SC-F1-02"]);
    expect(idx.get("T4")).toBeUndefined();
  });

  it("sceneCountOf returns the count, 0 for an empty screen", () => {
    const idx = sceneIndex(
      graph([screen("T2"), screen("T4")], [scene("SC-T2-04", "T2")])
    );
    expect(sceneCountOf(idx, "T2")).toBe(1);
    expect(sceneCountOf(idx, "T4")).toBe(0);
    expect(sceneCountOf(idx, "missing")).toBe(0);
  });

  it("screensWithScenes returns only populated screens, in graph.screens order", () => {
    const g = graph(
      [screen("T1"), screen("T2", "Market Row"), screen("F1", "Clearing")],
      [scene("SC-F1-02", "F1"), scene("SC-T2-04", "T2")]
    );
    const rows = screensWithScenes(g);
    expect(rows.map((r) => r.screen_id)).toEqual(["T2", "F1"]); // screens order, T1 absent
    expect(rows[0]).toMatchObject({
      screen_id: "T2",
      name: "Market Row",
      scene_ids: ["SC-T2-04"],
    });
  });

  it("returns an empty list when no screen has scenes", () => {
    expect(screensWithScenes(graph([screen("T1")], []))).toEqual([]);
  });
});
