import { describe, expect, it } from "vitest";
import type { Day, Graph, Scene } from "../src/types";
import { normalizeGraph } from "../src/lib/normalizeGraph";
import { buildGraphIndex, playStates } from "../src/lib/playMap";
import { LanternPlayer } from "../src/lib/play";
import {
  decideStagePath,
  filterPresence,
  nextTimeBlock,
  parseRectShape,
  rectToCss,
  rectToPixels,
  sceneCompletionId,
  stageExits,
  stageItems,
  stagePresence,
} from "../src/lib/stage";
import graphFixture from "../fixtures/graph.json";
import dayFixture from "../fixtures/day.json";
import storyFixture from "../fixtures/story.json";

const storyJson = JSON.stringify(storyFixture);
const graph: Graph = normalizeGraph(graphFixture);
const day = dayFixture as unknown as Day;
const index = buildGraphIndex(graph);
const t1 = graph.screens.find((s) => s.screen_id === "T1")!;
const t2 = graph.screens.find((s) => s.screen_id === "T2")!;

function newPlayer() {
  const p = new LanternPlayer(storyJson, index, day);
  p.continueOnce(); // day_start -> screen_hub
  return p;
}

describe("region -> pixel mapping", () => {
  it("parses a normalized rect shape", () => {
    expect(parseRectShape({ rect: { x: 0.4, y: 0.05, w: 0.2, h: 0.35 } })).toEqual({
      x: 0.4,
      y: 0.05,
      w: 0.2,
      h: 0.35,
    });
  });

  it("returns null for null / malformed / out-of-range shapes", () => {
    expect(parseRectShape(null)).toBeNull(); // the real-data specs ship null
    expect(parseRectShape(undefined)).toBeNull();
    expect(parseRectShape({})).toBeNull();
    expect(parseRectShape({ rect: { x: 0.5, y: 0.5 } })).toBeNull();
    expect(parseRectShape({ rect: { x: 0.9, y: 0, w: 0.2, h: 0.1 } })).toBeNull(); // x+w > 1
    expect(parseRectShape({ rect: { x: -0.1, y: 0, w: 0.2, h: 0.1 } })).toBeNull();
    expect(parseRectShape({ rect: { x: 0, y: 0, w: 0, h: 0.1 } })).toBeNull(); // zero width
  });

  it("maps normalized coords to pixels on the rendered image", () => {
    const rect = { x: 0.6, y: 0.6, w: 0.2, h: 0.25 }; // r_crates
    expect(rectToPixels(rect, 960, 540)).toEqual({
      left: 576,
      top: 324,
      width: 192,
      height: 135,
    });
    // and to CSS percentages (the same mapping without measuring the image)
    expect(rectToCss(rect)).toEqual({
      left: "60.00%",
      top: "60.00%",
      width: "20.00%",
      height: "25.00%",
    });
  });
});

describe("fallback rendering decision", () => {
  it("image path only when the manifest names an image AND it loaded", () => {
    expect(decideStagePath("images/t2.png", true)).toBe("image");
    expect(decideStagePath("images/t2.png", false)).toBe("fallback"); // broken image
    expect(decideStagePath(null, true)).toBe("fallback"); // no manifest entry
    expect(decideStagePath(undefined, true)).toBe("fallback");
  });

  it("a region with a null shape keeps its interaction but loses its hotspot", () => {
    const screen = {
      ...t2,
      regions: [{ region_id: "r_crates", shape: null }],
    };
    const [slot] = stageItems(screen, day, new Set());
    expect(slot.slot_id).toBe("SL-T2-01");
    expect(slot.rect).toBeNull(); // -> text button, not hotspot
    expect(slot.rolled).toBe(true); // still clickable
  });

  it("joins item slots with the day's rolls", () => {
    const [slot] = stageItems(t2, day, new Set());
    expect(slot.item).toBe("wool");
    expect(slot.rect).toEqual({ x: 0.6, y: 0.6, w: 0.2, h: 0.25 });
    const [picked] = stageItems(t2, day, new Set(["SL-T2-01"]));
    expect(picked.picked).toBe(true);
    expect(picked.rolled).toBe(false);
    const [noDay] = stageItems(t2, null, new Set());
    expect(noDay.item).toBe("empty");
    expect(noDay.rolled).toBe(false);
  });
});

