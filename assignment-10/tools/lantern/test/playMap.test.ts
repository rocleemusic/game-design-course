import { describe, expect, it } from "vitest";
import type { Graph, Screen } from "../src/types";
import { buildGraphIndex } from "../src/lib/playMap";

/**
 * D3: only status "locked(gate_id[, gate_id])" is a lock. "reachable(gate_id)"
 * is explicitly NOT one (screen-spec-schema.md: "a knowledge-demonstration
 * site that is never blocked... walking up is free, the demonstration is the
 * gate"). This is exercised directly against buildGraphIndex, independent of
 * the compiled story fixture, because the real graph.json fixture only ever
 * carries a "reachable(...)" screen (T2) and never a "locked(...)" one — so
 * without this test the positive case (a real lock actually surfacing) was
 * never covered.
 */
function screen(id: string, over: Partial<Screen> = {}): Screen {
  return {
    screen_id: id,
    location: "town",
    name: id,
    status: "start",
    gates: [],
    connects_to: [],
    ink_address: id,
    ...over,
  };
}

function graph(over: Partial<Graph> = {}): Graph {
  return { screens: [], seams: [], scenes: [], variables: [], ...over };
}

describe("buildGraphIndex — lockForScreenName (D3)", () => {
  it("surfaces a locked(...) screen by its display name", () => {
    const g = graph({
      screens: [
        screen("T1", { status: "start", name: "Town Square" }),
        screen("T5", { status: "locked(G-T5-trust)", name: "Ilsa's Door" }),
      ],
    });
    const index = buildGraphIndex(g);
    expect(index.lockForScreenName.get("Ilsa's Door")).toBe("locked(G-T5-trust)");
  });

  it("does NOT surface a reachable(...) screen — it is not a lock", () => {
    const g = graph({
      screens: [
        screen("T1", { status: "start", name: "Town Square" }),
        screen("T2", { status: "reachable(G-T1-showask)", name: "Market Row" }),
      ],
    });
    const index = buildGraphIndex(g);
    expect(index.lockForScreenName.has("Market Row")).toBe(false);
  });

  it("does NOT surface a start screen", () => {
    const g = graph({
      screens: [screen("T1", { status: "start", name: "Town Square" })],
    });
    const index = buildGraphIndex(g);
    expect(index.lockForScreenName.has("Town Square")).toBe(false);
  });
});
