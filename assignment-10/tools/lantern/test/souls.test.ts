import { describe, expect, it } from "vitest";
import { soulName, soulNames } from "../src/lib/souls";
import type { Graph } from "../src/types";

const graph = {
  screens: [],
  seams: [],
  scenes: [],
  variables: [],
  souls: [
    { soul_id: "toby", name: "Toby", deep: true },
    { soul_id: "ilsa", name: "Ilsa", deep: true },
    { soul_id: "pip" }, // texture soul, no authored name
  ],
} as unknown as Graph;

describe("soulName", () => {
  const names = soulNames(graph);

  it("shows the authored name, not the id", () => {
    expect(soulName(names, "toby")).toBe("Toby");
    expect(soulName(names, "ilsa")).toBe("Ilsa");
  });

  it("falls back to the id when a soul has no authored name", () => {
    // reads as the data gap it is, rather than inventing a spelling
    expect(soulName(names, "pip")).toBe("pip");
  });

  it("falls back to the id for a soul absent from the cast", () => {
    expect(soulName(names, "bram")).toBe("bram");
  });

  it("calls the player You — they are the reader, not a soul", () => {
    expect(soulName(names, "player")).toBe("You");
  });

  it("is empty for a missing speaker", () => {
    expect(soulName(names, undefined)).toBe("");
  });

  it("tolerates a graph with no souls array at all (older graph.json)", () => {
    const bare = { screens: [], seams: [], scenes: [], variables: [] } as unknown as Graph;
    expect(soulNames(bare).size).toBe(0);
    expect(soulName(soulNames(bare), "toby")).toBe("toby");
  });
});