describe("pickup -> satchel state", () => {
  it("pickup empties the slot (story-side too) and fills the satchel", () => {
    const p = newPlayer();
    expect(p.peekVar("slot_sl_t2_01")).toBe("wool"); // day-start roll applied
    expect(p.pickup("SL-T2-01", "wool")).toBe(true);
    const v = p.view();
    expect(v.satchel).toEqual(["wool"]);
    expect(v.pickedSlots).toEqual(["SL-T2-01"]);
    expect(p.peekVar("slot_sl_t2_01")).toBe("empty");
    // double pickup and empty pickups are no-ops
    expect(p.pickup("SL-T2-01", "wool")).toBe(false);
    expect(p.pickup("SL-X", "empty")).toBe(false);
    expect(p.view().satchel).toEqual(["wool"]);
  });

  it("satchel is snapshot state: restore rolls the pickup back", () => {
    const p = newPlayer();
    p.jumpTo("SC-T2-01");
    p.continueOnce();
    p.continueOnce();
    p.choose(0); // snapshot taken here, satchel still empty
    p.pickup("SL-T2-01", "wool");
    expect(p.view().satchel).toEqual(["wool"]);

    p.restore(0); // back at the choice: the item returns to its slot
    const v = p.view();
    expect(v.satchel).toEqual([]);
    expect(v.pickedSlots).toEqual([]);
    expect(p.peekVar("slot_sl_t2_01")).toBe("wool"); // slot VAR lives in stateJson
    expect(p.pickup("SL-T2-01", "wool")).toBe(true); // can pick it up again
  });

  it("day re-roll is day-start: slots respawn and the satchel empties", () => {
    const p = newPlayer();
    p.pickup("SL-T2-01", "wool");
    p.applyDay(day); // what Re-roll day does
    const v = p.view();
    expect(v.satchel).toEqual([]);
    expect(v.pickedSlots).toEqual([]);
    expect(v.timeBlock).toBe("morning");
    expect(p.peekVar("slot_sl_t2_01")).toBe("wool");
  });
});

describe("presence filtering by screen + time_block", () => {
  it("filters day.json slot_fill to one screen and block", () => {
    expect(filterPresence(day, "T2", "morning").map((f) => f.soul)).toEqual(["toby"]);
    expect(filterPresence(day, "T1", "morning").map((f) => f.soul).sort()).toEqual([
      "finch",
      "mara",
    ]);
    expect(filterPresence(day, "T2", "night")).toEqual([]);
    expect(filterPresence(null, "T2", "morning")).toEqual([]);
  });

  it("maps a present soul to its scene on that screen", () => {
    const [toby] = stagePresence(graph, day, "T2", "morning", new Set());
    expect(toby.soul).toBe("toby");
    expect(toby.scene_id).toBe("SC-T2-01");
    expect(toby.conversed).toBe(false);
    // mara stands at T2 in the afternoon but the graph has no scene for her there
    const [mara] = stagePresence(graph, day, "T2", "afternoon", new Set());
    expect(mara.scene_id).toBeNull();
  });

  it("marks conversed-today once the scene's gather is in the visited trace", () => {
    const p = newPlayer();
    p.jumpTo("SC-T2-01");
    p.continueOnce();
    p.continueOnce();
    p.choose(0);
    p.continueOnce(); // response
    let [toby] = stagePresence(graph, day, "T2", "morning", p.view().pos.visited);
    expect(toby.conversed).toBe(false); // gather not reached yet
    p.continueOnce(); // the gather line completes the scene
    [toby] = stagePresence(graph, day, "T2", "morning", p.view().pos.visited);
    expect(toby.conversed).toBe(true);
  });

  it("choiceless scenes complete on their last line", () => {
    const scene: Scene = {
      scene_id: "SC-X",
      soul: "x",
      screen_id: "T1",
      ink_address: "x.sc_x",
      lines: [
        { content_id: "L-1", slot_type: "dialogue", speaker_id: "x", text: "a" },
        { content_id: "L-2", slot_type: "dialogue", speaker_id: "x", text: "b" },
      ],
      choice_nodes: [],
    };
    expect(sceneCompletionId(scene)).toBe("L-2");
    expect(sceneCompletionId(graph.scenes[0])).toBe("GB-CH-T2-01-GATHER");
  });
});

describe("exits and the time stub", () => {
  it("builds one exit per connects_to entry, seam-labeled, name-resolved", () => {
    expect(stageExits(graph, t1)).toEqual([
      { to: "T2", name: "Market Row", seam: undefined, resolvable: true },
      { to: "F1", name: "F1", seam: "forest_path", resolvable: false },
    ]);
    expect(stageExits(graph, t2)).toEqual([
      { to: "T1", name: "Town Square", seam: undefined, resolvable: true },
    ]);
  });

  it("an exit drives the screen change and the graph's current-screen highlight", () => {
    const p = newPlayer();
    // the stage exit action: jump to the screen's ink_address, continue once
    expect(p.jumpTo("T2")).toBe(true);
    p.continueOnce(); // the arriving line carries #screen:T2
    const pos = p.view().pos;
    expect(pos.currentScreen).toBe("T2");
    expect(playStates(index, pos).get("T2")).toBe("current");
  });

  it("advance-time stub cycles the block and re-applies presence vars only", () => {
    const p = newPlayer();
    expect(p.peekVar("present_toby")).toBe("T2"); // morning fill
    p.advanceTime();
    const v = p.view();
    expect(v.timeBlock).toBe("afternoon");
    expect(p.peekVar("present_toby")).toBe("T1"); // T1 afternoon fill
    expect(p.peekVar("present_mara")).toBe("T2");
    p.advanceTime();
    p.advanceTime();
    expect(p.view().timeBlock).toBe("morning"); // cycles — day 1, not festival night
    expect(nextTimeBlock("evening", 1)).toBe("morning");
  });

  it("evening only advances into festival night on day 5 (RULED 2026-08-01)", () => {
    expect(nextTimeBlock("evening", 4)).toBe("morning");
    expect(nextTimeBlock("evening", 5)).toBe("night");
    expect(nextTimeBlock("night", 5)).toBe("night"); // terminal, does not cycle
  });
});
