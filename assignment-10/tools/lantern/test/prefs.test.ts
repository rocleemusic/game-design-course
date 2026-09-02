import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  levelModeFor,
  readPrefs,
  sceneListOpenFor,
  withCollapsed,
  writeCollapsed,
  writeLevelMode,
  writeSceneListOpen,
} from "../src/lib/prefs";

const KEY = "lantern-prefs-v1";

describe("withCollapsed (pure toggle)", () => {
  it("adds an id that is not collapsed", () => {
    expect(withCollapsed([], "T2")).toEqual(["T2"]);
    expect(withCollapsed(["T2"], "T4")).toEqual(["T2", "T4"]);
  });
  it("removes an id that already is", () => {
    expect(withCollapsed(["T2", "T4"], "T2")).toEqual(["T4"]);
  });
  it("does not mutate the input", () => {
    const list = ["T2"];
    withCollapsed(list, "T4");
    expect(list).toEqual(["T2"]);
  });
});

describe("prefs storage", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => window.localStorage.clear());

  it("is empty before anything is stored", () => {
    expect(readPrefs()).toEqual({ levelMode: {}, sceneListClosed: [], collapsed: [] });
  });

  it("keeps each host's layout separate", () => {
    writeLevelMode("col-centre", "tree");
    writeLevelMode("col-right", "list");
    expect(levelModeFor("col-centre", "constellation")).toBe("tree");
    expect(levelModeFor("col-right", "constellation")).toBe("list");
    // an unknown host falls back
    expect(levelModeFor("col-other", "constellation")).toBe("constellation");
  });

  it("treats the scene picker as open unless a host says otherwise", () => {
    expect(sceneListOpenFor("col-centre")).toBe(true);
    writeSceneListOpen("col-centre", false);
    expect(sceneListOpenFor("col-centre")).toBe(false);
    // the other pane is untouched
    expect(sceneListOpenFor("col-right")).toBe(true);
    // and reopening clears it rather than stacking duplicates
    writeSceneListOpen("col-centre", false);
    writeSceneListOpen("col-centre", true);
    expect(sceneListOpenFor("col-centre")).toBe(true);
    expect(readPrefs().sceneListClosed).toEqual([]);
  });

  it("round-trips collapsed rail groups", () => {
    writeCollapsed(["T2", "F1"]);
    expect(readPrefs().collapsed).toEqual(["T2", "F1"]);
  });

  it("keeps one pref when the other is written", () => {
    writeLevelMode("col-centre", "tree");
    writeCollapsed(["T2"]);
    const p = readPrefs();
    expect(p.levelMode["col-centre"]).toBe("tree");
    expect(p.collapsed).toEqual(["T2"]);
  });

  it("survives garbage without losing the defaults", () => {
    window.localStorage.setItem(KEY, "not json");
    expect(readPrefs()).toEqual({ levelMode: {}, sceneListClosed: [], collapsed: [] });

    window.localStorage.setItem(KEY, JSON.stringify([1, 2, 3]));
    expect(readPrefs()).toEqual({ levelMode: {}, sceneListClosed: [], collapsed: [] });

    // an unrecognised layout name is dropped, valid siblings survive
    window.localStorage.setItem(
      KEY,
      JSON.stringify({
        levelMode: { "col-centre": "spiral", "col-right": "tree" },
        collapsed: ["T2", 7, null, ""],
      })
    );
    const p = readPrefs();
    expect(p.levelMode).toEqual({ "col-right": "tree" });
    expect(p.collapsed).toEqual(["T2"]);
    expect(levelModeFor("col-centre", "constellation")).toBe("constellation");
  });
});
