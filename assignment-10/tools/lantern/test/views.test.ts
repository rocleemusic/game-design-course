import { describe, expect, it } from "vitest";
import {
  VIEWS,
  isPlayView,
  modeForViews,
  viewDef,
  visibleViews,
  type ViewId,
} from "../src/lib/views";

describe("views registry", () => {
  it("lists every view a host offers, in tab order", () => {
    expect(VIEWS.map((v) => v.id)).toEqual([
      "dialogue",
      "level",
      "week",
      "stage",
      "play",
      "sweep",
      "flags",
      "variables",
      "notes",
      "assets",
      "cast",
      "notebook",
      "festival",
    ]);
  });

  it("gives every view a label and a hint", () => {
    for (const v of VIEWS) {
      expect(v.label.length).toBeGreaterThan(0);
      expect(v.hint.length).toBeGreaterThan(0);
    }
  });

  it("looks a view up by id and throws on an unknown one", () => {
    expect(viewDef("dialogue").label).toBe("Dialogue");
    expect(() => viewDef("nope" as ViewId)).toThrow(/unknown view/);
  });
});

describe("mode is derived from the visible views", () => {
  it("counts Stage and Play as play surfaces, nothing else", () => {
    expect(isPlayView("stage")).toBe(true);
    expect(isPlayView("play")).toBe(true);
    for (const id of ["dialogue", "level", "sweep", "variables", "assets"] as ViewId[]) {
      expect(isPlayView(id)).toBe(false);
    }
  });

  it("is review with no play surface on screen", () => {
    expect(modeForViews(["dialogue", "level"])).toBe("review");
    expect(modeForViews([])).toBe("review");
  });

  it("is play when either host shows a play surface", () => {
    expect(modeForViews(["dialogue", "stage"])).toBe("play");
    expect(modeForViews(["play", "level"])).toBe("play");
    expect(modeForViews(["stage", "play"])).toBe("play");
  });

  it("a hidden right pane contributes no view", () => {
    expect(visibleViews("dialogue", "play", true)).toEqual(["dialogue", "play"]);
    expect(visibleViews("dialogue", "play", false)).toEqual(["dialogue"]);
    // and so cannot hold the shell in play mode
    expect(modeForViews(visibleViews("dialogue", "play", false))).toBe("review");
    expect(modeForViews(visibleViews("dialogue", "play", true))).toBe("play");
  });
});
