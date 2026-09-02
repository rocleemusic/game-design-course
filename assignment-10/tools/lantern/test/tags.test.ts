import { describe, expect, it } from "vitest";
import { parseTags, stripTags } from "../src/lib/tags";

describe("parseTags (the build-loop.md tag contract)", () => {
  it("reads the four contract tags plus speaker", () => {
    expect(
      parseTags(["screen:T1", "choice:CH-T2-01", "opt:CH-T2-01-a", "id:L-01", "speaker:toby"])
    ).toEqual({
      screen: "T1",
      choice: "CH-T2-01",
      opt: "CH-T2-01-a",
      id: "L-01",
      speaker: "toby",
    });
  });

  it("trims whitespace the compiler leaves on tag text", () => {
    expect(parseTags(["screen:T1 ", " id:GB-T1-INTRO"])).toEqual({
      screen: "T1",
      id: "GB-T1-INTRO",
    });
  });

  it("tolerates a leading # and ignores unknown or malformed tags", () => {
    expect(parseTags(["#opt:CH-1-b", "tone:warm", "no-colon", "id:"])).toEqual({
      opt: "CH-1-b",
    });
  });

  it("handles null (inkjs choices without tags)", () => {
    expect(parseTags(null)).toEqual({});
  });
});

describe("stripTags", () => {
  it("removes leftover tag text from a display line", () => {
    expect(stripTags("Morning! #id:L-01 #speaker:toby")).toBe("Morning!");
  });
  it("leaves ordinary text alone", () => {
    expect(stripTags('"Let me carry the trays at least."')).toBe(
      '"Let me carry the trays at least."'
    );
  });
});
