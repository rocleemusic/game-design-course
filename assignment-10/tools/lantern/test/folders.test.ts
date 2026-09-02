import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  RECENT_LIMIT,
  lastFolder,
  readRecentFolders,
  rememberFolder,
  withFolder,
} from "../src/lib/folders";

const KEY = "lantern-folders-v1";

describe("withFolder (pure list math)", () => {
  it("puts a new folder at the front", () => {
    expect(withFolder(["a", "b"], "c")).toEqual(["c", "a", "b"]);
  });

  it("moves an existing folder to the front instead of duplicating it", () => {
    expect(withFolder(["a", "b", "c"], "c")).toEqual(["c", "a", "b"]);
  });

  it("trims whitespace and ignores a blank folder", () => {
    expect(withFolder(["a"], "  b  ")).toEqual(["b", "a"]);
    expect(withFolder(["a"], "   ")).toEqual(["a"]);
    expect(withFolder(["a"], "")).toEqual(["a"]);
  });

  it("caps the list at RECENT_LIMIT, dropping the oldest", () => {
    const full = Array.from({ length: RECENT_LIMIT }, (_, i) => `d${i}`);
    const next = withFolder(full, "new");
    expect(next).toHaveLength(RECENT_LIMIT);
    expect(next[0]).toBe("new");
    expect(next).not.toContain(`d${RECENT_LIMIT - 1}`);
  });

  it("does not mutate the input", () => {
    const list = ["a", "b"];
    withFolder(list, "c");
    expect(list).toEqual(["a", "b"]);
  });
});

describe("folder storage", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => window.localStorage.clear());

  it("reads back what it remembered, most recent first", () => {
    rememberFolder("fixtures");
    rememberFolder("../resolver/out-calib");
    expect(readRecentFolders()).toEqual(["../resolver/out-calib", "fixtures"]);
  });

  it("offers the most recent folder for startup, null when empty", () => {
    expect(lastFolder()).toBeNull();
    rememberFolder("fixtures");
    expect(lastFolder()).toBe("fixtures");
  });

  it("survives garbage in storage", () => {
    window.localStorage.setItem(KEY, "not json");
    expect(readRecentFolders()).toEqual([]);
    window.localStorage.setItem(KEY, JSON.stringify({ not: "an array" }));
    expect(readRecentFolders()).toEqual([]);
    window.localStorage.setItem(KEY, JSON.stringify(["ok", 7, null, "  ", "two"]));
    expect(readRecentFolders()).toEqual(["ok", "two"]);
  });
});
